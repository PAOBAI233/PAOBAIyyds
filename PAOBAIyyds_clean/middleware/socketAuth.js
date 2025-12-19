/**
 * Socket.IO认证中间件
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Socket认证中间件
 */
function socketAuth(socket, next) {
  try {
    // 获取认证令牌
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // 允许匿名连接，但标记为匿名用户
      socket.user = {
        id: socket.id,
        type: 'anonymous',
        authenticated: false
      };
      return next();
    }

    // 验证JWT令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 设置用户信息
    socket.user = {
      id: decoded.id,
      openid: decoded.openid,
      nickname: decoded.nickname,
      type: decoded.type || 'customer',
      restaurantId: decoded.restaurantId,
      sessionId: decoded.sessionId,
      authenticated: true,
      ...decoded
    };

    logger.debug(`Socket认证成功: ${socket.user.id} (${socket.user.type})`);
    next();

  } catch (error) {
    logger.warn('Socket认证失败:', error.message);
    
    // 认证失败，允许匿名连接
    socket.user = {
      id: socket.id,
      type: 'anonymous',
      authenticated: false
    };
    next();
  }
}

/**
 * 验证用户权限
 */
function checkPermission(user, requiredType, requiredRestaurantId = null) {
  if (!user || !user.authenticated) {
    return false;
  }

  // 检查用户类型
  if (requiredType && user.type !== requiredType) {
    return false;
  }

  // 检查餐厅权限
  if (requiredRestaurantId && user.restaurantId && user.restaurantId !== requiredRestaurantId) {
    return false;
  }

  return true;
}

/**
 * 验证会话权限
 */
function checkSessionPermission(user, sessionId) {
  if (!user || !user.authenticated) {
    return false;
  }

  // 管理员可以访问所有会话
  if (user.type === 'admin') {
    return true;
  }

  // 后厨可以访问餐厅内所有会话
  if (user.type === 'kitchen' && user.restaurantId) {
    return true;
  }

  // 用户只能访问自己的会话
  if (user.type === 'customer' && user.sessionId === sessionId) {
    return true;
  }

  return false;
}

/**
 * 验证餐厅权限
 */
function checkRestaurantPermission(user, restaurantId) {
  if (!user || !user.authenticated) {
    return false;
  }

  // 管理员可以访问所有餐厅
  if (user.type === 'admin') {
    return true;
  }

  // 其他用户只能访问自己餐厅的数据
  return user.restaurantId === restaurantId;
}

/**
 * Socket事件权限检查
 */
function checkEventPermission(socket, eventName, data) {
  const user = socket.user;
  
  if (!user || !user.authenticated) {
    return false;
  }

  switch (eventName) {
    case 'join_session':
      return checkSessionPermission(user, data.sessionId);
      
    case 'order_update':
      return checkRestaurantPermission(user, data.restaurantId) || 
             checkSessionPermission(user, data.sessionId);
      
    case 'payment_update':
      return checkSessionPermission(user, data.sessionId);
      
    case 'kitchen_order_update':
      return user.type === 'kitchen' || user.type === 'admin';
      
    case 'table_update':
      return user.type === 'admin' || user.type === 'kitchen';
      
    default:
      return true; // 默认允许
  }
}

/**
 * 记录Socket事件
 */
function logSocketEvent(socket, eventName, data) {
  const user = socket.user;
  
  logger.debug('Socket事件:', {
    socketId: socket.id,
    userId: user?.id,
    userType: user?.type,
    authenticated: user?.authenticated || false,
    event: eventName,
    data: data || {},
    timestamp: new Date().toISOString()
  });
}

/**
 * 频道权限检查
 */
function checkChannelPermission(socket, channel) {
  const user = socket.user;
  
  if (!user || !user.authenticated) {
    return false;
  }

  // 解析频道名称
  const match = channel.match(/^(restaurant|session)_(.+)$/);
  if (!match) {
    return true; // 其他频道默认允许
  }

  const [, type, id] = match;

  switch (type) {
    case 'restaurant':
      return checkRestaurantPermission(user, parseInt(id));
      
    case 'session':
      return checkSessionPermission(user, id);
      
    default:
      return false;
  }
}

/**
 * 获取用户可加入的频道
 */
function getUserChannels(user) {
  const channels = [];
  
  if (!user || !user.authenticated) {
    return channels;
  }

  // 餐厅频道
  if (user.restaurantId) {
    channels.push(`restaurant_${user.restaurantId}`);
  }

  // 会话频道
  if (user.sessionId) {
    channels.push(`session_${user.sessionId}`);
  }

  // 管理员频道
  if (user.type === 'admin') {
    channels.push('admin_broadcast');
  }

  // 后厨频道
  if (user.type === 'kitchen') {
    channels.push('kitchen_broadcast');
  }

  return channels;
}

/**
 * Socket连接限制
 */
const connectionLimits = new Map();

function checkConnectionLimit(socket) {
  const user = socket.user;
  
  if (!user || !user.authenticated) {
    return true; // 匿名用户不限制
  }

  const key = user.id;
  const maxConnections = 5; // 每个用户最多5个连接
  
  if (!connectionLimits.has(key)) {
    connectionLimits.set(key, 0);
  }

  const count = connectionLimits.get(key);
  
  if (count >= maxConnections) {
    logger.warn(`用户连接超限: ${user.id} (${count})`);
    return false;
  }

  connectionLimits.set(key, count + 1);
  
  // 断开连接时清理
  socket.on('disconnect', () => {
    const currentCount = connectionLimits.get(key) || 0;
    connectionLimits.set(key, Math.max(0, currentCount - 1));
  });

  return true;
}

/**
 * 清理过期连接限制
 */
function cleanupConnectionLimits() {
  // 定期清理空值
  for (const [key, count] of connectionLimits.entries()) {
    if (count <= 0) {
      connectionLimits.delete(key);
    }
  }
}

// 每分钟清理一次
setInterval(cleanupConnectionLimits, 60000);

module.exports = {
  socketAuth,
  checkPermission,
  checkSessionPermission,
  checkRestaurantPermission,
  checkEventPermission,
  checkChannelPermission,
  getUserChannels,
  logSocketEvent,
  checkConnectionLimit,
  cleanupConnectionLimits
};


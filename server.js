const express = require('express');

const http = require('http');

const socketIo = require('socket.io');

const cors = require('cors');

const helmet = require('helmet');

const compression = require('compression');

const morgan = require('morgan');

const rateLimit = require('express-rate-limit');

const path = require('path');

require('dotenv').config();

// 创建Express应用
const app = express();

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 异步初始化函数
async function initializeApp() {
  try {
    // 初始化数据库
    console.log('🔄 正在初始化数据库...');
    const { initDatabase } = require('./database/init');
    await initDatabase();
    console.log('✅ 数据库初始化成功');

    // 数据库初始化成功后再导入路由
    const apiRoutes = require('./routes/api');
    const customerRoutes = require('./routes/customer');
    const kitchenRoutes = require('./routes/kitchen');
    const adminRoutes = require('./routes/admin');

    // 配置中间件和路由
    setupMiddlewareAndRoutes(app, apiRoutes, customerRoutes, kitchenRoutes, adminRoutes);

    return { app, server, io };
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    process.exit(1);
  }
}

// 配置中间件和路由的函数
function setupMiddlewareAndRoutes(app, apiRoutes, customerRoutes, kitchenRoutes, adminRoutes) {
  console.log('🔧 配置中间件和路由...');

  // 基础中间件
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(compression());
  app.use(morgan('combined', { stream: { write: message => console.log(message.trim()) } }));

  // CORS配置
  let corsOptions = {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

  // 开发环境下允许所有本地来源
  if (process.env.NODE_ENV === 'development') {
    corsOptions.origin = function (origin, callback) {
      // 允许没有origin的请求（如移动应用、Postman等）
      if (!origin) return callback(null, true);
      
      // 允许所有localhost和127.0.0.1来源
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // 允许配置的域名
      const allowedOrigins = [
        'http://paobai.cn',
        'https://paobai.cn', 
        'http://www.paobai.cn',
        'https://www.paobai.cn',
        'https://paobai-restaurant.paobai.cn'  // 支持可能的子域名
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        callback(new Error('CORS策略不允许此来源'));
      }
    };
  } else {
    // 生产环境使用配置的来源列表
    corsOptions.origin = process.env.CORS_ORIGIN?.split(',') || [
      'http://paobai.cn',
      'https://paobai.cn',
      'http://www.paobai.cn', 
      'https://www.paobai.cn',
      'https://paobai-restaurant.paobai.cn'
    ];
  }
  
  app.use(cors(corsOptions));
  
  // 手动处理预检请求（确保OPTIONS请求被正确处理）
  app.options('*', cors(corsOptions));

  // 请求限制
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    message: {
      success: false,
      message: '请求过于频繁，请稍后再试'
    }
  });
  app.use('/api', limiter);

  // 解析中间件
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 静态文件
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Socket.IO客户端文件
  app.use('/socket.io', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));

  // API路由配置 - 必须在视图路由之前
  app.use('/api', (req, res, next) => {
    console.log(`API请求: ${req.method} ${req.originalUrl}`);
    next();
  }, apiRoutes);
  app.use('/api/customer', (req, res, next) => {
    console.log(`Customer API请求: ${req.method} ${req.originalUrl}`);
    next();
  }, customerRoutes);
  app.use('/api/kitchen', (req, res, next) => {
    console.log(`Kitchen API请求: ${req.method} ${req.originalUrl}`);
    next();
  }, kitchenRoutes);
  app.use('/api/admin', (req, res, next) => {
    console.log(`Admin API请求: ${req.method} ${req.originalUrl}`);
    next();
  }, adminRoutes);

  // 视图路由 - 使用精确匹配避免与API路由冲突
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  app.get('/kitchen', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'kitchen.html'));
  });

  app.get('/customer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'aa-payment.html'));
  });

  // 主页重定向
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // 404处理 - 必须在所有路由之后
  app.use((req, res) => {
    // 如果是API请求，返回JSON错误
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        message: 'API接口不存在',
        path: req.originalUrl
      });
    }
    
    // 其他请求返回HTML 404页面
    res.status(404).json({
      success: false,
      message: '页面不存在',
      path: req.originalUrl
    });
  });

  // 错误处理中间件
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || '服务器内部错误'
    });
  });

  console.log('✅ 中间件和路由配置完成');
  
  // 添加全局请求日志
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
  });
}

// Socket.IO连接处理
function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log('客户端连接:', socket.id);
    
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`客户端 ${socket.id} 加入房间 ${roomId}`);
    });
    
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`客户端 ${socket.id} 离开房间 ${roomId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('客户端断开连接:', socket.id);
    });
  });
}

// 启动服务器
async function startServer() {
  try {
    const { app, server, io } = await initializeApp();
    
    // 设置Socket.IO
    setupSocketIO(io);
    
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';

    server.listen(PORT, HOST, () => {
      console.log(`🚀 智能餐饮系统启动成功！`);
      console.log(`📍 服务器地址: http://${HOST}:${PORT}`);
      console.log(`🌐 环境模式: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动应用
startServer();

module.exports = { app, io };
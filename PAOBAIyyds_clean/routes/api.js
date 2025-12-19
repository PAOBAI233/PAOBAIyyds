/**
 * 基础API路由
 */

const express = require('express');
const router = express.Router();
const { body, query: validatorQuery, param, validationResult } = require('express-validator');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');
const { query: dbQuery } = require('../database/init');
const xpyunService = require('../services/xpyunService');
const logger = require('../utils/logger');

// 生成唯一ID
function generateId(prefix = '') {
  return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * 获取餐厅信息
 */
router.get('/restaurant/info', asyncHandler(async (req, res) => {
  const restaurantId = req.query.id || 1;
  const sql = 'SELECT * FROM restaurants WHERE id = ? AND status = 1';
  const [restaurant] = await dbQuery(sql, [restaurantId]);
  
  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: '餐厅信息不存在或已停业'
    });
  }

  res.json({
    success: true,
    data: {
      id: restaurant.id,
      name: restaurant.name,
      logo: restaurant.logo,
      description: restaurant.description,
      address: restaurant.address,
      phone: restaurant.phone,
      business_hours: restaurant.business_hours
    }
  });
});

/**
 * 获取菜品分类
 */
router.get('/menu/categories', asyncHandler(async (req, res) => {
  const sql = `
    SELECT * FROM categories 
    WHERE restaurant_id = 1 AND is_active = 1 
    ORDER BY sort_order ASC
  `;
  
  const categories = await dbQuery(sql);
  
  res.json({
    success: true,
    data: categories
  });
});

/**
 * 获取菜品列表
 */
router.get('/menu/items', [
  validatorQuery('category_id').optional().isInt({ min: 1 }).withMessage('分类ID必须是正整数'),
  validatorQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validatorQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { category_id, page = 1, limit = 50 } = req.query;
  
  let whereClause = 'WHERE mi.restaurant_id = 1 AND mi.is_available = 1';
  const params = [];
  
  if (category_id) {
    whereClause += ' AND mi.category_id = ?';
    params.push(category_id);
  }
  
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT 
      mi.*,
      c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    ${whereClause}
    ORDER BY mi.sort_order ASC, mi.id ASC
    LIMIT ? OFFSET ?
  `;
  
  const items = await dbQuery(sql, [...params, parseInt(limit), offset]);
  
  // 获取总数
  const countSql = `
    SELECT COUNT(*) as total 
    FROM menu_items mi 
    ${whereClause}
  `;
  const [{ total }] = await dbQuery(countSql, params);
  
  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * 获取菜品详情
 */
router.get('/menu/items/:id', [
  param('id').isInt({ min: 1 }).withMessage('菜品ID必须是正整数')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const sql = `
    SELECT 
      mi.*,
      c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.id = ? AND mi.restaurant_id = 1
  `;
  
  const [item] = await dbQuery(sql, [id]);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      message: '菜品不存在'
    });
  }
  
  res.json({
    success: true,
    data: item
  });
});

/**
 * 获取桌台信息（通过二维码）
 */
router.get('/tables/qr/:qr_code', [
  param('qr_code').isString().withMessage('二维码必须是字符串')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { qr_code } = req.params;
  
  const sql = `
    SELECT 
      t.*,
      r.name as restaurant_name
    FROM tables t
    LEFT JOIN restaurants r ON t.restaurant_id = r.id
    WHERE t.qr_code = ? AND t.status = 'available'
  `;
  
  const [table] = await dbQuery(sql, [qr_code]);
  
  if (!table) {
    return res.status(404).json({
      success: false,
      message: '桌台不存在或已被占用'
    });
  }
  
  res.json({
    success: true,
    data: {
      id: table.id,
      table_number: table.table_number,
      table_name: table.table_name,
      capacity: table.capacity,
      table_type: table.table_type,
      restaurant: {
        name: table.restaurant_name
      }
    }
  });
});

/**
 * 创建用餐会话
 */
router.post('/sessions', [
  body('table_id').isInt({ min: 1 }).withMessage('桌台ID必须是正整数'),
  body('leader_info.openid').isString().withMessage('队长openid不能为空'),
  body('leader_info.nickname').optional().isString().withMessage('队长昵称必须是字符串'),
  body('total_customers').optional().isInt({ min: 1, max: 20 }).withMessage('人数必须在1-20之间')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { table_id, leader_info, total_customers = 1 } = req.body;
  
  const sessionId = generateId('SS');
  
  // 开始事务
  await dbQuery('START TRANSACTION');
  
  try {
    // 检查桌台状态
    const [table] = await dbQuery('SELECT * FROM tables WHERE id = ? AND restaurant_id = 1', [table_id]);
    
    if (!table) {
      throw new Error('桌台不存在');
    }
    
    if (table.status !== 'available') {
      throw new Error('桌台已被占用');
    }
    
    // 更新桌台状态
    await dbQuery(
      'UPDATE tables SET status = ?, current_session_id = ? WHERE id = ?',
      ['occupied', sessionId, table_id]
    );
    
    // 创建用餐会话
    await dbQuery(`
      INSERT INTO dining_sessions (
        id, restaurant_id, table_id, leader_openid, leader_nickname, 
        total_customers, status, created_at
      ) VALUES (?, 1, ?, ?, ?, ?, 'active', NOW())
    `, [sessionId, table_id, leader_info.openid, leader_info.nickname, total_customers]);
    
    // 添加队长为用餐者
    await dbQuery(`
      INSERT INTO diners (session_id, openid, nickname, is_leader, join_time)
      VALUES (?, ?, ?, 1, NOW())
    `, [sessionId, leader_info.openid, leader_info.nickname]);
    
    await dbQuery('COMMIT');
    
    res.json({
      success: true,
      data: {
        session_id: sessionId,
        table_info: {
          id: table.id,
          table_number: table.table_number,
          table_name: table.table_name,
          capacity: table.capacity
        },
        leader_info: {
          openid: leader_info.openid,
          nickname: leader_info.nickname,
          is_leader: true
        },
        total_customers,
        status: 'active',
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    await dbQuery('ROLLBACK');
    throw error;
  }
});

/**
 * 加入用餐会话
 */
router.post('/sessions/:sessionId/join', [
  param('sessionId').isString().withMessage('会话ID不能为空'),
  body('openid').isString().withMessage('openid不能为空'),
  body('nickname').optional().isString().withMessage('昵称必须是字符串')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { openid, nickname } = req.body;
  
  // 检查会话是否存在且活跃
  const [session] = await dbQuery(
    'SELECT * FROM dining_sessions WHERE id = ? AND status = ?',
    [sessionId, 'active']
  );
  
  if (!session) {
    return res.status(404).json({
      success: false,
      message: '会话不存在或已结束'
    });
  }
  
  // 检查用户是否已在会话中
  const [existingDiner] = await dbQuery(
    'SELECT * FROM diners WHERE session_id = ? AND openid = ?',
    [sessionId, openid]
  );
  
  if (existingDiner) {
    return res.json({
      success: true,
      message: '已在会话中',
      data: {
        diner_info: {
          id: existingDiner.id,
          openid: existingDiner.openid,
          nickname: existingDiner.nickname,
          is_leader: existingDiner.is_leader === 1,
          join_time: existingDiner.join_time
        }
      }
    });
  }
  
  // 加入会话
  await dbQuery(`
    INSERT INTO diners (session_id, openid, nickname, is_leader, join_time)
    VALUES (?, ?, ?, 0, NOW())
  `, [sessionId, openid, nickname]);
  
  // 更新会话人数
  await dbQuery(`
    UPDATE dining_sessions 
    SET total_customers = (
      SELECT COUNT(*) FROM diners WHERE session_id = ?
    )
    WHERE id = ?
  `, [sessionId, sessionId]);
  
  // 获取用户信息
  const [diner] = await dbQuery(
    'SELECT * FROM diners WHERE session_id = ? AND openid = ? ORDER BY id DESC LIMIT 1',
    [sessionId, openid]
  );
  
  res.json({
    success: true,
    message: '成功加入会话',
    data: {
      diner_info: {
        id: diner.id,
        openid: diner.openid,
        nickname: diner.nickname,
        is_leader: diner.is_leader === 1,
        join_time: diner.join_time
      },
      session_info: {
        total_customers: session.total_customers + 1
      }
    }
  });
});

/**
 * 获取会话信息
 */
router.get('/sessions/:sessionId', [
  param('sessionId').isString().withMessage('会话ID不能为空')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  // 获取会话基本信息
  const [session] = await dbQuery(`
    SELECT 
      ds.*,
      t.table_number,
      t.table_name
    FROM dining_sessions ds
    LEFT JOIN tables t ON ds.table_id = t.id
    WHERE ds.id = ?
  `, [sessionId]);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      message: '会话不存在'
    });
  }
  
  // 获取用餐者列表
  const diners = await dbQuery(`
    SELECT id, openid, nickname, is_leader, join_time, last_active_time
    FROM diners
    WHERE session_id = ?
    ORDER BY is_leader DESC, join_time ASC
  `, [sessionId]);
  
  // 获取当前订单
  const currentOrders = await dbQuery(`
    SELECT o.*, COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.session_id = ? AND o.status IN ('pending', 'confirmed', 'preparing', 'ready')
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [sessionId]);
  
  res.json({
    success: true,
    data: {
      session_info: {
        id: session.id,
        table: {
          id: session.table_id,
          table_number: session.table_number,
          table_name: session.table_name
        },
        leader_info: {
          openid: session.leader_openid,
          nickname: session.leader_nickname
        },
        total_customers: session.total_customers,
        status: session.status,
        start_time: session.start_time,
        subtotal: session.subtotal,
        discount_amount: session.discount_amount,
        total_amount: session.total_amount,
        paid_amount: session.paid_amount
      },
      diners: diners.map(diner => ({
        id: diner.id,
        openid: diner.openid,
        nickname: diner.nickname,
        is_leader: diner.is_leader === 1,
        join_time: diner.join_time,
        last_active_time: diner.last_active_time
      })),
      current_orders: currentOrders.map(order => ({
        id: order.id,
        order_no: order.order_no,
        total_amount: order.total_amount,
        item_count: order.item_count,
        status: order.status,
        created_at: order.created_at
      }))
    }
  });
});

/**
 * 打印测试
 */
router.post('/print/test', asyncHandler(async (req, res) => {
  const result = await xpyunService.printTestPage();
  
  if (result.success) {
    res.json({
      success: true,
      message: '打印测试成功',
      data: result
    });
  } else {
    res.status(500).json({
      success: false,
      message: '打印测试失败',
      error: result.message
    });
  }
});

/**
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;


/**
 * 后厨显示系统路由
 */

const express = require('express');
const router = express.Router();
const { body, query: validatorQuery, param, validationResult } = require('express-validator');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');
const { query: dbQuery } = require('../database/init');
const xpyunService = require('../services/xpyunService');
const logger = require('../utils/logger');

/**
 * 获取待处理订单列表
 */
router.get('/orders', [
  validatorQuery('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'served']).withMessage('状态值无效'),
  validatorQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validatorQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  let whereClause = 'WHERE o.restaurant_id = 1';
  const params = [];
  
  if (status) {
    whereClause += ' AND o.status = ?';
    params.push(status);
  } else {
    // 默认显示未完成的订单
    whereClause += ' AND o.status IN (?, ?, ?, ?)';
    params.push('pending', 'confirmed', 'preparing', 'ready');
  }
  
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT 
      o.*,
      t.table_number,
      t.table_name,
      ds.leader_nickname,
      ds.total_customers,
      TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) as wait_time
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN dining_sessions ds ON o.session_id = ds.id
    ${whereClause}
    ORDER BY 
      CASE 
        WHEN o.priority = 1 THEN 0 
        ELSE 1 
      END,
      o.created_at ASC
    LIMIT ? OFFSET ?
  `;
  
  const orders = await dbQuery(sql, [...params, parseInt(limit), offset]);
  
  // 获取每个订单的项目
  for (const order of orders) {
    const items = await dbQuery(`
      SELECT 
        oi.*,
        mi.category_id,
        c.name as category_name,
        mi.preparation_time,
        mi.image_url
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE oi.order_id = ?
      ORDER BY 
        c.sort_order ASC,
        mi.sort_order ASC,
        oi.created_at ASC
    `, [order.id]);
    
    order.items = items;
  }
  
  // 获取总数
  const countSql = `
    SELECT COUNT(*) as total 
    FROM orders o 
    ${whereClause}
  `;
  const [{ total }] = await dbQuery(countSql, params);
  
  res.json({
    success: true,
    data: {
      orders: orders.map(order => ({
        id: order.id,
        order_no: order.order_no,
        table: {
          id: order.table_id,
          table_number: order.table_number,
          table_name: order.table_name
        },
        session_info: {
          leader_nickname: order.leader_nickname,
          total_customers: order.total_customers
        },
        total_amount: order.total_amount,
        item_count: order.item_count,
        status: order.status,
        priority: order.priority === 1,
        special_requests: order.special_requests,
        preparation_time: order.preparation_time,
        actual_time: order.actual_time,
        wait_time: order.wait_time,
        created_at: order.created_at,
        items: order.items.map(item => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          category: {
            id: item.category_id,
            name: item.category_name
          },
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          special_instructions: item.special_instructions,
          status: item.status,
          preparation_time: item.preparation_time,
          image_url: item.image_url
        }))
      })),
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
 * 更新订单状态
 */
router.put('/orders/:orderId/status', [
  param('orderId').isString().withMessage('订单ID不能为空'),
  body('status').isIn(['confirmed', 'preparing', 'ready', 'served', 'cancelled']).withMessage('状态值无效'),
  body('actual_time').optional().isInt({ min: 0 }).withMessage('实际制作时间必须是非负整数'),
  body('reason').optional().isString().withMessage('原因必须是字符串')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, actual_time, reason } = req.body;
  
  // 获取订单信息
  const [order] = await dbQuery(
    'SELECT * FROM orders WHERE id = ? AND restaurant_id = 1',
    [orderId]
  );
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: '订单不存在'
    });
  }
  
  // 验证状态流转
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['served'],
    'served': [],
    'cancelled': []
  };
  
  const allowedStatuses = validTransitions[order.status] || [];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `无法从 ${order.status} 状态变更为 ${status} 状态`
    });
  }
  
  // 更新订单状态
  const updateFields = {
    status: status,
    updated_at: new Date()
  };
  
  if (status === 'confirmed') {
    updateFields.confirmed_at = new Date();
  } else if (status === 'ready') {
    updateFields.completed_at = new Date();
  } else if (status === 'served') {
    updateFields.completed_at = new Date();
  }
  
  if (actual_time !== undefined) {
    updateFields.actual_time = actual_time;
  }
  
  await dbQuery(`
    UPDATE orders 
    SET ${Object.keys(updateFields).map(key => `${key} = ?`).join(', ')}
    WHERE id = ?
  `, [...Object.values(updateFields), orderId]);
  
  // 更新订单项状态
  await dbQuery(
    'UPDATE order_items SET status = ?, updated_at = NOW() WHERE order_id = ?',
    [status, orderId]
  );
  
  // 获取更新后的订单信息
  const [updatedOrder] = await dbQuery(`
    SELECT 
      o.*,
      t.table_number,
      t.table_name,
      ds.leader_nickname
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN dining_sessions ds ON o.session_id = ds.id
    WHERE o.id = ?
  `, [orderId]);
  
  // 通知顾客端
  const io = req.app.get('io');
  if (io) {
    io.to(`session_${order.session_id}`).emit('order_status_update', {
      order_id: orderId,
      status: status,
      actual_time: actual_time,
      reason: reason,
      timestamp: new Date().toISOString()
    });
    
    // 通知其他后厨终端
    io.to('restaurant_1').emit('kitchen_order_update', {
      order_id: orderId,
      order_no: updatedOrder.order_no,
      table_number: updatedOrder.table_number,
      status: status,
      timestamp: new Date().toISOString()
    });
  }
  
  // 如果订单完成，更新会话统计
  if (status === 'served') {
    await dbQuery(`
      UPDATE dining_sessions 
      SET subtotal = (
        SELECT COALESCE(SUM(total_amount), 0) 
        FROM orders 
        WHERE session_id = ? AND status = 'served'
      )
      WHERE id = ?
    `, [order.session_id, order.session_id]);
  }
  
  res.json({
    success: true,
    message: '订单状态更新成功',
    data: {
      order: {
        id: updatedOrder.id,
        order_no: updatedOrder.order_no,
        table: {
          id: updatedOrder.table_id,
          table_number: updatedOrder.table_number,
          table_name: updatedOrder.table_name
        },
        status: updatedOrder.status,
        actual_time: updatedOrder.actual_time,
        reason: reason,
        updated_at: new Date().toISOString()
      }
    }
  });
});

/**
 * 更新单个订单项状态
 */
router.put('/order-items/:itemId/status', [
  param('itemId').isInt({ min: 1 }).withMessage('订单项ID必须是正整数'),
  body('status').isIn(['preparing', 'ready', 'served', 'cancelled']).withMessage('状态值无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { status } = req.body;
  
  // 获取订单项信息
  const [orderItem] = await dbQuery(`
    SELECT 
      oi.*,
      o.session_id,
      o.table_id,
      o.status as order_status
    FROM order_items oi
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE oi.id = ? AND o.restaurant_id = 1
  `, [itemId]);
  
  if (!orderItem) {
    return res.status(404).json({
      success: false,
      message: '订单项不存在'
    });
  }
  
  // 更新订单项状态
  await dbQuery(
    'UPDATE order_items SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, itemId]
  );
  
  // 检查是否所有订单项都是相同状态，如果是则更新订单状态
  const [statusCount] = await dbQuery(`
    SELECT 
      status,
      COUNT(*) as count
    FROM order_items 
    WHERE order_id = ?
    GROUP BY status
  `, [orderItem.order_id]);
  
  // 如果所有项都已完成，更新订单状态
  const totalItems = statusCount.reduce((sum, item) => sum + item.count, 0);
  const readyItems = statusCount.find(item => item.status === 'ready')?.count || 0;
  const servedItems = statusCount.find(item => item.status === 'served')?.count || 0;
  
  if (readyItems === totalItems && orderItem.order_status !== 'ready') {
    await dbQuery(
      'UPDATE orders SET status = ?, completed_at = NOW() WHERE id = ?',
      ['ready', orderItem.order_id]
    );
  } else if (servedItems === totalItems && orderItem.order_status !== 'served') {
    await dbQuery(
      'UPDATE orders SET status = ?, completed_at = NOW() WHERE id = ?',
      ['served', orderItem.order_id]
    );
  }
  
  // 通知顾客端
  const io = req.app.get('io');
  if (io) {
    io.to(`session_${orderItem.session_id}`).emit('order_item_status_update', {
      order_item_id: itemId,
      order_id: orderItem.order_id,
      status: status,
      timestamp: new Date().toISOString()
    });
    
    // 通知其他后厨终端
    io.to('restaurant_1').emit('kitchen_item_update', {
      order_item_id: itemId,
      order_id: orderItem.order_id,
      status: status,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    message: '订单项状态更新成功',
    data: {
      order_item_id: itemId,
      status: status,
      updated_at: new Date().toISOString()
    }
  });
});

/**
 * 获取菜品分类统计
 */
router.get('/stats/categories', [
  validatorQuery('date_from').optional().isDate().withMessage('开始日期格式无效'),
  validatorQuery('date_to').optional().isDate().withMessage('结束日期格式无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  
  let whereClause = 'WHERE o.restaurant_id = 1 AND o.status IN (?, ?)';
  const params = ['served', 'completed'];
  
  if (date_from) {
    whereClause += ' AND DATE(o.created_at) >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    whereClause += ' AND DATE(o.created_at) <= ?';
    params.push(date_to);
  }
  
  const sql = `
    SELECT 
      c.id,
      c.name as category_name,
      COUNT(oi.id) as item_count,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.subtotal) as total_amount
    FROM order_items oi
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    LEFT JOIN categories c ON mi.category_id = c.id
    LEFT JOIN orders o ON oi.order_id = o.id
    ${whereClause}
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC
  `;
  
  const categories = await dbQuery(sql, params);
  
  res.json({
    success: true,
    data: {
      categories: categories.map(category => ({
        id: category.id,
        name: category.category_name,
        item_count: category.item_count,
        total_quantity: category.total_quantity,
        total_amount: category.total_amount
      }))
    }
  });
});

/**
 * 获取热销菜品
 */
router.get('/stats/popular-items', [
  validatorQuery('limit').optional().isInt({ min: 1, max: 50 }).withMessage('限制数量必须在1-50之间'),
  validatorQuery('date_from').optional().isDate().withMessage('开始日期格式无效'),
  validatorQuery('date_to').optional().isDate().withMessage('结束日期格式无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { limit = 10, date_from, date_to } = req.query;
  
  let whereClause = 'WHERE o.restaurant_id = 1 AND o.status IN (?, ?)';
  const params = ['served', 'completed'];
  
  if (date_from) {
    whereClause += ' AND DATE(o.created_at) >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    whereClause += ' AND DATE(o.created_at) <= ?';
    params.push(date_to);
  }
  
  const sql = `
    SELECT 
      mi.id,
      mi.name,
      mi.price,
      mi.image_url,
      c.name as category_name,
      COUNT(oi.id) as order_count,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.subtotal) as total_amount,
      AVG(oi.subtotal / oi.quantity) as avg_price
    FROM order_items oi
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    LEFT JOIN categories c ON mi.category_id = c.id
    LEFT JOIN orders o ON oi.order_id = o.id
    ${whereClause}
    GROUP BY mi.id, mi.name, mi.price, mi.image_url, c.name
    HAVING total_quantity > 0
    ORDER BY total_quantity DESC, total_amount DESC
    LIMIT ?
  `;
  
  const items = await dbQuery(sql, [...params, parseInt(limit)]);
  
  res.json({
    success: true,
    data: {
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        category: item.category_name,
        order_count: item.order_count,
        total_quantity: item.total_quantity,
        total_amount: item.total_amount,
        avg_price: item.avg_price
      }))
    }
  });
});

/**
 * 获取今日统计
 */
router.get('/stats/today', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // 获取今日订单统计
  const [orderStats] = await dbQuery(`
    SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'served' THEN 1 END) as completed_orders,
      SUM(total_amount) as total_revenue,
      AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_preparation_time
    FROM orders 
    WHERE restaurant_id = 1 
      AND DATE(created_at) = ?
      AND status IN ('served', 'completed')
  `, [today]);
  
  // 获取活跃桌台数
  const [activeTables] = await dbQuery(`
    SELECT COUNT(*) as count
    FROM tables 
    WHERE restaurant_id = 1 AND status = 'occupied'
  `);
  
  // 获取今日热销分类
  const categoryStats = await dbQuery(`
    SELECT 
      c.name,
      COUNT(oi.id) as item_count
    FROM order_items oi
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    LEFT JOIN categories c ON mi.category_id = c.id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.restaurant_id = 1 
      AND DATE(o.created_at) = ?
      AND o.status IN ('served', 'completed')
    GROUP BY c.id, c.name
    ORDER BY item_count DESC
    LIMIT 5
  `, [today]);
  
  res.json({
    success: true,
    data: {
      date: today,
      orders: {
        total: orderStats.total_orders || 0,
        completed: orderStats.completed_orders || 0,
        completion_rate: orderStats.total_orders > 0 
          ? ((orderStats.completed_orders / orderStats.total_orders) * 100).toFixed(1)
          : 0
      },
      revenue: {
        total: orderStats.total_revenue || 0,
        avg_order: orderStats.total_orders > 0
          ? (orderStats.total_revenue / orderStats.total_orders).toFixed(2)
          : 0
      },
      performance: {
        avg_preparation_time: Math.round(orderStats.avg_preparation_time || 0),
        active_tables: activeTables.count || 0
      },
      top_categories: categoryStats
    }
  });
});

/**
 * 获取实时监控数据
 */
router.get('/dashboard/realtime', asyncHandler(async (req, res) => {
  // 获取待处理订单数
  const [pendingOrders] = await dbQuery(`
    SELECT COUNT(*) as count
    FROM orders 
    WHERE restaurant_id = 1 AND status IN ('pending', 'confirmed')
  `);
  
  // 获取制作中订单数
  const [preparingOrders] = await dbQuery(`
    SELECT COUNT(*) as count
    FROM orders 
    WHERE restaurant_id = 1 AND status = 'preparing'
  `);
  
  // 获取待上菜订单数
  const [readyOrders] = await dbQuery(`
    SELECT COUNT(*) as count
    FROM orders 
    WHERE restaurant_id = 1 AND status = 'ready'
  `);
  
  // 获取今日已上菜订单数
  const [todayServed] = await dbQuery(`
    SELECT COUNT(*) as count
    FROM orders 
    WHERE restaurant_id = 1 
      AND DATE(created_at) = CURDATE()
      AND status = 'served'
  `);
  
  // 获取平均等待时间
  const [avgWaitTime] = await dbQuery(`
    SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_time
    FROM orders 
    WHERE restaurant_id = 1 
      AND DATE(created_at) = CURDATE()
      AND status IN ('served', 'completed')
      AND completed_at IS NOT NULL
  `);
  
  res.json({
    success: true,
    data: {
      pending_orders: pendingOrders.count || 0,
      preparing_orders: preparingOrders.count || 0,
      ready_orders: readyOrders.count || 0,
      today_served: todayServed.count || 0,
      avg_wait_time: Math.round(avgWaitTime.avg_time || 0),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;


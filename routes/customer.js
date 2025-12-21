/**
 * 顾客端路由 - H5点餐功能
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
 * 生成订单号
 */
function generateOrderNo() {
  const date = new Date();
  const dateStr = date.getFullYear() + 
                  String(date.getMonth() + 1).padStart(2, '0') + 
                  String(date.getDate()).padStart(2, '0');
  const timeStr = String(date.getHours()).padStart(2, '0') + 
                  String(date.getMinutes()).padStart(2, '0') + 
                  String(date.getSeconds()).padStart(2, '0');
  const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `PO${dateStr}${timeStr}${randomStr}`;
}

/**
 * 创建订单
 */
router.post('/orders', [
  body('session_id').isString().withMessage('会话ID不能为空'),
  body('items').isArray({ min: 1 }).withMessage('菜品列表不能为空'),
  body('items.*.menu_item_id').isInt({ min: 1 }).withMessage('菜品ID必须是正整数'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('数量必须是正整数'),
  body('items.*.special_instructions').optional().isString().withMessage('特殊要求必须是字符串'),
  body('special_requests').optional().isString().withMessage('特殊要求必须是字符串'),
  body('diner_openid').isString().withMessage('点餐用户不能为空')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { session_id, items, special_requests, diner_openid } = req.body;
  
  // 验证会话状态
  const [session] = await dbQuery(
    'SELECT * FROM dining_sessions WHERE id = ? AND status = ?',
    [session_id, 'active']
  );
  
  if (!session) {
    return res.status(404).json({
      success: false,
      message: '会话不存在或已结束'
    });
  }
  
  // 验证用户是否在会话中
  const [diner] = await dbQuery(
    'SELECT * FROM diners WHERE session_id = ? AND openid = ?',
    [session_id, diner_openid]
  );
  
  if (!diner) {
    return res.status(403).json({
      success: false,
      message: '用户不在当前会话中'
    });
  }
  
  // 计算订单总金额
  let totalAmount = 0;
  let itemCount = 0;
  
  const validatedItems = [];
  
  for (const item of items) {
    const [menuItem] = await dbQuery(
      'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = 1 AND is_available = 1',
      [item.menu_item_id]
    );
    
    if (!menuItem) {
      return res.status(400).json({
        success: false,
        message: `菜品ID ${item.menu_item_id} 不存在或不可售`
      });
    }
    
    const subtotal = menuItem.price * item.quantity;
    totalAmount += subtotal;
    itemCount += item.quantity;
    
    validatedItems.push({
      menu_item_id: item.menu_item_id,
      item_name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      subtotal: subtotal,
      special_instructions: item.special_instructions || null
    });
  }
  
  const orderId = generateId('O');
  const orderNo = generateOrderNo();
  
  // 开始事务
  await dbQuery('START TRANSACTION');
  
  try {
    // 创建订单
    await dbQuery(`
      INSERT INTO orders (
        id, session_id, restaurant_id, table_id, order_no, 
        total_amount, item_count, status, special_requests, created_at
      ) VALUES (?, ?, 1, ?, ?, ?, ?, 'pending', ?, NOW())
    `, [orderId, session_id, session.table_id, orderNo, totalAmount, itemCount, special_requests]);
    
    // 创建订单项
    for (const item of validatedItems) {
      await dbQuery(`
        INSERT INTO order_items (
          order_id, menu_item_id, item_name, price, quantity, 
          subtotal, special_instructions, diner_openid, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        orderId, item.menu_item_id, item.item_name, item.price,
        item.quantity, item.subtotal, item.special_instructions, diner_openid
      ]);
    }
    
    // 更新会话总金额
    await dbQuery(`
      UPDATE dining_sessions 
      SET total_amount = total_amount + ? 
      WHERE id = ?
    `, [totalAmount, session_id]);
    
    await dbQuery('COMMIT');
    
    // 获取完整订单信息
    const [order] = await dbQuery(`
      SELECT 
        o.*,
        t.table_number,
        t.table_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.id = ?
    `, [orderId]);
    
    const orderItems = await dbQuery(`
      SELECT 
        oi.*,
        mi.image_url
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    // 发送到后厨打印
    try {
      const printData = {
        type: 'order',
        data: {
          restaurant: { name: '范式转换演示餐厅' },
          order: {
            order_no: order.order_no,
            total_amount: order.total_amount,
            special_requests: order.special_requests
          },
          table: {
            table_number: order.table_number,
            table_name: order.table_name
          },
          items: orderItems.map(item => ({
            item_name: item.item_name,
            quantity: item.quantity,
            special_instructions: item.special_instructions
          }))
        }
      };
      
      await xpyunService.printReceipt(printData);
      logger.info('订单打印成功', { orderId, orderNo });
      
    } catch (printError) {
      logger.error('订单打印失败', { orderId, orderNo, error: printError.message });
    }
    
    // 通知其他用户
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${session_id}`).emit('new_order', {
        order_id: orderId,
        order_no: orderNo,
        total_amount: totalAmount,
        item_count: itemCount,
        timestamp: new Date().toISOString()
      });
      
      io.to(`restaurant_1`).emit('kitchen_new_order', {
        order_id: orderId,
        order_no: orderNo,
        table_number: order.table_number,
        total_amount: totalAmount,
        items: orderItems.length,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: '订单创建成功',
      data: {
        order: {
          id: order.id,
          order_no: order.order_no,
          table: {
            id: order.table_id,
            table_number: order.table_number,
            table_name: order.table_name
          },
          total_amount: order.total_amount,
          item_count: order.item_count,
          status: order.status,
          special_requests: order.special_requests,
          created_at: order.created_at
        },
        items: orderItems.map(item => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          special_instructions: item.special_instructions,
          image_url: item.image_url,
          status: item.status
        }))
      }
    });
    
  } catch (error) {
    await dbQuery('ROLLBACK');
    throw error;
  }
});

/**
 * 获取会话订单列表
 */
router.get('/sessions/:sessionId/orders', [
  param('sessionId').isString().withMessage('会话ID不能为空'),
  validatorQuery('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled']).withMessage('状态值无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { status } = req.query;
  
  // 验证会话
  const [session] = await dbQuery(
    'SELECT * FROM dining_sessions WHERE id = ?',
    [sessionId]
  );
  
  if (!session) {
    return res.status(404).json({
      success: false,
      message: '会话不存在'
    });
  }
  
  let whereClause = 'WHERE o.session_id = ?';
  const params = [sessionId];
  
  if (status) {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }
  
  const sql = `
    SELECT 
      o.*,
      t.table_number,
      t.table_name
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    ${whereClause}
    ORDER BY o.created_at DESC
  `;
  
  const orders = await dbQuery(sql, params);
  
  // 获取每个订单的项目
  for (const order of orders) {
    const items = await dbQuery(`
      SELECT 
        oi.*,
        mi.image_url,
        mi.category_id
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at ASC
    `, [order.id]);
    
    order.items = items;
  }
  
  res.json({
    success: true,
    data: {
      session_info: {
        id: session.id,
        status: session.status,
        total_amount: session.total_amount,
        paid_amount: session.paid_amount
      },
      orders: orders.map(order => ({
        id: order.id,
        order_no: order.order_no,
        table: {
          id: order.table_id,
          table_number: order.table_number,
          table_name: order.table_name
        },
        total_amount: order.total_amount,
        item_count: order.item_count,
        status: order.status,
        special_requests: order.special_requests,
        created_at: order.created_at,
        items: order.items.map(item => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          special_instructions: item.special_instructions,
          image_url: item.image_url,
          status: item.status
        }))
      }))
    }
  });
});

/**
 * 更新订单状态（用户取消订单）
 */
router.put('/api/orders/:orderId/status', [
  param('orderId').isString().withMessage('订单ID不能为空'),
  body('status').isIn(['cancelled']).withMessage('只能取消订单'),
  body('reason').optional().isString().withMessage('取消原因必须是字符串')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, reason } = req.body;
  
  // 获取订单信息
  const [order] = await dbQuery(
    'SELECT * FROM orders WHERE id = ? AND status IN (?, ?, ?)',
    [orderId, 'pending', 'confirmed', 'preparing']
  );
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: '订单不存在或无法取消'
    });
  }
  
  // 更新订单状态
  await dbQuery(
    'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, orderId]
  );
  
  // 更新订单项状态
  await dbQuery(
    'UPDATE order_items SET status = ?, updated_at = NOW() WHERE order_id = ?',
    [status, orderId]
  );
  
  // 更新会话总金额
  await dbQuery(
    'UPDATE dining_sessions SET total_amount = total_amount - ? WHERE id = ?',
    [order.total_amount, order.session_id]
  );
  
  // 通知其他用户
  const io = req.app.get('io');
  if (io) {
    io.to(`session_${order.session_id}`).emit('order_status_update', {
      order_id: orderId,
      status: status,
      reason: reason,
      timestamp: new Date().toISOString()
    });
    
    io.to(`restaurant_1`).emit('kitchen_order_cancelled', {
      order_id: orderId,
      order_no: order.order_no,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    message: '订单状态更新成功',
    data: {
      order_id: orderId,
      status: status,
      reason: reason,
      updated_at: new Date().toISOString()
    }
  });
});

/**
 * 计算AA制分账
 */
router.post('/sessions/:sessionId/calculate-aa', [
  param('sessionId').isString().withMessage('会话ID不能为空'),
  body('order_items').isArray().withMessage('订单项目列表不能为空'),
  body('order_items.*.order_item_id').isInt().withMessage('订单项ID必须是整数'),
  body('order_items.*.diner_openid').isString().withMessage('用户openid不能为空')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { order_items } = req.body;
  
  // 验证会话状态
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
  
  // 计算每个用户的应付金额
  const userAmounts = {};
  let totalAmount = 0;
  
  for (const item of order_items) {
    const [orderItem] = await dbQuery(`
      SELECT oi.*, o.order_no
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = ? AND oi.order_id IN (
        SELECT id FROM orders WHERE session_id = ?
      )
    `, [item.order_item_id, sessionId]);
    
    if (!orderItem) {
      return res.status(400).json({
        success: false,
        message: `订单项 ${item.order_item_id} 不存在`
      });
    }
    
    const dinerOpenid = item.diner_openid;
    const itemAmount = orderItem.subtotal;
    
    if (!userAmounts[dinerOpenid]) {
      userAmounts[dinerOpenid] = {
        openid: dinerOpenid,
        original_amount: 0,
        items: []
      };
    }
    
    userAmounts[dinerOpenid].original_amount += itemAmount;
    userAmounts[dinerOpenid].items.push({
      order_item_id: item.order_item_id,
      item_name: orderItem.item_name,
      quantity: orderItem.quantity,
      subtotal: itemAmount
    });
    
    totalAmount += itemAmount;
  }
  
  // 获取用户信息
  const diners = await dbQuery(
    'SELECT openid, nickname FROM diners WHERE session_id = ?',
    [sessionId]
  );
  
  const dinerMap = {};
  diners.forEach(diner => {
    dinerMap[diner.openid] = diner.nickname;
  });
  
  // 构建结果
  const result = Object.values(userAmounts).map(user => ({
    openid: user.openid,
    nickname: dinerMap[user.openid] || '未知用户',
    original_amount: user.original_amount,
    items: user.items,
    final_amount: user.original_amount // 这里可以添加优惠计算逻辑
  });
  
  res.json({
    success: true,
    data: {
      session_id: sessionId,
      total_amount: totalAmount,
      total_customers: result.length,
      split_details: result
    }
  });
});

/**
 * 创建支付记录
 */
router.post('/payments', [
  body('session_id').isString().withMessage('会话ID不能为空'),
  body('diner_openid').isString().withMessage('用户openid不能为空'),
  body('payment_method').isIn(['wechat', 'alipay', 'cash', 'split_aa']).withMessage('支付方式无效'),
  body('amount').isFloat({ min: 0.01 }).withMessage('支付金额必须大于0'),
  body('order_ids').optional().isArray().withMessage('订单ID列表必须是数组'),
  body('split_details').optional().isArray().withMessage('AA制分账详情必须是数组')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { session_id, diner_openid, payment_method, amount, order_ids, split_details } = req.body;
  
  // 验证会话
  const [session] = await dbQuery(
    'SELECT * FROM dining_sessions WHERE id = ? AND status = ?',
    [session_id, 'active']
  );
  
  if (!session) {
    return res.status(404).json({
      success: false,
      message: '会话不存在或已结束'
    });
  }
  
  // 验证用户
  const [diner] = await dbQuery(
    'SELECT * FROM diners WHERE session_id = ? AND openid = ?',
    [session_id, diner_openid]
  );
  
  if (!diner) {
    return res.status(403).json({
      success: false,
      message: '用户不在当前会话中'
    });
  }
  
  const paymentId = generateId('P');
  const transactionId = 'TX' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // 开始事务
  await dbQuery('START TRANSACTION');
  
  try {
    // 创建支付记录
    await dbQuery(`
      INSERT INTO payments (
        id, session_id, order_ids, diner_openid, payment_method,
        amount, payment_type, transaction_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'full', ?, 'pending', NOW())
    `, [
      paymentId, session_id, 
      order_ids ? JSON.stringify(order_ids) : null,
      diner_openid, payment_method, amount, transactionId
    ]);
    
    // 如果是AA制支付，创建分账明细
    if (payment_method === 'split_aa' && split_details) {
      for (const detail of split_details) {
        await dbQuery(`
          INSERT INTO aa_split_details (
            payment_id, session_id, diner_openid, order_items,
            original_amount, split_amount, discount_amount, final_amount, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'pending', NOW())
        `, [
          paymentId, session_id, detail.diner_openid,
          JSON.stringify(detail.order_items),
          detail.original_amount, detail.final_amount, detail.final_amount
        ]);
      }
    }
    
    // 更新会话已付金额
    await dbQuery(
      'UPDATE dining_sessions SET paid_amount = paid_amount + ? WHERE id = ?',
      [amount, session_id]
    );
    
    await dbQuery('COMMIT');
    
    // 通知其他用户
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${session_id}`).emit('payment_status_update', {
        payment_id: paymentId,
        diner_openid: diner_openid,
        amount: amount,
        payment_method: payment_method,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: '支付记录创建成功',
      data: {
        payment_id: paymentId,
        transaction_id: transactionId,
        session_id: session_id,
        diner_info: {
          openid: diner_openid,
          nickname: diner.nickname
        },
        payment_method: payment_method,
        amount: amount,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    await dbQuery('ROLLBACK');
    throw error;
  }
});

/**
 * 获取支付记录
 */
router.get('/sessions/:sessionId/payments', [
  param('sessionId').isString().withMessage('会话ID不能为空'),
  validatorQuery('status').optional().isIn(['pending', 'processing', 'success', 'failed', 'refunded']).withMessage('状态值无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { status } = req.query;
  
  let whereClause = 'WHERE p.session_id = ?';
  const params = [sessionId];
  
  if (status) {
    whereClause += ' AND p.status = ?';
    params.push(status);
  }
  
  const sql = `
    SELECT 
      p.*,
      d.nickname as diner_nickname
    FROM payments p
    LEFT JOIN diners d ON p.diner_openid = d.openid AND d.session_id = p.session_id
    ${whereClause}
    ORDER BY p.created_at DESC
  `;
  
  const payments = await dbQuery(sql, params);
  
  res.json({
    success: true,
    data: {
      payments: payments.map(payment => ({
        id: payment.id,
        diner_info: {
          openid: payment.diner_openid,
          nickname: payment.diner_nickname
        },
        payment_method: payment.payment_method,
        amount: payment.amount,
        payment_type: payment.payment_type,
        transaction_id: payment.transaction_id,
        status: payment.status,
        payment_time: payment.payment_time,
        created_at: payment.created_at
      }))
    }
  });
});

module.exports = router;
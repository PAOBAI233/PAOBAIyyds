/**
 * 商家管理后台路由
 */

const express = require('express');
const router = express.Router();
const { body, query: validatorQuery, param, validationResult } = require('express-validator');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');
const { query: dbQuery } = require('../database/init');
const xpyunService = require('../services/xpyunService');
const logger = require('../utils/logger');

/**
 * 管理员认证中间件
 */
const requireAdmin = (req, res, next) => {
  // 这里简化处理，实际应该验证JWT token
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || token !== 'admin_token') {
    return res.status(401).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  
  next();
};

/**
 * 获取餐厅信息
 */
router.get('/restaurant', requireAdmin, asyncHandler(async (req, res) => {
  const [restaurant] = await dbQuery('SELECT * FROM restaurants WHERE id = 1');
  
  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: '餐厅信息不存在'
    });
  }
  
  res.json({
    success: true,
    data: restaurant
  });
});

/**
 * 更新餐厅信息
 */
router.put('/restaurant', requireAdmin, [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('餐厅名称长度必须在1-100之间'),
  body('description').optional().isString().trim().isLength({ max: 500 }).withMessage('描述长度不能超过500字符'),
  body('address').optional().isString().trim().isLength({ min: 1, max: 255 }).withMessage('地址长度必须在1-255之间'),
  body('phone').optional().isString().trim().isLength({ min: 1, max: 20 }).withMessage('电话长度必须在1-20之间'),
  body('business_hours').optional().isString().trim().isLength({ max: 100 }).withMessage('营业时间长度不能超过100字符'),
  body('status').optional().isIn([0, 1]).withMessage('状态值无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const updates = req.body;
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有提供更新数据'
    });
  }
  
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  
  await dbQuery(
    `UPDATE restaurants SET ${setClause}, updated_at = NOW() WHERE id = 1`,
    values
  );
  
  // 获取更新后的信息
  const [restaurant] = await dbQuery('SELECT * FROM restaurants WHERE id = 1');
  
  res.json({
    success: true,
    message: '餐厅信息更新成功',
    data: restaurant
  });
});

/**
 * 获取桌台列表
 */
router.get('/tables', requireAdmin, [
  validatorQuery('status').optional().isIn(['available', 'occupied', 'reserved', 'cleaning']).withMessage('状态值无效'),
  validatorQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validatorQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  let whereClause = 'WHERE restaurant_id = 1';
  const params = [];
  
  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }
  
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT 
      t.*,
      CASE 
        WHEN t.current_session_id IS NOT NULL THEN (
          SELECT ds.total_customers 
          FROM dining_sessions ds 
          WHERE ds.id = t.current_session_id AND ds.status = 'active'
        )
        ELSE NULL
      END as current_customers,
      CASE 
        WHEN t.current_session_id IS NOT NULL THEN (
          SELECT ds.start_time 
          FROM dining_sessions ds 
          WHERE ds.id = t.current_session_id AND ds.status = 'active'
        )
        ELSE NULL
      END as session_start_time
    FROM tables t
    ${whereClause}
    ORDER BY t.table_number ASC
    LIMIT ? OFFSET ?
  `;
  
  const tables = await dbQuery(sql, [...params, parseInt(limit), offset]);
  
  // 获取总数
  const countSql = `SELECT COUNT(*) as total FROM tables ${whereClause}`;
  const [{ total }] = await dbQuery(countSql, params);
  
  res.json({
    success: true,
    data: {
      tables: tables.map(table => ({
        id: table.id,
        table_number: table.table_number,
        table_name: table.table_name,
        capacity: table.capacity,
        table_type: table.table_type,
        status: table.status,
        current_customers: table.current_customers,
        session_start_time: table.session_start_time,
        qr_code: table.qr_code
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
 * 创建桌台
 */
router.post('/tables', requireAdmin, [
  body('table_number').isString().trim().isLength({ min: 1, max: 20 }).withMessage('桌台号长度必须在1-20之间'),
  body('table_name').optional().isString().trim().isLength({ max: 50 }).withMessage('桌台名称长度不能超过50字符'),
  body('capacity').isInt({ min: 1, max: 20 }).withMessage('可容纳人数必须在1-20之间'),
  body('table_type').optional().isIn(['normal', 'vip', 'private']).withMessage('桌台类型无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { table_number, table_name, capacity, table_type = 'normal' } = req.body;
  
  // 检查桌台号是否已存在
  const [existing] = await dbQuery(
    'SELECT id FROM tables WHERE restaurant_id = 1 AND table_number = ?',
    [table_number]
  );
  
  if (existing) {
    return res.status(400).json({
      success: false,
      message: '桌台号已存在'
    });
  }
  
  const qr_code = `https://paobai.cn/order/table/${table_number}`;
  
  const [result] = await dbQuery(`
    INSERT INTO tables (
      restaurant_id, table_number, table_name, capacity, table_type, qr_code, status, created_at
    ) VALUES (1, ?, ?, ?, ?, ?, 'available', NOW())
  `, [table_number, table_name, capacity, table_type, qr_code]);
  
  // 获取创建的桌台信息
  const [table] = await dbQuery('SELECT * FROM tables WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    message: '桌台创建成功',
    data: table
  });
});

/**
 * 更新桌台
 */
router.put('/tables/:id', requireAdmin, [
  param('id').isInt({ min: 1 }).withMessage('桌台ID必须是正整数'),
  body('table_name').optional().isString().trim().isLength({ max: 50 }).withMessage('桌台名称长度不能超过50字符'),
  body('capacity').optional().isInt({ min: 1, max: 20 }).withMessage('可容纳人数必须在1-20之间'),
  body('table_type').optional().isIn(['normal', 'vip', 'private']).withMessage('桌台类型无效'),
  body('status').optional().isIn(['available', 'occupied', 'reserved', 'cleaning']).withMessage('状态值无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有提供更新数据'
    });
  }
  
  // 检查桌台是否存在
  const [existing] = await dbQuery('SELECT * FROM tables WHERE id = ? AND restaurant_id = 1', [id]);
  
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: '桌台不存在'
    });
  }
  
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  
  await dbQuery(
    `UPDATE tables SET ${setClause}, updated_at = NOW() WHERE id = ?`,
    [...values, id]
  );
  
  // 获取更新后的信息
  const [table] = await dbQuery('SELECT * FROM tables WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: '桌台信息更新成功',
    data: table
  });
});

/**
 * 获取菜品分类列表
 */
router.get('/categories', requireAdmin, asyncHandler(async (req, res) => {
  const categories = await dbQuery(`
    SELECT 
      c.*,
      COUNT(mi.id) as item_count
    FROM categories c
    LEFT JOIN menu_items mi ON c.id = mi.category_id
    WHERE c.restaurant_id = 1
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `);
  
  res.json({
    success: true,
    data: categories
  });
});

/**
 * 创建菜品分类
 */
router.post('/categories', requireAdmin, [
  body('name').isString().trim().isLength({ min: 1, max: 50 }).withMessage('分类名称长度必须在1-50之间'),
  body('description').optional().isString().trim().isLength({ max: 255 }).withMessage('描述长度不能超过255字符'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序顺序必须是非负整数')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { name, description, sort_order = 0 } = req.body;
  
  // 检查分类名称是否已存在
  const [existing] = await dbQuery(
    'SELECT id FROM categories WHERE restaurant_id = 1 AND name = ?',
    [name]
  );
  
  if (existing) {
    return res.status(400).json({
      success: false,
      message: '分类名称已存在'
    });
  }
  
  const [result] = await dbQuery(`
    INSERT INTO categories (
      restaurant_id, name, description, sort_order, is_active, created_at
    ) VALUES (1, ?, ?, ?, 1, NOW())
  `, [name, description, sort_order]);
  
  // 获取创建的分类信息
  const [category] = await dbQuery('SELECT * FROM categories WHERE id = ?', [result.insertId]);
  
  res.status(201).json({
    success: true,
    message: '分类创建成功',
    data: category
  });
});

/**
 * 获取菜品列表
 */
router.get('/menu-items', requireAdmin, [
  validatorQuery('category_id').optional().isInt({ min: 1 }).withMessage('分类ID必须是正整数'),
  validatorQuery('is_available').optional().isBoolean().withMessage('可用状态必须是布尔值'),
  validatorQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validatorQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { category_id, is_available, page = 1, limit = 50 } = req.query;
  
  let whereClause = 'WHERE mi.restaurant_id = 1';
  const params = [];
  
  if (category_id) {
    whereClause += ' AND mi.category_id = ?';
    params.push(category_id);
  }
  
  if (is_available !== undefined) {
    whereClause += ' AND mi.is_available = ?';
    params.push(is_available === 'true' ? 1 : 0);
  }
  
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT 
      mi.*,
      c.name as category_name,
      COUNT(oi.id) as order_count
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
    LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('served', 'completed')
    ${whereClause}
    GROUP BY mi.id
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
      items: items.map(item => ({
        id: item.id,
        category_id: item.category_id,
        category_name: item.category_name,
        name: item.name,
        description: item.description,
        price: item.price,
        original_price: item.original_price,
        image_url: item.image_url,
        unit: item.unit,
        sort_order: item.sort_order,
        is_available: item.is_available === 1,
        is_special: item.is_special === 1,
        spicy_level: item.spicy_level,
        preparation_time: item.preparation_time,
        daily_limit: item.daily_limit,
        sold_today: item.sold_today,
        order_count: item.order_count
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
 * 创建菜品
 */
router.post('/menu-items', requireAdmin, [
  body('category_id').isInt({ min: 1 }).withMessage('分类ID必须是正整数'),
  body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('菜品名称长度必须在1-100之间'),
  body('description').optional().isString().trim().isLength({ max: 255 }).withMessage('描述长度不能超过255字符'),
  body('price').isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
  body('original_price').optional().isFloat({ min: 0 }).withMessage('原价必须大于等于0'),
  body('image_url').optional().isURL().withMessage('图片URL格式无效'),
  body('unit').optional().isString().trim().isLength({ max: 20 }).withMessage('单位长度不能超过20字符'),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('排序顺序必须是非负整数'),
  body('is_available').optional().isBoolean().withMessage('可用状态必须是布尔值'),
  body('is_special').optional().isBoolean().withMessage('特色菜状态必须是布尔值'),
  body('spicy_level').optional().isInt({ min: 0, max: 3 }).withMessage('辣度等级必须在0-3之间'),
  body('preparation_time').optional().isInt({ min: 0 }).withMessage('制作时间必须是非负整数'),
  body('daily_limit').optional().isInt({ min: 1 }).withMessage('每日限量必须是正整数')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const {
    category_id, name, description, price, original_price, image_url,
    unit = '份', sort_order = 0, is_available = true, is_special = false,
    spicy_level = 0, preparation_time = 0, daily_limit
  } = req.body;
  
  // 验证分类是否存在
  const [category] = await dbQuery(
    'SELECT id FROM categories WHERE id = ? AND restaurant_id = 1',
    [category_id]
  );
  
  if (!category) {
    return res.status(400).json({
      success: false,
      message: '分类不存在'
    });
  }
  
  const [result] = await dbQuery(`
    INSERT INTO menu_items (
      restaurant_id, category_id, name, description, price, original_price,
      image_url, unit, sort_order, is_available, is_special, spicy_level,
      preparation_time, daily_limit, created_at
    ) VALUES (
      1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    )
  `, [
    category_id, name, description, price, original_price, image_url,
    unit, sort_order, is_available ? 1 : 0, is_special ? 1 : 0,
    spicy_level, preparation_time, daily_limit
  ]);
  
  // 获取创建的菜品信息
  const [menuItem] = await dbQuery(`
    SELECT 
      mi.*,
      c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.id = ?
  `, [result.insertId]);
  
  res.status(201).json({
    success: true,
    message: '菜品创建成功',
    data: menuItem
  });
});

/**
 * 更新菜品
 */
router.put('/menu-items/:id', requireAdmin, [
  param('id').isInt({ min: 1 }).withMessage('菜品ID必须是正整数'),
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('菜品名称长度必须在1-100之间'),
  body('price').optional().isFloat({ min: 0 }).withMessage('价格必须大于等于0')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // 转换布尔值
  if (updates.is_available !== undefined) {
    updates.is_available = updates.is_available ? 1 : 0;
  }
  
  if (updates.is_special !== undefined) {
    updates.is_special = updates.is_special ? 1 : 0;
  }
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有提供更新数据'
    });
  }
  
  // 检查菜品是否存在
  const [existing] = await dbQuery('SELECT * FROM menu_items WHERE id = ? AND restaurant_id = 1', [id]);
  
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: '菜品不存在'
    });
  }
  
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  
  await dbQuery(
    `UPDATE menu_items SET ${setClause}, updated_at = NOW() WHERE id = ?`,
    [...values, id]
  );
  
  // 获取更新后的信息
  const [menuItem] = await dbQuery(`
    SELECT 
      mi.*,
      c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.id = ?
  `, [id]);
  
  res.json({
    success: true,
    message: '菜品信息更新成功',
    data: menuItem
  });
});

/**
 * 删除菜品
 */
router.delete('/menu-items/:id', requireAdmin, [
  param('id').isInt({ min: 1 }).withMessage('菜品ID必须是正整数')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 检查菜品是否存在
  const [existing] = await dbQuery('SELECT * FROM menu_items WHERE id = ? AND restaurant_id = 1', [id]);
  
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: '菜品不存在'
    });
  }
  
  // 检查是否有相关订单
  const [orderCount] = await dbQuery(
    'SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = ?',
    [id]
  );
  
  if (orderCount.count > 0) {
    // 如果有订单，只是设置为不可用
    await dbQuery('UPDATE menu_items SET is_available = 0, updated_at = NOW() WHERE id = ?', [id]);
    
    return res.json({
      success: true,
      message: '菜品已设为不可售（存在相关订单）'
    });
  }
  
  // 如果没有订单，直接删除
  await dbQuery('DELETE FROM menu_items WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: '菜品删除成功'
  });
});

/**
 * 获取订单统计
 */
router.get('/stats/overview', requireAdmin, [
  validatorQuery('date_from').optional().isDate().withMessage('开始日期格式无效'),
  validatorQuery('date_to').optional().isDate().withMessage('结束日期格式无效')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  
  let whereClause = 'WHERE restaurant_id = 1 AND status IN (?, ?)';
  const params = ['served', 'completed'];
  
  if (date_from) {
    whereClause += ' AND DATE(created_at) >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    whereClause += ' AND DATE(created_at) <= ?';
    params.push(date_to);
  }
  
  // 获取基本统计
  const [overview] = await dbQuery(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_order_value,
      COUNT(CASE WHEN priority = 1 THEN 1 END) as priority_orders
    FROM orders 
    ${whereClause}
  `, params);
  
  // 获取桌台使用率
  const [tableUsage] = await dbQuery(`
    SELECT 
      COUNT(*) as total_tables,
      COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_tables,
      ROUND(COUNT(CASE WHEN status = 'occupied' THEN 1 END) * 100.0 / COUNT(*), 2) as usage_rate
    FROM tables 
    WHERE restaurant_id = 1
  `);
  
  // 获取今日活跃会话
  const [todaySessions] = await dbQuery(`
    SELECT COUNT(*) as count
    FROM dining_sessions 
    WHERE restaurant_id = 1 
      AND DATE(start_time) = CURDATE()
      AND status = 'active'
  `);
  
  res.json({
    success: true,
    data: {
      orders: {
        total: overview.total_orders || 0,
        total_revenue: overview.total_revenue || 0,
        avg_order_value: overview.avg_order_value || 0,
        priority_orders: overview.priority_orders || 0
      },
      tables: {
        total: tableUsage.total_tables || 0,
        occupied: tableUsage.occupied_tables || 0,
        usage_rate: tableUsage.usage_rate || 0
      },
      sessions: {
        active_today: todaySessions.count || 0
      }
    }
  });
});

/**
 * 获取热销菜品统计
 */
router.get('/stats/popular-items', requireAdmin, [
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
        total_amount: item.total_amount,
        total_quantity: item.total_quantity
      }))
    }
  });
}));

/**
 * 获取分类统计
 */
router.get('/stats/categories', requireAdmin, [
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
      c.name as name,
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
        name: category.name,
        total_amount: category.total_amount,
        item_count: category.item_count
      }))
    }
  });
});

/**
 * 获取打印任务历史
 */
router.get('/print-jobs', requireAdmin, [
  validatorQuery('status').optional().isIn(['pending', 'printing', 'success', 'failed']).withMessage('状态值无效'),
  validatorQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validatorQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  let whereClause = 'WHERE pj.restaurant_id = 1';
  const params = [];
  
  if (status) {
    whereClause += ' AND pj.status = ?';
    params.push(status);
  }
  
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT 
      pj.*,
      o.order_no,
      t.table_number
    FROM print_jobs pj
    LEFT JOIN orders o ON pj.order_id = o.id
    LEFT JOIN tables t ON o.table_id = t.id
    ${whereClause}
    ORDER BY pj.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const jobs = await dbQuery(sql, [...params, parseInt(limit), offset]);
  
  // 获取总数
  const countSql = `SELECT COUNT(*) as total FROM print_jobs pj ${whereClause}`;
  const [{ total }] = await dbQuery(countSql, params);
  
  res.json({
    success: true,
    data: {
      jobs: jobs.map(job => ({
        id: job.id,
        order_no: job.order_no,
        table_number: job.table_number,
        printer_sn: job.printer_sn,
        content: job.content,
        copies: job.copies,
        status: job.status,
        error_message: job.error_message,
        xpyun_order_id: job.xpyun_order_id,
        retry_count: job.retry_count,
        created_at: job.created_at,
        printed_at: job.printed_at
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
 * 重试打印任务
 */
router.post('/print-jobs/:id/retry', requireAdmin, [
  param('id').isString().withMessage('打印任务ID不能为空')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // 获取打印任务
  const [job] = await dbQuery(
    'SELECT * FROM print_jobs WHERE id = ? AND restaurant_id = 1',
    [id]
  );
  
  if (!job) {
    return res.status(404).json({
      success: false,
      message: '打印任务不存在'
    });
  }
  
  if (job.status === 'success') {
    return res.status(400).json({
      success: false,
      message: '打印任务已成功，无需重试'
    });
  }
  
  if (job.retry_count >= 3) {
    return res.status(400).json({
      success: false,
      message: '打印任务重试次数已达上限'
    });
  }
  
  // 重试打印
  try {
    const content = JSON.parse(job.content);
    const result = await xpyunService.printReceipt(content, job.copies);
    
    if (result.success) {
      // 更新任务状态
      await dbQuery(`
        UPDATE print_jobs 
        SET status = 'success', xpyun_order_id = ?, printed_at = NOW(), retry_count = retry_count + 1
        WHERE id = ?
      `, [result.orderId, id]);
      
      return res.json({
        success: true,
        message: '打印重试成功',
        data: { xpyun_order_id: result.orderId }
      });
    } else {
      // 更新重试次数
      await dbQuery(
        'UPDATE print_jobs SET retry_count = retry_count + 1, error_message = ? WHERE id = ?',
        [result.message, id]
      );
      
      return res.status(500).json({
        success: false,
        message: '打印重试失败',
        error: result.message
      });
    }
    
  } catch (error) {
    // 更新重试次数
    await dbQuery(
      'UPDATE print_jobs SET retry_count = retry_count + 1, error_message = ? WHERE id = ?',
      [error.message, id]
    );
    
    return res.status(500).json({
      success: false,
      message: '打印重试失败',
      error: error.message
    });
  }
});

/**
 * 获取订单列表
 */
router.get('/orders', requireAdmin, [
  validatorQuery('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled']).withMessage('状态值无效'),
  validatorQuery('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  validatorQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  let whereClause = 'WHERE o.restaurant_id = 1';
  const params = [];
  
  if (status) {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }
  
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT 
      o.*,
      t.table_number,
      t.table_name
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const orders = await dbQuery(sql, [...params, parseInt(limit), offset]);
  
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
        table_number: order.table_number,
        table_name: order.table_name,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

module.exports = router;
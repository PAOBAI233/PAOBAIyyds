-- 范式转换餐饮系统数据库设计
-- 数据库名称: paobai_restaurant

-- 创建数据库
CREATE DATABASE IF NOT EXISTS paobai_restaurant DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE paobai_restaurant;

-- 1. 餐厅信息表
CREATE TABLE restaurants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '餐厅名称',
    logo VARCHAR(255) DEFAULT NULL COMMENT '餐厅Logo图片URL',
    description TEXT COMMENT '餐厅描述',
    address VARCHAR(255) NOT NULL COMMENT '餐厅地址',
    phone VARCHAR(20) NOT NULL COMMENT '餐厅电话',
    business_hours VARCHAR(100) COMMENT '营业时间',
    status TINYINT DEFAULT 1 COMMENT '状态: 1=正常营业, 0=暂停营业',
    xpyun_sn VARCHAR(50) DEFAULT '7428YAAABZB704B' COMMENT 'xpyun打印机SN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) COMMENT '餐厅信息表';

-- 2. 桌台表
CREATE TABLE tables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    table_number VARCHAR(20) NOT NULL COMMENT '桌台号',
    table_name VARCHAR(50) COMMENT '桌台名称',
    qr_code VARCHAR(255) NOT NULL COMMENT '二维码内容',
    capacity INT DEFAULT 4 COMMENT '可容纳人数',
    table_type ENUM('normal', 'vip', 'private') DEFAULT 'normal' COMMENT '桌台类型',
    status ENUM('available', 'occupied', 'reserved', 'cleaning') DEFAULT 'available' COMMENT '桌台状态',
    current_session_id VARCHAR(50) DEFAULT NULL COMMENT '当前用餐会话ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    UNIQUE KEY uk_restaurant_table (restaurant_id, table_number),
    INDEX idx_qr_code (qr_code),
    INDEX idx_status (status)
) COMMENT '桌台表';

-- 3. 菜品分类表
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    description TEXT COMMENT '分类描述',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    is_active TINYINT DEFAULT 1 COMMENT '是否启用: 1=启用, 0=禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant_sort (restaurant_id, sort_order),
    INDEX idx_active (is_active)
) COMMENT '菜品分类表';

-- 4. 菜品表
CREATE TABLE menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '菜品名称',
    description TEXT COMMENT '菜品描述',
    price DECIMAL(10,2) NOT NULL COMMENT '价格',
    original_price DECIMAL(10,2) COMMENT '原价',
    image_url VARCHAR(255) COMMENT '菜品图片URL',
    unit VARCHAR(20) DEFAULT '份' COMMENT '单位',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    is_available TINYINT DEFAULT 1 COMMENT '是否可售: 1=可售, 0=售罄',
    is_special TINYINT DEFAULT 0 COMMENT '是否特色菜: 1=是, 0=否',
    spicy_level TINYINT DEFAULT 0 COMMENT '辣度等级: 0=不辣, 1=微辣, 2=中辣, 3=特辣',
    preparation_time INT DEFAULT 0 COMMENT '预计制作时间(分钟)',
    daily_limit INT COMMENT '每日限量',
    sold_today INT DEFAULT 0 COMMENT '今日已售数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_restaurant_category (restaurant_id, category_id),
    INDEX idx_available (is_available),
    INDEX idx_sort (sort_order)
) COMMENT '菜品表';

-- 5. 用餐会话表
CREATE TABLE dining_sessions (
    id VARCHAR(50) PRIMARY KEY COMMENT '会话ID',
    restaurant_id INT NOT NULL,
    table_id INT NOT NULL,
    leader_openid VARCHAR(50) COMMENT '队长openid',
    leader_nickname VARCHAR(100) COMMENT '队长昵称',
    total_customers INT DEFAULT 1 COMMENT '总人数',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始用餐时间',
    end_time TIMESTAMP NULL COMMENT '结束用餐时间',
    status ENUM('active', 'paid', 'completed') DEFAULT 'active' COMMENT '会话状态',
    subtotal DECIMAL(10,2) DEFAULT 0.00 COMMENT '小计金额',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
    total_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '总金额',
    paid_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '已付金额',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (table_id) REFERENCES tables(id),
    INDEX idx_table_status (table_id, status),
    INDEX idx_leader (leader_openid),
    INDEX idx_created (created_at)
) COMMENT '用餐会话表';

-- 6. 用餐者表
CREATE TABLE diners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(50) NOT NULL,
    openid VARCHAR(50) NOT NULL COMMENT '用户唯一标识',
    nickname VARCHAR(100) COMMENT '用户昵称',
    avatar VARCHAR(255) COMMENT '头像URL',
    is_leader TINYINT DEFAULT 0 COMMENT '是否队长: 1=是, 0=否',
    join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    last_active_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES dining_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_session_openid (session_id, openid),
    INDEX idx_openid (openid)
) COMMENT '用餐者表';

-- 7. 订单表
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY COMMENT '订单ID',
    session_id VARCHAR(50) NOT NULL,
    restaurant_id INT NOT NULL,
    table_id INT NOT NULL,
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
    item_count INT NOT NULL COMMENT '菜品总数',
    status ENUM('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
    priority TINYINT DEFAULT 0 COMMENT '优先级: 0=普通, 1=加急',
    special_requests TEXT COMMENT '特殊要求',
    preparation_time INT DEFAULT 0 COMMENT '预计制作时间(分钟)',
    actual_time INT COMMENT '实际制作时间(分钟)',
    printer_order_id VARCHAR(50) COMMENT '打印订单ID',
    printed_at TIMESTAMP NULL COMMENT '打印时间',
    confirmed_at TIMESTAMP NULL COMMENT '确认时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES dining_sessions(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (table_id) REFERENCES tables(id),
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_session_status (session_id, status),
    INDEX idx_restaurant_status (restaurant_id, status),
    INDEX idx_table_status (table_id, status),
    INDEX idx_created (created_at)
) COMMENT '订单表';

-- 8. 订单项表
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(50) NOT NULL,
    menu_item_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL COMMENT '菜品名称(冗余字段)',
    price DECIMAL(10,2) NOT NULL COMMENT '单价(快照)',
    quantity INT NOT NULL COMMENT '数量',
    subtotal DECIMAL(10,2) NOT NULL COMMENT '小计',
    status ENUM('ordered', 'preparing', 'ready', 'served', 'cancelled') DEFAULT 'ordered' COMMENT '单项状态',
    special_instructions TEXT COMMENT '特殊要求',
    diner_openid VARCHAR(50) COMMENT '点餐用户',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    INDEX idx_order_status (order_id, status),
    INDEX idx_diner (diner_openid)
) COMMENT '订单项表';

-- 9. 支付记录表
CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY COMMENT '支付ID',
    session_id VARCHAR(50) NOT NULL,
    order_ids TEXT COMMENT '关联订单ID列表(JSON)',
    diner_openid VARCHAR(50) NOT NULL COMMENT '支付用户',
    payment_method ENUM('wechat', 'alipay', 'cash', 'split_aa') DEFAULT 'wechat' COMMENT '支付方式',
    amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    payment_type ENUM('full', 'partial', 'deposit') DEFAULT 'full' COMMENT '支付类型',
    transaction_id VARCHAR(100) COMMENT '第三方交易号',
    status ENUM('pending', 'processing', 'success', 'failed', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
    payment_time TIMESTAMP NULL COMMENT '支付完成时间',
    refund_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '退款金额',
    refund_time TIMESTAMP NULL COMMENT '退款时间',
    remark TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES dining_sessions(id),
    INDEX idx_session_diner (session_id, diner_openid),
    INDEX idx_transaction (transaction_id),
    INDEX idx_status (status),
    INDEX idx_payment_time (payment_time)
) COMMENT '支付记录表';

-- 10. AA制分账明细表
CREATE TABLE aa_split_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(50) NOT NULL,
    diner_openid VARCHAR(50) NOT NULL,
    order_items TEXT NOT NULL COMMENT '分摊的订单项ID列表(JSON)',
    original_amount DECIMAL(10,2) NOT NULL COMMENT '原始应付金额',
    split_amount DECIMAL(10,2) NOT NULL COMMENT '分摊金额',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
    final_amount DECIMAL(10,2) NOT NULL COMMENT '最终应付金额',
    paid_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '已付金额',
    status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES dining_sessions(id),
    INDEX idx_session_diner (session_id, diner_openid),
    INDEX idx_status (status)
) COMMENT 'AA制分账明细表';

-- 11. 系统配置表
CREATE TABLE system_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    description VARCHAR(255),
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_config_key (config_key),
    INDEX idx_active (is_active)
) COMMENT '系统配置表';

-- 12. 打印任务表
CREATE TABLE print_jobs (
    id VARCHAR(50) PRIMARY KEY COMMENT '打印任务ID',
    restaurant_id INT NOT NULL,
    order_id VARCHAR(50) COMMENT '关联订单ID',
    printer_sn VARCHAR(50) DEFAULT '7428YAAABZB704B' COMMENT '打印机SN',
    content TEXT NOT NULL COMMENT '打印内容',
    copies INT DEFAULT 1 COMMENT '打印份数',
    status ENUM('pending', 'printing', 'success', 'failed') DEFAULT 'pending',
    error_message TEXT COMMENT '错误信息',
    xpyun_order_id VARCHAR(50) COMMENT 'xpyun返回的订单ID',
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    printed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    INDEX idx_restaurant_status (restaurant_id, status),
    INDEX idx_order (order_id),
    INDEX idx_created (created_at)
) COMMENT '打印任务表';

-- 插入默认餐厅数据
INSERT INTO restaurants (id, name, description, address, phone, business_hours, status) 
VALUES (1, '范式转换演示餐厅', '智能点餐系统演示餐厅', '中国·广西·示范地址', '18677275508', '09:00-22:00', 1);

-- 插入默认菜品分类
INSERT INTO categories (restaurant_id, name, sort_order) VALUES 
(1, '热菜', 1),
(1, '凉菜', 2),
(1, '汤羹', 3),
(1, '主食', 4),
(1, '饮品', 5),
(1, '小吃', 6);

-- 插入示例菜品数据
INSERT INTO menu_items (restaurant_id, category_id, name, description, price, unit, sort_order, is_available) VALUES 
-- 热菜
(1, 1, '宫保鸡丁', '经典川菜，鸡肉配花生米', 38.00, '份', 1, 1),
(1, 1, '麻婆豆腐', '四川名菜，嫩滑豆腐配麻辣肉末', 28.00, '份', 2, 1),
(1, 1, '回锅肉', '四川传统名菜', 42.00, '份', 3, 1),
(1, 1, '糖醋排骨', '酸甜可口的经典菜品', 48.00, '份', 4, 1),

-- 凉菜
(1, 2, '拍黄瓜', '清爽解腻', 18.00, '份', 1, 1),
(1, 2, '口水鸡', '四川特色凉菜', 32.00, '份', 2, 1),
(1, 2, '凉拌木耳', '健康美味', 22.00, '份', 3, 1),

-- 汤羹
(1, 3, '紫菜蛋花汤', '清淡营养', 16.00, '份', 1, 1),
(1, 3, '酸辣汤', '开胃爽口', 20.00, '份', 2, 1),
(1, 3, '冬瓜排骨汤', '滋补养生', 35.00, '份', 3, 1),

-- 主食
(1, 4, '白米饭', '东北大米', 3.00, '碗', 1, 1),
(1, 4, '炒饭', '扬州炒饭', 18.00, '份', 2, 1),
(1, 4, '面条', '手工拉面', 15.00, '碗', 3, 1),

-- 饮品
(1, 5, '可乐', '冰镇可乐', 8.00, '瓶', 1, 1),
(1, 5, '雪碧', '冰镇雪碧', 8.00, '瓶', 2, 1),
(1, 5, '橙汁', '鲜榨橙汁', 12.00, '杯', 3, 1),

-- 小吃
(1, 6, '春卷', '传统小吃', 15.00, '份', 1, 1),
(1, 6, '薯条', '美式快餐', 12.00, '份', 2, 1),
(1, 6, '饺子', '手工水饺', 18.00, '份', 3, 1);

-- 插入默认桌台数据
INSERT INTO tables (restaurant_id, table_number, table_name, capacity, status) VALUES 
(1, '01', '一号桌', 4, 'available'),
(1, '02', '二号桌', 4, 'available'),
(1, '03', '三号桌', 2, 'available'),
(1, '04', '四号桌', 6, 'available'),
(1, '05', '五号桌', 8, 'available'),
(1, '06', '六号桌', 4, 'available'),
(1, '07', '七号桌', 2, 'available'),
(1, '08', '八号桌', 10, 'available'),
(1, 'VIP01', 'VIP包间1', 8, 'available'),
(1, 'VIP02', 'VIP包间2', 12, 'available');

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES 
('xpyun_user', 'paolongtaonb233@163.com', 'xpyun用户名'),
('xpyun_password', '2006524fsh..', 'xpyun密码'),
('xpyun_sn', '7428YAAABZB704B', 'xpyun打印机SN'),
('auto_print', '1', '自动打印订单'),
('qr_code_base', 'https://paobai.cn/order/', '二维码基础URL'),
('session_timeout', '7200', '会话超时时间(秒)'),
('aa_min_amount', '1.00', 'AA制最小支付金额');

-- 创建视图：订单详情视图
CREATE VIEW order_details AS
SELECT 
    o.id as order_id,
    o.order_no,
    o.session_id,
    o.table_id,
    t.table_number,
    o.total_amount,
    o.item_count,
    o.status as order_status,
    o.special_requests,
    o.created_at as order_time,
    d.total_customers,
    d.leader_nickname,
    GROUP_CONCAT(
        CONCAT(mi.name, ' x', oi.quantity, ' ', oi.special_instructions) 
        SEPARATOR '; '
    ) as items_detail
FROM orders o
JOIN dining_sessions d ON o.session_id = d.id
JOIN tables t ON o.table_id = t.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
GROUP BY o.id, o.order_no, o.session_id, o.table_id, t.table_number, 
         o.total_amount, o.item_count, o.status, o.special_requests, 
         o.created_at, d.total_customers, d.leader_nickname;

-- 创建视图：会话统计视图
CREATE VIEW session_statistics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_sessions,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_amount,
    SUM(total_customers) as total_customers
FROM dining_sessions
WHERE status IN ('paid', 'completed')
GROUP BY DATE(created_at);

-- 创建索引优化查询性能
CREATE INDEX idx_dining_sessions_date ON dining_sessions(DATE(created_at));
CREATE INDEX idx_orders_created_status ON orders(created_at, status);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_print_jobs_created ON print_jobs(created_at);


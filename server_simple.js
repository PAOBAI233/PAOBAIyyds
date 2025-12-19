const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 导入路由
const apiRoutes = require('./routes/api');
const customerRoutes = require('./routes/customer');
const kitchenRoutes = require('./routes/kitchen');
const adminRoutes = require('./routes/admin');

const app = express();

// 基础中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 路由配置
app.use('/api', apiRoutes);
app.use('/customer', customerRoutes);
app.use('/kitchen', kitchenRoutes);
app.use('/admin', adminRoutes);

// 主页重定向
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
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

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 智能餐饮系统启动成功！`);
  console.log(`📍 服务器地址: http://${HOST}:${PORT}`);
  console.log(`🌐 环境模式: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  console.log(`⚠️  注意：暂时禁用了 Socket.io 和图像处理功能`);
});

module.exports = app;


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



// 导入路由

const apiRoutes = require('./routes/api');

const customerRoutes = require('./routes/customer');

const kitchenRoutes = require('./routes/kitchen');

const adminRoutes = require('./routes/admin');



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



// 基础中间件

app.use(helmet({

  crossOriginResourcePolicy: { policy: "cross-origin" }

}));

app.use(compression());

app.use(morgan('combined', { stream: { write: message => console.log(message.trim()) } }));



// CORS配置

app.use(cors({

  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],

  methods: ['GET', 'POST', 'PUT', 'DELETE'],

  credentials: true

}));



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



// 视图路由 - 必须放在API路由之前
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

// API路由配置
app.use('/api', apiRoutes);

// 注意：视图路由已经处理了根路径，API路由使用不同的路径前缀
app.use('/customer/api', customerRoutes);
app.use('/kitchen/api', kitchenRoutes);
app.use('/admin/api', adminRoutes);



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



// Socket.IO连接处理

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



// 启动服务器

const PORT = process.env.PORT || 3000;

const HOST = process.env.HOST || '0.0.0.0';



server.listen(PORT, HOST, () => {

  console.log(`🚀 智能餐饮系统启动成功！`);

  console.log(`📍 服务器地址: http://${HOST}:${PORT}`);

  console.log(`🌐 环境模式: ${process.env.NODE_ENV || 'development'}`);

  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);

});



module.exports = { app, io };


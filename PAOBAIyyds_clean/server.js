
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



// 启动服务器的异步函数
async function startServer() {
  try {
    // 初始化数据库连接池
    console.log('🔄 正在初始化数据库连接...');
    const { initDatabase } = require('./database/init');
    await initDatabase();
    console.log('✅ 数据库连接初始化成功！');
    
    // 启动HTTP服务器
    server.listen(PORT, HOST, () => {
      console.log(`🚀 智能餐饮系统启动成功！`);
      console.log(`📍 服务器地址: http://${HOST}:${PORT}`);
      console.log(`🌐 环境模式: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    console.error('请检查数据库配置和网络连接');
    process.exit(1);
  }
}

// 启动服务器
startServer();



module.exports = { app, io };




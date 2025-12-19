# 范式转换智能餐饮系统

> 见所未见，驭所未有 - 基于xpyun云打印服务的SaaS餐饮解决方案

## 🍽️ 项目简介

范式转换智能餐饮系统是一个完整的现代化餐饮管理解决方案，集成扫码点餐、实时厨房管理、智能AA支付、云打印等功能，为餐厅提供全方位的数字化转型支持。

### ✨ 核心特性

- 📱 **扫码点餐**: 顾客扫码即可点餐，无需服务员引导
- 👥 **队长模式**: 自动选举队长，支持多人同时点餐
- 🧮 **智能AA制**: 智能分账，支持灵活的AA制支付
- 👨‍🍳 **后厨显示**: 实时订单推送，大屏显示系统
- 🖨️ **云打印**: 集成xpyun云打印服务，自动打印订单
- 📊 **数据统计**: 完整的营业数据分析和报表
- 🔄 **实时同步**: 基于Socket.IO的实时状态更新
- 🎨 **现代UI**: 响应式设计，适配各种设备

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   顾客H5端      │    │   后厨显示系统   │    │   管理后台      │
│                 │    │                 │    │                 │
│ • 扫码点餐      │◄──►│ • 订单监控      │◄──►│ • 菜品管理      │
│ • 队长模式      │    │ • 状态更新      │    │ • 桌台管理      │
│ • AA支付        │    │ • 实时推送      │    │ • 数据统计      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Node.js后端   │
                    │                 │
                    │ • RESTful API   │
                    │ • Socket.IO     │
                    │ • xpyun集成     │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MySQL数据库   │
                    │                 │
                    │ • 订单管理      │
                    │ • 用户管理      │
                    │ • 菜品管理      │
                    └─────────────────┘
```

## 🚀 快速开始

### 环境要求

- Node.js 16.0+
- MySQL 8.0+
- PM2 (生产环境)
- Nginx (可选，生产环境推荐)

### 安装部署

1. **克隆项目**
```bash
git clone https://github.com/your-repo/paobai-restaurant-system.git
cd paobai-restaurant-system
```

2. **安装依赖**
```bash
npm install
```

3. **配置数据库**
```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE paobai_restaurant;

# 导入数据结构
mysql -u root -p paobai_restaurant < database.sql
```

4. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

5. **启动开发服务器**
```bash
npm run dev
```

6. **访问应用**
- 顾客端: http://localhost:3000/
- 后厨端: http://localhost:3000/kitchen.html
- 管理端: http://localhost:3000/admin.html

### 生产部署

详细部署文档请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

```bash
# 生产环境启动
npm start

# 使用PM2管理进程
pm2 start ecosystem.config.js
```

## 📱 功能模块

### 1. 顾客点餐端

- **扫码开桌**: 扫描桌台二维码，自动创建用餐会话
- **菜单浏览**: 分类展示菜品，支持搜索和筛选
- **购物车**: 实时计算金额，支持批量操作
- **订单提交**: 支持特殊要求，实时推送后厨
- **支付结算**: 整单支付和AA制两种模式

### 2. 队长模式

- **自动选举**: 扫码用户自动成为队长
- **邀请加入**: 其他用户可扫码加入同一桌台
- **实时同步**: 所有用户看到相同的订单状态
- **权限管理**: 队长可以确认订单和发起支付

### 3. 智能AA支付

- **灵活分账**: 支持按菜品、按人数等多种分账方式
- **实时计算**: 自动计算每个人应付金额
- **多种支付**: 支持微信、支付宝、现金等支付方式
- **账单明细**: 清晰的分账明细和历史记录

### 4. 后厨显示系统

- **订单监控**: 实时显示新订单和状态变化
- **分类展示**: 按状态和分类组织订单显示
- **状态更新**: 一键更新订单和菜品状态
- **声音提醒**: 新订单自动语音提醒
- **统计信息**: 实时显示工作量和效率统计

### 5. 管理后台

- **餐厅管理**: 基本信息、营业时间等设置
- **桌台管理**: 桌台增删改查、状态监控
- **菜品管理**: 分类管理、菜品维护、价格设置
- **订单管理**: 订单查询、统计分析
- **打印管理**: 打印任务监控和重试
- **数据统计**: 营收分析、热销菜品等报表

### 6. xpyun云打印

- **自动打印**: 订单提交后自动打印小票
- **格式化**: 美观的小票格式，包含完整信息
- **多份打印**: 支持后厨和前台多份打印
- **状态监控**: 打印任务状态实时监控
- **重试机制**: 打印失败自动重试

## 🛠️ 技术栈

### 后端技术
- **Node.js**: 服务器运行环境
- **Express.js**: Web框架
- **Socket.IO**: 实时通信
- **MySQL**: 关系型数据库
- **Sequelize**: ORM数据库操作
- **JWT**: 身份认证
- **Winston**: 日志管理

### 前端技术
- **HTML5/CSS3**: 页面结构和样式
- **Tailwind CSS**: CSS框架
- **Vanilla JavaScript**: 原生JS开发
- **Remix Icon**: 图标库
- **Axios**: HTTP客户端

### 第三方服务
- **xpyun**: 云打印服务
- **微信支付**: 支付接口(预留)
- **支付宝**: 支付接口(预留)

## 📊 数据库设计

### 核心表结构

- **restaurants**: 餐厅信息表
- **tables**: 桌台信息表
- **categories**: 菜品分类表
- **menu_items**: 菜品信息表
- **dining_sessions**: 用餐会话表
- **diners**: 用餐者信息表
- **orders**: 订单表
- **order_items**: 订单项表
- **payments**: 支付记录表
- **aa_split_details**: AA制分账明细表
- **print_jobs**: 打印任务表

### ER图

```
[restaurants] 1──N [tables]
[restaurants] 1──N [categories]
[categories] 1──N [menu_items]

[tables] 1──N [dining_sessions]
[dining_sessions] 1──N [diners]
[dining_sessions] 1──N [orders]
[orders] 1──N [order_items]
[order_items] N──1 [menu_items]

[dining_sessions] 1──N [payments]
[payments] 1──N [aa_split_details]

[restaurants] 1──N [print_jobs]
[orders] 1──N [print_jobs]
```

## 🔧 API文档

### 基础接口

#### 餐厅信息
```
GET /api/restaurant/info
```

#### 菜品分类
```
GET /api/menu/categories
```

#### 菜品列表
```
GET /api/menu/items?category_id=1&page=1&limit=20
```

#### 桌台信息
```
GET /api/tables/qr/{qr_code}
```

### 顾客端接口

#### 创建会话
```
POST /customer/sessions
{
  "table_id": 1,
  "leader_info": {
    "openid": "user123",
    "nickname": "张三"
  }
}
```

#### 加入会话
```
POST /customer/sessions/{sessionId}/join
{
  "openid": "user456",
  "nickname": "李四"
}
```

#### 创建订单
```
POST /customer/orders
{
  "session_id": "SS1234567890",
  "items": [
    {
      "menu_item_id": 1,
      "quantity": 2,
      "special_instructions": "不要辣"
    }
  ],
  "diner_openid": "user123"
}
```

#### AA制计算
```
POST /customer/sessions/{sessionId}/calculate-aa
{
  "order_items": [
    {
      "order_item_id": 1,
      "diner_openid": "user123"
    }
  ]
}
```

### 后厨端接口

#### 获取订单列表
```
GET /kitchen/orders?status=pending&page=1&limit=20
```

#### 更新订单状态
```
PUT /kitchen/orders/{orderId}/status
{
  "status": "confirmed",
  "actual_time": 15
}
```

#### 统计信息
```
GET /kitchen/stats/today
GET /kitchen/stats/popular-items?limit=10
```

### 管理端接口

#### 桌台管理
```
GET /admin/tables
POST /admin/tables
PUT /admin/tables/{id}
DELETE /admin/tables/{id}
```

#### 菜品管理
```
GET /admin/menu-items
POST /admin/menu-items
PUT /admin/menu-items/{id}
DELETE /admin/menu-items/{id}
```

#### 统计数据
```
GET /admin/stats/overview
GET /admin/stats/categories
```

## 🎯 使用场景

### 适用餐厅类型

- 🍜 **中式餐厅**: 支持复杂的菜品分类和做法要求
- ☕ **咖啡西餐**: 适合小份量、多品种的点餐模式
- 🍢 **快餐小吃**: 高效的点餐和出餐流程
- 🍽️ **高档餐厅**: 支持VIP包间和个性化服务
- 🏪 **连锁餐饮**: 统一管理和标准化服务

### 典型应用场景

1. **小型餐厅**: 降低人力成本，提升点餐效率
2. **连锁品牌**: 统一数字化管理，数据分析决策
3. **美食广场**: 多品牌统一管理，集中收银
4. **外卖自提**: 线上线下融合，提升用户体验

## 🔒 安全特性

- **数据加密**: 敏感数据加密存储
- **访问控制**: 基于角色的权限管理
- **SQL注入防护**: 参数化查询防止注入
- **XSS防护**: 输入输出过滤和转义
- **CSRF防护**: 令牌验证防止跨站请求
- **HTTPS支持**: SSL/TLS加密传输

## 📈 性能优化

- **数据库优化**: 索引优化、查询优化
- **缓存策略**: Redis缓存热点数据
- **CDN加速**: 静态资源CDN分发
- **负载均衡**: Nginx反向代理和负载均衡
- **代码分割**: 前端资源按需加载
- **图片优化**: 压缩和WebP格式支持

## 🔄 版本更新

### v1.0.0 (当前版本)
- ✅ 基础点餐功能
- ✅ 队长模式
- ✅ AA制支付
- ✅ 后厨显示系统
- ✅ xpyun云打印集成
- ✅ 管理后台

### 后续版本计划
- 📋 微信小程序端
- 💳 更多支付方式
- 📊 高级数据分析
- 🎯 会员管理系统
- 🚀 多租户架构
- 🤖 AI智能推荐

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范

- 使用 ES6+ 语法
- 遵循 Airbnb JavaScript 规范
- 编写单元测试
- 添加必要的注释
- 更新相关文档

## 📞 技术支持

如有问题或建议，请通过以下方式联系：

- **项目地址**: https://paobai.cn
- **技术支持**: 18677275508
- **邮箱**: paolongtaonb233@163.com
- **问题反馈**: [GitHub Issues](https://github.com/your-repo/issues)

## 📄 开源协议

本项目基于 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🏆 致谢

感谢以下开源项目和服务：

- [Node.js](https://nodejs.org/) - JavaScript运行环境
- [Express.js](https://expressjs.com/) - Web应用框架
- [Socket.IO](https://socket.io/) - 实时通信框架
- [MySQL](https://www.mysql.com/) - 关系型数据库
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Remix Icon](https://remixicon.com/) - 图标库
- [xpyun](https://www.xpyun.net/) - 云打印服务

---

**范式转换工作室** © 2025 - 用新技术重塑中国餐饮数字化未来# PAOBAIyyds



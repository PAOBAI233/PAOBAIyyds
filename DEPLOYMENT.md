# 范式转换智能餐饮系统 - 部署配置文档

## 系统概述

范式转换智能餐饮系统是基于Node.js和MySQL的SaaS餐饮解决方案，集成xpyun云打印服务，支持扫码点餐、队长模式、智能AA支付、实时订单推送等功能。

## 部署要求

### 服务器环境
- **操作系统**: Linux (推荐Ubuntu 20.04+) 或 Windows Server 2016+
- **内存**: 最低2GB，推荐4GB+
- **存储**: 最低20GB，推荐50GB+
- **网络**: 稳定的互联网连接（用于xpyun云打印服务）

### 软件依赖
- **Node.js**: 16.0+ (推荐18.x LTS版本)
- **MySQL**: 8.0+ 或 MariaDB 10.5+
- **PM2**: 进程管理器（生产环境）
- **Nginx**: 反向代理（可选，生产环境推荐）

## 部署路径配置

系统严格部署到 `/www/wwwroot/paobai.cn` 路径下。

## 部署步骤

### 1. 服务器准备

```bash
# 创建部署目录
sudo mkdir -p /www/wwwroot/paobai.cn
sudo chown -R $USER:$USER /www/wwwroot/paobai.cn

# 进入部署目录
cd /www/wwwroot/paobai.cn
```

### 2. 安装Node.js

```bash
# 使用nvm安装Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 或者直接下载安装包
# wget https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz
# tar -xf node-v18.19.0-linux-x64.tar.xz
# sudo mv node-v18.19.0-linux-x64 /opt/node
# echo 'export PATH=/opt/node/bin:$PATH' >> ~/.bashrc
```

### 3. 安装MySQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server
# 或使用 MariaDB
sudo yum install mariadb-server

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

### 4. 配置数据库

```sql
-- 登录MySQL
mysql -u root -p

-- 创建数据库和用户
CREATE DATABASE paobai_restaurant DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'paobai'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON paobai_restaurant.* TO 'paobai'@'localhost';
FLUSH PRIVILEGES;

-- 导入数据库结构
USE paobai_restaurant;
SOURCE /www/wwwroot/paobai.cn/database.sql;
```

### 5. 部署应用代码

```bash
# 上传代码到部署目录（如果是新部署）
# 确保所有文件都在 /www/wwwroot/paobai.cn 目录下

# 安装依赖
cd /www/wwwroot/paobai.cn
npm install --production

# 创建必要的目录
mkdir -p logs uploads
chmod 755 logs uploads
```

### 6. 配置环境变量

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑环境配置
nano .env
```

环境配置示例：
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=paobai
DB_PASSWORD=your_password
DB_NAME=paobai_restaurant

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# xpyun云打印配置
XPYUN_USER=paolongtaonb233@163.com
XPYUN_PASSWORD=2006524fsh..
XPYUN_SN=7428YAAABZB704B

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 7. 安装PM2进程管理器

```bash
# 全局安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'paobai-restaurant',
    script: 'server.js',
    cwd: '/www/wwwroot/paobai.cn',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. 配置Nginx反向代理（推荐）

```bash
# 安装Nginx
sudo apt install nginx  # Ubuntu/Debian
# 或 sudo yum install nginx  # CentOS/RHEL

# 创建站点配置
sudo nano /etc/nginx/sites-available/paobai.cn
```

Nginx配置示例：
```nginx
server {
    listen 80;
    server_name paobai.cn www.paobai.cn;
    
    # HTTP重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name paobai.cn www.paobai.cn;
    
    # SSL证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # 静态文件
    location / {
        root /www/wwwroot/paobai.cn/public;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.IO代理
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 其他路由代理
    location /customer {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /kitchen {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /admin {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 文件上传大小限制
    client_max_body_size 10M;
    
    # 日志
    access_log /var/log/nginx/paobai.cn.access.log;
    error_log /var/log/nginx/paobai.cn.error.log;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/paobai.cn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. 防火墙配置

```bash
# UFW防火墙配置
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 或者使用iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

## 系统访问配置

部署完成后，系统将通过以下方式访问：

- **主页**: https://paobai.cn/
- **顾客点餐端**: https://paobai.cn/
- **后厨显示系统**: https://paobai.cn/kitchen.html
- **管理后台**: https://paobai.cn/admin.html
- **AA支付页面**: https://paobai.cn/aa-payment.html
- **API接口**: https://paobai.cn/api/

## 监控和维护

### 1. 应用监控

```bash
# 查看PM2进程状态
pm2 status
pm2 monit

# 查看日志
pm2 logs paobai-restaurant
tail -f /www/wwwroot/paobai.cn/logs/app.log

# 重启应用
pm2 restart paobai-restaurant

# 更新应用
cd /www/wwwroot/paobai.cn
git pull  # 如果使用Git
npm install --production
pm2 restart paobai-restaurant
```

### 2. 数据库备份

```bash
# 创建备份脚本
cat > backup.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/www/backups/paobai.cn"
mkdir -p \$BACKUP_DIR

# 数据库备份
mysqldump -u paobai -p'your_password' paobai_restaurant > \$BACKUP_DIR/db_\$DATE.sql
gzip \$BACKUP_DIR/db_\$DATE.sql

# 文件备份
tar -czf \$BACKUP_DIR/files_\$DATE.tar.gz /www/wwwroot/paobai.cn/uploads /www/wwwroot/paobai.cn/logs

# 删除7天前的备份
find \$BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# 设置定时备份（每天凌晨2点）
echo "0 2 * * * /www/wwwroot/paobai.cn/backup.sh" | crontab -
```

### 3. 系统监控

```bash
# 创建监控脚本
cat > monitor.sh << EOF
#!/bin/bash
# 检查应用是否运行
if ! pm2 describe paobai-restaurant > /dev/null 2>&1; then
    echo "应用未运行，正在启动..."
    cd /www/wwwroot/paobai.cn && pm2 start ecosystem.config.js
fi

# 检查数据库连接
if ! mysql -u paobai -p'your_password' -e "SELECT 1" paobai_restaurant > /dev/null 2>&1; then
    echo "数据库连接失败"
    # 发送告警
fi

# 检查磁盘空间
DISK_USAGE=\$(df /www/wwwroot/paobai.cn | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 80 ]; then
    echo "磁盘空间不足: \$DISK_USAGE%"
    # 发送告警
fi
EOF

chmod +x monitor.sh

# 设置定时监控（每5分钟）
echo "*/5 * * * * /www/wwwroot/paobai.cn/monitor.sh" | crontab -
```

## 故障排除

### 1. 应用无法启动

```bash
# 检查日志
pm2 logs paobai-restaurant --lines 50

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查Node.js版本
node --version
npm --version

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install --production
```

### 2. 数据库连接失败

```bash
# 测试数据库连接
mysql -u paobai -p paobai_restaurant

# 检查MySQL服务
sudo systemctl status mysql
sudo systemctl restart mysql

# 检查防火墙
sudo ufw status
```

### 3. xpyun打印服务异常

```bash
# 测试网络连接
curl -I https://open.xpyun.net

# 检查打印机状态
curl -X POST "https://open.xpyun.net/api/openapi/xpyun/queryOrderStatusSn" \
  -H "Content-Type: application/json" \
  -d '{"user":"paolongtaonb233@163.com","timestamp":"$(date +%s)","sign":"your_sign","sn":"7428YAAABZB704B","order_id":"test"}'
```

## 性能优化

### 1. Node.js优化

```bash
# 启用集群模式
pm2 start server.js -i max --name paobai-restaurant

# 设置内存限制
pm2 start server.js --max-memory-restart 1G

# 开启GC日志
node --trace-gc server.js
```

### 2. MySQL优化

```sql
-- MySQL配置优化
SET GLOBAL innodb_buffer_pool_size = 1G;
SET GLOBAL innodb_log_file_size = 256M;
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 128M;
```

### 3. Nginx优化

```nginx
# 在http块中添加
worker_processes auto;
worker_connections 1024;

# 启用gzip压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 缓存配置
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 安全配置

### 1. 应用安全

```bash
# 设置文件权限
find /www/wwwroot/paobai.cn -type f -exec chmod 644 {} \;
find /www/wwwroot/paobai.cn -type d -exec chmod 755 {} \;

# 保护敏感文件
chmod 600 /www/wwwroot/paobai.cn/.env
```

### 2. SSL证书

```bash
# 使用Let's Encrypt免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d paobai.cn -d www.paobai.cn

# 自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 版本更新

```bash
# 备份当前版本
cp -r /www/wwwroot/paobai.cn /www/backups/paobai.cn_backup_$(date +%Y%m%d)

# 更新代码
cd /www/wwwroot/paobai.cn
git pull origin main  # 或其他方式更新

# 更新依赖
npm install --production

# 数据库迁移（如有）
# mysql -u paobai -p paobai_restaurant < migration.sql

# 重启应用
pm2 restart paobai-restaurant

# 验证更新
curl -f https://paobai.cn/health || echo "健康检查失败"
```

## 技术支持

如果在部署过程中遇到问题，请联系：

- **技术支持**: 18677275508
- **邮箱**: paolongtaonb233@163.com
- **项目地址**: https://paobai.cn

---

*本文档最后更新时间: 2025年12月*
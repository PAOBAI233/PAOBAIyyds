
#!/bin/bash

echo "=== 智能餐饮系统数据库初始化 ==="



# 1. 创建数据库

echo "1. 创建数据库..."

mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS paobai_restaurant DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"



# 2. 创建用户

echo "2. 创建数据库用户..."

mysql -u root -p << MYSQL_SCRIPT

DROP USER IF EXISTS 'paobai'@'localhost';

CREATE USER 'paobai'@'localhost' IDENTIFIED WITH mysql_native_password BY 'paobai123';

GRANT ALL PRIVILEGES ON paobai_restaurant.* TO 'paobai'@'localhost';

FLUSH PRIVILEGES;

MYSQL_SCRIPT



# 3. 导入数据库

echo "3. 导入数据库结构..."

mysql -u paobai -p'paobai123' paobai_restaurant < database.sql



# 4. 验证

echo "4. 验证安装..."

mysql -u paobai -p'paobai123' paobai_restaurant -e "SHOW TABLES;"



# 5. 显示连接信息

echo ""

echo "=== 安装完成 ==="

echo "数据库名: paobai_restaurant"

echo "用户名: paobai"

echo "密码: paobai123"

echo ""

echo "请更新 .env 文件中的数据库配置："

echo "DB_HOST=localhost"

echo "DB_USER=paobai"

echo "DB_PASSWORD=paobai123"

echo "DB_NAME=paobai_restaurant"


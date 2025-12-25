#!/usr/bin/env node

// 404错误诊断脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 开始诊断404错误...\n');

// 1. 检查服务器配置
console.log('1️⃣ 检查服务器路由配置:');

const serverContent = fs.readFileSync('server.js', 'utf8');
const routeMatches = serverContent.match(/app\.use\(['"`]\/([^'"`]+)['"`]/g);

if (routeMatches) {
  console.log('   已配置的路由:');
  routeMatches.forEach(match => {
    const route = match.match(/\/([^'"`]+)/)[1];
    console.log(`   - /${route}`);
  });
} else {
  console.log('   ❌ 未找到路由配置');
}

// 2. 检查API端点
console.log('\n2️⃣ 可用的API端点:');

const routesDir = 'routes';
if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const routeName = path.basename(file, '.js');
    
    const endpoints = content.match(/router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g);
    
    if (endpoints) {
      console.log(`   \n   ${routeName}.js:`);
      endpoints.forEach(endpoint => {
        const match = endpoint.match(/router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/);
        const method = match[1].toUpperCase();
        const path = match[2];
        const fullPath = routeName === 'api' ? `/api${path}` : `/api/${routeName}${path}`;
        console.log(`     ${method} ${fullPath}`);
      });
    }
  });
}

// 3. 常见404原因检查
console.log('\n3️⃣ 常见404原因检查:');

// 检查数据库连接
console.log('   📊 数据库连接检查:');
try {
  const { query: dbQuery } = require('./database/init');
  console.log('   ✅ 数据库模块加载成功');
} catch (error) {
  console.log(`   ❌ 数据库模块加载失败: ${error.message}`);
}

// 检查端口配置
console.log('\n4️⃣ 服务器配置信息:');
const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const portMatch = envContent.match(/PORT=(\d+)/);
const hostMatch = envContent.match(/HOST=(.+)/);

console.log(`   端口: ${portMatch ? portMatch[1] : '默认3000'}`);
console.log(`   主机: ${hostMatch ? hostMatch[1] : '默认localhost'}`);

// 5. 提供测试URL
console.log('\n5️⃣ 建议测试的API端点:');
console.log('   GET  http://localhost:3000/api/restaurant/info');
console.log('   GET  http://localhost:3000/api/menu/categories');
console.log('   GET  http://localhost:3000/api/menu/items');
console.log('   GET  http://localhost:3000/api/health');
console.log('   GET  http://localhost:3000/ (主页)');

console.log('\n🔧 如果仍然遇到404，请检查:');
console.log('   1. 服务器是否正在运行 (npm start 或 node server.js)');
console.log('   2. 数据库是否正常连接');
console.log('   3. 请求的URL是否完全正确');
console.log('   4. CORS配置是否允许您的来源');

console.log('\n✨ 诊断完成!');
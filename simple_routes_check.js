const fs = require('fs');
const path = require('path');

console.log('🔍 API端点检查');

// 检查routes目录
const routesDir = 'routes';
if (!fs.existsSync(routesDir)) {
  console.log('❌ routes目录不存在');
  process.exit(1);
}

const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

console.log('\n📋 可用的API端点:\n');

routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const routeName = path.basename(file, '.js');
  
  console.log(`${routeName}.js:`);
  
  // 简单的正则匹配
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const match = line.match(/router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (match) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const fullPath = routeName === 'api' ? `/api${path}` : `/api/${routeName}${path}`;
      console.log(`  ${method} ${fullPath}`);
    }
  });
  console.log('');
});

console.log('\n🌐 测试URL:');
console.log('GET  http://localhost:3000/api/health');
console.log('GET  http://localhost:3000/api/restaurant/info');  
console.log('GET  http://localhost:3000/api/menu/categories');
console.log('GET  http://localhost:3000/');
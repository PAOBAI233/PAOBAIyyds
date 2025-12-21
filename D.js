/**
 * 启动服务器并测试路由
 */

const { spawn } = require('child_process');
const http = require('http');

const config = {
  host: '127.0.0.1',
  port: 3000
};

// 检查服务器是否可用
function checkServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: config.host,
      port: config.port,
      path: '/api/health',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// 测试API端点
async function testApi() {
  console.log('🔍 测试API端点...\n');
  
  const tests = [
    { path: '/api/health', desc: '基础API健康检查' },
    { path: '/admin/api/stats/overview', desc: 'Admin统计API' },
    { path: '/kitchen/api/orders', desc: 'Kitchen订单API' }
  ];
  
  for (const test of tests) {
    try {
      const response = await fetch(`http://${config.host}:${config.port}${test.path}`);
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      console.log(`📍 ${test.desc}:`);
      console.log(`   状态码: ${response.status}`);
      console.log(`   内容类型: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        console.log('   ✅ 返回JSON (正确)');
      } else if (text.trim().startsWith('<')) {
        console.log('   ❌ 返回HTML (问题!)');
      } else {
        console.log('   ⚠️ 其他格式');
      }
      console.log('');
      
    } catch (error) {
      console.log(`📍 ${test.desc}: ❌ 失败 - ${error.message}\n`);
    }
  }
}

// 启动服务器
function startServer() {
  console.log('🚀 启动服务器...\n');
  
  const serverProcess = spawn('node', ['server.js'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: __dirname
  });
  
  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
  });
  
  return serverProcess;
}

// 主函数
async function main() {
  console.log('🔧 检查服务器状态...\n');
  
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    console.log('✅ 服务器已在运行，直接测试...\n');
    await testApi();
  } else {
    console.log('❌ 服务器未运行，正在启动...\n');
    
    const serverProcess = startServer();
    
    // 等待服务器启动
    console.log('⏳ 等待服务器启动...');
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isUp = await checkServer();
      if (isUp) {
        console.log('✅ 服务器启动成功！\n');
        await testApi();
        break;
      }
      process.stdout.write('.');
    }
    
    if (!await checkServer()) {
      console.log('\n❌ 服务器启动超时');
      serverProcess.kill();
      process.exit(1);
    }
  }
}

main().catch(console.error);
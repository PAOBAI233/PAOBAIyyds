#!/usr/bin/env node

// 测试修复后的API响应
const http = require('http');

function testApiResponse(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n测试路径: ${path}`);
        console.log(`状态码: ${res.statusCode}`);
        console.log(`Content-Type: ${res.headers['content-type']}`);
        console.log(`响应长度: ${data.length} bytes`);
        console.log(`响应前100字符: ${data.substring(0, 100)}`);
        
        // 尝试解析JSON
        if (res.statusCode === 200 || path.startsWith('/api')) {
          try {
            const jsonData = JSON.parse(data);
            console.log('✅ JSON解析成功');
            console.log('响应结构:', JSON.stringify(jsonData, null, 2).substring(0, 200));
          } catch (e) {
            console.log('❌ JSON解析失败:', e.message);
          }
        }
        
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (err) => {
      console.error('请求错误:', err.message);
      reject(err);
    });

    req.end();
  });
}

// 测试各种API路径
async function runTests() {
  console.log('🧪 开始测试API响应格式修复...\n');
  
  try {
    await testApiResponse('/api/restaurant/info');  // 存在的API
    await testApiResponse('/api/nonexistent');      // 不存在的API
    await testApiResponse('/nonexistent-page');    // 不存在的页面
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

runTests();
const { NotFoundError } = require('../utils/errors');
const path = require('path');

/**
 * 404 错误处理中间件
 * 区分有效路径前缀和无效路径
 */
function notFoundHandler(req, res, next) {
  // 系统支持的有效路径前缀
  const validPrefixes = [
    '/api',         // 基础API
    '/admin',       // 管理端API
    '/customer',    // 顾客端API
    '/public',      // 静态资源
    '/',            // 根路径
    '/order'        // 订单相关
  ];

  // 检查请求路径是否匹配有效前缀
  const isInvalidPath = !validPrefixes.some(prefix => 
    req.path.startsWith(prefix) || 
    (prefix === '/' && req.path === '/')
  );

  let errorMessage;
  if (isInvalidPath) {
    errorMessage = `无效的请求路径: ${req.originalUrl}`;
  } else {
    errorMessage = `路径 ${req.originalUrl} 未找到`;
  }

  next(new NotFoundError(errorMessage));
}

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('错误详情:', err);

  // 处理404错误
  if (err instanceof NotFoundError) {
    // API请求返回JSON
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/admin') || 
        req.path.startsWith('/customer')) {
      return res.status(404).json({
        success: false,
        message: err.message,
        code: 'NOT_FOUND',
        path: req.originalUrl
      });
    }

    // 无效路径返回简洁HTML
    if (err.message.includes('无效的请求路径')) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>404 未找到</title></head>
          <body style="text-align:center;padding:50px;">
            <h1>404 页面不存在</h1>
            <p>您请求的路径 "${req.originalUrl}" 无效</p>
          </body>
        </html>
      `);
    }

    // 有效前缀下的页面请求返回自定义404页面
    return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
  }

  // 其他错误处理
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // 开发环境显示堆栈信息
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
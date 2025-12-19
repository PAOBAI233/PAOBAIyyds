/**
 * 统一错误处理中间件
 */

const logger = require('../utils/logger');

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * 认证错误类
 */
class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授权错误类
 */
class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 资源未找到错误类
 */
class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 冲突错误类
 */
class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 业务逻辑错误类
 */
class BusinessError extends AppError {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(message, 400, code);
  }
}

/**
 * 统一错误处理中间件
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error('错误处理:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message, err.errors);
  }

  // Mongoose重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new ConflictError(`${field} '${value}' 已存在`);
  }

  // Mongoose类型转换错误
  if (err.name === 'CastError') {
    error = new ValidationError('无效的ID格式');
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('无效的令牌');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('令牌已过期');
  }

  // 数据库连接错误
  if (err.code === 'ECONNREFUSED') {
    error = new AppError('数据库连接失败', 503, 'DATABASE_ERROR');
  }

  // 请求体过大错误
  if (err.type === 'entity.too.large') {
    error = new ValidationError('请求体过大');
  }

  // 请求格式错误
  if (err.type === 'entity.parse.failed') {
    error = new ValidationError('请求格式错误');
  }

  // 构建响应对象
  const response = {
    success: false,
    message: error.message || '服务器内部错误',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // 开发环境下包含堆栈信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // 验证错误包含详细信息
  if (error instanceof ValidationError && error.details) {
    response.details = error.details;
  }

  // 数据库错误特殊处理
  if (error.code === 'DATABASE_ERROR') {
    response.message = '数据库服务暂时不可用，请稍后重试';
  }

  // 发送响应
  res.status(error.statusCode || 500).json(response);
}

/**
 * 404处理中间件
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`路径 ${req.originalUrl} 未找到`);
  next(error);
}

/**
 * 异步错误包装器
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 验证错误处理
 */
function handleValidationErrors(req, res, next) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    });
    
    throw new ValidationError('请求参数验证失败', errorDetails);
  }
  
  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleValidationErrors,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError
};


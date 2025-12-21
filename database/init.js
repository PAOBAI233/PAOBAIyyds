/**
 * 数据库初始化模块
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// 数据库连接池配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  timezone: process.env.DB_TIMEZONE || '+08:00'
};

let pool = null;

/**
 * 初始化数据库连接池
 */
async function initPool() {
  try {
    // 首先连接到MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
      ...dbConfig,
      database: undefined
    });

    // 创建数据库
    const dbName = process.env.DB_NAME || 'paobai_restaurant';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();

    // 创建连接池
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0
    });

    logger.info(`数据库连接池初始化成功: ${dbName}`);
    return pool;

  } catch (error) {
    logger.error('数据库连接池初始化失败:', error);
    throw error;
  }
}

/**
 * 获取数据库连接池
 */
function getPool() {
  if (!pool) {
    throw new Error('数据库连接池未初始化');
  }
  return pool;
}

/**
 * 执行SQL文件
 */
async function executeSqlFile(sqlFilePath) {
  try {
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const connection = await pool.getConnection();
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await connection.query(statement);
        } catch (error) {
          // 忽略重复索引和表已存在的错误
          if (error.code === 'ER_DUP_KEYNAME' || // 重复索引
              error.code === 'ER_TABLE_EXISTS_ERROR' || // 表已存在
              error.code === 'ER_DUP_ENTRY') { // 重复条目
            logger.warn(`SQL语句 ${i + 1}/${statements.length} 已存在，跳过: ${error.message}`);
          } else {
            logger.error(`执行SQL语句 ${i + 1}/${statements.length} 失败`, {
              sql: statement,
              error: error.message
            });
            throw error;
          }
        }
      }
    }
    
    connection.release();
    logger.info(`SQL文件执行成功: ${sqlFilePath}`);

  } catch (error) {
    logger.error(`SQL文件执行失败: ${sqlFilePath}`, error);
    throw error;
  }
}

/**
 * 初始化数据库表结构
 */
async function initDatabase() {
  try {
    if (!pool) {
      await initPool();
    }

    // 执行SQL建表文件
    const sqlFile = path.join(__dirname, '../database.sql');
    
    try {
      await fs.access(sqlFile);
      await executeSqlFile(sqlFile);
      logger.info('数据库表结构初始化完成');
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn('未找到database.sql文件，跳过表结构初始化');
      } else {
        throw error;
      }
    }

    // 验证必要表是否存在
    const [tables] = await pool.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    const requiredTables = [
      'restaurants', 'tables', 'categories', 'menu_items', 
      'dining_sessions', 'diners', 'orders', 'order_items',
      'payments', 'aa_split_details', 'system_configs', 'print_jobs'
    ];

    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    if (missingTables.length > 0) {
      logger.warn('缺少数据库表:', missingTables);
    } else {
      logger.info('所有必要表都存在');
    }

    return true;

  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 执行数据库查询
 */
async function query(sql, params = []) {
  try {
    if (!pool) {
      await initPool();
    }
    
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
    
  } catch (error) {
    logger.error('数据库查询失败:', { sql, params, error: error.message });
    throw error;
  }
}

/**
 * 执行数据库事务
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    if (!pool) {
      await initPool();
    }
    
    const [rows] = await pool.execute('SELECT 1 as test');
    return rows[0].test === 1;
    
  } catch (error) {
    logger.error('数据库连接测试失败:', error);
    return false;
  }
}

/**
 * 关闭数据库连接池
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('数据库连接池已关闭');
  }
}

module.exports = {
  initDatabase,
  initPool,
  getPool,
  query,
  transaction,
  testConnection,
  closePool,
  dbConfig
};
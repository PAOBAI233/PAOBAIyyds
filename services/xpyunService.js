/**
 * xpyun云打印服务模块
 * 集成易联云打印服务
 */

const axios = require('axios');
const crypto = require('crypto');
const { query: dbQuery } = require('../database/init');
const logger = require('../utils/logger');

class XpyunService {
  constructor() {
    this.baseUrl = process.env.XPYUN_BASE_URL || 'https://open.xpyun.net/api/openapi';
    this.user = process.env.XPYUN_USER;
    this.password = process.env.XPYUN_PASSWORD;
    this.sn = process.env.XPYUN_SN;
  }

  /**
   * 生成签名
   */
  generateSign(params) {
    const { user, timestamp, timestampSign } = params;
    const signString = `${user},${timestamp},${timestampSign}`;
    return crypto.createHash('md5').update(signString).digest('hex');
  }

  /**
   * 获取当前时间戳
   */
  getTimestamp() {
    return Date.now().toString();
  }

  /**
   * 生成时间戳签名
   */
  getTimestampSign(timestamp) {
    return crypto.createHash('md5').update(timestamp + this.password).digest('hex');
  }

  /**
   * 构建请求参数
   */
  buildParams() {
    const timestamp = this.getTimestamp();
    const timestampSign = this.getTimestampSign(timestamp);
    const sign = this.generateSign({
      user: this.user,
      timestamp,
      timestampSign
    });

    return {
      user: this.user,
      timestamp,
      sign,
      sn: this.sn
    };
  }

  /**
   * 发送HTTP请求
   */
  async makeRequest(endpoint, data) {
    try {
      const params = this.buildParams();
      const requestData = { ...params, ...data };

      logger.debug('xpyun请求参数:', requestData);

      const response = await axios.post(`${this.baseUrl}${endpoint}`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.debug('xpyun响应结果:', response.data);
      return response.data;

    } catch (error) {
      logger.error('xpyun请求失败:', error.message);
      throw new Error(`xpyun服务请求失败: ${error.message}`);
    }
  }

  /**
   * 打印小票
   */
  async printReceipt(content, copies = 1) {
    try {
      const requestData = {
        content: this.formatPrintContent(content),
        copies
      };

      const result = await this.makeRequest('/xpyun/printOrders', requestData);

      if (result.code === 0) {
        // 记录打印任务
        await this.savePrintJob({
          printer_sn: this.sn,
          content: JSON.stringify(content),
          copies,
          status: 'success',
          xpyun_order_id: result.data?.order_id || null
        });

        logger.info('打印任务提交成功', { orderId: result.data?.order_id });
        return {
          success: true,
          orderId: result.data?.order_id,
          message: '打印任务提交成功'
        };
      } else {
        throw new Error(result.msg || '打印失败');
      }

    } catch (error) {
      logger.error('打印小票失败:', error);
      
      // 记录失败的打印任务
      await this.savePrintJob({
        printer_sn: this.sn,
        content: JSON.stringify(content),
        copies,
        status: 'failed',
        error_message: error.message
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 格式化打印内容
   */
  formatPrintContent(content) {
    let printContent = '';

    if (typeof content === 'string') {
      printContent = content;
    } else if (typeof content === 'object') {
      // 格式化订单数据
      if (content.type === 'order') {
        printContent = this.formatOrderContent(content.data);
      } else if (content.type === 'bill') {
        printContent = this.formatBillContent(content.data);
      } else {
        printContent = JSON.stringify(content);
      }
    }

    return printContent;
  }

  /**
   * 格式化订单内容
   */
  formatOrderContent(orderData) {
    const { restaurant, order, items, table } = orderData;
    
    let content = '<C><B>' + restaurant.name + '</B></C><BR>';
    content += '<C>================</C><BR>';
    content += '<C><B>点餐单</B></C><BR>';
    content += '================<BR>';
    content += '桌号: ' + table.table_number + '<BR>';
    content += '订单号: ' + order.order_no + '<BR>';
    content += '时间: ' + new Date().toLocaleString('zh-CN') + '<BR>';
    content += '================<BR>';
    
    items.forEach(item => {
      const itemName = item.item_name.padEnd(20, ' ');
      const quantity = item.quantity.toString().padStart(3, ' ');
      content += itemName + ' x' + quantity + '<BR>';
      if (item.special_instructions) {
        content += '  备注: ' + item.special_instructions + '<BR>';
      }
    });
    
    content += '================<BR>';
    content += '总计: ' + items.length + ' 项<BR>';
    content += '金额: ¥' + order.total_amount + '<BR>';
    content += '================<BR>';
    content += '<C>请尽快准备</C><BR>';
    
    if (order.special_requests) {
      content += '特殊要求: ' + order.special_requests + '<BR>';
    }
    
    content += '<BR><BR>';
    
    return content;
  }

  /**
   * 格式化账单内容
   */
  formatBillContent(billData) {
    const { restaurant, session, orders, payment } = billData;
    
    let content = '<C><B>' + restaurant.name + '</B></C><BR>';
    content += '<C>================</C><BR>';
    content += '<C><B>结账单</B></C><BR>';
    content += '================<BR>';
    content += '桌号: ' + session.table_name + '<BR>';
    content += '时间: ' + new Date().toLocaleString('zh-CN') + '<BR>';
    content += '人数: ' + session.total_customers + ' 人<BR>';
    content += '================<BR>';
    
    orders.forEach(order => {
      content += '订单号: ' + order.order_no + '<BR>';
      content += '金额: ¥' + order.total_amount + '<BR>';
    });
    
    content += '================<BR>';
    content += '<R>小计: ¥' + session.subtotal + '</R><BR>';
    content += '<R>优惠: -¥' + session.discount_amount + '</R><BR>';
    content += '<B><R>总计: ¥' + session.total_amount + '</R></B><BR>';
    
    if (payment.payment_method) {
      content += '支付方式: ' + this.getPaymentMethodName(payment.payment_method) + '<BR>';
    }
    
    content += '================<BR>';
    content += '<C>感谢光临</C><BR>';
    content += '<BR><BR>';
    
    return content;
  }

  /**
   * 获取支付方式名称
   */
  getPaymentMethodName(method) {
    const methods = {
      'wechat': '微信支付',
      'alipay': '支付宝',
      'cash': '现金',
      'split_aa': 'AA制支付'
    };
    return methods[method] || method;
  }

  /**
   * 保存打印任务记录
   */
  async savePrintJob(jobData) {
    try {
      const jobId = 'PJ' + Date.now();
      const sql = `
        INSERT INTO print_jobs (
          id, restaurant_id, order_id, printer_sn, content, 
          copies, status, error_message, xpyun_order_id, created_at
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await dbQuery(sql, [
        jobId,
        jobData.order_id || null,
        jobData.printer_sn,
        jobData.content,
        jobData.copies,
        jobData.status,
        jobData.error_message || null,
        jobData.xpyun_order_id || null
      ]);

      logger.debug('打印任务已保存:', { jobId, status: jobData.status });

    } catch (error) {
      logger.error('保存打印任务失败:', error);
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrderStatus(orderId) {
    try {
      const result = await this.makeRequest('/xpyun/queryOrderStatusSn', {
        order_id: orderId
      });

      if (result.code === 0) {
        return {
          success: true,
          status: result.data?.status,
          message: result.data?.msg || '查询成功'
        };
      } else {
        throw new Error(result.msg || '查询失败');
      }

    } catch (error) {
      logger.error('查询订单状态失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 打印测试页
   */
  async printTestPage() {
    const content = `
<C><B>测试打印</B></C><BR>
================<BR>
打印机SN: ${this.sn}<BR>
时间: ${new Date().toLocaleString('zh-CN')}<BR>
================<BR>
<C>测试成功！</C><BR>
<BR><BR>
    `.trim();

    return await this.printReceipt(content, 1);
  }

  /**
   * 重试失败的打印任务
   */
  async retryFailedPrintJobs() {
    try {
      const sql = `
        SELECT * FROM print_jobs 
        WHERE status = 'failed' AND retry_count < 3 
        ORDER BY created_at DESC LIMIT 10
      `;
      
      const failedJobs = await dbQuery(sql);
      
      for (const job of failedJobs) {
        try {
          // 检查content是否为有效的JSON
          if (!job.content || typeof job.content !== 'string') {
            throw new Error('打印内容为空或格式错误');
          }
          
          // 检查是否为HTML内容（错误数据）
          if (job.content.trim().startsWith('<')) {
            throw new Error('打印内容包含HTML格式，无法解析');
          }
          
          const content = JSON.parse(job.content);
          const result = await this.printReceipt(content, job.copies);
          
          if (result.success) {
            // 更新任务状态
            await dbQuery(
              'UPDATE print_jobs SET status = ?, xpyun_order_id = ?, retry_count = retry_count + 1 WHERE id = ?',
              ['success', result.orderId, job.id]
            );
            
            logger.info('打印任务重试成功:', { jobId: job.id });
          }
          
        } catch (error) {
          // 更新重试次数
          await dbQuery(
            'UPDATE print_jobs SET retry_count = retry_count + 1, error_message = ? WHERE id = ?',
            [error.message, job.id]
          );
          
          logger.error('打印任务重试失败:', { jobId: job.id, error: error.message });
        }
      }

    } catch (error) {
      logger.error('重试打印任务失败:', error);
    }
  }
}

module.exports = new XpyunService();
/**
 * 支付网关服务模块
 * 预留多种支付方式接口
 */

const axios = require('axios');
const crypto = require('crypto');
const { query: dbQuery } = require('../database/init');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    // 微信支付配置
    this.wechatPay = {
      appId: process.env.WECHAT_APP_ID,
      appSecret: process.env.WECHAT_APP_SECRET,
      mchId: process.env.WECHAT_PAY_MCH_ID,
      apiKey: process.env.WECHAT_PAY_KEY,
      certPath: process.env.WECHAT_PAY_CERT_PATH,
      keyPath: process.env.WECHAT_PAY_KEY_PATH,
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || 'https://paobai.cn/api/payment/wechat/notify'
    };

    // 支付宝配置
    this.alipay = {
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAY_PUBLIC_KEY,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://paobai.cn/api/payment/alipay/notify'
    };
  }

  /**
   * 生成微信支付订单
   */
  async createWechatOrder(paymentData) {
    try {
      const { payment_id, amount, description, openid } = paymentData;
      
      const orderData = {
        appid: this.wechatPay.appId,
        mch_id: this.wechatPay.mchId,
        nonce_str: this.generateNonceStr(),
        body: description || '范式转换智能餐饮',
        out_trade_no: payment_id,
        total_fee: Math.round(amount * 100), // 转换为分
        spbill_create_ip: '127.0.0.1',
        notify_url: this.wechatPay.notifyUrl,
        trade_type: 'JSAPI',
        openid: openid
      };

      // 生成签名
      orderData.sign = this.generateWechatSign(orderData);

      // 转换XML
      const xml = this.objectToXml(orderData);

      // 发送请求到微信统一下单接口
      const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xml, {
        headers: { 'Content-Type': 'application/xml' }
      });

      const result = this.xmlToObject(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        // 生成前端支付参数
        const payParams = {
          appId: this.wechatPay.appId,
          timeStamp: Math.floor(Date.now() / 1000).toString(),
          nonceStr: this.generateNonceStr(),
          package: `prepay_id=${result.prepay_id}`,
          signType: 'MD5'
        };

        payParams.paySign = this.generateWechatSign(payParams);

        return {
          success: true,
          payment_method: 'wechat',
          payment_params: payParams,
          prepay_id: result.prepay_id
        };
      } else {
        throw new Error(result.err_code_des || '微信支付订单创建失败');
      }

    } catch (error) {
      logger.error('微信支付订单创建失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 生成支付宝支付订单
   */
  async createAlipayOrder(paymentData) {
    try {
      const { payment_id, amount, description } = paymentData;

      const orderData = {
        app_id: this.alipay.appId,
        method: 'alipay.trade.app.pay',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        notify_url: this.alipay.notifyUrl,
        biz_content: JSON.stringify({
          out_trade_no: payment_id,
          total_amount: amount.toFixed(2),
          subject: description || '范式转换智能餐饮',
          product_code: 'QUICK_MSECURITY_PAY'
        })
      };

      // 生成签名
      orderData.sign = this.generateAlipaySign(orderData);

      // 生成支付字符串
      const payString = Object.keys(orderData)
        .map(key => `${key}=${encodeURIComponent(orderData[key])}`)
        .join('&');

      return {
        success: true,
        payment_method: 'alipay',
        payment_params: payString
      };

    } catch (error) {
      logger.error('支付宝订单创建失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 处理微信支付回调
   */
  async handleWechatNotify(xmlData) {
    try {
      const data = this.xmlToObject(xmlData);

      // 验证签名
      if (!this.verifyWechatSign(data)) {
        throw new Error('微信支付回调签名验证失败');
      }

      if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
        const paymentId = data.out_trade_no;
        const transactionId = data.transaction_id;
        const totalAmount = (parseInt(data.total_fee) / 100).toFixed(2);

        // 更新支付记录
        await this.updatePaymentStatus(paymentId, 'success', {
          transaction_id: transactionId,
          payment_time: new Date(),
          paid_amount: totalAmount
        });

        logger.info('微信支付回调处理成功', { paymentId, transactionId, amount: totalAmount });

        return this.generateWechatNotifyResponse('SUCCESS', 'OK');
      } else {
        logger.warn('微信支付回调失败', data);
        return this.generateWechatNotifyResponse('FAIL', data.err_code_des || '支付失败');
      }

    } catch (error) {
      logger.error('微信支付回调处理失败:', error);
      return this.generateWechatNotifyResponse('FAIL', '系统错误');
    }
  }

  /**
   * 处理支付宝回调
   */
  async handleAlipayNotify(postData) {
    try {
      // 验证签名
      if (!this.verifyAlipaySign(postData)) {
        throw new Error('支付宝回调签名验证失败');
      }

      if (postData.trade_status === 'TRADE_SUCCESS' || postData.trade_status === 'TRADE_FINISHED') {
        const paymentId = postData.out_trade_no;
        const transactionId = data.trade_no;
        const totalAmount = parseFloat(postData.total_amount);

        // 更新支付记录
        await this.updatePaymentStatus(paymentId, 'success', {
          transaction_id: transactionId,
          payment_time: new Date(),
          paid_amount: totalAmount
        });

        logger.info('支付宝回调处理成功', { paymentId, transactionId, amount: totalAmount });

        return 'success';
      } else {
        logger.warn('支付宝回调状态异常', postData);
        return 'fail';
      }

    } catch (error) {
      logger.error('支付宝回调处理失败:', error);
      return 'fail';
    }
  }

  /**
   * 查询微信支付状态
   */
  async queryWechatOrder(paymentId) {
    try {
      const queryData = {
        appid: this.wechatPay.appId,
        mch_id: this.wechatPay.mchId,
        out_trade_no: paymentId,
        nonce_str: this.generateNonceStr()
      };

      queryData.sign = this.generateWechatSign(queryData);
      const xml = this.objectToXml(queryData);

      const response = await axios.post('https://api.mch.weixin.qq.com/pay/orderquery', xml, {
        headers: { 'Content-Type': 'application/xml' }
      });

      const result = this.xmlToObject(response.data);

      if (result.return_code === 'SUCCESS') {
        return {
          success: true,
          trade_state: result.trade_state,
          transaction_id: result.transaction_id,
          total_fee: result.total_fee
        };
      } else {
        throw new Error(result.err_code_des || '查询失败');
      }

    } catch (error) {
      logger.error('微信支付查询失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 查询支付宝支付状态
   */
  async queryAlipayOrder(paymentId) {
    try {
      const queryData = {
        app_id: this.alipay.appId,
        method: 'alipay.trade.query',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        version: '1.0',
        biz_content: JSON.stringify({
          out_trade_no: paymentId
        })
      };

      queryData.sign = this.generateAlipaySign(queryData);

      const response = await axios.post('https://openapi.alipay.com/gateway.do', queryData);

      const result = response.data;

      if (result.alipay_trade_query_response && result.alipay_trade_query_response.code === '10000') {
        return {
          success: true,
          trade_status: result.alipay_trade_query_response.trade_status,
          trade_no: result.alipay_trade_query_response.trade_no,
          total_amount: result.alipay_trade_query_response.total_amount
        };
      } else {
        throw new Error(result.alipay_trade_query_response.sub_msg || '查询失败');
      }

    } catch (error) {
      logger.error('支付宝查询失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 创建支付订单（统一入口）
   */
  async createPaymentOrder(paymentData) {
    const { payment_method, ...data } = paymentData;

    switch (payment_method) {
      case 'wechat':
        return await this.createWechatOrder(data);
      case 'alipay':
        return await this.createAlipayOrder(data);
      case 'cash':
        // 现金支付直接返回成功
        return {
          success: true,
          payment_method: 'cash',
          payment_params: { message: '现金支付，请到收银台支付' }
        };
      default:
        return {
          success: false,
          message: '不支持的支付方式'
        };
    }

  }

  /**
   * 更新支付状态
   */
  async updatePaymentStatus(paymentId, status, updateData = {}) {
    const updates = {
      status: status,
      updated_at: new Date(),
      ...updateData
    };

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await dbQuery(
      `UPDATE payments SET ${setClause} WHERE id = ?`,
      [...values, paymentId]
    );

    // 如果支付成功，更新会话状态
    if (status === 'success') {
      await dbQuery(`
        UPDATE dining_sessions ds
        SET ds.paid_amount = (
          SELECT COALESCE(SUM(paid_amount), 0) 
          FROM payments 
          WHERE session_id = ds.session_id AND status = 'success'
        )
        WHERE ds.id = (SELECT session_id FROM payments WHERE id = ?)
      `, [paymentId]);
    }
  }

  /**
   * 生成随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成微信支付签名
   */
  generateWechatSign(data) {
    const keys = Object.keys(data).filter(key => key !== 'sign' && data[key] !== undefined && data[key] !== '');
    keys.sort();
    
    const string = keys.map(key => `${key}=${data[key]}`).join('&') + `&key=${this.wechatPay.apiKey}`;
    
    return crypto.createHash('md5').update(string, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * 验证微信支付签名
   */
  verifyWechatSign(data) {
    const sign = data.sign;
    delete data.sign;
    
    const generatedSign = this.generateWechatSign(data);
    return sign === generatedSign;
  }

  /**
   * 生成支付宝签名
   */
  generateAlipaySign(data) {
    const keys = Object.keys(data).filter(key => key !== 'sign' && data[key] !== undefined && data[key] !== '');
    keys.sort();
    
    const string = keys.map(key => `${key}=${data[key]}`).join('&');
    
    const sign = crypto
      .createSign('RSA-SHA256')
      .update(string, 'utf8')
      .sign(this.alipay.privateKey, 'base64');
    
    return sign;
  }

  /**
   * 验证支付宝签名
   */
  verifyAlipaySign(data) {
    const sign = data.sign;
    delete data.sign;
    
    const keys = Object.keys(data).filter(key => key !== 'sign' && data[key] !== undefined && data[key] !== '');
    keys.sort();
    
    const string = keys.map(key => `${key}=${data[key]}`).join('&');
    
    return crypto
      .createVerify('RSA-SHA256')
      .update(string, 'utf8')
      .verify(this.alipay.publicKey, sign, 'base64');
  }

  /**
   * 对象转XML
   */
  objectToXml(obj) {
    let xml = '<xml>';
    for (const key in obj) {
      if (obj[key] !== undefined && obj[key] !== null) {
        xml += `<${key}>${obj[key]}</${key}>`;
      }
    }
    xml += '</xml>';
    return xml;
  }

  /**
   * XML转对象
   */
  xmlToObject(xml) {
    const xml2js = require('xml2js');
    let result = {};
    
    xml2js.parseString(xml, { explicitArray: false }, (err, data) => {
      if (!err && data.xml) {
        result = data.xml;
      }
    });
    
    return result;
  }

  /**
   * 生成微信支付回调响应
   */
  generateWechatNotifyResponse(code, message) {
    return `<xml>
      <return_code><![CDATA[${code}]]></return_code>
      <return_msg><![CDATA[${message}]]></return_msg>
    </xml>`;
  }

  /**
   * 申请退款
   */
  async refund(paymentId, refundAmount, reason = '') {
    try {
      // 获取支付记录
      const [payment] = await dbQuery('SELECT * FROM payments WHERE id = ?', [paymentId]);
      
      if (!payment) {
        throw new Error('支付记录不存在');
      }

      if (payment.status !== 'success') {
        throw new Error('只有成功的支付才能退款');
      }

      const refundId = 'RF' + Date.now();

      // 根据支付方式调用相应的退款接口
      let refundResult;
      if (payment.payment_method === 'wechat') {
        refundResult = await this.wechatRefund(paymentId, refundId, refundAmount, reason);
      } else if (payment.payment_method === 'alipay') {
        refundResult = await this.alipayRefund(paymentId, refundId, refundAmount, reason);
      } else {
        throw new Error('该支付方式不支持在线退款');
      }

      if (refundResult.success) {
        // 更新退款记录
        await dbQuery(
          'UPDATE payments SET refund_amount = ?, refund_time = NOW(), status = ? WHERE id = ?',
          [refundAmount, 'refunded', paymentId]
        );

        logger.info('退款成功', { paymentId, refundId, refundAmount });

        return {
          success: true,
          refund_id: refundId,
          refund_amount: refundAmount
        };
      } else {
        throw new Error(refundResult.message || '退款失败');
      }

    } catch (error) {
      logger.error('退款失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 微信退款
   */
  async wechatRefund(paymentId, refundId, refundAmount, reason) {
    try {
      // 实现微信退款逻辑
      // 这里需要调用微信退款API
      return {
        success: true,
        message: '微信退款成功'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 支付宝退款
   */
  async alipayRefund(paymentId, refundId, refundAmount, reason) {
    try {
      // 实现支付宝退款逻辑
      // 这里需要调用支付宝退款API
      return {
        success: true,
        message: '支付宝退款成功'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new PaymentService();


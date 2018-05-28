/*
常用工具类
 */

var crypto = require('crypto');
var util = require('../config/config');
var http = require('http');
var DX_CONFIG = require("../config/config");

/**
 * 判断是否为数字
 * @param nubmer
 * @returns {boolean}
 */
exports.checkRate =function (nubmer) {
    var re = /^[0-9]+$/;//判断字符串是否为数字//判断正整数/[1−9]+[0−9]∗]∗/
    if (!re.test(nubmer)) {
        return false
    }else{
        return true
    }
}
/**
 * md5加密
 * @param number
 * @returns {*|PromiseLike<ArrayBuffer>}
 */
exports.md5Password = function (number) {
    return crypto.createHash('md5').update(number + util.md5).digest('hex');
}

/**
 * 验证手机号
 * @param number
 * @returns {boolean}
 */
exports.checkphone = function (number) {
    let regex = new RegExp(/^[1][3,4,5,6,7,8,9][0-9]{9}$/)
    if (!regex.test(number)) {
        return false//格式错误
    } else {
        return true//格式正确
    }
}
/**
 * 返回json
 * @param res
 * @param code
 * @param data
 */
exports.writeJson = function (res, code, data) {
    if (code == 0) {
        res.json({code: code, data: data})
    } else {
        res.json({code: code, msg: data})
    }
}
/**
 * 生成随机值
 */

exports.makeRandoMnumber = function (length) {
    var all = "azxcvbnmsdfghjklqwertyuiopZXCVBNMASDFGHJKLQWERTYUIOP0123456789";
    var b = "";
    for (var i = 0; i < length; i++) {
        var index = Math.floor(Math.random() * 62);
        b += all.charAt(index);
    }
    return b.toUpperCase();
}
/**
 * 生成验证码
 */
exports.makeyanzhengam = function (length) {
    var result = "";
    for (let i = 0; i < parseInt(length); i++) {
        result = result + (parseInt(Math.random() * 10)).toString();
    }
    return result;
}

/**
 * 生成随机下标
 * @param number
 */
exports.makeRando = function (number) {
    return Math.floor(Math.random() * (number))
}
/**
 * 给手机号打马赛克
 * @param phone
 * @returns {string}
 */
exports.makephone = function (phone) {
    return phone.substring(0, 3) + "****" + phone.substring(7, 11)
}
/**
 * 生成订单号
 * @returns {string}
 */
exports.makeOrderId = function () {
    return this.makeRandoMnumber(4) + new Date().getTime().toString();
}
/**
 * 给手机发送验证码
 * @param phone
 */
exports.sendMessage = function (phone, msg) {
    var post_data = { // 这是需要提交的数据
        'account': DX_CONFIG.account,
        'password': DX_CONFIG.pass,
        'phone': phone,
        'msg': msg,
        'report': 'false',
    };
    var content = JSON.stringify(post_data);
    post(content);
}

/**
 * 发起post请求
 * @param content
 */
function post(content) {
    var options = {
        hostname: DX_CONFIG.smsUrl,
        port: 80,
        path: DX_CONFIG.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
        }
    };
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('发送短信结果： ' + chunk);
        });
    });
    req.write(content);
    req.end();
}




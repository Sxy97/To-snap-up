var crypto = require('crypto');
var WEIXIN = require("../config/config")
var wxutil = require("../util/wxutil")
var util = require("../util/util")

/**
 * 接入微信开发者模式
 * @param req
 * @param res
 */
exports.exploitPattern = function (req, res) {
    //1.获取微信服务器Get请求的参数 signature、timestamp、nonce、echostr
    var signature = req.query.signature,//微信加密签名
        timestamp = req.query.timestamp,//时间戳
        nonce = req.query.nonce,//随机数
        echostr = req.query.echostr;//随机字符串

    //2.将token、timestamp、nonce三个参数进行字典序排序
    var array = [WEIXIN.token, timestamp, nonce];
    array.sort();

    //3.将三个参数字符串拼接成一个字符串进行sha1加密
    var tempStr = array.join('');
    const hashCode = crypto.createHash('sha1'); //创建加密类型
    var resultCode = hashCode.update(tempStr, 'utf8').digest('hex'); //对传入的字符串进行加密

    //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
    if (resultCode === signature) {
        res.send(echostr);
    } else {
        console.log("签名错误")
        res.send('签名错误');
    }
}

/**
 * 分享接口
 */
exports.share = async function (req, res) {
    try {
        const url = req.body.url || ""
        if (!url) {
            throw("参数为空")
        } else {
            const date = await wxutil.share(url)
            util.writeJson(res, 0, date)
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}


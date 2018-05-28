var https = require('https');
const request = require('request') // 请安装第三方包 request
var util = require('util');
var WXCONFIG = require("../config/config")
var accessTokenJson = require("../access_token")
var fs = require("fs")
var crypto = require('crypto')  //引入加密模块
var utils = require('../util/util');

/**
 * 发送get请求
 * @param url
 * @returns {Promise<any>}
 */
function requestGet(url, date) {
    return new Promise(async function (resolve, reject) {
        request.get({
            uri: url,
            json: true,
            qs: date
        }, (err, res, body) => {
            if (err) {
                reject(err)
            } else {
                resolve(body)
            }
        })
    })
}

/**
 * 获取分享接口的AccessToken
 * @returns {Promise<any>}
 */
function getAccessToken() {
    try {
        return new Promise(async function (resolve, reject) {
            //获取当前时间
            var currentTime = new Date().getTime();
            //判断 本地存储的 access_token 是否有效
            if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
                const date = await requestGet('https://api.weixin.qq.com/cgi-bin/token', {
                    grant_type: 'client_credential',
                    appid: WXCONFIG.shareAppID,
                    secret: WXCONFIG.sharesecret
                })
                if (date.errcode) {
                    //错误
                    console.log(date)
                    reject(date)
                } else {
                    var result = date;
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    // 取jsapi_ticket
                    const jsapi = await requestGet("https://api.weixin.qq.com/cgi-bin/ticket/getticket", {
                        access_token: result.access_token,
                        type: "jsapi"
                    })
                    //更新本地存储的
                    accessTokenJson.ticket = jsapi.ticket
                    fs.writeFile('./access_token.json', JSON.stringify(accessTokenJson), function (err) {
                        if (err) {
                            console.log(err)
                        }
                        console.log("save assess_token success")
                    });
                    //将获取后的 access_token 返回
                    resolve(accessTokenJson);
                }
            } else {
                //将本地存储的 access_token 返回
                resolve(accessTokenJson);
            }
        });
    } catch (err) {
        console.log(err)
    }
}

/**
 * 获取网页授权的AccessToken
 * @param code
 */
exports.getAccessTokenByCode = function (code) {
    try {
        return new Promise(async function (resolve, reject) {
            const date = await requestGet('https://api.weixin.qq.com/sns/oauth2/access_token', {
                appid: WXCONFIG.AppID,
                secret: WXCONFIG.secret,
                code: code,
                grant_type: "authorization_code"
            })
            if (date.errcode) {
                console.log(date)
                reject(date)
            } else {
                resolve(date)
            }
        })
    } catch (err) {
        console.log(err)
    }
}

/**
 * 获取微信中的个人信息
 * @param accessToken
 * @param openid
 * @returns {Promise<any>}
 */
exports.getPersonalInformationByAccessToken = function (accessToken, openid) {
    try {
        return new Promise(async function (resolve, reject) {
            const date = await requestGet('https://api.weixin.qq.com/sns/userinfo', {
                access_token: accessToken,
                openid: openid,
                lang: "zh_CN"
            })
            if (date.errcode) {
                console.log(date)
                reject(date)
            } else {
                resolve(date)
            }
        })
    } catch (err) {
        console.log(err)
    }
}

/**
 * 分享功能
 * @param url
 * @returns {Promise<any>}
 */
exports.share = function (url) {
    try {
        return new Promise(async function (resolve, reject) {
            const accessTokenJson = await getAccessToken()
            // 加密
            var date = {
                appId: WXCONFIG.shareAppID,
                nonceStr: utils.makeRandoMnumber(21),
                timestamp: Date.parse(new Date()) / 1000
            }
            var string = 'jsapi_ticket=' + accessTokenJson.ticket + '&noncestr=' + date.nonceStr + '&timestamp=' + date.timestamp + '&url=' + url;
            const hashCode = crypto.createHash('sha1'); //创建加密类型
            var resultCode = hashCode.update(string, 'utf8').digest('hex'); //对传入的字符串进行加密
            date.signature = resultCode
            resolve(date)
        })
    } catch (err) {
        console.log(err)
    }
}
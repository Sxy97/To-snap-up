const util = require("../util/util");
var crypto = require('crypto');
var config = require("../config/config");
var db = require("../util/db");
const PAYCONFIG = require("../config/config")
/*
支付功能模块
 */
const BCRESTAPI = require('beecloud-node-sdk');
const API = new BCRESTAPI();
API.registerApp(PAYCONFIG.APP_ID, PAYCONFIG.APP_SECRET, PAYCONFIG.MASTER_SECRET, PAYCONFIG.TEST_SECRET);
// API.setSandbox(true);//开启测试模式 不设置就是不开启

exports.pay = function (row, callback) {
    if (!row) {
        var err = {
            code: 100,
            msg: "参数错误"
        };
        callback(err, null);
        return;
    }
    const date = {
        channel: row.way,//根据不同场景选择不同的支付方式（前台传）
        timestamp: new Date().valueOf(),//时间戳，毫秒数
        total_fee: parseInt(PAYCONFIG.price),//total_fee(int 类型) 单位分
        bill_no: row.orderId,//8到32位数字和/或字母组合，请自行确保在商户系统中唯一，同一订单号不可重复提交，否则会造成订单重复
        title: "未来音乐音箱",//title UTF8编码格式，32个字节内，最长支持16个汉字
        optional: {openid: row.openid, phone: row.phone, number: row.number, token: row.token, imgurl: row.imgurl},//用户自定义的参数，将会在webhook通知中原样返回，该字段主要用于商户携带订单的自定义数据
        bill_timeout: 60 * 5,//选填必须为非零正整数，单位为秒，建议最短失效时间间隔必须大于360秒，京东(JD*)不支持该参数。
        openid: row.openid
    };
    API.bill(date).then((response) => {
        //alipay
        if (response.result_code == 0) {
            //response.id; 成功发起支付后返回支付表记录唯一标识
            // if(response.html && response.url){
            //     //支付宝 ALI_WEB
            //     callback(null,{state:"ALI_WEB",url:response.url});
            // }else
            if (response.app_id && response.pay_sign) {
                //微信 WX_JSAPI
                callback(null, {state: "WX_JSAPI", data: response});
            } else {
                callback("未知错误", null);
            }
        } else {
            var err = response.err_detail
            callback(err, null);
        }
    })
}


exports.callback = async function (req, res) {
    var body = req.body;
    var app_id = body.app_id;
    var transaction_id = body.transaction_id;
    var transaction_type = body.transaction_type;
    var channel_type = body.channel_type;
    var transaction_fee = body.transaction_fee;
    var master_secret = config.MASTER_SECRET;
    var signature = body.signature;
    var transactionId = body.transactionId; ///订单号
    var msg = app_id + transaction_id + transaction_type + channel_type + transaction_fee + master_secret;
    var msgs = crypto.createHash("md5").update(msg, 'utf8').digest('hex');
    if (msgs == signature) {
        var result = await db.query("select * from winninglist where orderid=?", [transactionId]);
        if (result.length > 0) {
            if (result[0].ispay == 0) {
                if (body.trade_success == true) {
                    var transaction_fee = body.transaction_fee;//支付金额
                    if (transaction_fee == parseInt(PAYCONFIG.price)) {
                        db.query("update winninglist set ispay=1 where orderid=?", [transactionId]);
                        var activeid = body.optional.number;//第几天
                        var phone = body.optional.phone;//手机号
                        var token = body.optional.token
                        var imgurl = body.optional.imgurl
                        var openid = body.optional.openid
                        //更新token,imgurl,openid
                        db.query("update people_information set openid=?,token=?,imgurl=? where phone=?", [openid, token, imgurl, phone])
                        if (activeid == 1) {
                            const date = await db.query("select * from activity where number>?", [activeid]);
                            for (let i = 0; i < date.length; i++) {
                                makezhugous([], 3, phone, "666", date[i].number, config.qianggouLength, function (data) {
                                    if (data.length > 0) {
                                        // if(i == 0){
                                        //     util.sendMessage(phone, `您的抢购码已经发放。抢购码（${data.toString()}）。分享给好友，将抢购小未的机会带给他们吧！`)
                                        // }
                                        console.log(`第一天：${phone}:支付成功，分配码成功`);
                                    } else {
                                        console.log(`支付成功，分配码失败`);
                                    }
                                })
                            }
                        } else if(activeid == 8){
                            makezhugous([], 2, phone, "666", parseInt(activeid) + 1, config.qianggouLength, function (data) {
                                if (data.length > 0) {
                                    console.log(`第八天：${phone}:支付成功，分配码成功`);
                                } else {
                                    console.log(`支付成功，分配码失败`);
                                }
                            })
                        }else{
                            const date = await db.query("select * from activity where number>?", [activeid]);
                            for (let i = 0; i < date.length; i++) {
                                makezhugous([], 2, phone, "666", date[i].number, config.qianggouLength, function (data) {
                                    if (data.length > 0) {
                                        // if(i == 0){
                                        //     util.sendMessage(phone, `您的抢购码已经发放。抢购码（${data.toString()}）。分享给好友，将抢购小未的机会带给他们吧！`)
                                        // }
                                        console.log(`第二到七天：${phone}:支付成功，分配码成功`);
                                    } else {
                                        console.log(`支付成功，分配码失败`);
                                    }
                                })
                            }
                        }
                        res.send("success");
                    }
                }
            } else {
                return;
            }
        } else {
            util.writeJson(res, 103, "此订单号存在错误,请重试");
        }
    } else {
        return;
    }

}

/**
 * 生成抢购码
 * @param date 抢购码数组
 * @param long  生成几个抢购码
 * @param phone  手机号
 * @param from   助购手机号/系统生成传666
 * @param activeid   活动号
 * @param length  //抢购码长度
 * @param callback  回调函数
 * @returns {Promise<void>}
 */
async function makezhugous(date, long, phone, from, activeid, length, callback) {
    if (date.length < long) {
        if (!activeid) {
            activeid = 1
        }
        const suijima = util.makeRandoMnumber(length)
        const num = await db.query("insert ignore into shap_up (shap_up_code,phone,fphone,createdatetime,activeid) values (?,?,?,?,?)", [suijima, phone, from, new Date(), activeid])
        if (num.affectedRows == 1) {
            date.push(suijima)
        }
        makezhugous(date, long, phone, from, activeid, length, callback)

    } else {
        callback(date)
    }
}


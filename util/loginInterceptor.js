var util = require("../util/util")
var TIMECONFIG=require("../config/config")
var sd = require('silly-datetime');

var phones=["18614085131","18513850592","15210391307","18189815851","18612550720","13520596123","18310054013","18510088288","13488730111","13001072672"]
//登录拦截器
exports.interceptor = async function (req, res, next) {
    const path = req.originalUrl;
    if (backAdmin(path)) {
        var phone=req.body.phone || ''
       //判断是不是那个手机号
        if(phones.includes(phone)){
            util.writeJson(res, 1, "不能抢了哦，你懂得")
        }else{
            next()
        }
    } else {
        next()
    }
}

//拦截后台路由
function backAdmin(path) {
    let noLoginPath = ["/firstSnapUpCode","/rushToPurchase"];
    if (noLoginPath.includes(path) || noLoginPath.includes(path + '/')) {
        return true //需要
    } else {
        return false //不需要
    }
}


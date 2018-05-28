var util = require("../util/util")
var payinfo = require("../controller/paymentController")
var weixin = require("../util/wxutil")
var https = require('https');
var schedule = require('node-schedule');
var db = require("../util/db");
exports.test = function (req, res) {
    try {
        const query = req.body;
        const openid = query.openid || ''//用户id
        const channel = query.channel || '' //支付方式
        console.log(`1.openid:${openid}---channel${channel}`)
        if (!channel) {
            throw("参数错误")
        } else {
            var row = {
                way: channel,
                phone: "111111",
                number: 5,
                orderId: util.makeOrderId()
            }
            if (openid) {
                row.openid = openid
            }
            payinfo.pay(row, function (err, date) {
                console.log(`2.err:${err},date:${date}`)
                if (err) {
                    throw(err)
                } else {
                    util.writeJson(res, 0, date)
                }
            })
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}

exports.test1 = async function (req, res) {
    const date = await weixin.share("http://www.baidu.com")
    res.json(date)
}

exports.test2 = function () {
    try {
        schedule.scheduleJob('5 * * * * *', async function () {
            const order = await db.query("select * from winninglist where ispay=0 and creatime<?", [new Date()])
            for (let i = 0; i < order.length; i++) {
                db.query("delete from winninglist where id=?", [order[i].id])
                db.query("update activity set kucun=kucun+1 where number=?", [order[i].activeid])
            }
            console.log("执行了")
        });
    } catch (err) {
        console.log(err)
    }
}
// var num=3
// const peoplenum=[10,30,60,120,240,480,960,1920]
// const jifen=Math.floor(2000000 / peoplenum[parseInt(num)-1])
// console.log(jifen)
// this.test2()
// console.log(Math.floor(20000000/5))
// //转base64
// var decodedstr =new Buffer("&***").toString('base64');
// //base64转出来
// var obj =new Buffer(decodedstr,'base64').toString();

// const winpeople=[{id:123,value:9999},{id:222,value:4999}]
// for(let i of winpeople){
//     console.log(i)
// }
// var value = []
// for (let i = 0; i < Object.values(winpeople).length; i++) {
//     winpeople[i].jfen=3333
//     value.push(Object.values(winpeople[i]))
//     // value.push("ddd")
//     // value.push(new Date())
// }
// console.log(value)

// var arr = ["Stimpson", "J", "cat"];
// for (var i = 0; i < arr.length; i++) {
//     if (arr[i] === "J") {
//         var a=arr.splice(i, 1)[0];
//     }
// }
// arr.unshift(a);
// console.log(arr)
// var a = 10,
//
// // (function (f) {
// //     var max = 100;
// //     f(15)
// b=4
// function fn () {
//     var b = 20;
//     function bar() {
//         console.log(a+b)
//     }
//     return bar
// }
// var b =200,
//     x = fn();




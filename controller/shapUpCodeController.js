/*
抢购码模块
 */
var db = require("../util/db");
var util = require("../util/util")
var wxutil = require("../util/wxutil")
var schedule = require('node-schedule');
var sd = require('silly-datetime');
var dat = require("date-and-time")
var async = require('async');
var payinfo = require("./paymentController")
const TIMECONFIG = require("../config/config")

exports.homepage = async function (req, res) {
    try {
        const query = req.body
        const wxcode = query.wxcode || ''//微信获取个人信息code

        let openid = query.openid || ''
        let token = query.token || ''

        let imgurl = query.imgurl || ''
        let nickname = query.nickname || ''
        console.log(query)
        if (!wxcode && !openid) {
            throw("参数错误")
        } else {
            if (wxcode) {
                //根据code 获取 对方imgurl,nickname
                const AccessToken = await wxutil.getAccessTokenByCode(wxcode)
                const whopeopleInformation = await wxutil.getPersonalInformationByAccessToken(AccessToken.access_token, AccessToken.openid)
                openid = whopeopleInformation.openid
                imgurl = whopeopleInformation.headimgurl
                nickname = whopeopleInformation.nickname
                const people = await db.query("select * from people_information where openid=?", [openid])
                if (people.length > 0) {
                    token = people[0].token
                }
            } else {
                const people = await db.query("select * from people_information where openid=? and token=?", [openid, token])
                if (people.length > 0) {
                    openid = people[0].openid
                    imgurl = people[0].imgurl
                    nickname = people[0].nickname
                }
            }
            const time = new Date()
            if (time >= new Date(TIMECONFIG.creatime)) {//整体活动开始
                //获取活动时间
                var active = await db.query("select amount,number,startime,kucun from activity where startime<? and closetime >?", [time, time])
                if (active.length > 0) {
                    active[0].startime = sd.format(new Date(active[0].startime), 'YYYY-MM-DD HH:mm:ss')
                }
                //获取下一次活动时间
                var date = await db.query("select amount,number,startime from activity where startime>? order by startime  limit 1", [new Date()])
                if (date.length > 0) {
                    date[0].startime = sd.format(new Date(date[0].startime), 'YYYY-MM-DD HH:mm:ss')
                }
                var ispeople = await db.query("select * from people_information where openid=? and token=?", [openid, token])
                const people = await db.query("select * from people_information where openid=? and token is not null", [openid])

                if (people.length > 0 && ispeople.length > 0) { //已经抢购过
                    if (active.length > 0) {//在活动时间
                        //判断购买过没有
                        const isbuy = await db.query("select * from people_information as a,winninglist as b where a.phone=b.number and a.openid=? and b.ispay=1", [openid])
                        if (isbuy.length > 0) {//购买过
                            const kucun = await db.query("select count(1) as num from winninglist where activeid=? and ispay=1", [active[0].number])
                            console.log("---购买人数：----")
                            console.log(kucun)
                            console.log("---剩余库存：----")
                            console.log(active[0].kucun)
                            console.log("---总数量：----")
                            console.log(active[0].amount)
                            if (kucun.length <= 0 || active[0].amount > kucun[0].num) {//有库存
                                var meCodeList = await db.query("select shap_up_code,activeid from shap_up where phone=? and fphone=? and activeid >1 and activeid<=? order by activeid desc", [people[0].phone, 666, active[0].number])
                                meCodeList = await shapuplist(meCodeList, active[0].number)
                            } else {//没有库存
                                var meCodeList = await db.query("select shap_up_code,activeid from shap_up where phone=? and fphone=? and activeid >1 and activeid<=? order by activeid desc", [people[0].phone, 666, date[0].number])
                                meCodeList = await shapuplist(meCodeList, date[0].number)
                            }
                            let jifenList = await db.query("select jifen,creatime,type from integral where phone=?", [people[0].phone])
                            var sum = 0
                            for (let i = 0; i < jifenList.length; i++) {
                                jifenList[i].creatime = sd.format(new Date(jifenList[i].creatime), 'YYYY-MM-DD')
                                if (jifenList[i].type == 1) {
                                    sum = sum - jifenList[i].jifen
                                    jifenList[i].jifen = -jifenList[i].jifen
                                    jifenList[i].type = "转出"
                                } else if (jifenList[i].type == 2) {
                                    sum = sum + jifenList[i].jifen
                                    jifenList[i].jifen = "+" + jifenList[i].jifen
                                    jifenList[i].type = "转入"
                                } else {
                                    sum = sum + jifenList[i].jifen
                                    jifenList[i].type = "系统赠送"
                                }
                            }
                            util.writeJson(res, 0, {
                                state: 3,
                                meInformation: {
                                    type: 1,//抢购过
                                    phone: people[0].phone,
                                    openid: openid,
                                    imgurl: imgurl,
                                    nickname: nickname,
                                    token: people[0].token,
                                    mecode: meCodeList,
                                    jifenlist: jifenList,
                                    sum: sum
                                },
                                active: date[0]
                            })
                        } else {//没有购买过
                            //判断有没有库存，判断是不是第一天（查看没有中奖，中奖，中奖支付过期）
                            const kucun = await db.query("select count(1) as num from winninglist where activeid=? and ispay=1", [active[0].number])
                            console.log("---购买人数：----")
                            console.log(kucun)
                            console.log("---剩余库存：----")
                            console.log(active[0].kucun)
                            console.log("---总数量：----")
                            console.log(active[0].amount)
                            if (kucun.length <= 0 || active[0].amount > kucun[0].num) {//有库存
                                if (active[0].number == 1) {//第一天
                                    //自己的码
                                    const meCode = await db.query("select shap_up_code,activeid from shap_up where phone=? and activeid=? and fphone=?", [people[0].phone, active[0].number, 666])
                                    //朋友赠码
                                    const helpCodeList = await db.query("select b.imgurl,b.nickname,a.shap_up_code,a.activeid from shap_up as a,people_information as b where a.fphone=b.phone and a.phone=? and a.fphone != ? and a.activeid=? order by a.createdatetime desc", [people[0].phone, 666, active[0].number])
                                    util.writeJson(res, 0, {
                                        state: 4,
                                        meInformation: {
                                            type: 1,//抢购过
                                            phone: people[0].phone,
                                            openid: openid,
                                            imgurl: imgurl,
                                            nickname: nickname,
                                            token: people[0].token,
                                            mecode: meCode,
                                            helpcodelist: helpCodeList
                                        },
                                        active: active[0]
                                    })
                                } else {//其余几天
                                    active[0].md5 = util.md5Password(active[0].number)
                                    util.writeJson(res, 0, {
                                        state: 1,//正在开抢
                                        meInformation: {
                                            type: 1,//抢购过
                                            phone: people[0].phone,
                                            token: people[0].token,
                                            openid: openid,
                                            imgurl: imgurl,
                                            nickname: nickname
                                        },
                                        active: active[0]
                                    })
                                }
                            } else {//没有库存
                                if (active[0].number == 1) {//第一天
                                    const result = await db.query("select shap_up_code,activeid,creatime,ispay from winninglist where number=? and activeid=1", [people[0].phone])
                                    if (result.length > 0) {//中奖了
                                        //自己的码
                                        let meCode = await db.query("select shap_up_code,activeid from shap_up where phone=? and activeid=? and fphone=?", [people[0].phone, active[0].number, 666])
                                        meCode = winshapuplist(meCode, result[0].shap_up_code)
                                        //朋友赠码
                                        let helpCodeList = await db.query("select b.imgurl,b.nickname,a.shap_up_code,a.activeid from shap_up as a,people_information as b where a.fphone=b.phone and a.phone=? and a.fphone != ? and a.activeid=? order by a.createdatetime desc", [people[0].phone, 666, active[0].number])
                                        helpCodeList = winshapuplist(helpCodeList, result[0].shap_up_code)
                                        if (new Date() > new Date(result[0].creatime)) {//中奖支付过期了
                                            util.writeJson(res, 0, {
                                                state: 6,
                                                meInformation: {
                                                    type: 1,//抢购过
                                                    phone: people[0].phone,
                                                    openid: openid,
                                                    imgurl: imgurl,
                                                    nickname: nickname,
                                                    token: people[0].token,
                                                    mecode: meCode,
                                                    helpcodelist: helpCodeList
                                                },
                                                active: date[0]
                                            })
                                        } else {//中奖支付没有过期
                                            active[0].md5 = util.md5Password(active[0].number)
                                            active[0].startime = date[0].startime
                                            util.writeJson(res, 0, {
                                                state: 7,
                                                meInformation: {
                                                    type: 1,//抢购过
                                                    phone: people[0].phone,
                                                    openid: openid,
                                                    imgurl: imgurl,
                                                    nickname: nickname,
                                                    token: people[0].token,
                                                    wincode: result[0].shap_up_code,
                                                    mecode: meCode,
                                                    helpcodelist: helpCodeList
                                                },
                                                active: active[0]
                                            })
                                        }
                                    } else {//没有中奖
                                        //自己的码
                                        const meCode = await db.query("select shap_up_code,activeid from shap_up where phone=? and activeid=? and fphone=?", [people[0].phone, active[0].number, 666])
                                        //朋友赠码
                                        const helpCodeList = await db.query("select b.imgurl,b.nickname,a.shap_up_code,a.activeid from shap_up as a,people_information as b where a.fphone=b.phone and a.phone=? and a.fphone != ? and a.activeid=? order by a.createdatetime desc", [people[0].phone, 666, active[0].number])
                                        util.writeJson(res, 0, {
                                            state: 5,
                                            meInformation: {
                                                type: 1,//抢购过
                                                phone: people[0].phone,
                                                openid: openid,
                                                imgurl: imgurl,
                                                nickname: nickname,
                                                token: people[0].token,
                                                mecode: meCode,
                                                helpcodelist: helpCodeList
                                            },
                                            active: date[0]
                                        })
                                    }
                                } else {//其余几天（被抢完了）
                                    util.writeJson(res, 0, {
                                        state: 2,//被抢完
                                        meInformation: {
                                            type: 1,//抢购过
                                            phone: people[0].phone,
                                            token: people[0].token,
                                            openid: openid,
                                            imgurl: imgurl,
                                            nickname: nickname
                                        },
                                        active: date[0]
                                    })
                                }
                            }
                        }
                    } else {//没在活动时间
                        if (date.length > 0) {
                            //判断购买过没有，（有，返回状态，返回有效码，）（没有，返回有效码）
                            const isbuy = await db.query("select * from people_information as a,winninglist as b where a.phone=b.number and a.openid=? and b.ispay=1", [openid])
                            if (isbuy.length > 0) {//购买支付过
                                //返回下一天的码 todo (此状态可能没有 最后一天)
                                let meCodeList = await db.query("select shap_up_code,activeid from shap_up where phone=? and fphone=? and activeid >1 and activeid<=? order by activeid desc", [people[0].phone, 666, date[0].number])
                                meCodeList = await shapuplist(meCodeList, date[0].number)
                                let jifenList = await db.query("select jifen,creatime from integral where phone=?", [people[0].phone])
                                var sum = 0
                                for (let i = 0; i < jifenList.length; i++) {
                                    jifenList[i].creatime = sd.format(new Date(jifenList[i].creatime), 'YYYY-MM-DD')
                                    if (jifenList[i].type == 1) {
                                        sum = sum - jifenList[i].jifen
                                        jifenList[i].jifen = -jifenList[i].jifen
                                        jifenList[i].type = "转出"
                                    } else if (jifenList[i].type == 2) {
                                        sum = sum + jifenList[i].jifen
                                        jifenList[i].jifen = "+" + jifenList[i].jifen
                                        jifenList[i].type = "转入"
                                    } else {
                                        sum = sum + jifenList[i].jifen
                                        jifenList[i].type = "系统赠送"
                                    }
                                }
                                if (date[0].number > 8) {
                                    var state = 66//活动已结束
                                } else {
                                    var state = 3//活动未开始但购买过
                                }
                                util.writeJson(res, 0, {
                                    state: state,
                                    meInformation: {
                                        type: 1,//抢购过
                                        phone: people[0].phone,
                                        openid: openid,
                                        imgurl: imgurl,
                                        nickname: nickname,
                                        token: people[0].token,
                                        mecode: meCodeList,
                                        jifenlist: jifenList,
                                        sum: sum,
                                        flog: true//购买过
                                    },
                                    active: date[0]
                                })
                            } else {//没购买支付过
                                //自己的码
                                const meCode = await db.query("select shap_up_code,activeid from shap_up where phone=? and activeid=? and fphone=?", [people[0].phone, date[0].number, 666])
                                //朋友赠码
                                const helpCodeList = await db.query("select b.imgurl,b.nickname,a.shap_up_code,a.activeid from shap_up as a,people_information as b where a.fphone=b.phone and a.phone=? and a.fphone != ? and a.activeid=? order by a.createdatetime desc", [people[0].phone, 666, date[0].number])
                                if (date[0].number > 8) {
                                    var state = 66//活动已结束
                                } else {
                                    var state = 0//活动未开始
                                }
                                util.writeJson(res, 0, {
                                    state: state,
                                    meInformation: {
                                        type: 1,//抢购过
                                        phone: people[0].phone,
                                        sharemd5: util.md5Password(people[0].phone),
                                        openid: openid,
                                        imgurl: imgurl,
                                        nickname: nickname,
                                        token: people[0].token,
                                        mecode: meCode,
                                        helpcodelist: helpCodeList,
                                        flog: false//没购买过
                                    },
                                    active: date[0]
                                })
                            }
                        }
                    }
                } else {//没有抢购过
                    if (active.length > 0) {//正在活动时间
                        const kucun = await db.query("select count(1) as num from winninglist where activeid=? and ispay=1", [active[0].number])
                        console.log("---购买人数：----")
                        console.log(kucun)
                        console.log("---剩余库存：----")
                        console.log(active[0].kucun)
                        console.log("---总数量：----")
                        console.log(active[0].amount)
                        if (kucun.length <= 0 || active[0].amount > kucun[0].num) {//还没有抢完
                            active[0].md5 = util.md5Password(active[0].number)
                            util.writeJson(res, 0, {
                                state: 1,//正在开抢
                                meInformation: {
                                    type: 0,//未抢购过
                                    openid: openid,
                                    imgurl: imgurl,
                                    nickname: nickname
                                },
                                active: active[0]
                            })
                        } else {//已经被抢完
                            util.writeJson(res, 0, {
                                state: 2,//被抢完
                                meInformation: {
                                    type: 0,//未抢购过
                                    openid: openid,
                                    imgurl: imgurl,
                                    nickname: nickname
                                },
                                active: date[0]
                            })
                        }
                    } else {//没有在活动时间
                        if (date.length > 0) {
                            if (date[0].number > 8) {
                                var state = 66//活动已结束
                            } else {
                                var state = 0//活动未开始
                            }
                            util.writeJson(res, 0, {
                                state: state,
                                meInformation: {
                                    type: 0,//未抢购过
                                    openid: openid,
                                    imgurl: imgurl,
                                    nickname: nickname,
                                    flog: false
                                },
                                active: date[0]
                            })
                        }
                    }
                }
            } else {//整体活动未开始
                util.writeJson(res, 0, {
                    state: 99,
                    meInformation: {
                        type: 0,//未抢购过
                        openid: openid,
                        imgurl: imgurl,
                        nickname: nickname
                    },
                    active: {
                        number: 0,
                        startime: `${sd.format(new Date(TIMECONFIG.creatime), 'YYYY-MM-DD HH:mm:ss')}`
                    }
                })
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}


exports.addActive = async function (req, res) {
    try {
        const query = req.body
        const number = parseInt(query.number) || '' //活动号
        const startime = query.startime || ''//开始时间
        const closetime = query.closetime || ''//关闭时间
        const sum = parseInt(query.sum) || ''//总量
        const price = parseInt(query.price) || ''//价格
        if (!number || !startime || !closetime || !price || !Number.isInteger(price) || !Number.isInteger(number)) {
            throw("参数错误")
        } else {
            const active = await db.query("select * from activity where number=?", number)
            if (active.length <= 0) {
                db.query("insert into activity (number,startime,closetime,amount,price,kucun) values (?,?,?,?,?,?)", [number, startime, closetime, sum, price, sum])
            } else {
                db.query("update activity set startime=?,closetime=?,amount=?,price=?,kucun=? where number=?", [startime, closetime, sum, price, sum, number])
            }
            if (number == 1) {
                schedule.scheduleJob(new Date(startime), async function (time) {
                    //判断时间是否修改
                    const active = await db.query("select * from activity where number=1")
                    if (active.length > 0) {
                        if (new Date(active[0].startime).getTime() === new Date(time).getTime()) {
                            console.log(time + "第一期开奖了")
                            //开奖方法
                            const result = await db.query("select shap_up_code,phone from shap_up where activeid=1")
                            firstOpenlotery([], result, active[0].amount)
                        }
                    }
                });
                console.log(`定时器设置成功,${startime} 触发`)
            }
            util.writeJson(res, 0, "添加成功")
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}

exports.rushToPurchase = async function (req, res) {
    try {
        const query = req.body;
        const phone = query.phone || ''//手机号
        const md5 = query.md5 || ''//MD5
        const number = query.number || ''//活动号
        const code = query.code || ''//验证码
        const shapupcode = query.shapupcode || ''//抢购码
        const channel = "WX_JSAPI" //支付方式
        const openid = query.openid || ''//用户id
        const imgurl = query.imgurl || '' //用户图片
        console.log("抢购接口")
        console.log(query)
        if (!phone || !md5 || !number || !code || !shapupcode || !openid || !imgurl) {
            throw("参数错误")
        } else {
            //判断number MD5值
            if (md5 != util.md5Password(number)) {
                throw("活动加密参数错误")
            } else {
                //判断手机号格式
                if (util.checkphone(phone)) {
                    //判断是否已经购买过
                    const alreadypay = await db.query("select * from winninglist where number=? and ispay=1", [phone])
                    if (alreadypay.length > 0) {
                        throw("你已经购买过一台")
                    } else {
                        //判断验证码
                        const people = await db.query("select phone from people_information where phone=? and yanzhengma=? and yanzhengmatype=0", [phone, code.toUpperCase()])
                        if (people.length > 0) {
                            //判断第几天
                            const time = new Date()
                            //查询是否在某个开奖时间段
                            const active = await db.query("select * from activity where startime<? and closetime >?", [time, time])
                            if (active.length > 0 && active[0].number == number) {
                                // 判断是否为活动时间
                                if (new Date(active[0].closetime).getTime() < time.getTime()) {
                                    throw("本次活动已经结束")
                                } else {
                                    if (number == 1) {
                                        //第一天
                                        //判断抢购码和手机号是否匹配 是否为中奖号码 判断支付时间是否过期
                                        const result = await db.query("select * from winninglist where shap_up_code=? and number=? and activeid=? and ispay=0 and creatime>?", [shapupcode.toUpperCase(), phone, 1, time])
                                        if (result.length > 0) {
                                            var token = util.md5Password(phone + new Date().getTime())
                                            //调支付
                                            var row = {
                                                way: channel,
                                                phone: phone,
                                                number: number,
                                                orderId: result[0].orderid,
                                                openid: openid,
                                                token: token,
                                                imgurl: imgurl
                                            }
                                            payinfo.pay(row, async function (err, date) {
                                                if (err) {
                                                    util.writeJson(res, 1, err)
                                                } else {
                                                    db.query("update people_information set yanzhengmatype=1 where phone=?", [phone])//修改验证码
                                                    date.token = token
                                                    date.phone = phone
                                                    const address = await db.query("select * from address where phone=?", [phone])
                                                    if (address.length <= 0) {
                                                        date.address = false
                                                    } else {
                                                        date.address = true
                                                    }
                                                    util.writeJson(res, 0, date)
                                                }
                                            })
                                        } else {
                                            throw("中奖码错误或中奖码和手机不匹配或支付过期")
                                        }
                                    } else {
                                        //剩余几天
                                        //判断该手机号是否已经购买过 (是否已经有一台了)
                                        const payout = await db.query("select * from winninglist where number=? and ispay=1", [phone])
                                        if (payout.length > 0) {
                                            throw ("你已经购买过一台了")
                                        } else {
                                            //判断是否重复抢购
                                            const repeatPurchase = await db.query("select * from winninglist where number=? and activeid=?", [phone, number])
                                            if (repeatPurchase.length > 0) {
                                                throw ("重复抢购")
                                            } else {
                                                // 判断 抢购码 是否在列表中
                                                const result = await db.query("select * from shap_up where shap_up_code=? and activeid=? and fphone=666", [shapupcode.toUpperCase(), active[0].number])
                                                if (result.length > 0) {
                                                    const date = await db.query("select kucun from activity where number=?", [number])
                                                    if (date[0].kucun > 0) {
                                                        const orderid = util.makeOrderId()
                                                        //插入购买明细 (判断是否购买重复) 减库存
                                                        executeSeckill(phone, shapupcode, number, orderid, function (results) {
                                                            if (results.code == 0) {
                                                                //秒杀成功
                                                                //调支付
                                                                var token = util.md5Password(phone + new Date().getTime())
                                                                var row = {
                                                                    way: channel,
                                                                    phone: phone,
                                                                    number: number,
                                                                    orderId: orderid,
                                                                    openid: openid,
                                                                    token: token,
                                                                    imgurl: imgurl
                                                                }
                                                                payinfo.pay(row, async function (err, date) {
                                                                    if (err) {
                                                                        util.writeJson(res, 1, err)
                                                                    } else {
                                                                        db.query("update people_information set yanzhengmatype=1 where phone=?", [phone])//修改验证码
                                                                        date.token = token
                                                                        date.phone = phone
                                                                        const address = await db.query("select * from address where phone=?", [phone])
                                                                        if (address.length <= 0) {
                                                                            date.address = false
                                                                        } else {
                                                                            date.address = true
                                                                        }
                                                                        util.writeJson(res, 0, date)
                                                                    }
                                                                })
                                                            } else {
                                                                //秒杀失败
                                                                util.writeJson(res, 1, results.msg)
                                                            }
                                                        })
                                                    } else {
                                                        const shuliang = await db.query("select amount from activity where number=?", [number])
                                                        if (shuliang.length > 0) {
                                                            const paylist = await db.query("select count(1) as num from winninglist where activeid=? and ispay=1", [number])
                                                            if (paylist.length > 0) {
                                                                console.log("*------已经支付的人------*")
                                                                console.log(paylist)
                                                                console.log("*-------总共的人数-----*")
                                                                console.log(shuliang[0].amount)
                                                                if (shuliang[0].amount > paylist[0].num) {
                                                                    throw(`想要小未的人太多，正在排队中...\n点击确定，继续立即购买`)
                                                                } else {
                                                                    throw("被抢完了")
                                                                }
                                                            } else {
                                                                throw(`想要小未的人太多，正在排队中...\n点击确定，继续立即购买`)
                                                            }
                                                        } else {
                                                            throw("被抢完了")
                                                        }
                                                    }
                                                } else {
                                                    throw("抢购码错误")
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                throw("抢购的活动与实际现在开抢活动不符")
                            }
                        } else {
                            throw("验证码错误或验证码失效")
                        }
                    }
                } else {
                    throw("手机号格式错误")
                }
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}

exports.getintegral = async function (req, res) {
    try {
        const query = req.body

        const wxcode = query.wxcode || ''//微信获取个人信息code

        var openid = query.openid || ''
        var token = query.token || ''
        console.log(query)
        var imgurl = ""
        var state = false

        var list = []
        var sum = 0
        if (!wxcode && (!openid || !token)) {
            throw("参数错误")
        } else {
            if (wxcode) {
                const AccessToken = await wxutil.getAccessTokenByCode(wxcode)
                const whopeopleInformation = await wxutil.getPersonalInformationByAccessToken(AccessToken.access_token, AccessToken.openid)
                var people = await db.query("select * from people_information where openid=?", [whopeopleInformation.openid])
                imgurl = whopeopleInformation.headimgurl
                openid = whopeopleInformation.openid
            } else {
                var people = await db.query("select * from people_information where openid=? and token=?", [openid, token])
            }

            if (people.length > 0) {
                token = people[0].token
                imgurl = people[0].imgurl
                openid = people[0].openid
                state = true
                list = await db.query("select jifen,creatime,type from integral where phone=?", [people[0].phone])
                for (let i = 0; i < list.length; i++) {
                    list[i].creatime = sd.format(new Date(list[i].creatime), 'YYYY-MM-DD')
                    if (list[i].type == 1) {
                        sum = sum - list[i].jifen
                        list[i].jifen = -list[i].jifen
                        list[i].type = "转出"
                    } else if (list[i].type == 2) {
                        sum = sum + list[i].jifen
                        list[i].jifen = "+" + list[i].jifen
                        list[i].type = "转入"
                    } else {
                        sum = sum + list[i].jifen
                        list[i].type = "系统赠送"
                    }
                }
            }
            util.writeJson(res, 0, {
                imgurl: imgurl,
                list: list,
                sum: sum,
                openid: openid,
                token: token,
                state: state
            })
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }

}

/**
 * 注册接口（用于手机号和openid绑定）
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.register = async function (req, res) {
    try {
        const query = req.body
        const phone = query.phone || ''
        const code = query.code || ''
        const openid = query.openid || ""
        const imgurl = query.imgurl || ''//微信头像地址
        console.log(query)
        if (!phone || !code || !openid || !imgurl) {
            throw("参数错误")
        } else {
            if (util.checkphone(phone)) {
                const people = await db.query("select * from people_information where phone=? and yanzhengma=? and yanzhengmatype=0", [phone, code])
                if (people.length > 0) {
                    const firstopenid = await db.query("select * from people_information where openid=?", [openid])
                    if (firstopenid.length > 0 && firstopenid[0].phone != phone) {
                        throw(`一个微信号只能绑定一个手机号,您已经绑定${firstopenid[0].phone}`)
                    } else {
                        const token = util.md5Password(phone + new Date().getTime())
                        db.query("update people_information set yanzhengmatype=1,openid=?,imgurl=?,token=? where phone=?", [openid, imgurl, token, phone])
                        util.writeJson(res, 0, {token: token})
                    }
                } else {
                    throw("验证码错误或验证码失效")
                }
            } else {
                throw("手机号格式错误")
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}
/**
 * 转让积分
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.transferintegral = async function (req, res) {
    try {
        const query = req.body
        const jifen = query.jifen || ''//积分数量
        const phone = query.phone || ''//转给谁的手机号
        const openid = query.openid || ''//主人的openid
        const token = query.token || ''
        console.log(query)
        if (!jifen || !token || !phone || !openid || !util.checkRate(jifen) || parseFloat(jifen) <= 0) {
            throw("参数错误")
        } else {
            if (util.checkphone(phone)) {
                const people = await db.query("select * from people_information where openid=? and token=?", [openid, token])
                if (people.length > 0) {
                    if (phone != people[0].phone) {
                        const forpeople = await db.query("select * from people_information where phone=? and openid is not null", [phone])
                        if (forpeople.length > 0) {
                            //判断积分合理没有
                            const jifenlist = await db.query("select jifen,type from integral where phone=?", [people[0].phone])
                            var sum = 0
                            for (let i = 0; i < jifenlist.length; i++) {
                                if (jifenlist[i].type == 1) {
                                    sum = sum - jifenlist[i].jifen
                                } else {
                                    sum = sum + jifenlist[i].jifen
                                }
                            }
                            if (sum < jifen) {
                                throw("积分不够")
                            } else {
                                db.query("insert into integral (phone,jifen,active,creatime,type) values (?,?,?,?,?)", [phone, jifen, 0, new Date(), 2]);
                                db.query("insert into integral (phone,jifen,active,creatime,type) values (?,?,?,?,?)", [people[0].phone, jifen, 0, new Date(), 1]);
                                util.writeJson(res, 0, "转出分贝成功")
                            }
                        } else {
                            throw("没有该用户")
                        }
                    } else {
                        throw("自己不能给自己转")
                    }
                } else {
                    throw("token错误")
                }
            } else {
                throw("手机号格式错误")
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}

/**
 * 第一次开奖方法
 * @param result  【】
 * @param date  所有活动的抢购码
 * @param num  中奖个数
 * @returns {Promise<void>}
 */
async function firstOpenlotery(result, date, num) {
    if (result.length < num) {
        //取随机数
        const suijishu = util.makeRando(date.length)
        //判断数据库是否有相同的
        const winninglist = await db.query("select * from winninglist where number=? and activeid=1", [date[suijishu].phone])
        //没有就插，有重新获取
        if (winninglist.length <= 0) {
            const num = await db.query('insert ignore into winninglist (shap_up_code,number,activeid,creatime,orderid) values (?,?,?,?,?)', [date[suijishu].shap_up_code, date[suijishu].phone, 1, dat.addMinutes(new Date(), 30), util.makeOrderId()])
            if (num.affectedRows == 1) {
                result.push(date[suijishu])
                //发送短信
                //【未来声音】恭喜您获得小未音箱，稍后我们的客服将与您联系。
                util.sendMessage(date[suijishu].phone, "【未来声音】恭喜您成功打败99.9%的人，赢得购买资格，获得创世版特权。请在三十分钟之内完成支付，否则视为放弃购买资格。详情请关注未来声音TFM公众号")
            }
        }
        firstOpenlotery(result, date, num)
    } else {
        console.log(result)
        db.query("update activity set kucun=0 where number=1")
    }
}


/**
 *剩余几天的【插入购买明细 (判断是否购买重复)   （减库存）】
 * @param phone 手机号
 * @param shapupcode 抢购码
 * @param number 活动号
 * @param callbacks 回调
 */
function executeSeckill(phone, shapupcode, number, orderid, callbacks) {
    db.pool.getConnection(function (err, conn) {
        conn.beginTransaction(function (err) {
            if (err) {
                console.log(err);
                return;
            } else {
                //插入购买明细
                var insert = function (callback) {
                    //查询抢购码是否已经购买过
                    conn.query("insert ignore into winninglist (shap_up_code,number,activeid,creatime,orderid) values (?,?,?,?,?)", [shapupcode.toUpperCase(), phone, number, dat.addMinutes(new Date(), 5), orderid], function (err, results) {
                        if (err) {
                            callback(err, false)
                        } else {
                            if (results.affectedRows == 1) {
                                //秒杀成功
                                callback(false, true)
                            } else {
                                //秒杀失败（有重复值，重复秒杀）
                                callback("抢购码已被使用", false)
                            }
                        }
                    })
                }
                //更新库存
                var updatekucun = function (callback) {
                    conn.query("update activity set kucun=kucun-1 where number=? and startime<=? and closetime >=? and kucun>0", [number, new Date(), new Date()], function (err, result) {
                        if (err) {
                            callback(err, false)
                        } else {
                            if (result.affectedRows == 1) {
                                //减库存成功
                                callback(false, true)
                            } else {
                                //减库存失败
                                db.query("select amount from activity where number=?", [number], function (err, result) {
                                    if (err) {
                                        callback(err, false)
                                    } else {
                                        db.query("select count(1) as num from winninglist where activeid=? and ispay=1", [number], function (err, result1) {
                                            if (err) {
                                                callback(err, false)
                                            } else {
                                                if (result[0].amount > result1[0].num) {
                                                    callback(`想要小未的人太多，正在排队中...\n点击确定，继续立即购买`, false)
                                                } else {
                                                    callback("被抢完了", false)
                                                }
                                            }
                                        })
                                    }
                                })
                            }
                        }
                    })
                }
                async.parallel([insert, updatekucun], function callback(err, result) {
                    var errs = err
                    if (!err) {
                        conn.commit(function (err) {
                            if (err) {
                                callbacks(false)
                            }
                            console.log('秒杀成功,提交!');
                            //释放资源
                            conn.release();
                            callbacks({code: 0, msg: "抢购成功"})
                        });
                    } else {
                        conn.rollback(function (err, result) {
                            console.log('秒杀出现错误,回滚!');
                            //释放资源
                            conn.release();
                            callbacks({code: 1, msg: errs})
                        });
                    }
                })
            }
        })
    })
}

function transferJife() {
    db.pool.getConnection(function (err, conn) {
        conn.beginTransaction(function (err) {
            if (err) {
                console.log(err);
                return;
            } else {
                //插入
                var insert = function (callback) {
                    //查询抢购码是否已经购买过
                    conn.query("insert ignore into winninglist (shap_up_code,number,activeid,creatime,orderid) values (?,?,?,?,?)", [shapupcode.toUpperCase(), phone, number, dat.addMinutes(new Date(), 5), orderid], function (err, results) {
                        if (err) {
                            callback(err, false)
                        } else {
                            if (results.affectedRows == 1) {
                                //秒杀成功
                                callback(false, true)
                            } else {
                                //秒杀失败（有重复值，重复秒杀）
                                callback("抢购码已被使用", false)
                            }
                        }
                    })
                }
                //插入
                var updatekucun = function (callback) {
                    conn.query("update activity set kucun=kucun-1 where number=? and startime<=? and closetime >=? and kucun>0", [number, new Date(), new Date()], function (err, result) {
                        if (err) {
                            callback(err, false)
                        } else {
                            if (result.affectedRows == 1) {
                                //减库存成功
                                callback(false, true)
                            } else {
                                //减库存失败
                                db.query("select amount from activity where number=?", [number], function (err, result) {
                                    if (err) {
                                        callback(err, false)
                                    } else {
                                        db.query("select count(1) as num from winninglist where activeid=? and ispay=1", [number], function (err, result1) {
                                            if (err) {
                                                callback(err, false)
                                            } else {
                                                if (result[0].amount > result1[0].num) {
                                                    callback(`想要小未的人太多，正在排队中...\n点击确定，继续立即购买`, false)
                                                } else {
                                                    callback("被抢完了", false)
                                                }
                                            }
                                        })
                                    }
                                })
                            }
                        }
                    })
                }

                async.parallel([insert, updatekucun], function callback(err, result) {
                    var errs = err
                    if (!err) {
                        conn.commit(function (err) {
                            if (err) {
                                callbacks(false)
                            }
                            console.log('秒杀成功,提交!');
                            //释放资源
                            conn.release();
                            callbacks({code: 0, msg: "抢购成功"})
                        });
                    } else {
                        conn.rollback(function (err, result) {
                            console.log('秒杀出现错误,回滚!');
                            //释放资源
                            conn.release();
                            callbacks({code: 1, msg: errs})
                        });
                    }
                })
            }
        })
    })
}


/**
 * 返回码状态列表
 * @param phone 手机号
 * @param activeid 活动号
 * @returns {Promise<any>}
 */
function shapuplist(meCodeList, activeid) {
    return new Promise(async function (resolve, reject) {

        for (let i = 0; i < meCodeList.length; i++) {
            if (meCodeList[i].activeid >= activeid) {
                meCodeList[i].flag = true//有效码
            } else {
                meCodeList[i].flag = false//无效码
            }
        }
        resolve(meCodeList)
    })
}

/**
 * 中奖码状态
 * @param shapupcode 码列表
 * @param wincode 中奖码
 */
function winshapuplist(shapupcode, wincode) {
    var win = ""
    for (let i = 0; i < shapupcode.length; i++) {
        if (shapupcode[i].shap_up_code == wincode) {
            shapupcode[i].flag = true//中奖码
            win = shapupcode.splice(i, 1)[0];
        } else {
            shapupcode[i].flag = false
        }
    }
    if (win) {
        shapupcode.unshift(win);
    }
    return shapupcode
}




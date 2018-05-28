/*
手机验证模块
 */
var db = require("../util/db");
var util = require("../util/util")
var wxutil = require("../util/wxutil")
var dat = require("date-and-time")
var LENGTH = require("../config/config")

//获取验证码
exports.getPhoneCode = async function (req, res) {
    try {
        const query = req.body
        const phone = query.phone || ''
        if (!phone) {
            throw ("参数不能为空")
        } else {
            if (util.checkphone(phone)) {
                //进行短信时间限制
                const result = await db.query("select * from people_information where phone=? and expirationtime>? and yanzhengmatype=0", [phone, new Date()])
                if (result.length > 0) {
                    throw("请求频繁，请稍后请求")
                } else {
                    const code = util.makeyanzhengam(LENGTH.suijiLength);
                    util.sendMessage(phone, `【未来声音】您的验证码是：${code}，请尽快验证，感谢您使用。`)
                    const people = await db.query("select * from people_information where phone=?", [phone])
                    if (people.length > 0) {
                        //更新
                        db.query("update people_information set yanzhengma=?,expirationtime=?,yanzhengmatype=0 where phone=?", [code, dat.addMinutes(new Date(), 1), phone])
                    } else {
                        //添加
                        db.query("insert into people_information (phone,yanzhengma,createdatetime,expirationtime) values (?,?,?,?)", [phone, code, new Date(), dat.addMinutes(new Date(), 1)])
                    }
                    util.writeJson(res, 0, "发送成功")
                }
            } else {
                throw ("手机号格式错误")
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}

//助购方法
exports.helpPeople = async function (req, res) {
    try {
        const query = req.body
        const whophone = query.whophone || ''//谁
        const forphone = query.forphone || ''//为谁
        const code = query.code || ''//验证码
        const imgurl = query.imgurl || ''//微信图片
        let nickname = query.nickname || ''//微信昵称
        const openid = query.openid || ''//微信openid
        if (!whophone || !forphone || !code || !imgurl || !nickname || !openid) {
            throw("参数不能为空")
        } else {
            //只能在第一天未开奖前助购
            const timeout = await db.query("select startime from activity where number=1");
            if (new Date() > new Date(timeout[0].startime)) {
                throw("助购活动已结束")
            } else {
                if (whophone == forphone) {
                    throw("Sorry,自己不能助购自己")
                } else {
                    if (util.checkphone(whophone) && util.checkphone(forphone)) {
                        //判断助购用户是否存在
                        const peoplexist = await db.query("select * from people_information where phone=? and token is not null", [forphone])
                        if (peoplexist.length > 0) {
                            if (peoplexist[0].openid == openid) {
                                throw("同一个微信号,不能助购")
                            } else {
                                //判断验证码
                                const people = await db.query("select phone from people_information where phone=? and yanzhengma=? and yanzhengmatype=0", [whophone, code.toUpperCase()])
                                if (people.length > 0) {
                                    const phonebyopenid = await db.query("select phone from people_information where openid=? and openid is not null", [openid])
                                    if (phonebyopenid.length > 0) {
                                        //判断上下家关系
                                        var result = await db.query('select * from shap_up where phone=? and fphone=?', [phonebyopenid[0].phone,forphone])
                                        console.log("1"+JSON.stringify(result))
                                    } else {
                                        //判断上下家关系
                                        var result = await db.query('select * from shap_up where phone=? and fphone=?', [whophone, forphone])
                                        console.log("2"+JSON.stringify(result))
                                    }
                                    console.log("3"+JSON.stringify(result))
                                    if (result.length > 0) {
                                        throw("Sorry,对方为你助购了，你就不能为对方助购了")
                                    } else {
                                        //判断是否已经助购
                                        const data = await db.query("select * from shap_up where phone=? and fphone=?", [forphone, whophone])
                                        if (data.length > 0) {
                                            throw("Sorry,只能为对方助购一次")
                                        } else {
                                            nickname = new Buffer(nickname).toString('base64');
                                            //生成助购码，更新助购人信息（此次活动不能有相同的助购码）
                                            db.query("update people_information set yanzhengmatype=1,imgurl=?,nickname=?,openid=? where phone=?", [imgurl, nickname, openid, whophone])
                                            makezhugou([], 1, forphone, whophone, 1, LENGTH.qianggouLength, function (result) {
                                                console.log(`${whophone} 帮助 ${forphone} 抢码 ：${result}`)
                                            })
                                            util.writeJson(res, 0, "助购成功")
                                        }
                                    }
                                } else {
                                    throw ("验证码错误或验证码失效")
                                }
                            }
                        } else {
                            throw ("没有该用户")
                        }
                    } else {
                        throw("手机号格式错误")
                    }
                }
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}

//第一天活动第一次获得系统赠码
exports.firstSnapUpCode = async function (req, res) {
    try {
        const query = req.body
        const phone = query.phone || ''//手机号
        const code = query.code || ''//验证码
        const openid = query.openid || '' //微信openid
        const imgurl = query.imgurl || ''//微信头像地址
        let nickname = query.nickname || ''//微信昵称
        console.log("第一次领码接口")
        console.log(query)
        if (!phone || !code || !openid || !imgurl || !nickname) {
            throw("参数不能为空")
        } else {
            if (util.checkphone(phone)) {
                //判断在第一天之前（第一天之后此接口关闭）
                const time = await db.query("select number,startime from activity where startime>? order by startime  limit 1", [new Date()])
                if (time.length <= 0 || time[0].number > 1) {
                    throw("开奖时间已过,不能再抢码")
                } else {
                    //判断手机号验证码是否匹配
                    const people = await db.query("select * from people_information where phone=? and yanzhengma=? and yanzhengmatype=0", [phone, code])
                    if (people.length > 0) {
                        //判断是否为第一次抢购
                        const firstphone = await db.query("select * from people_information where phone=? and token is null", [phone])
                        if (firstphone.length > 0) {
                            //判断此openid是否已经绑定手机号了
                            const firstopenid = await db.query("select * from people_information where openid=?", [openid])
                            if (firstopenid.length > 0 && firstopenid[0].phone != phone) {
                                throw(`一个微信号只能绑定一个手机号,您已经绑定${firstopenid[0].phone}`)
                            } else {
                                //第一次（添加个人信息，赠码）
                                const token = util.md5Password(phone + new Date().getTime())
                                nickname = new Buffer(nickname).toString('base64');
                                db.query("update people_information set yanzhengmatype=1,openid=?,imgurl=?,token=?,nickname=? where phone=?", [openid, imgurl, token, nickname, phone])
                                makezhugou([], 1, phone, "666", 1, LENGTH.qianggouLength, function (result) {
                                    console.log(`系统赠送 手机号：${phone} 码 ：${result}`)
                                    // util.writeJson(res, 0, {openid: openid, token: token, shapupcode: result})
                                })
                                util.writeJson(res, 0, {openid: openid, token: token})
                            }
                        } else {
                            //不是第一次
                            throw("不要贪心哦，一个手机号只能领取一次系统赠码")
                        }
                    } else {
                        throw("验证码错误或验证码失效")
                    }
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

//助购页面（只在第一天开奖前展示）
exports.helpToBuyList = async function (req, res) {
    try {
        const query = req.body
        const forphone = query.forphone || '' //为谁 手机号
        const md5 = query.sharemd5 || ''//md5判断进行鉴别
        const wxcode = query.wxcode || ''//用于获取whophone的头像和昵称

        let openid = query.openid || '' //刷新时，传openid
        let imgurl = query.imgurl || ''
        let nickname = query.nickname || ''
        if (!forphone || !md5) {
            throw("参数不能为空")
        } else {
            if (!wxcode && !openid) {
                throw("openid,wxcode必须传一个")
            } else {
                //进行时间的判定
                const timeout = await db.query("select startime from activity where number=1");
                if (new Date() > new Date(timeout[0].startime)) {
                    throw("助购活动已结束,此链接无效")
                } else {
                    //进行phone ，md5的判定
                    if (md5 == util.md5Password(forphone)) {
                        if (wxcode) {
                            //根据code 获取 对方imgurl,nickname
                            const AccessToken = await wxutil.getAccessTokenByCode(wxcode)
                            const whopeopleInformation = await wxutil.getPersonalInformationByAccessToken(AccessToken.access_token, AccessToken.openid)
                            openid = whopeopleInformation.openid
                            imgurl = whopeopleInformation.headimgurl
                            nickname = whopeopleInformation.nickname
                        }
                        const helpToBuy = await db.query('select * from people_information as a,shap_up as b where  a.phone=b.fphone and a.openid= ? and b.phone=? and a.openid is not null', [openid, forphone])
                        if (helpToBuy.length > 0) {
                            //已助购
                            var state = 1
                        } else {
                            //未助购
                            var state = 0
                        }
                        const people = await db.query("select phone,openid,imgurl,nickname from people_information where phone=?", [forphone])

                        //查询助购表
                        const forpeoplelist = await db.query("select b.imgurl,b.nickname,a.shap_up_code from shap_up as a ,people_information as b where a.fphone=b.phone and a.phone =? order by a.createdatetime desc", [forphone])
                        util.writeJson(res, 0, {
                            state: state,//0未助购过,1助购过
                            whopeople: {
                                imgurl: imgurl,
                                nickname: nickname,
                                openid: openid
                            },
                            forpeople: {
                                imgurl: people[0].imgurl,
                                nickname: people[0].nickname,
                                phone: people[0].phone,
                                forpeoplelist: forpeoplelist
                            }
                        })
                    } else {
                        throw("助购链接错误")
                    }
                }
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}
//添加地址
exports.addaddress = async function (req, res) {
    try {
        const query = req.body
        const phone = query.phone || ''
        const token = query.token || ''
        const name = query.name || ''
        const address = query.address || ''
        if (!phone || !token || !name || !address) {
            throw("参数错误")
        } else {
            const people = await db.query("select * from people_information where phone=? and token=?", [phone, token])
            if (people.length > 0) {
                const meaddress = await db.query("select * from address where phone=?", [phone])
                if (meaddress.length > 0) {//更新
                    db.query("update address set name=?,shippingaddress=? where phone=?", [name, address, phone])
                } else {//添加
                    db.query("insert into address (phone,name,shippingaddress) values (?,?,?)", [phone, name, address])
                }
                util.writeJson(res, 0, "添加成功")
            } else {
                throw("token错误")
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}

//查看地址
exports.lookaddress = async function (req, res) {
    try {
        const query = req.query
        const phone = query.phone || ''
        const token = query.token || ''
        if (!phone || !token) {
            throw("参数错误")
        } else {
            const people = await db.query("select * from people_information where phone=? and token=?", [phone, token])
            if (people.length > 0) {
                const meaddress = await db.query("select * from address where phone=?", [phone])
                util.writeJson(res, 0, meaddress[0])
            } else {
                throw("token错误")
            }
        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }
}
//分积分
exports.fenPeiintegral = async function (req, res) {
    try {
        const query = req.body;
        const num = query.num || '' //活动号
        if (!num) {
            throw("参数为空")
        } else {
            const isclose = await db.query("select closetime from activity where number=?", [num])
            // if (new Date(isclose[0].closetime) < new Date()) {
                let winpeople = await db.query("select number from winninglist where ispay=1 and activeid<=?", [num])
                if (winpeople.length > 0) {
                    //分积分
                    const isFenPei = await db.query("select * from integral where active=?", [num])
                    if (isFenPei.length > 0) {
                        throw("已经分配过积分")
                    } else {
                        const peoplenum=[10,30,60,120,240,480,960,1920]
                        const jifen=Math.floor(2000000 / peoplenum[parseInt(num)-1])
                        // const jifen = Math.floor(2000000 / parseInt(winpeople.length))
                        var value = []
                        for (let i = 0; i < Object.values(winpeople).length; i++) {
                            winpeople[i].active = num
                            winpeople[i].jifen = jifen
                            winpeople[i].creatime = new Date()
                            value.push(Object.values(winpeople[i]))
                        }
                        const number = await db.query("insert into integral (phone,active,jifen,creatime) values ?", [value])
                        if (number.affectedRows == value.length) {
                            util.writeJson(res, 0, "分配成功")
                        } else {
                            throw("分配错误请查询数据库")
                        }
                    }
                } else {
                    throw(`第${num}天活动还没有人支付`)
                }
            // } else {
            //     throw(`第${num}天活动还没有结束`)
            // }

        }
    } catch (err) {
        console.log(err)
        util.writeJson(res, 1, err)
    }

}


/**
 * 生成抢购码
 * @param date 抢购码数组
 * @param long  生成几个抢购码
 * @param phone  手机号
 * @param from   助购手机号/系统生成传666
 * @param activeid   活动号
 * @param length  抢购码长度
 * @param callback  回调函数
 * @returns {Promise<void>}
 */
async function makezhugou(date, long, phone, from, activeid, length, callback) {
    if (date.length < long) {
        const suijima = util.makeRandoMnumber(length)
        const num = await db.query("insert ignore into shap_up (shap_up_code,phone,fphone,createdatetime,activeid) values (?,?,?,?,?)", [suijima, phone, from, new Date(), activeid])
        if (num.affectedRows == 1) {
            date.push(suijima)
        }
        makezhugou(date, long, phone, from, activeid, length, callback)

    } else {
        callback(date)
    }
}


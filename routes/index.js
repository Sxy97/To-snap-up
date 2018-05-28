var express = require('express');
var router = express.Router();

const phoneVerificationController = require("../controller/phoneVerificationController");
const shapUpCodeController = require("../controller/shapUpCodeController");
const pay = require("../controller/paymentController");
const WEIXIN = require("../controller/weiXinController")

/**
 * 验证模块
 */
router.post("/getPhoneCodeByLogin", phoneVerificationController.getPhoneCode)//发送验证码(登录，助购，支付)
router.post("/firstSnapUpCode", phoneVerificationController.firstSnapUpCode)//第一天活动第一次获得系统赠码 todo openidtoken
router.post("/helpPeople", phoneVerificationController.helpPeople)//助购验证，(上下家验证)为对方生成助购码(防止生成相同的助购码)
router.post("/helpToBuyList", phoneVerificationController.helpToBuyList)//助购页面
router.post("/addaddress", phoneVerificationController.addaddress)//添加地址
router.post("/fenPeiintegral", phoneVerificationController.fenPeiintegral)//分配积分
router.get("/lookaddress", phoneVerificationController.lookaddress) //查看地址
/**
 * 抢购模块
 */
router.post("/rushToPurchase", shapUpCodeController.rushToPurchase)//抢购

router.post("/homepage", shapUpCodeController.homepage)//抢购主页(根据当前时间判断所处哪个活动，及活动状态)

router.post("/addActive", shapUpCodeController.addActive)//添加活动


router.post("/getintegral", shapUpCodeController.getintegral)//查看积分


router.post("/register",shapUpCodeController.register)//注册
router.post("/transferintegral",shapUpCodeController.transferintegral)//转让积分



//微信模块
router.get("/exploitPattern", WEIXIN.exploitPattern)//启用配置
router.post("/share", WEIXIN.share)

//支付模块

router.post("/callback", pay.callback);//支付回调地址


//测试模块
// router.get("/test",test.test1)


/* 跳转路由 */
router.get('/', function (req, res, next) {
    res.render('home');
});
router.get('/home', function (req, res, next) {
    res.render('home');
});
router.get('/index1', function (req, res, next) {
    res.render('index1');
});
router.get('/index2', function (req, res, next) {
    res.render('index2');
});
router.get('/index3', function (req, res, next) {
    res.render('index3');
});
router.get('/index4', function (req, res, next) {
    res.render('index4');
});
router.get('/index5', function (req, res, next) {
    res.render('index5');
});
router.get('/index6', function (req, res, next) {
    res.render('index6');
});
router.get('/index7', function (req, res, next) {
    res.render('index7');
});
router.get('/index8', function (req, res, next) {
    res.render('index8');
});
router.get('/Invitation', function (req, res, next) {
    res.render('Invitation');
});
router.get('/payment/fulll', function (req, res, next) {
    res.render('payment/fulll');
});
router.get('/dome', function (req, res, next) {
    res.render('dome');
});
module.exports = router;



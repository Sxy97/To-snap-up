
// var sever = "http://192.168.1.10:3000";
var server = 'http://tfm.futuremelody.cn';
// var server = 'http://abc666.ngrok.xiaomiqiu.cn';
// var starttime = new Date("2018/4/24");
//
// setInterval(function () {
//     //当前时间
//     var nowtime = new Date();
//     var time = starttime - nowtime;
//     var hour = parseInt(time / 1000 / 60 / 60 % 24);
//     var minute = parseInt(time / 1000 / 60 % 60);
//     var seconds = parseInt(time / 1000 % 60);
//     $(".hour").text(hour);
//     $(".minus").text(minute);
//     $(".seconds").text(seconds);
//     $('.time').html(hour + "小时" + minute + "分钟" + seconds + "秒");
// }, 1000);

var num;
var time;
function setint(){
    if(num==0){
        clearInterval(time);
        $(".gettime").prop("disabled",false);
        $(".gettime").text("获取验证码")
    }else{
        $(".gettime").prop("disabled",true);
        num -=1;
        $(".gettime").text(num +"秒")
    }
}

// 验证手机号
function isPhone(poneInput,phone) {
    var myreg=/^[1][3,4,5,6,7,8,9][0-9]{9}$/;
    if (!myreg.test(poneInput.val())) {
        alert("请输入正确的手机号");
        return false;
    } else {
        $.ajax({
            url: server+"/getPhoneCodeByLogin",
            data:{
                phone:phone
            },
            type:"post",
            success:function (data) {
                $(".gettime").text("发送成功");
                num = 60;
                clearInterval(time);
                time  = setInterval("setint()",1000)
            }
        })
    }
}

// 点击获取验证码
function getyzm(){
    isPhone($(".phone2"),$(".phone2").val());
}

function getyzm1(){
    isPhone($(".phone1"),$(".phone1").val())
}

// post /firstSnapUpCode  参数 ：phone,code,openid,imgurl,nickname


// 登录点击下一步匹配
function setmsg(){
    var phone = $(".phone1").val();
    var yzm =$(".yzm1").val();
    $.ajax({
        url: server+"/firstSnapUpCode",
        data:{
            phone:phone,
            code:yzm,
            openid:JSON.parse(sessionStorage.getItem('key')).openid,
            imgurl:JSON.parse(sessionStorage.getItem('key')).imgurl,
            nickname:JSON.parse(sessionStorage.getItem('key')).nickname,
        },
        type:"post",
        success:function (data) {
            console.log(data);
            if(data.code == 1){
                alert(data.msg)
            }else{
                sessionStorage.setItem('value',JSON.stringify(data.data));
                window.location.reload();
                // $(".gzgzh").show();
            }
        },
        error:function (err) {
            console.log(err)
        }
    })
}
//点击内容为空


// 获取当前url-->
function getQueryString(name) {
    var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
    var r = window.location.search.substr(1).match(reg);
    if (r != null) {
        return unescape(r[2]);
    }
    return null;
}

// 获取当前url-->
function getQueryString1(name) {
    var reg = new RegExp('(^|*)' + name + '=([^&]*)(&|$)', 'i');
    var r = window.location.href.match(reg);
    if (r != null) {
        return unescape(r[2]);
    }
    return null;
}

function getParams(key) {
    var url = location.search.replace(/^\?/, '').split('*');
    var paramsObj = {};
    for(var i = 0, iLen = url.length; i < iLen; i++) {
        var param = url[i].split('=');
        paramsObj[param[0]] = param[1];
    }
    if(key) {
        return paramsObj[key] || '';
    }
    return paramsObj;
}



//支付调用
$(".purchase").click(function () {
    // alert(22);
    var phone = $(".phone2").val();
    var ma = $(".qgm").val();
    var code1 = $(".yzm").val();
    var md5 = JSON.parse(sessionStorage.getItem("md5"));
    var number = JSON.parse(sessionStorage.getItem("number"));
    var openid = JSON.parse(sessionStorage.getItem('value')).openid;
    // alert(phone);
    $.ajax({
        url: server +"/rushToPurchase",
        type:"post",
        data:{
            phone:phone,
            number:number,
            md5:md5,
            code:code1,
            openid:openid,
            shapupcode:ma,
            imgurl:JSON.parse(sessionStorage.getItem('key')).imgurl
        },
        success:function (data) {
            // alert("成功")
            console.log(data);
            if(data.code == 0){
                //微信
                if(data.data.state == "WX_JSAPI"){
                    console.log(data.data.data);
                    function onBridgeReady(){
                        WeixinJSBridge.invoke(
                            'getBrandWCPayRequest', {
                                "appId":data.data.data.app_id,     //公众号名称，由商户传入
                                "timeStamp":data.data.data.timestamp,         //时间戳，自1970年以来的秒数
                                "nonceStr":data.data.data.nonce_str, //随机串
                                "package":data.data.data.package,
                                "signType":data.data.data.sign_type,         //微信签名方式：
                                "paySign":data.data.data.pay_sign //微信签名
                            },
                            function(res){
                                if(res.err_msg == "get_brand_wcpay_request:ok" ){
                                    // alert(JSON.stringify(res));
                                    var obj = JSON.parse(sessionStorage.getItem("value"));
                                    obj.token = data.data.token;
                                    sessionStorage.setItem("value",JSON.stringify(obj));
                                    $(".addPhone").val(data.data.phone);
                                    if(!data.data.address){
                                        //填写地址
                                        $(".mozhifu").hide();
                                        $(".address").stop().slideDown();
                                        $(".cha").hide();
                                        $("body,html").addClass("html1")
                                    }else{
                                        window.location.reload()
                                    }
                                    // alert(data.data.address);
                                    // alert("支付成功")
                                }     // 使用以上方式判断前端返回,微信团队郑重提示：res.err_msg将在用户支付成功后返回    ok，但并不保证它绝对可靠。
                            }
                        );
                    }
                    if (typeof WeixinJSBridge == "undefined"){
                        if( document.addEventListener ){
                            document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
                        }else if (document.attachEvent){
                            document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
                            document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
                        }
                    }else{
                        onBridgeReady();
                    }
                }else{
                    window.location.href = data.data.url;
                }
            }else {
                alert(data.msg);
            }
        }
    })
});

//支付前
// $(".btn_z").click(function () {
//     if($(".ma").val() ==""){
//         alert("请输入抢购码")
//     }else{
//         if($(".phone").val() == ""){
//             alert("请输入手机号")
//         }else{
//             if($(".yzm").val() == ""){
//                 alert("请输入验证码")
//             }else{
//                 var url ="http://tfm.yanmaiw.com/payment/full.html?shap="+$(".ma").val()+"#md5="+getQueryString("md5")+"#number="+getQueryString("number")+"#phone="+$(".phone").val()+"#code1="+$(".yzm").val();
//                 url = encodeURI(url);
//                 if(isWeiXin()){
//                     var redirectUrl = "https://open.weixin.qq.com/connect/oauth2/authorize?appid=wxff2af56a454e9c05&redirect_uri="+url+"&response_type=code&scope=snsapi_userinfo&state=123#wechat_redirect";
//                     // alert(redirectUrl)
//                     window.location.href= redirectUrl;
//                     // alert("是微信浏览器");
//                 }else{
//                     // alert("不是微信浏览器");
//                     window.location.href = url
//                 }
//             }
//         }
//     }
//
// });
// function isWeiXin(){
//     var ua = window.navigator.userAgent.toLowerCase();
//     if(ua.match(/MicroMessenger/i) == 'micromessenger'){
//         return true;
//     }else{
//         return false;
//     }
// }

//支付
// $(".btn_zf").click(function () {
//     var phone = getQueryString1("phone");
//     var ma = getQueryString1("shap");
//     var code1 = getQueryString1("code1");
//     var md5 = getQueryString1("md5");
//     var number = getQueryString1("number");
//     var channel = $('input[name="zhifu"]:checked').val();
//     alert(phone);
//     $.ajax({
//         url: sever +"/rushToPurchase",
//         type:"post",
//         data:{
//             phone:phone,
//             number:number,
//             md5:md5,
//             code:code1,
//             openid:opid,
//             shapupcode:ma,
//             channel:channel,
//         },
//         success:function (data) {
//             // alert("成功")
//             console.log(data);
//             if(data.code == 0){
//                 //微信
//                 if(data.data.state == "WX_JSAPI"){
//                     console.log(data.data.data);
//                     function onBridgeReady(){
//                         WeixinJSBridge.invoke(
//                             'getBrandWCPayRequest', {
//                                 "appId":data.data.data.app_id,     //公众号名称，由商户传入
//                                 "timeStamp":data.data.data.timestamp,         //时间戳，自1970年以来的秒数
//                                 "nonceStr":data.data.data.nonce_str, //随机串
//                                 "package":data.data.data.package,
//                                 "signType":data.data.data.sign_type,         //微信签名方式：
//                                 "paySign":data.data.data.pay_sign //微信签名
//                             },
//                             function(res){
//                                 if(res.err_msg == "get_brand_wcpay_request:ok" ) {}     // 使用以上方式判断前端返回,微信团队郑重提示：res.err_msg将在用户支付成功后返回    ok，但并不保证它绝对可靠。
//                             }
//                         );
//                     }
//                     if (typeof WeixinJSBridge == "undefined"){
//                         if( document.addEventListener ){
//                             document.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
//                         }else if (document.attachEvent){
//                             document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
//                             document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
//                         }
//                     }else{
//                         onBridgeReady();
//                     }
//                 }else{
//                     window.location.href = data.data.url;
//                 }
//             }else {
//                 alert(data.msg);
//             }
//         }
//     })
// });
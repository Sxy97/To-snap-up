
/*首页     大字：    抢购小未，来自未来的音箱
小字：首日10台全球创世抢购。不只是日进斗金，钱程似锦；还能决定后来小未花落谁家。

要求好友帮我抢购    大字： 抢购小未，就靠你了老铁。
小字：如果能抢到这台创世版音箱简直此生无憾了，跪求老铁助我一臂之力！*/



//微信分享
/*$.ajax({
    url: server + "/share",  //接口地址
    type:"POST",
    dataType:"json",
    data:{
        "url": window.location.href,
    },
    success:function(data){
        console.log(data.data);
        $(".Invitation").click(function () {
            // $(".moban").show();
            wxstart(data.data, 'http://tfm.futuremelody.cn/index8?forphone='+phone);
        });
    }
});*/
$(".moYao").click(function () {
    $(this).stop().slideUp();
    $("body,html").removeClass("html1");
})

$(".yao button").click(function () {
    //微信分享
    $.ajax({
        url: server + "/share",  //接口地址
        type:"POST",
        dataType:"json",
        data:{
            "url": window.location.href,
        },
        success:function(data){
            console.log(data);
            $(".moYao").stop().slideDown();
            $("body,html").addClass("html1");
            var phone = JSON.parse(sessionStorage.getItem("value")).phone;
            var sharemd5 = JSON.parse(sessionStorage.getItem("value")).sharemd5;
            // $(".moban").show();
            wxstart(data.data, server+'/index7?forphone='+phone+'&sharemd5='+sharemd5);
        }
    });
});


function wxstart(data, url){
    var url = url;  //分享的文章地址
    var appId = data.appId;
    var timestamp = data.timestamp;
    var nonceStr = data.nonceStr;
    var signature = data.signature;

    // alert(data.appId+","+data.timestamp+","+data.nonceStr+","+data.signature);
    wx.config({
        debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
        appId: appId, // 必填，公众号的唯一标识
        timestamp: timestamp, // 必填，生成签名的时间戳
        nonceStr: nonceStr, // 必填，生成签名的随机串
        signature: signature,// 必填，签名，见附录1
        jsApiList: ["onMenuShareTimeline", "onMenuShareAppMessage", "onMenuShareQQ"] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
    });

    wx.ready(function(){
        // var imgurl = 'https://' + window.location.hostname + '/static/customerHtml/img/weixinshare.jpg';
        // var title = '';
        // var desc = '';
        wx.onMenuShareTimeline({
            title: "颠覆想象的小未音箱，快帮我抢", // 分享标题
            desc: '第一批创世版，全球仅有10台。', // 分享描述
            link: url, // 分享链接
            imgUrl: 'http://tfm.futuremelody.cn/img/fx.png', // 分享图标
            success: function () {
                $(".moYao").stop().slideDown();
                $(".ewm").stop().show();
                $(".shou").stop().show();
                // alert("确认分享")
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // alert("取消分享")
                // 用户取消分享后执行的回调函数
            }
        });

        wx.onMenuShareAppMessage({
            title: "颠覆想象的小未音箱，快帮我抢", // 分享标题
            desc: "第一批创世版，全球仅有10台。", // 分享描述
            link: url, // 分享链接
            imgUrl: "http://tfm.futuremelody.cn/img/fx.png", // 分享图标
            type: '', // 分享类型,music、video或link，不填默认为link
            dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
            success: function () {
                // alert("确认分享")
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // alert("取消分享")
                // 用户取消分享后执行的回调函数
            }
        });

        wx.onMenuShareQQ({
            title: "qq分享", // 分享标题
            desc: "", // 分享描述
            link: url, // 分享链接
            imgUrl: "", // 分享图标
            success: function () {
                // alert("确认分享")
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // alert("取消分享")
                // 用户取消分享后执行的回调函数
            },
        });

    // <%--处理失败验证--%>
        wx.error(function (res) {
            console.log("error: " + res.errMsg);
        });
    });
}

//首页分享
function wxstart1(data, url){
    var url = url;  //分享的文章地址
    var appId = data.appId;
    var timestamp = data.timestamp;
    var nonceStr = data.nonceStr;
    var signature = data.signature;

    // alert(data.appId+","+data.timestamp+","+data.nonceStr+","+data.signature);
    wx.config({
        debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
        appId: appId, // 必填，公众号的唯一标识
        timestamp: timestamp, // 必填，生成签名的时间戳
        nonceStr: nonceStr, // 必填，生成签名的随机串
        signature: signature,// 必填，签名，见附录1
        jsApiList: ["onMenuShareTimeline", "onMenuShareAppMessage", "onMenuShareQQ"] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
    });

    wx.ready(function(){
        // var imgurl = 'https://' + window.location.hostname + '/static/customerHtml/img/weixinshare.jpg';
        // var title = '';
        // var desc = '';
        wx.onMenuShareTimeline({
            title: "抢创世版音箱，赢光明钱途", // 分享标题
            desc: '小未区块链智能音箱，创世版全球仅10台。', // 分享描述
            link: url, // 分享链接
            imgUrl: 'http://tfm.futuremelody.cn/img/fx.png', // 分享图标
            success: function () {
                // alert("确认分享")
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // alert("取消分享")
                // 用户取消分享后执行的回调函数
            }
        });

        wx.onMenuShareAppMessage({
            title: "抢创世版音箱，赢光明钱途", // 分享标题
            desc: "小未区块链智能音箱，创世版全球仅10台。", // 分享描述
            link: url, // 分享链接
            imgUrl: "http://tfm.futuremelody.cn/img/fx.png", // 分享图标
            type: '', // 分享类型,music、video或link，不填默认为link
            dataUrl: '', // 如果type是music或video，则要提供数据链接，默认为空
            success: function () {
                // alert("确认分享")
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // alert("取消分享")
                // 用户取消分享后执行的回调函数
            }
        });

        wx.onMenuShareQQ({
            title: "qq分享", // 分享标题
            desc: "", // 分享描述
            link: url, // 分享链接
            imgUrl: "", // 分享图标
            success: function () {
                // alert("确认分享")
                // 用户确认分享后执行的回调函数
            },
            cancel: function () {
                // alert("取消分享")
                // 用户取消分享后执行的回调函数
            },
        });

        // <%--处理失败验证--%>
        wx.error(function (res) {
            console.log("error: " + res.errMsg);
        });
    });
}
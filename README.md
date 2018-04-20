## 目录：
[1、助购别人](#1助购别人)<br/>
[2、主页](#2主页)<br/>
[3、抢购、付款链接](#3抢购、付款链接)<br/>

### 1、助购别人

#### 请求URL:
```
/helpPeople
```

#### 请求方式: 
```
POST
```

#### 请求参数

|参数|是否必选|类型|说明|
|:-----|:-------:|:-----|:-----|
|whophone    |Y       |string|助购人|
|forphone   |Y       |string|为谁助购|
|code     |Y       |string|验证码|

#### 返回示例：

```javascript
{
    "code": 0,
    "data": "YQ02"//为他人生成的抢购码
}
```

### 2、主页

#### 请求URL:
```
/homepage
```

#### 请求方式: 
```
get
```



#### 返回示例：

```javascript
//各种状态
{
    "code": 0,
    "data": {
        "msg": "已经被抢完"
    }
}
{
    "code": 0,
    "data": {
        "msg": "已经被抢完",
        "nextime": {
            "number": 2,
            "startime": "2018-04-21 13:35:00"
        }
    }
}
{
    "code": 0,
    "data": {
        "number": 2,
        "startime": "2018-04-21 13:35:00"
    }
}
。。。。。等
```

### 3、抢购、付款链接

#### 请求URL:
```
/rushToPurchase
```

#### 请求方式: 
```
POST
```

#### 请求参数

|参数|是否必选|类型|说明|
|:-----|:-------:|:-----|:-----|
|phone    |Y       |string|手机号|
|md5   |Y       |string|md5值|
|code     |Y       |string|验证码|
|shapupcode     |Y       |string|抢购码|
|number|Y|string|活动号|

#### 返回示例：

```javascript
待定
```


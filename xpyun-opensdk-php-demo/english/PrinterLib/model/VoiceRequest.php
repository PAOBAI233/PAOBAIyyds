<?php

namespace Xpyun\model;
class VoiceRequest extends RestRequest
{
    //*Required*: The serial number of the printer
    var $sn;

    //payment method:
    //Value range 41~55:
    //Alipay 41, WeChat 42, Cloud Payment 43, UnionPay Swipe 44, UnionPay Payment 45, Member Card Consumption 46, Member Card Recharge 47, Yipay 48, Successful Collection 49, Jialian Payment 50, One Wallet 51, JD Pay 52, Quick money payment 53, Granville payment 54, Xiangqian payment 55
    //It is only used for Xinye cloud printers that support the amount broadcast.
    var $payType;
    //Pay or not:
    //Value range 59~61:
    //Refund 59 to account 60 consumption 61.
    //It is only used for Xinye cloud printers that support the amount broadcast.
    var $payMode;
    //Payment amount:
    //Up to 2 decimal places are allowed.
    //It is only used for Xinye cloud printers that support the amount broadcast.
    var $money;
}

?>
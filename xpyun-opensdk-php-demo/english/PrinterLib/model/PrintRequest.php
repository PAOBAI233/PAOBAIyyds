<?php

namespace Xpyun\model;
class PrintRequest extends RestRequest
{

    //*Required*: The serial number of the printer
    var $sn;

    //*Required*: The content to be printed can’t exceed 12288 bytes.
    var $content;

    //The number of printed copies is 1 by default.
    var $copies = 1;

    //Print mode:
    //If the value is 0 or not specified, it will check whether the printer is online. If not online, it will not generate a print order and directly return the status code of an offline device.
    //If online, it will generate a print order and return the print order number.If the value is 1, it will not check whether the printer is online, directly generate a print order and return the print order number.
    //If the printer is not online, the order will be cached in the print queue and will be printed automatically when the printer is normally online.
    var $mode = 0;

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
	//Sound playback mode, 0 for cancel the order mode, 1 for mute mode, 2 for single playback mode, default is 2 for single playback mode
    var $voice = 2;
}

?>
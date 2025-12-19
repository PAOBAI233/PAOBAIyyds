<?php

use Xpyun\model\AddPrinterRequest;
use Xpyun\model\AddPrinterRequestItem;
use Xpyun\model\DelPrinterRequest;
use Xpyun\model\PrinterRequest;
use Xpyun\model\QueryOrderStateRequest;
use Xpyun\model\QueryOrderStatisRequest;
use Xpyun\model\SetVoiceTypeRequest;
use Xpyun\model\UpdPrinterRequest;
use Xpyun\model\VoiceRequest;
use Xpyun\service\PrintService;

/**
 * Class XpsdkOtherApiDemo
 * Printer management
 */
class XpsdkOtherApiDemo
{
    /**
     * Print service object instantiation
     */
    private $service;

    public function __construct()
    {
        $this->service = new PrintService();
    }

    /**
     * add printers in batch
     */
    public function addPrintersTest()
    {
        //Printer list
        $request = new AddPrinterRequest();

        $requestItem1 = new AddPrinterRequestItem();
        //*Required*: The printer number must be a real printer number,
        // otherwise it will cause the subsequent api to fail to print
        $requestItem1->sn = OK_PRINTER_SN;
        //Printer name
        $requestItem1->name = "测试打印机";

        $requestItems = array($requestItem1);

        $request->generateSign();
        //*Required*: Array elements are json objects.
        //{"cardno": "traffic card number", "idcode": "printer identifying code","name":"printer name", "sn":"serial number of printer"}
        //The fields of sn and name are required, and a maximum 50 sets can be added each time.
        $request->items = $requestItems;

        $result = $this->service->xpYunAddPrinters($request);
        //$result->content->data: Return one json object, including success and failure information, see https://www.xpyun.net/open/index.html example
        //{"code":0,"msg":"ok","data":{"success":["UffietiT46XF2u4","I3kHP4RMcL5jU39"],"fail":["111"]},"serverExecutedTime":0}
        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        var_dump($result->content->data);
    }

    /**
     * set voice type for printer
     * voice type: 0:live big, 1:live middle, 2:live small, 3:beep, 4:muted
     */
    function setVoiceTypeTest()
    {
        $request = new SetVoiceTypeRequest();
        $request->generateSign();
        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        //Voice type: 0 human voice (loud) 1 human voice (medium) 2 human voice (low) 3 Ticking  4 Mute sound
        $request->voiceType = 1;

        $result = $this->service->xpYunSetVoiceType($request);
        //$result->content->data: Return to a Boolean type: true indicates a successful setting and false indicates a failed setting.
        print $result->content->code;
        print $result->content->msg;
        var_dump($result->content->data);
    }

    /**
     * delete printer in batch
     */
    function delPrintersTest()
    {
        $request = new DelPrinterRequest();
        $request->generateSign();
        //*Required*: A set of printer serial number, which is string array.
        $snlist = array();
        //*Required*: The serial number of the printer
        $snlist[0] = OK_PRINTER_SN;
        $request->snlist = $snlist;

        $result = $this->service->xpYunDelPrinters($request);
        //$result->content->data:Return one json object, including success and failure information, see https://www.xpyun.net/open/index.html example
        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        var_dump($result->content->data);
    }

    /**
     * modify information of your printer
     */
    function updPrinterTest()
    {
        $request = new UpdPrinterRequest();
        $request->generateSign();
        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;
        //*Required*: Name of the printer
        $request->name = "X58C75432";

        $result = $this->service->xpYunUpdatePrinter($request);
        //$result->content->data:Return to a Boolean type: true indicates a successful setting and false indicates a failed setting.
        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        print $result->content->data . "\n";
        var_dump($result->content->data);
    }

    /**
     * clear printer queue
     */
    function delPrinterQueueTest()
    {
        $request = new PrinterRequest();
        $request->generateSign();
        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        $result = $this->service->xpYunDelPrinterQueue($request);
        //$result->content->data:Return to a Boolean type: true indicates a successful setting and false indicates a failed setting.
        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        print $result->content->data . "\n";
        var_dump($result->content->data);
    }

    /**
     * check if the order is printed successfully
     */
    function queryOrderStateTest()
    {
        $request = new QueryOrderStateRequest();
        $request->generateSign();
        //*Required*: The order ID is returned by the “print order” interface.
        $request->orderId = "OM30102113431016894227";
        $result = $this->service->xpYunQueryOrderState($request);
        //$result->content->data:True indicates return after printed and false indicates return not printed.
        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        print $result->content->data . "\n";
        var_dump($result->content->data);
    }

    /**
     * query order statistics for printer on a certain day
     */
    function queryOrderStatisTest()
    {
        $request = new QueryOrderStatisRequest();
        $request->generateSign();
        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;
        //*Required*: Query date, format in yyyy-MM-dd, e.g. 2020-10-21
        $request->date = "2020-10-21";
        $result = $this->service->xpYunQueryOrderStatis($request);
        //$result->content->data:Json object, return the order quantity printed and to be printed, e.g. {"printed": 2,"waiting": 0}
        print $result->content->code;
        print $result->content->msg;
        var_dump($result->content->data);
    }

    /**
     * query status of printer
     */
    function queryPrinterStatusTest()
    {
        $request = new PrinterRequest();
        $request->generateSign();
        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        $result = $this->service->xpYunQueryPrinterStatus($request);
        //$result->content->data:Return to the printer status value, three types in total:
        //0 indicates offline status.
        //1 indicates online and normal status.
        //2 indicates online and out of paper.
        //Remarks: if the printer has been out of contact with the server for more than 30s, it can be confirmed to be offline status.

        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        print $result->content->data . "\n";
        var_dump($result->content->data);
    }

    /**
     * Amount broadcast
     */
    function playVoiceTest()
    {
        $request = new VoiceRequest();
        $request->generateSign();
        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;
        //payment method:
        //Value range 41~55:
        //Alipay 41, WeChat 42, Cloud Payment 43, UnionPay Swipe 44, UnionPay Payment 45, Member Card Consumption 46, Member Card Recharge 47, Yipay 48, Successful Collection 49, Jialian Payment 50, One Wallet 51, JD Pay 52, Quick money payment 53, Granville payment 54, Xiangqian payment 55
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->payType = 41;
        //Pay or not:
        //Value range 59~61:
        //Refund 59 to account 60 consumption 61.
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->payMode = 59;

        $request->money = 24.15;
        //Payment amount:
        //Up to 2 decimal places are allowed.
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $result = $this->service->xpYunPlayVoice($request);
        //$result->content->data:Returns 0 correctly
        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        print $result->content->data . "\n";
        var_dump($result->content->data);
    }
}

?>
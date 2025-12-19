<?php

use Xpyun\model\PrintRequest;
use Xpyun\service\PrintService;
use Xpyun\util\NoteFormatter;

/**
 * Class XpsdkPrintApiDemo
 * Print example
 */
class XpsdkPrintApiDemo
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
     * Example of font alignment for small ticket printing, does not support amount broadcast
     * Note: Do not use the alignment labels L C R CB in nesting. The inner label is valid while the outer label is invalid;
     * Do not use multiple alignment labels in the same row, otherwise only the last alignment label is valid
     */
    public function printFontAlign()
    {
        /**
         * <BR>：Line break (a closing tag on the same line (such as </C>) should be placed before the closing tag, two consecutive line breaks <BR><BR> can mean adding a blank line)
         *  <L></L>：Align left
         *  <C></C>：Align center
         *  <R></R>：Align right
         *  Note: Multiple alignment methods cannot be used for the same line of content, and the alignment style can be customized by adding spaces.
         *       58mm machine, 16 Chinese characters and 32 letters can be printed in one line
         *       80mm machine, print 24 Chinese characters and 48 letters in one line
         *
         *  <N></N>：Normal font size
         *  <HB></HB>：double font in height
         *  <WB></WB>：double font in width
         *  <B></B>：double font in size
         *  <CB></CB>：double font in size centred
         *  <HB2></HB2>：Triple font height
         *  <WB2></WB2>：Triple font width
         *  <B2></B2>：Triple font size
         *  <BOLD></BOLD>：bold font
         *  <IMG></IMG>: To print the LOGO picture, you need to log in to the open platform and upload it by setting the LOGO function under [Printer Management = "Device Management]. Write directly here
         *           Empty tags, such as <IMG></IMG>, please refer to the sample for details.
         *           Picture width setting: It can be customized by the <IMG> tag name, such as <IMG60> means the width is 60, the corresponding closed tag </IMG>
         *           No need to specify height. The <IMG> tag does not specify the width, the default is 40, the minimum is 20, and the maximum is 100
         *  <QR></QR>：QR code (the label content is the value of the QR code, the maximum cannot exceed 256 characters, and a single order can only print one QR code).
         *             QR code width setting: It can be customized by <QR> tag name, for example, <QR180> means the width is 180, and the corresponding closed tag </QR>
         *             No need to specify width. The <QR> tag does not specify a width, the default is 110, the minimum is 90, and the maximum is 180
         *  <BARCODE></BARCODE>：Barcode (the content of the label is the barcode value)
         */
        $printContent = <<<EOF
no element：default font<BR>
<BR>
L element: <L>left<BR></L>
<BR>
R element: <R>right<BR></R>
<BR>
C element: <C>center<BR></C>
<BR>
N element：<N>normal font size<BR></N>
<BR>
HB element: <HB>double font height<BR></HB>
<BR>
WB element: <WB>double font width<BR></WB>
<BR>
B element: <B>double font size<BR></B>
<BR>
HB2 element: <HB2>triple font height<BR></HB2>
<BR>
WB2 element: <WB2>triple font width<BR></WB2>
<BR>
B2 element: <B2>triple font size<BR></B2>
<BR>
BOLD element: <BOLD>bold font<BR></BOLD>
EOF;

        // neseted using font and align element
        $printContent = $printContent . '<BR>';
        $printContent = $printContent . '<C>nested use：<BOLD>center bold</BOLD><BR></C>';

        //print barcode and QR
        $printContent = $printContent . '<BR>';
        $printContent = $printContent . '<C><BARCODE>9884822189</BARCODE></C>';
        $printContent = $printContent . '<C><QR>https://www.xpyun.net</QR></C>';


        $request = new PrintRequest();
        $request->generateSign();

        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        //*Required*: The content to be printed can’t exceed 12288 bytes.
        $request->content = $printContent;

        //The number of printed copies is 1 by default.
        $request->copies = 1;
		
		// Sound playback mode, 0 for cancel the order mode, 1 for mute mode, 2 for single playback mode,3. Apply for refund for some users. default is 2 for single playback mode
		$request->voice = 2;

        //Print mode:
        //If the value is 0 or not specified, it will check whether the printer is online. If not online, it will not generate a print order and directly return the status code of an offline device.
        //If online, it will generate a print order and return the print order number.If the value is 1, it will not check whether the printer is online, directly generate a print order and return the print order number.
        //If the printer is not online, the order will be cached in the print queue and will be printed automatically when the printer is normally online.
        $request->mode = 0;

        $result = $this->service->xpYunPrint($request);
        //$result->content->data:Return to order No. correctly
        print $result->content->code . "\n";
        print $result->content->msg . "\n";

        //data:Return to order No. correctly
        print $result->content->data . "\n";
    }

    /**
     * sample for receipt using font and alignment in nest,support voice broadcast
     * notice: 1. do not nested use alignment elements like L C R CB. for example, <L><C>your text<C/><L/>,
     * element C inside will be valid while element L will be invalid
     * 2. do not use multiple alignment elements in the same. for example, <L>left<L/><C>center<C/>,
     * only the last alignment element C is valid
     */
    public function printFontAlignVoiceSupport()
    {
        /**
         * <BR>：Line break (a closing tag on the same line (such as </C>) should be placed before the closing tag, two consecutive line breaks <BR><BR> can mean adding a blank line)
         *  <L></L>：Align left
         *  <C></C>：Align center
         *  <R></R>：Align right
         *  Note: Multiple alignment methods cannot be used for the same line of content, and the alignment style can be customized by adding spaces.
         *       58mm machine, 16 Chinese characters and 32 letters can be printed in one line
         *       80mm machine, print 24 Chinese characters and 48 letters in one line
         *
         *  <N></N>：Normal font size
         *  <HB></HB>：double font in height
         *  <WB></WB>：double font in width
         *  <B></B>：double font in size
         *  <CB></CB>：double font in size centred
         *  <HB2></HB2>：Triple font height
         *  <WB2></WB2>：Triple font width
         *  <B2></B2>：Triple font size
         *  <BOLD></BOLD>：bold font
         *  <IMG></IMG>: To print the LOGO picture, you need to log in to the open platform and upload it by setting the LOGO function under [Printer Management = "Device Management]. Write directly here
         *           Empty tags, such as <IMG></IMG>, please refer to the sample for details.
         *           Picture width setting: It can be customized by the <IMG> tag name, such as <IMG60> means the width is 60, the corresponding closed tag </IMG>
         *           No need to specify height. The <IMG> tag does not specify the width, the default is 40, the minimum is 20, and the maximum is 100
         *  <QR></QR>：QR code (the label content is the value of the QR code, the maximum cannot exceed 256 characters, and a single order can only print one QR code).
         *             QR code width setting: It can be customized by <QR> tag name, for example, <QR180> means the width is 180, and the corresponding closed tag </QR>
         *             No need to specify width. The <QR> tag does not specify a width, the default is 110, the minimum is 90, and the maximum is 180
         *  <BARCODE></BARCODE>：Barcode (the content of the label is the barcode value)
         */
        $printContent = <<<EOF
no element：default font<BR>
<BR>
L element: <L>left<BR></L>
<BR>
R element: <R>right<BR></R>
<BR>
C element: <C>center<BR></C>
<BR>
N element：<N>normal font size<BR></N>
<BR>
HB element: <HB>double font height<BR></HB>
<BR>
WB element: <WB>double font width<BR></WB>
<BR>
B element: <B>double font size<BR></B>
<BR>
HB2 element: <HB2>triple font height<BR></HB2>
<BR>
WB2 element: <WB2>triple font width<BR></WB2>
<BR>
B2 element: <B2>triple font size<BR></B2>
<BR>
BOLD element: <BOLD>bold font<BR></BOLD>
<BR>
<C>nested use：<BOLD>center bold</BOLD><BR></C>
<BR>
<C><BARCODE>9884822189</BARCODE></C>
<C><QR>https://www.xpyun.net</QR></C>
EOF;

        $request = new PrintRequest();
        $request->generateSign();

        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        //*Required*: The content to be printed can’t exceed 12288 bytes.
        $request->content = $printContent;

        //The number of printed copies is 1 by default.
        $request->copies = 1;


        // Sound playback mode, 0 for cancel the order mode, 1 for mute mode, 2 for single playback mode,3. Apply for refund for some users. default is 2 for single playback mode
		$request->voice = 2;

        //Print mode:
        //If the value is 0 or not specified, it will check whether the printer is online. If not online, it will not generate a print order and directly return the status code of an offline device.
        //If online, it will generate a print order and return the print order number.If the value is 1, it will not check whether the printer is online, directly generate a print order and return the print order number.
        //If the printer is not online, the order will be cached in the print queue and will be printed automatically when the printer is normally online.
        $request->mode = 0;

        //payment method:
        //Value range 41~55:
        //Alipay 41, WeChat 42, Cloud Payment 43, UnionPay Swipe 44, UnionPay Payment 45, Member Card Consumption 46, Member Card Recharge 47, Yipay 48, Successful Collection 49, Jialian Payment 50, One Wallet 51, JD Pay 52, Quick money payment 53, Granville payment 54, Xiangqian payment 55
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->payType = 41;

        //Pay or not:
        //Value range 59~61:
        //Refund 59 to account 60 consumption 61.
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->payMode = 60;

        //Payment amount:
        //Up to 2 decimal places are allowed.
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->money = 20.15;

        $result = $this->service->xpYunPrint($request);
        //$result->content->data:Return to order No. correctly
        print $result->content->code . "\n";
        print $result->content->msg . "\n";
        print $result->content->data . "\n";
    }

    /**
     * complex alignment sample for note,don't support voice broadcast
     * notice: 58mm printer can print 32 characters per line
     */
    function printComplexReceipt()
    {
        /**
         * <BR>：Line break (a closing tag on the same line (such as </C>) should be placed before the closing tag, two consecutive line breaks <BR><BR> can mean adding a blank line)
         *  <L></L>：Align left
         *  <C></C>：Align center
         *  <R></R>：Align right
         *  Note: Multiple alignment methods cannot be used for the same line of content, and the alignment style can be customized by adding spaces.
         *       58mm machine, 16 Chinese characters and 32 letters can be printed in one line
         *       80mm machine, print 24 Chinese characters and 48 letters in one line
         *
         *  <N></N>：Normal font size
         *  <HB></HB>：double font in height
         *  <WB></WB>：double font in width
         *  <B></B>：double font in size
         *  <CB></CB>：double font in size centred
         *  <HB2></HB2>：Triple font height
         *  <WB2></WB2>：Triple font width
         *  <B2></B2>：Triple font size
         *  <BOLD></BOLD>：bold font
         *  <IMG></IMG>: To print the LOGO picture, you need to log in to the open platform and upload it by setting the LOGO function under [Printer Management = "Device Management]. Write directly here
         *           Empty tags, such as <IMG></IMG>, please refer to the sample for details.
         *           Picture width setting: It can be customized by the <IMG> tag name, such as <IMG60> means the width is 60, the corresponding closed tag </IMG>
         *           No need to specify height. The <IMG> tag does not specify the width, the default is 40, the minimum is 20, and the maximum is 100
         *  <QR></QR>：QR code (the label content is the value of the QR code, the maximum cannot exceed 256 characters, and a single order can only print one QR code).
         *             QR code width setting: It can be customized by <QR> tag name, for example, <QR180> means the width is 180, and the corresponding closed tag </QR>
         *             No need to specify width. The <QR> tag does not specify a width, the default is 110, the minimum is 90, and the maximum is 180
         *  <BARCODE></BARCODE>：Barcode (the content of the label is the barcode value)
         */
        $printContent = "";

        $printContent = $printContent . "<C>" . "<B>xpyun receipt</B>" . "<BR></C>";
        $printContent = $printContent . "<BR>";

        $printContent = $printContent . "name" . str_repeat(" ", 16) . "count" . str_repeat(" ", 2) . "price" . str_repeat(" ", 2)
            . "<BR>";
        $printContent = $printContent . str_repeat("-", 32) . "<BR>";
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Stewed Ribs", 2, 9.99);
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Boiled Fish", 1, 108.0);
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Braised Codfish with Mushrooms", 1, 99.9);
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Braised Squid", 5, 19.99);
        $printContent = $printContent . str_repeat("-", 32) . "<BR>";
        $printContent = $printContent . "<R>" . "total：" . "$327.83" . "<BR></R>";

        $printContent = $printContent . "<BR>";
        $printContent = $printContent . "<L>"
        . "address：" . "Broadway, New York City" . "<BR>"
        . "phone：" . "1363*****88" . "<BR>"
        . "orderTime：" . "2020-9-9 15:07:57" . "<BR>"
        . "remarks：" . "Less spicy, no coriander" . "<BR>";

        $printContent = $printContent . "<C>"
            . "<QR>https://www.xpyun.net</QR>"
            . "</C>";

        print $printContent;

        $request = new PrintRequest();
        $request->generateSign();

        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        //*Required*: The content to be printed can’t exceed 12288 bytes.
        $request->content = $printContent;

        //The number of printed copies is 1 by default.
        $request->copies = 1;


        // Sound playback mode, 0 for cancel the order mode, 1 for mute mode, 2 for single playback mode,3. Apply for refund for some users. default is 2 for single playback mode
		$request->voice = 2;
        //Print mode:
        //If the value is 0 or not specified, it will check whether the printer is online. If not online, it will not generate a print order and directly return the status code of an offline device.
        //If online, it will generate a print order and return the print order number.If the value is 1, it will not check whether the printer is online, directly generate a print order and return the print order number.
        //If the printer is not online, the order will be cached in the print queue and will be printed automatically when the printer is normally online.
        $request->mode = 0;

        $result = $this->service->xpYunPrint($request);
        print $result->content->code . "\n";
        print $result->content->msg . "\n";

        //data:Return to order No. correctly
        print $result->content->data . "\n";
    }


    /**
     * complex alignment sample for note,support voice broadcast
     * notice: 58mm printer can print 32 characters per line
     */
    function printComplexReceiptVoiceSupport()
    {
        /**
         * <BR>：Line break (a closing tag on the same line (such as </C>) should be placed before the closing tag, two consecutive line breaks <BR><BR> can mean adding a blank line)
         *  <L></L>：Align left
         *  <C></C>：Align center
         *  <R></R>：Align right
         *  Note: Multiple alignment methods cannot be used for the same line of content, and the alignment style can be customized by adding spaces.
         *       58mm machine, 16 Chinese characters and 32 letters can be printed in one line
         *       80mm machine, print 24 Chinese characters and 48 letters in one line
         *
         *  <N></N>：Normal font size
         *  <HB></HB>：double font in height
         *  <WB></WB>：double font in width
         *  <B></B>：double font in size
         *  <CB></CB>：double font in size centred
         *  <HB2></HB2>：Triple font height
         *  <WB2></WB2>：Triple font width
         *  <B2></B2>：Triple font size
         *  <BOLD></BOLD>：bold font
         *  <IMG></IMG>: To print the LOGO picture, you need to log in to the open platform and upload it by setting the LOGO function under [Printer Management = "Device Management]. Write directly here
         *           Empty tags, such as <IMG></IMG>, please refer to the sample for details.
         *           Picture width setting: It can be customized by the <IMG> tag name, such as <IMG60> means the width is 60, the corresponding closed tag </IMG>
         *           No need to specify height. The <IMG> tag does not specify the width, the default is 40, the minimum is 20, and the maximum is 100
         *  <QR></QR>：QR code (the label content is the value of the QR code, the maximum cannot exceed 256 characters, and a single order can only print one QR code).
         *             QR code width setting: It can be customized by <QR> tag name, for example, <QR180> means the width is 180, and the corresponding closed tag </QR>
         *             No need to specify width. The <QR> tag does not specify a width, the default is 110, the minimum is 90, and the maximum is 180
         *  <BARCODE></BARCODE>：Barcode (the content of the label is the barcode value)
         */
        $printContent = "";

        $printContent = $printContent . "<C>" . "<B>xpyun receipt</B>" . "<BR></C>";
        $printContent = $printContent . "<BR>";

        $printContent = $printContent . "name" . str_repeat(" ", 16) . "count" . str_repeat(" ", 2) . "price" . str_repeat(" ", 2)
            . "<BR>";
        $printContent = $printContent . str_repeat("-", 32) . "<BR>";
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Stewed Ribs", 2, 9.99);
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Boiled Fish", 1, 108.0);
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Braised Codfish with Mushrooms", 1, 99.9);
        $printContent = $printContent . NoteFormatter::formatPrintOrderItem("Braised Squid", 5, 19.99);
        $printContent = $printContent . str_repeat("-", 32) . "<BR>";
        $printContent = $printContent . "<R>" . "total：" . "$327.83" . "<BR></R>";

        $printContent = $printContent . "<BR>";
        $printContent = $printContent . "<L>"
        . "address：" . "Broadway, New York City" . "<BR>"
        . "phone：" . "1363*****88" . "<BR>"
        . "orderTime：" . "2020-9-9 15:07:57" . "<BR>"
        . "remarks：" . "Less spicy, no coriander" . "<BR>";

        $printContent = $printContent . "<C>"
            . "<QR>https://www.xpyun.net</QR>"
            . "</C>";

        $request = new PrintRequest();
        $request->generateSign();

        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        //*Required*: The content to be printed can’t exceed 12288 bytes.
        $request->content = $printContent;

        //The number of printed copies is 1 by default.
        $request->copies = 1;


        // Sound playback mode, 0 for cancel the order mode, 1 for mute mode, 2 for single playback mode,3. Apply for refund for some users. default is 2 for single playback mode
		$request->voice = 2;

        //Print mode:
        //If the value is 0 or not specified, it will check whether the printer is online. If not online, it will not generate a print order and directly return the status code of an offline device.
        //If online, it will generate a print order and return the print order number.If the value is 1, it will not check whether the printer is online, directly generate a print order and return the print order number.
        //If the printer is not online, the order will be cached in the print queue and will be printed automatically when the printer is normally online.
        $request->mode = 0;

        //payment method:
        //Value range 41~55:
        //Alipay 41, WeChat 42, Cloud Payment 43, UnionPay Swipe 44, UnionPay Payment 45, Member Card Consumption 46, Member Card Recharge 47, Yipay 48, Successful Collection 49, Jialian Payment 50, One Wallet 51, JD Pay 52, Quick money payment 53, Granville payment 54, Xiangqian payment 55
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->payType = 41;

        //Pay or not:
        //Value range 59~61:
        //Refund 59 to account 60 consumption 61.
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->payMode = 60;

        //Payment amount:
        //Up to 2 decimal places are allowed.
        //It is only used for Xinye cloud printers that support the amount broadcast.
        $request->money = 20.15;

        $result = $this->service->xpYunPrint($request);
        print $result->content->code . "\n";
        print $result->content->msg . "\n";

        //data:Return to order No. correctly
        print $result->content->data . "\n";
    }

    /**
     * comprehensive layout sample for label printing
     * How to determine the coordinates?
     * The origin of the coordinates is at the upper left corner, the x-axis is from left to right,
     * and the y-axis is from top to bottom;
     * According to the test, the maximum value of the x-axis is equal to the width of the label paper
     * multiplied by 8, and the maximum value of the y-axis is equal to the height of the label paper multiplied by 8.
     * For example, the label size is 40*30, the maximum value of x-axis=40*8=320, the maximum value of y-axis=30*8=240
     * Users need to typeset according to actual paper size and their requirements
     *
     * The greater than and less than signs in the printed content (except labels) need to be translated before they can be printed normally.
     * Among them, "<" is represented by "&lt", and ">" is represented by "&gt"; 1mm=8dots.
     */
    function printLabel()
    {
        /**
         * <PAGE></PAGE>：
         *  Pagination, used to support the printing of multiple different label pages (up to 10 sheets), not using this label means that all elements are only printed on one label page
         *
         *  <SIZE>width,height</SIZE>：
         *  Set label paper width and height, width label paper width (excluding backing paper), height label paper height (excluding backing paper), unit mm, such as<SIZE>40,30</SIZE>
         *
         *  <TEXT x="10" y="100" w="1" h="2" r="0">Text content</TEXT>：
         *  Print the text, where:
         *  The attribute x is the coordinate of the starting point in the horizontal direction (default is 0)
         *  Attribute y is the starting point coordinate in the vertical direction (default is 0)
         *  The attribute w is the text width magnification ratio 1-10 (default is 1)
         *  Attribute h is text height magnification 1-10 (default is 1)
         *  The attribute r is the rotation angle of the text (clockwise, the default is 0):
         *  0     0degree
         *  90   90degree
         *  180 180degree
         *  270 270degree
         *
         *  <BC128 x="10" y="100" h="60" s="1" n="1" w="1" r="0">1234567</BC128>：
         *  Print code128 one-dimensional code, where:
         *  The attribute x is the coordinate of the starting point in the horizontal direction (default is 0)
         *  Attribute y is the starting point coordinate in the vertical direction (default is 0)
         *  The attribute h is the height of the barcode (default is 48)
         *  Whether the attribute s can be recognized by human eyes: 0 is not recognized, 1 is recognized (default is 1)
         *  The attribute n is the width of the narrow bar, expressed in dots (default is 1)
         *  The attribute w is the width of bar, expressed in dots (default is 1)
         *  The attribute r is the text rotation angle (clockwise, the default is 0):
         *  0     0degree
         *  90   90degree
         *  180 180degree
         *  270 270degree
         *
         *  <BC39 x="10" y="100" h="60" s="1" n="1" w="1" r="0">1234567</BC39>：
         *  Print code39 one-dimensional code, where:
         *  The attribute x is the coordinate of the starting point in the horizontal direction (default is 0)
         *  Attribute y is the starting point coordinate in the vertical direction (default is 0)
         *  The attribute h is the height of the barcode (default is 48)
         *  Whether the attribute s can be recognized by human eyes: 0 is not recognized, 1 is recognized (default is 1)
         *  The attribute n is the width of the narrow bar, expressed in dots (default is 1)
         *  The attribute w is the width of bar, expressed in dots (default is 2)
         *  The attribute r is the rotation angle of the text (clockwise, the default is 0):
         *  0     0degree
         *  90   90degree
         *  180 180degree
         *  270 270degree
         *
         *  <QR x="20" y="20" w="160" e="H">QR code content</QR>：
         *  Print the QR code, where:
         *  The attribute x is the coordinate of the starting point in the horizontal direction (default is 0)
         *  Attribute y is the starting point coordinate in the vertical direction (default is 0)
         *  The attribute w is the width of the QR code (default is 160)
         *  Attribute e is the error correction level: L 7% M 15% Q 25% H 30% (the default is H)
         *  The label content is a QR code value, and the maximum cannot exceed 256 characters
         *  Note: A single order can only print one QR code
         *
         *  <IMG x="16" y="32" w="100">:
         * To print the LOGO picture, you need to log in to the open platform and upload it by setting the LOGO function under [Printer Management = "Device Management]. Directly here
         * Write an empty tag. If the <PAGE> tag is specified, the <IMG> tag should be placed in the <PAGE> tag, <IMG>, such as <IMG>,
         * For details, please refer to the sample. among them:
         * The attribute x is the coordinate of the starting point in the horizontal direction (default is 0)
         * Attribute y is the starting point coordinate in the vertical direction (default is 0)
         * The attribute w is the maximum width of the logo image (default is 50), the minimum is 20, and the maximum is 100. The height and width of the logo image are equal
         */


        //print the first label
        $printContent = "<PAGE>"
            . "<SIZE>40,30</SIZE>" //Set size of label paper
            . "<TEXT x=\"8\" y=\"8\" w=\"1\" h=\"1\" r=\"0\">"
            . "#001" . str_repeat(" ", 4)
            . "Table one" . str_repeat(" ", 4)
            . "1/3"
            . "</TEXT>"
            . "<TEXT x=\"8\" y=\"96\" w=\"2\" h=\"2\" r=\"0\">"
            . "Cucumber salad"
            . "</TEXT>"
            . "<TEXT x=\"8\" y=\"200\" w=\"1\" h=\"1\" r=\"0\">"
            . "Miss Wang" . str_repeat(" ", 4)
            . "136****3388"
            . "</TEXT>"
            . "</PAGE>";

        //print the second label
        $printContent = $printContent . "<PAGE>"
            . "<TEXT x=\"8\" y=\"8\" w=\"1\" h=\"1\" r=\"0\">"
            . "#001" . str_repeat(" ", 4)
            . "Table one" . str_repeat(" ", 4)
            . "2/3"
            . "</TEXT>"
            . "<TEXT x=\"8\" y=\"96\" w=\"2\" h=\"2\" r=\"0\">"
            . "Golden Fried Rice"
            . "</TEXT>"
            . "<TEXT x=\"8\" y=\"200\" w=\"1\" h=\"1\" r=\"0\">"
            . "Miss Wang" . str_repeat(" ", 4)
            . "136****3388"
            . "</TEXT>"
            . "</PAGE>";

        //print the third label
        $printContent = $printContent . "<PAGE>"
            . "<TEXT x=\"8\" y=\"8\" w=\"1\" h=\"1\" r=\"0\">"
            . "#001" . str_repeat(" ", 4)
            . "Table one" . str_repeat(" ", 4)
            . "3/3"
            . "</TEXT>"
            . "<TEXT x=\"8\" y=\"96\" w=\"2\" h=\"2\" r=\"0\">"
            . "Boston Lobster"
            . "</TEXT>"
            . "<TEXT x=\"8\" y=\"200\" w=\"1\" h=\"1\" r=\"0\">"
            . "Miss Wang" . str_repeat(" ", 4)
            . "136****3388"
            . "</TEXT>"
            . "</PAGE>";

        //print a barcode
        $printContent = $printContent . "<PAGE>"
            . "<TEXT x=\"8\" y=\"8\" w=\"1\" h=\"1\" r=\"0\">"
            . "print a barcode："
            . "</TEXT>"
            . "<BC128 x=\"16\" y=\"32\" h=\"32\" s=\"1\" n=\"2\" w=\"2\" r=\"0\">"
            . "12345678"
            . "</BC128>"
            . "</PAGE>";

        //print a QR code. The minimum width is 128, it will not be able to be scanned if lower than 128
        $printContent = $printContent . "<PAGE>"
            . "<TEXT x=\"8\" y=\"8\" w=\"1\" h=\"1\" r=\"0\">"
            . "print a QR code:"
            . "</TEXT>"
            . "<QR x=\"16\" y=\"32\" w=\"128\">"
            . "https://www.xpyun.net"
            . "</QR>"
            . "</PAGE>";

        $request = new PrintRequest();
        $request->generateSign();

        //*Required*: The serial number of the printer
        $request->sn = OK_PRINTER_SN;

        //*Required*: The content to be printed can’t exceed 12288 bytes.
        $request->content = $printContent;

        //The number of printed copies is 1 by default.
        $request->copies = 1;

        // Sound playback mode, 0 for cancel the order mode, 1 for mute mode, 2 for single playback mode,3. Apply for refund for some users. default is 2 for single playback mode
		$request->voice = 2;

        //Print mode:
        //If the value is 0 or not specified, it will check whether the printer is online. If not online, it will not generate a print order and directly return the status code of an offline device.
        //If online, it will generate a print order and return the print order number.If the value is 1, it will not check whether the printer is online, directly generate a print order and return the print order number.
        //If the printer is not online, the order will be cached in the print queue and will be printed automatically when the printer is normally online.
        $request->mode = 0;

        $result = $this->service->xpYunPrintLabel($request);
        print $result->content->code . "\n";
        print $result->content->msg . "\n";

        //data:Return to order No. correctly
        print $result->content->data . "\n";
    }
}

?>
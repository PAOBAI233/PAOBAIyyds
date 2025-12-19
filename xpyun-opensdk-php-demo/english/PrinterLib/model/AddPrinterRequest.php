<?php

namespace Xpyun\model;
class AddPrinterRequest extends RestRequest
{
    //*Required*: Array elements are json objects.
    //{"cardno": "traffic card number", "idcode": "printer identifying code","name":"printer name", "sn":"serial number of printer"}
    //The fields of sn and name are required, and a maximum 50 sets can be added each time.
    var $items;
}

?>
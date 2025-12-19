<?php

namespace Xpyun\model;
class UpdPrinterRequest extends RestRequest
{
    //The serial number of the printer
    var $sn;
    //*Required*: Name of the printer
    var $name;
}

?>
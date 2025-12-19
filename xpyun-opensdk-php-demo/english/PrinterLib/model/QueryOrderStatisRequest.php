<?php

namespace Xpyun\model;
class QueryOrderStatisRequest extends RestRequest
{
    //*Required*: The serial number of the printer
    var $sn;
    //*Required*: Query date, format in yyyy-MM-dd, e.g. 2020-09-09
    var $date;
}

?>
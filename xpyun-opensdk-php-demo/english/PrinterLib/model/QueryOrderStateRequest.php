<?php

namespace Xpyun\model;
class QueryOrderStateRequest extends RestRequest
{
    //*Required*: The order ID is returned by the “print order” interface.
    var $orderId;
}

?>
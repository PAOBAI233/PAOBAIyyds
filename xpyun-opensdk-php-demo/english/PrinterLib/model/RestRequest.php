<?php

namespace Xpyun\model;

use Xpyun\util\Xputil;

class RestRequest
{
    //*Required*: Registered account of Xinye cloud platform (developer ID)
    var $user;
    //*Required*: The developer key automatically generated after registering an account on the Xinye Cloud background.
    var $userKey;
    //*Required*: Current UNIX timestamp
    var $timestamp;
    //*Required*: After the parameter user + UserKEY + timestamp is spliced (+ indicates connector), SHA1 encryption will produce a signature.
    //The value is a 40-bit lowercase string, where UserKEY is a developer key for the user.
    var $sign;
    //When debug is equal to 1, it will return to non-json data, which is only used for testing.
    var $debug;

    function __construct()
    {
        $this->user = USER_NAME;
        $this->userKey = USER_KEY;
        $this->debug = "0";
        $this->timestamp = Xputil::getMillisecond();
    }

    public function generateSign()
    {
        $this->sign = Xputil::sign($this->user . $this->userKey . $this->timestamp);
    }
}

?>
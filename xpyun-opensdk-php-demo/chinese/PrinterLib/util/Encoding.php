<?php

namespace Xpyun\util;

class Encoding
{
    public static function CalcGbkLenForPrint($data)
    {
        return (strlen($data) + mb_strlen($data, "UTF8")) / 2;
    }

    public static function CalcAsciiLenForPrint($data)
    {
        return strlen($data);
    }
}

?>
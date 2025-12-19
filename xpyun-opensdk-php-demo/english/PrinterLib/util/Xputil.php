<?php

namespace Xpyun\util;
class Xputil
{
    /**
     * Haxi signature
     * @param signSource - Source string
     * @return
     */
    public static function sign($signSource)
    {
        $signature = sha1($signSource);

        return $signature;
    }

    /**
     * Current UNIX timestamp, accurate to the millisecond
     * @return string
     */
    public static function getMillisecond()
    {
        list($s1, $s2) = explode(' ', microtime());
        return sprintf('%.0f', (floatval($s1) + floatval($s2)) * 1000);
    }
}

?>
<?php

namespace Xpyun\util;

class NoteFormatter
{
    /**
     * 58mm 系列打印机模板
     */
    public const ROW_MAX_CHAR_LEN = 32;
    public const MAX_HEAD_NAME_CHAR_LEN58 = 116;
    private const MAX_NAME_CHAR_LEN = 20;
    private const LAST_ROW_MAX_NAME_CHAR_LEN = 16;
    private const MAX_QUANTITY_CHAR_LEN = 6;
    private const MAX_PRICE_CHAR_LEN = 6;

    /**
     * 80mm 系列打印机模板
     */
    public const ROW_MAX_CHAR_LEN80 = 48;
    public const MAX_HEAD_NAME_CHAR_LEN80 = 32;
    private const MAX_NAME_CHAR_LEN80 = 36;
    // 每行打印的字符数，汉字，字母，数字均为1
    private const LAST_ROW_MAX_NAME_CHAR_LEN80 = 17;
    private const MAX_QUANTITY_CHAR_LEN80 = 6;
    private const MAX_PRICE_CHAR_LEN80 = 6;

    public static function formatPrintOrderItem80($foodName, $quantity, $price)
    {
        $foodNameLen = Encoding::CalcGbkLenForPrint($foodName);
        $mod = $foodNameLen % self::ROW_MAX_CHAR_LEN80;
        $result = "";
        if ($foodNameLen <= self::LAST_ROW_MAX_NAME_CHAR_LEN80 * 2) {
            $result = $foodName;
            $result = $result . str_repeat(" ", self::MAX_NAME_CHAR_LEN80 - $mod);
            $quantityStr = '' . $quantity;
            $quantityLen = Encoding::CalcAsciiLenForPrint($quantityStr);

            $priceStr = '' . round($price, 2);
            $priceLen = Encoding::CalcAsciiLenForPrint($priceStr);
            $result = $result . $quantityStr . str_repeat(" ", self::MAX_QUANTITY_CHAR_LEN80 - $quantityLen);
            $result = $result . $priceStr . str_repeat(" ", self::MAX_PRICE_CHAR_LEN80 - $priceLen);
        } else {
            $result = $result . self::getFoodNameSplit80($foodName, $quantity, $price);
            $result = mb_convert_encoding($result, "UTF-8");
        }

        return $result . "<BR>";
    }

    private static function getFoodNameSplit80($foodName, $quantity, $price): string
    {
        print_r($foodName);
        $foodNames = str_split($foodName, self::LAST_ROW_MAX_NAME_CHAR_LEN80 * 3);
        $resultTemp = "";

        for ($i = 0; $i < count($foodNames); $i++) {
            $foodNameTmp = $foodNames[$i];
            if ($i == 0) {
                $foodNameLen = Encoding::CalcGbkLenForPrint($foodNameTmp);
                $mod = $foodNameLen % self::ROW_MAX_CHAR_LEN80;
                $resultTemp = $resultTemp . $foodNameTmp;
                $resultTemp = $resultTemp . str_repeat(" ", self::MAX_NAME_CHAR_LEN80 - $mod);

                $quantityStr = '' . $quantity;
                $quantityLen = Encoding::CalcAsciiLenForPrint($quantityStr);
                $priceStr = '' . round($price, 2);
                $priceLen = Encoding::CalcAsciiLenForPrint($priceStr);
                $resultTemp = $resultTemp . $quantityStr . str_repeat(" ", self::MAX_QUANTITY_CHAR_LEN80 - $quantityLen);
                $resultTemp = $resultTemp . $priceStr . str_repeat(" ", self::MAX_PRICE_CHAR_LEN80 - $priceLen);
            } else {
                $resultTemp = $resultTemp . $foodNameTmp . "<BR>";
            }
        }
        return $resultTemp;
    }

    /**
     * 格式化菜品列表（用于58mm打印机）
     * 注意：默认字体排版，若是字体宽度倍大后不适用
     * 58mm打印机一行可打印32个字符 汉子按照2个字符算
     * 分3列： 名称20字符一般用16字符4空格填充  数量6字符  单价6字符，不足用英文空格填充 名称过长换行
     *
     * @param foodName 菜品名称
     * @param quantity 数量
     * @param price 价格
     * @throws Exception
     */

    public static function formatPrintOrderItem($foodName, $quantity, $price)
    {
        $orderNameEmpty = str_repeat(" ", self::MAX_NAME_CHAR_LEN);
        $foodNameLen = Encoding::CalcGbkLenForPrint($foodName);
//         print("foodNameLen=".$foodNameLen."\n");

        $quantityStr = '' . $quantity;
        $quantityLen = Encoding::CalcAsciiLenForPrint($quantityStr);
        // print("quantityLen=".$quantityLen."\n");

        $priceStr = '' . round($price, 2);
        $priceLen = Encoding::CalcAsciiLenForPrint($priceStr);
        // print("priceLen=".$priceLen);

        $result = $foodName;
        $mod = $foodNameLen % self::ROW_MAX_CHAR_LEN;
        // print("mod=".$mod."\n");

        if ($mod <= self::LAST_ROW_MAX_NAME_CHAR_LEN) {
            // 保证各个列的宽度固定，不足部分，利用空格填充
            //make sure all the column length fixed, fill with space if not enough
            $result = $result . str_repeat(" ", self::MAX_NAME_CHAR_LEN - $mod);

        } else {
            // 另起新行
            // new line
            $result = $result . "<BR>";
            $result = $result . $orderNameEmpty;
        }

        $result = $result . $quantityStr . str_repeat(" ", self::MAX_QUANTITY_CHAR_LEN - $quantityLen);
        $result = $result . $priceStr . str_repeat(" ", self::MAX_PRICE_CHAR_LEN - $priceLen);

        $result = $result . "<BR>";

        return $result;
    }
}

?>
<?php

namespace Xpyun\util;

class NoteFormatter
{
    private const ROW_MAX_CHAR_LEN = 32;
    private const MAX_NAME_CHAR_LEN = 20;
    private const LAST_ROW_MAX_NAME_CHAR_LEN = 16;
    private const MAX_QUANTITY_CHAR_LEN = 6;
    private const MAX_PRICE_CHAR_LEN = 6;

    /**
     * Format the dish list (for 58 mm printer)
     * Note: this is  default font typesetting, not applicable if the font width is doubled
     * The 58mm printer can print 32 characters per line
     * Divided into 3 columns: name(20 characters), quanity(6 characters),price(6 characters)
     * The name column is generally filled with 16  your characters and 4 spaces
     * Long name column will cause auto line break
     *
     * @param foodName
     * @param quantity
     * @param price
     */

    public static function formatPrintOrderItem($foodName, $quantity, $price)
    {
        $orderNameEmpty = str_repeat(" ", self::MAX_NAME_CHAR_LEN);
        $foodNameLen = Encoding::CalcGbkLenForPrint($foodName);
        // print("foodNameLen=".$foodNameLen."\n");

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
            //make sure all the column length fixed, fill with space if not enough
            $result = $result . str_repeat(" ", self::MAX_NAME_CHAR_LEN - $mod);

        } else {
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
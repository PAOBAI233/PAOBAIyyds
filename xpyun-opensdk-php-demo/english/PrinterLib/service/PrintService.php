<?php

namespace Xpyun\service;

use Xpyun\model\XPYunResp;

class PrintService
{
    private const BASE_URL = 'https://open.xpyun.net/api/openapi';

    private function xpyunPostJson($url, $request)
    {
        $jsonRequest = json_encode($request);
        $client = new HttpClient();

        list($returnCode, $returnContent) = $client->http_post_json($url, $jsonRequest);

        $result = new XPYunResp();
        $result->httpStatusCode = $returnCode;
        $result->content = json_decode($returnContent);

        return $result;
    }

    /**
     * 1.add printers in batch
     * @param restRequest
     * @return
     */
    public function xpYunAddPrinters($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/addPrinters";
        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 2.Set printer voice type
     * @param restRequest
     * @return
     */
    public function xpYunSetVoiceType($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/setVoiceType";
        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 3.Print small ticket order
     * @param restRequest - Print order information
     * @return
     */
    public function xpYunPrint($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/print";

        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 4.Print label order
     * @param restRequest - Print order information
     * @return
     */
    public function xpYunPrintLabel($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/printLabel";

        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 5.delete printer in batch
     * @param restRequest
     * @return
     */
    public function xpYunDelPrinters($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/delPrinters";

        return $this->xpyunPostJson($url, $restRequest);
    }


    /**
     * 6.Modify printer information
     * @param restRequest
     * @return
     */
    public function xpYunUpdatePrinter($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/updPrinter";
        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 7.Empty the waiting queue
     * @param restRequest
     * @return
     */
    public function xpYunDelPrinterQueue($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/delPrinterQueue";
        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 8.Check if the order is printed successfully
     * @param restRequest
     * @return
     */
    public function xpYunQueryOrderState($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/queryOrderState";

        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 9.Query the printer's order statistics for a certain day
     * @param restRequest
     * @return
     */
    public function xpYunQueryOrderStatis($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/queryOrderStatis";
        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 10.Query printer status
     *
     * 0：offline 1：online normal 2：Out of paper online
     * Remarks: The exception is usually no paper, and the offline judgment is that the printer has lost contact with the server for more than 30 seconds
     * @param restRequest
     * @return
     */
    public function xpYunQueryPrinterStatus($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/queryPrinterStatus";

        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 10.Batch query printer status
     *
     * 0：offline 1：online normal 2：Out of paper online
     * Remarks: The exception is usually no paper, and the offline judgment is that the printer has lost contact with the server for more than 30 seconds
     * @param restRequest
     * @return
     */
    public function xpYunQueryPrintersStatus($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/queryPrintersStatus";

        return $this->xpyunPostJson($url, $restRequest);
    }

    /**
     * 11.Amount broadcast
     * @param restRequest - Play voice message
     * @return
     */
    public function xpYunPlayVoice($restRequest)
    {
        $url = self::BASE_URL . "/xprinter/playVoice";

        return $this->xpyunPostJson($url, $restRequest);
    }
	
	/**
	 * 12.POS instruction
	 * @param restRequest
	 * @return
	 */
	public function xpYunPos($restRequest)
	{
	    $url = self::BASE_URL . "/xprinter/pos";
	
	    return $this->xpyunPostJson($url, $restRequest);
	}
	
	/**
	 * 13.Cashbox control
	 * @param restRequest
	 * @return
	 */
	public function xpYunControlBox($restRequest)
	{
	    $url = self::BASE_URL . "/xprinter/controlBox";
	
	    return $this->xpyunPostJson($url, $restRequest);
	}
}

?>
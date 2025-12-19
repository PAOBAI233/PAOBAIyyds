<?php
/**
 * Send http json request
 *
 * @param $url Request url
 * @param $jsonStr Json string sent
 * @return array
 */
namespace Xpyun\service;

use Exception;

class HttpClient
{
    public function http_post_json($url, $jsonStr)
    {
        print($jsonStr.'<br/>');

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_POST, 1);// Send a regular Post request
        curl_setopt($ch, CURLOPT_URL, $url);// Address to visit
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); // Inspection of the source of the certificate
        curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Set timeout limit to prevent dead loop
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonStr);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                'Content-Type: application/json;charset=UTF-8',
                'Content-Length: ' . strlen($jsonStr)
            )
        );

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (curl_errno($ch)) {
            throw new Exception(curl_error($ch));
        }
        curl_close($ch);

        return array($httpCode, $response);
    }
}

?>
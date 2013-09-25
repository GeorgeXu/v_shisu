<?php
/**
 * curl请求
 * @param string $url
 * @param string $method
 * @param mixed $data
 * @param mixed $header
 * @param int $http_code
 * @param string $error
 * @return mixed|null
 */
function curl_invoke($url, $method, $data, $header = null, &$http_code = 0, &$error = '') {
    try {
        $ch = curl_init($url);
        if (stripos($url, "https://") !== FALSE) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
        }
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 60);
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $fields_string = '';
        if ($data) {
            if (is_array($data)) {
                foreach ($data as $k => $v) {
                    $fields_string .= $k . '=' . $v . '&';
                }
                $fields_string = rtrim($fields_string, '&');
            } else {
                $fields_string = $data;
            }
        }
        switch ($method) {
            case 'GET':
                if ($fields_string) {
                    if (strpos($url, '?')) {
                        curl_setopt($ch, CURLOPT_URL, $url . '&' . $fields_string);
                    } else {
                        curl_setopt($ch, CURLOPT_URL, $url . '?' . $fields_string);
                    }
                }
                break;
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, TRUE);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
                break;
            default:
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
                break;
        }
        $httpheader = array();
        foreach ($header as $key => $value) {
            array_push($httpheader, $key . ': ' . $value);
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $httpheader);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $response;
    } catch (Exception $e) {
        $error = $e->getMessage();
        return null;
    }
}
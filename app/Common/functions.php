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

/**
 * str_replace 只替换一次
 * @param string $needle
 * @param string $replace
 * @param string $haystack
 * @return string
 */
function str_replace_once($needle, $replace, $haystack) {
    $pos = strpos($haystack, $needle);
    if ($pos === false) {
        return $haystack;
    }
    return substr_replace($haystack, $replace, $pos, strlen($needle));
}

function get_dir_path($fullpath) {
    return substr($fullpath, 0, strrpos($fullpath, '/'));
}

//获取文件扩展名
function get_file_ext($filename) {
    $pos = strrpos($filename, '.');
    if ($pos !== false) {
        return strtolower(substr($filename, $pos + 1));
    } else {
        return '';
    }
}

/**
 * 根据key获取数组中值, 如果key不存在则返回默认值
 * @param array $arr
 * @param string $key
 * @param bool $default
 * @return mixed
 */
function array_map_assert(array $arr, $key, $default = false) {
    return array_key_exists($key, $arr) ? $arr[$key] : $default;
}
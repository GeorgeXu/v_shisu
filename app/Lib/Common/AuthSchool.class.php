<?php

class AuthSchool {

    private $_name;
    private $_key;
    private $_return_url;

    public function __construct($name) {
        $this->_name = $name;
        $this->_key = null;
        $this->_return_url = null;
    }

    public function setReturnUrl($url) {
        $this->_return_url = $url;
    }

    public function auth($key = false, array &$data = [], array &$params = []) {
        $this->_key = $key;
        if (!$data) {
            $fun = '_' . $this->_name;
            if (method_exists($this, $fun)) {
                return $this->$fun();
            } else {
                throw new Exception('内部错误',500);
            }
        }
        switch ($this->_name) {
            case 'shisu':
                return $this->_shisuValid($data['ticket']);
                break;

        }
    }


    /**
     * 上师大
     */
    private function _shnu() {
        $url = C('OAUTH.shnu')['CAS_URL'] . '?service=' . rawurlencode($this->_get_result_url());
        header('Location: ' . $url);
        exit;
    }


    /**
     * 上海外国语大学
     */
    private function _shisu() {
        header('Location: ' . C('OAUTH.shisu')['CAS_URL'] . '?service=' . rawurlencode($this->_get_result_url()));
        exit;
    }


    private function _get_login_url() {
        $url = 'http://' . C('SITE_DOMAIN') . '/account/school?name=' . rawurlencode($this->_name);
        return $url;
    }

    private function _get_result_url() {
        $url = 'http://' . C('SITE_DOMAIN') . '/account/oauth_login?school=' . rawurlencode($this->_name);
        if ($this->_key) {
            $url .= '&key=' . rawurlencode($this->_key);
        }
        if ($this->_return_url) {
            $url .= '&returnurl=' . rawurlencode($this->_return_url);
        }
        return $url;
    }

    /**
     * 上海外国语大学登录验证, 并获取用户id
     * @param string $ticket
     * @return array
     * @throws
     */
    private function _shisuValid($ticket) {
        $data = ['ticket' => rawurlencode($ticket), 'service' => rawurlencode($this->_get_result_url())];
        $response = curl_invoke(C('OAUTH.shisu')['CAS_VALIDATE_URL'], 'GET', $data, null, $http_code);
        if ($http_code == 200 && $response) {
            $id = $name = $email = '';
            $response = iconv('GBK', 'UTF-8//IGNORE', $response);
            //节点替换，去除sso:，否则解析的时候有问题
            $response = preg_replace("/sso:/", "", $response);
            $dom = new DOMDocument();
            $dom->loadXML($response);
            $xpath = new DOMXPath($dom);
            $result = $xpath->query('/serviceResponse/authenticationSuccess/user');
            if ($result && $result->item(0)) {
                $id = $result->item(0)->nodeValue;
            }
            $result = $xpath->query("/serviceResponse/authenticationSuccess/attributes/attribute[@name='cn']");
            if ($result && $result->item(0)) {
                $name = $result->item(0)->getAttribute('value');
            }
            if (!strlen($name)) {
                $result = $xpath->query("/serviceResponse/authenticationSuccess/attributes/attribute[@name='sn']");
                if ($result && $result->item(0)) {
                    $name = $result->item(0)->getAttribute('value');
                }
            }
            $result = $xpath->query("/serviceResponse/authenticationSuccess/attributes/attribute[@name='email']");
            if ($result && $result->item(0)) {
                $email = $result->item(0)->getAttribute('value');
            }
            if (!$email) {
                $email = $id . '@' . C('OAUTH.shisu')['MAIL_DOMAIN'];
            }
            if ($id) {
                return ['id' => $id, 'name' => $name, 'email' => $email];
            }
        }
        throw new Exception('获取认证信息失败',400);
    }
}

?>

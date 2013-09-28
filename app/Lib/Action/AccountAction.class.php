<?php

class AccountAction extends Action {


    function __construct() {
        parent::__construct();

    }

    /**
     * 获取用户session
     * @return mixed
     */
    public static function get_member() {
        return $_SESSION['member'];
    }

    /**
     * 登陆页面
     */
    public function login() {
        try {
            $name = $_GET['name'];
            if(!$name){
                $this->display();
            }else{
                $name = 'shisu';
                $auth_school = new AuthSchool($name);
                $key = self::_getOauthLoginKey();
                self::_setOauthLoginKeyCookie($key);
                $auth_school->auth($key);
            }

        } catch (Exception $e) {
            ErrorAction::show_page($e->getMessage(), $e->getCode());
        }
    }

    /**
     * oauth登陆成功后的回调
     */
    public function oauth_login() {
        try {
            $domain = 'shisu';
            $key = self::_getOauthLoginKey();
            self::_setOauthLoginKeyCookie('', true);
            $auth_school = new AuthSchool($domain);
            $result = $auth_school->auth($key, $_GET, $_SERVER);
            session_start();
            $_SESSION['member'] = $result;
            session_write_close();
            //var_dump($_SESSION);exit;
            header('Location: /index');
        } catch (Exception $e) {
            ErrorAction::show_page($e->getMessage(), $e->getCode());
        }
    }

    private static function _setOauthLoginKeyCookie($key, $clear = false) {
        if ($clear) {
            unset($_COOKIE['oauth_login_key']);
            setcookie('oauth_login_key', $key, time() - 3600, '/', C('COOKIE_DOMAIN'));
        } else {
            $_COOKIE['oauth_login_key'] = $key;
            setcookie('oauth_login_key', $key, 0, '/', C('COOKIE_DOMAIN'));
        }
    }

    private static function _getOauthLoginKey() {
        if ($_REQUEST['key']) {
            return $_REQUEST['key'];
        } elseif ($_COOKIE['oauth_login_key']) {
            return $_COOKIE['oauth_login_key'];
        } else {
            return '';
        }
    }


}

?>
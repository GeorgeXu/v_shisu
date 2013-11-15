<?php

class IndexAction extends Action
{
    private $gk_client;
    private $gk_widget;
    private $member;
    private $description_max_length;

    function __construct()
    {
        ignore_user_abort(true);
        parent::__construct();
        $member = AccountAction::get_member();
        if ($member) {
            $this->member = $member;
            $this->assign('member', $member);
            $this->gk_widget = new GKWidgetXML(APP_PATH . 'Conf/video.xml');
            $this->addTmplAttr();
            $config = require APP_PATH . 'Conf/gokuai.php';
            $this->description_max_length = $config['description_max_length'];
            $this->gk_client = new GokuaiClient($config['client_id'], $config['client_secret']);
            if (!$this->gk_client->login($config['user'], md5($config['password']))) {
                if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                    ErrorAction::show_ajax('授权失败', 403000);
                } else {
                    ErrorAction::show_page('授权失败', 403000);
                }
                exit(0);
            }
        } else {
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                ErrorAction::show_ajax('请先登录', 401000);
            } else {
                AccountAction::dispatch(false);
                exit;
            }
        }

    }

    private static function getTempUploadPath()
    {
        return APP_PATH . 'Common/uploads';
    }

    /**
     * 添加临时属性
     */
    private function addTmplAttr()
    {
        $nodes = $this->gk_widget->getNodes();
        $new_node = [
            'path' => $this->member['id'] . '-' . $this->member['name']
        ];
        foreach ($nodes as $v) {
            $this->gk_widget->addAttr($v['@attributes']['base_path'], $new_node);
        }
    }

    /**
     * 主页
     */
    public function index()
    {
        try {
            $xml = $this->gk_widget->getXmlDom();
            $page_name = $xml['name'] ? (string)$xml['name'] : '未命名';
            $background_color = (string)$xml['background_color'];
            $logo_url = (string)$xml['logo_url'];
            $base_name = '';
            $base_path = '';
            foreach ($xml->nodes as $node) {
                $base_name = (string)$node->attributes()['name'];
                $base_path = (string)$node->attributes()['base_path'];
            }
            if (!strlen($base_path)) {
                throw new Exception('video.xml中未定义base_path', 400);
            }
            $user_name = $this->member['id'] . '-' . $this->member['name'];
            $this->assign('page_name', $page_name);
            $this->assign('background_color', $background_color);
            $this->assign('logo_url', $logo_url);
            $this->assign('user_name', $user_name);
            $this->assign('base_name', $base_name);
            $this->assign('base_path', $base_path);
            $this->display();
        } catch (Exception $e) {
            ErrorAction::show_page($e->getMessage(), $e->getCode());
        }
    }

    /**
     * 文件列表
     */
    public function file_list()
    {
        $path = $_GET['path'];
        GKWidgetXML::checkPath($path);
        if ($this->gk_widget->checkNodeAuth('view', $path, $access)) {
            $list = $this->gk_client->getFileList($path, 0, 'team');
        } else {
            $list = [];
        }
        $uploadAllowExt = $this->gk_widget->getFeature($path, 'uploadAllowExt');
        $list['access'] = $access;
        $list['uploadAllowExt'] = $uploadAllowExt;
        echo json_encode($list);
    }

    /**
     * 下载文件
     */
    public function download_file()
    {
        try {
            $path = $_GET['path'];
            GKWidgetXML::checkPath($path);
            if (!$this->gk_widget->checkNodeAuth('download', $path)) {
                throw new Exception('没用权限下载改文件', 403);
            }
            $fileinfo = $this->gk_client->getFileInfo($path);
            if ($fileinfo['uri']) {
                header('Location:' . $fileinfo['uri']);
            }
        } catch (Exception $e) {
            ErrorAction::show_page($e->getMessage(), $e->getCode());
        }

    }

    /**
     * 上传文件
     */
    public function upload_file()
    {
        try {
            $path = $_POST['path'];
            GKWidgetXML::checkPath($path);
            if (!$this->gk_widget->checkNodeAuth('upload', $path)) {
                throw new Exception('你没有权限在该文件夹下上传文件', 400);
            }
            $filefield = $_POST['filefield'] ? $_POST['filefield'] : 'file';
            $file = $_FILES[$filefield];
            if (!isset($file)) {
                throw new Exception('文件上传失败', 400);
            }
            $name = $file['name'];
            $uploadAllowExt = $this->gk_widget->getFeature($path, 'uploadAllowExt');
            if ($uploadAllowExt) {
                $ext = get_file_ext($name);
                $extArr = explode('|', $uploadAllowExt);
                if (!in_array($ext, $extArr)) {
                    throw new Exception('只允许上传 ' . join('、', $extArr), 403);
                }
            }
            if ($file['error'] > 0) {
                switch ($file['error']) {
                    case '1':
                        $error = '文件太大'; //php.ini
                        break;
                    case '2':
                        $error = '文件太大'; //html form
                        break;
                    case '3':
                        $error = '部分数据未上传'; //部分上传
                        break;
                    case '4':
                        $error = '请选择要上传的文件';
                        break;
                    case '6':
                        $error = '缓存不存在'; //缓存文件夹不存在
                        break;
                    case '7':
                        $error = '无法写入服务器磁盘'; //无法写入磁盘
                        break;
                    case '8':
                        $error = '上传被中断'; //上传中断
                        break;
                    default:
                        $error = '发生未知错误';
                }

                throw new Exception($error, 400);
            }
            $tmp_filename = round(microtime(true) * 1000);
            $video_path = self::getTempUploadPath() . DIRECTORY_SEPARATOR . $tmp_filename;
            if (!move_uploaded_file($file['tmp_name'], $video_path)) {
                throw new Exception('无法移动上传文件', 400);
            }
            echo json_encode(['tmp_path' => $tmp_filename]);
        } catch (Exception $e) {
            echo json_encode(['error_code' => $e->getCode(), 'error_msg' => $e->getMessage()]);
        }
    }

    /**
     * 设置视频信息
     */
    public function set_video_info()
    {
        try {
            $code = $_POST['video_code'];
            $name = $_POST['video_name'];
            if (!strlen($name)) {
                throw new Exception('视频名称不能为空', 400);
            }
            self::checkFilenameVaild($name);
            $video_cid = $_POST['video_cid'];
            $video_cids = explode(',', $video_cid);
            foreach ($video_cids as $k => $v) {
                if (!is_numeric($k)) {
                    unset($video_cids[$k]);
                }
            }
            if (!$video_cids) {
                throw new Exception('请选择视频栏目', 400);
            }
            $introduction = $_POST['video_introduction'];
            if (mb_strlen($introduction, 'utf8') > $this->description_max_length) {
                throw new Exception('视频简介的字数不能超过' . $this->description_max_length, 400);
            }
            $uploader = $_POST['video_uploader'];
            if (!strlen($uploader)) {
                throw new Exception('视频上传者名称不能为空', 400);
            }
            $path = $_POST['path'];
            if (!strlen($path)) {
                throw new Exception('缺少参数[path]', 400);
            }
            $folder_name = $name;
            $folder_path = $path . '/' . $folder_name;
            $info_fullpath = $folder_path . '/info.xml';
            $ext = get_file_ext(basename($name));
            $filename = 'file' . ($ext ? '.' . $ext : '');
            $data = [
                'name' => $name,
                'uploader' => $uploader,
                'introduction' => $introduction,
                'cid' => implode(',', $video_cids),
                'filename' => $filename,
            ];
            $string = "<?xml version='1.0' encoding='utf-8'?><video></video>";
            $xml = simplexml_load_string($string);
            foreach ($data as $k => $v) {
                $xml->addChild($k, $v);
            }
            $content = $xml->asXML();

            $server = $this->gk_client->getUploadServer($folder_path, 'team');
            if (!$server) {
                throw new Exception('获取上传服务器地址失败', 500);
            }
            $re = $this->gk_client->uploadByContent($content, $server, $info_fullpath, 'team');
            if (!$re) {
                throw new Exception('文件上传到够快失败', 500);
            }
            $folder_path = get_dir_path($re['fullpath']);
            if ($re['error_code']) {
                throw new Exception($re['error_msg'], $re['error_code']);
            }
            if ($code) {
                $result = $this->gk_client->save($code, '', $folder_path, 'team', $filename);
            } else {
                $tmp_filename = $_POST['video_tmp_path'];
                $tmp_path = self::getTempUploadPath() . DIRECTORY_SEPARATOR . $tmp_filename;
                $video_fullpath = $folder_path . '/' . $filename;
                $result = $this->gk_client->uploadByFilename($tmp_path, $server, $video_fullpath, 'team');
                if (!$result) {
                    throw new Exception('文件上传到够快失败', 500);
                }
                if ($result['error_code']) {
                    throw new Exception($result['error_msg'], $result['error_code']);
                }
                @unlink($tmp_path);
                $this->gk_client->setKeywords(dirname($result['fullpath']) . '/', $introduction);
            }
            echo json_encode($result);
        } catch (Exception $e) {
            ErrorAction::show_ajax($e->getMessage(), $e->getCode());
        }
    }

    /**
     * 检测文件名的有效性
     * @param $filename
     * @throws Exception
     */
    public static function checkFilenameVaild($filename)
    {
        if ($filename == '.' || $filename == '..') {
            throw new Exception('文件名称不能是.或者..', 4000322);
        }
        if (preg_match('/\/|\\\\|\:|\*|\?|\"|<|>|\|/', $filename)) {
            throw new Exception('文件名不能包含下列任何字符： / \\ : * ? " < > |', 4000321);
        }
        if (mb_strlen($filename, 'utf-8') > 255) {
            throw new Exception('文件名不超过255个字符', 4000331);
        }
    }

}

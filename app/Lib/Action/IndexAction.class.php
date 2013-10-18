<?php

class IndexAction extends Action
{

    const CLIENT_ID = '818f83a6e217eb7152b28ba14fd31377';
    const CLIENT_SECRET = '18d0df158975b9fa33366bcf69586fdb';
    const GK_ACCOUNT = 'xugetest3@126.com';
    const GK_PASSWORD = '111111';
    const VIDEO_INTRODUCTION_LENGTH_LIMIT = 200;

    private $gkClient;
    private $gkWidget;
    private $xmlDom;
    private $member;

    function __construct() {
        parent::__construct();
        $member = AccountAction::get_member();
        if($member){
            $this->member = $member;
            $this->assign('member',$member);
            $this->gkWidget = new GKWidgetXML(APP_PATH . 'Common/nodeSource/video.xml');
            $this->addTmplAttr();
            $this->gkClient = new GokuaiClient(self::CLIENT_ID, self::CLIENT_SECRET);
            if (!$this->gkClient->login(self::GK_ACCOUNT, md5(self::GK_PASSWORD))) {
                if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                    ErrorAction::show_ajax('授权失败', 403000);
                } else {
                    ErrorAction::show_page('授权失败', 403000);
                }
                exit(0);
            }
        }else{
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                ErrorAction::show_ajax('请先登录', 401000);
            } else {
                AccountAction::dispatch(false);
                exit;
            }
        }

    }

    /**
     * 添加临时属性
     */
    private function addTmplAttr(){
        $nodes = $this->gkWidget->getNodes();
        $new_node = [
            'path' => $this->member['id'] . '-' . $this->member['name']
        ];
        foreach($nodes as $v){
            $this->gkWidget->addAttr($v['@attributes']['base_path'], $new_node);
        }
    }

    /**
     * 检测文件名的有效性
     * @param $filename
     * @throws Exception
     */
    public static function checkFilenameVaild($filename){
        if ($filename == '.' || $filename == '..') {
            throw new Exception('文件名称不能是.或者..',4000322);
        }
        if (preg_match('/\/|\\\\|\:|\*|\?|\"|<|>|\|/', $filename)) {
            throw new Exception('文件名不能包含下列任何字符： / \\ : * ? " < > |',4000321);
        }
        if (mb_strlen($filename, 'utf-8') > 255) {
            throw new Exception('文件名不超过255个字符',4000331);
        }
    }

    /**
     * 主页
     */
    public function index() {
        $xmlDom = $this->gkWidget->getXmlDom();
        $publishPage = $xmlDom;
        $xmlData = $xmlData = json_encode($xmlDom);
        $pageName = $publishPage['name']?$publishPage['name']:'未命名';
        $backgroundColor = $publishPage['background_color'];
        $logoUrl = $publishPage['logo_url'];
        $this->assign('page_name', $pageName);
        $this->assign('background_color', $backgroundColor);
        $this->assign('logo_url', $logoUrl);
        $this->assign('xml_data', $xmlData);
        $this->display();
    }

    /**
     * 文件列表
     */
    public function file_list() {
        $path = $_GET['path'];
        GKWidgetXML::checkPath($path);
        if ($this->gkWidget->checkNodeAuth('view',$path,$access)) {
            $list = $this->gkClient->getFileList($path, 0, 'team');
        }else{
            $list = [];
        }
        $uploadAllowExt = $this->gkWidget->getFeature($path,'uploadAllowExt');
        $list['access'] = $access;
        $list['uploadAllowExt'] = $uploadAllowExt;
        echo json_encode($list);
    }

    /**
     * 下载文件
     */
    public function download_file() {
        try{
            $path = $_GET['path'];
            GKWidgetXML::checkPath($path);
            if (!$this->gkWidget->checkNodeAuth('download',$path)) {
                throw new Exception('没用权限下载改文件',403);
            }
            $fileinfo = $this->gkClient->getFileInfo($path);
            if ($fileinfo['uri']) {
                header('Location:' . $fileinfo['uri']);
            }
        }catch (Exception $e){
            ErrorAction::show_page($e->getMessage(),$e->getCode());
        }

    }

    /**
     * 上传文件
     */
    public function upload_file() {
        try {
            $path = $_POST['path'];
            GKWidgetXML::checkPath($path);
            if(!$this->gkWidget->checkNodeAuth('upload',$path)){
                throw new Exception('你没有权限在该文件夹下上传文件', 400);
            }

            $filefield = $_POST['filefield'] ? $_POST['filefield'] : 'file';
            $file = $_FILES[$filefield];
            if (!isset($file)) {
                throw new Exception('文件上传失败', 400);
            }
            $name = $file['name'];
            $uploadAllowExt = $this->gkWidget->getFeature($path,'uploadAllowExt');
            if($uploadAllowExt){
                $ext = get_file_ext($name);
                $extArr = explode('|',$uploadAllowExt);
                if(!in_array($ext,$extArr)){
                    throw new Exception('只允许上传 '.join('、',$extArr), 403);
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

            $video_folder_path = APP_PATH.'Common/uploads';
            @mkdir($video_folder_path,0777);
            $video_path = $video_folder_path.DIRECTORY_SEPARATOR.'video';
            $re = move_uploaded_file($file['tmp_name'],$video_path);
            if(!$re){
                throw new Exception('无法移动上传文件', 400);
            }
            echo json_encode(['tmp_path'=>$video_path]);
        } catch (Exception $e) {
            echo json_encode(['error_code'=>$e->getCode(),'error_msg'=>$e->getMessage()]);
        }
    }

    /**
     * 设置视频信息
     */
    public function set_video_info(){
        try{
            $code = $_POST['video_code'];
            $name = $_POST['video_name'];
            if(!strlen($name)){
                throw new Exception('视频名称不能为空',400);
            }
            self::checkFilenameVaild($name);
            $introduction = $_POST['video_introduction'];
            if(mb_strlen($introduction,'utf8')>self::VIDEO_INTRODUCTION_LENGTH_LIMIT){
                throw new Exception('视频简介的字数不能超过'.self::VIDEO_INTRODUCTION_LENGTH_LIMIT,400);
            }
            $uploader = $_POST['video_uploader'];
            if(!strlen($uploader)){
                throw new Exception('视频上传者名称不能为空',400);
            }
            $path = $_POST['path'];
            if(!strlen($path)){
                throw new Exception('缺少参数[path]',400);
            }
            $folder_name = $name;
            $folder_path = $path . '/' .$folder_name;
            $info_fullpath = $folder_path.'/info.xml';
            $data = [
                'name'=>$name,
                'uploader'=>$uploader,
                'introduction'=>$introduction
            ];
            $string = "<?xml version='1.0' encoding='utf-8'?><video></video>";

            $xml = simplexml_load_string($string);

            foreach ($data as $k => $v) {
                $xml->addChild($k,$v);

            }

            $content =  $xml->asXML();

            $server = $this->gkClient->getUploadServer($folder_path, 'team');
            if (!$server) {
                throw new Exception('获取上传服务器地址失败', 400);
            }
            $re = $this->gkClient->uploadByContent($content, $server, $info_fullpath, 'team');
            if (!$re) {
                throw new Exception('文件上传到够快失败', 400);
            }
            $folder_path = get_dir_path($re['fullpath']);
            if($re['error_code']){
                throw new Exception($re['error_msg'], $re['error_code']);
            }
            $ext = get_file_ext(basename($name));
            $filename = 'video'.($ext?'.'.$ext:'');
            if($code){
                /**
                 * 从够快中选择呢
                 */
                $result = $this->gkClient->save($code , '', $folder_path, 'team',$filename);
            }else{
                /**
                 * 上传本地问
                 */
                $tmp_path = $_POST['video_tmp_path'];

                $video_fullpath = $folder_path.'/'.$filename;
                $result = $this->gkClient->uploadByFilename($tmp_path, $server, $video_fullpath, 'team');
                if (!$result) {
                    throw new Exception('文件上传到够快失败', 400);
                }
                if($result['error_code']){
                    throw new Exception($result['error_msg'], $result['error_code']);
                }
                @unlink($tmp_path);
                $this->gkClient->setKeywords(dirname($result['fullpath']) . '/', $introduction);
            }
            echo json_encode($result);
        }catch(Exception $e){
            ErrorAction::show_ajax($e->getMessage(), $e->getCode());
        }
    }

}

?>
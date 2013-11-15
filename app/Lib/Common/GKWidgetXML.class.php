<?php

class GKWidgetXML {

    private $xmlDom;
    private $nodes;
    private $basePaths;

    public function __construct($xmlPath) {
        $this->xmlDom = simplexml_load_file($xmlPath, 'SimpleXMLElement', LIBXML_NOCDATA);
        $this->setBasePaths();
        $this->setNodes();
    }

    private  function setBasePaths() {
        foreach($this->xmlDom->nodes as $v){
           $this->basePaths[] = trim($v->attributes()->base_path,'/');
        }
    }

    public static function checkAuth($auth, $access) {
        return in_array($auth, explode('|', $access));
    }

    public static function checkPath(&$path) {
        $path = trim($path, '/');
        if (!strlen($path)) {
            return;
        }
    }

    private function setNodes() {
        $this->nodes = json_decode(json_encode($this->xmlDom), true)['nodes'];
    }

    private function getBasePathAndRelPathByfullpath($fullpath,&$basePath='',&$relPath=''){
        foreach ($this->basePaths as $v) {
            if (strpos($fullpath . '/', $v . '/') === 0) {
                $basePath = $v;
                $relPath = trim(str_replace_once($basePath,'',$fullpath),'/');
                break;
            }
        }
    }

    public function getNodes() {
        return $this->nodes;
    }

    public function getNodeByFullpath($fullpath) {
        $fullpath = trim($fullpath, '/');
        $this->getBasePathAndRelPathByfullpath($fullpath,$basePath,$relPath);
        $node = $this->xmlDom->xpath('/publish_page/nodes[@base_path="'.$basePath.'"]/node[@path="'.$relPath.'"]');
        return json_decode(json_encode($node),true)[0];
    }

    public function addNode($base_path, $attrs) {
        $nodes = $this->xmlDom->xpath('/publish_page/nodes[@base_path="' . $base_path . '"]');
        if ($nodes) {
            $node = $nodes[0]->addChild('node');
            foreach ($attrs as $k => $v) {
                $node->addAttribute($k, $v);
            }
        }
    }

    public function addAttr($base_path, $attrs){
        $nodes = $this->xmlDom->xpath('/publish_page/nodes[@base_path="' . $base_path . '"]');
        if ($nodes) {
            foreach ($attrs as $k => $v) {
                $nodes[0]->addAttribute($k, $v);
            }
        }
    }

    public function getXmlDom() {
        return $this->xmlDom;
    }

    public function getFeature($fullpath,$attrName){
        $fullpath = trim($fullpath, '/');
        $this->getBasePathAndRelPathByfullpath($fullpath,$basePath,$relPath);
        $checkPath = $fullpath;
        $node = null;
        do {
            if (strlen($checkPath)) {
                $xpathQuery = '/publish_page/nodes[@base_path="'.$basePath.'"][@path="'.$checkPath.'"][@'.$attrName.']';
            } else {
                $xpathQuery = '/publish_page/nodes[@base_path="'.$basePath.'"][@'.$attrName.']';
            }
            $node = $this->xmlDom->xpath($xpathQuery);
            $checkPath = get_dir_path($checkPath);
        } while (!$node && $checkPath !== false);
        if(!$node){
            return (string)$this->xmlDom->attributes()[$attrName];
        }
        return (string)$node[0]->attributes()[$attrName];
    }

    public function checkNodeAuth($auth,$fullpath,&$access=''){
        $access = $this->getFeature($fullpath,'access');
        return in_array($auth, explode('|', $access));

    }

}
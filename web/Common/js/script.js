var gkHomeWorkDemo = {
    FILE_SORTS: {
        'SORT_SPEC': ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'],
        'SORT_MOVIE': ['mp4', 'mkv', 'rm', 'rmvb', 'avi', '3gp', 'flv', 'wmv', 'asf', 'mpeg', 'mpg', 'mov', 'ts', 'm4v'],
        'SORT_MUSIC': ['mp3', 'wma', 'wav', 'flac', 'ape', 'ogg', 'aac', 'm4a'],
        'SORT_IMAGE': ['jpg', 'png', 'jpeg', 'gif', 'psd'],
        'SORT_DOCUMENT': ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'odt', 'rtf', 'ods', 'csv', 'odp', 'txt'],
        'SORT_CODE': ['js', 'c', 'cpp', 'h', 'cs', 'vb', 'vbs', 'java', 'sql', 'ruby', 'php', 'asp', 'aspx', 'html', 'htm', 'py', 'jsp', 'pl', 'rb', 'm', 'css', 'go', 'xml', 'erl', 'lua', 'md'],
        'SORT_ZIP': ['rar', 'zip', '7z', 'cab', 'tar', 'gz', 'iso'],
        'SORT_EXE': ['exe', 'bat', 'com']
    },
    zTreeObj: null,
    getErrorMsg:function(request){
        var errorMsg = '';
        if (request.responseText) {
            var result = $.parseJSON(request.responseText);
            errorMsg = result.error_msg ? result.error_msg : request.responseText;
        } else {
            switch (request.status) {
                case 0:
                    errorMsg = '请检测网络是否已断开';
                    break;
                case 401:
                    errorMsg ='连接超时';
                    break;
                case 501:
                case 502:
                    errorMsg = '服务器繁忙, 请稍候重试';
                    break;
                case 503:
                case 504:
                    errorMsg = '因您的操作太过频繁, 操作已被取消';
                    break;
                default:
                    errorMsg = request.status + ':' + request.statusText;
                    break;
            }
        }
        return errorMsg;
    },
    checkFilenameVaild:function(filename){
        filename = $.trim(filename);
        if (!filename.length) {
            $.alert('文件名不能为空', {
                type: 'error'
            });
            return false;
        }
        var reg = /\/|\\\\|\:|\*|\?|\"|<|>|\|/;
        if (reg.test(filename)) {
            $.alert('文件名不能包含下列任何字符： / \\ : * ? " < > |', {
                type: 'error'
            });
            return false;
        }
        if (filename.length > 255) {
            $.alert('文件名的长度不能超过255个字符', {
                type: 'error'
            });
            return false;
        }
        return true;
    },
    buildFileItem: function (file, tmpl) {
        var _context = this;
        if (!file) {
            return '';
        }
        tmpl = tmpl === undefined ? $('#fileItemTmpl') : tmpl;
        var selectNode = _context.zTreeObj.getSelectedNodes()[0];
        var meta = {
            file: file,
            access:PAGE_CONFIG.access || ''
        };
        return tmpl.tmpl(meta);
    },
    getFullpath: function () {
        return Util.String.ltrim(PAGE_CONFIG.basePath ? PAGE_CONFIG.basePath + '/' + PAGE_CONFIG.path : PAGE_CONFIG.path,'/');
    },
    checkFilenameValid: function (filename) {
        filename = $.trim(filename);
        if (!filename.length) {
            $.alert('文件夹名不能为空', {
                type: 'error'
            });
            return false;
        }
        var reg = /\/|\\\\|\:|\*|\?|\"|<|>|\|/;
        if (reg.test(filename)) {
            $.alert('文件名不能包含下列任何字符： / \\ : * ? " < > |', {
                type: 'error'
            });
            return false;
        }
        if (filename.length > 255) {
            $.alert('文件名的长度不能超过255个字符', {
                type: 'error'
            });
            return false;
        }

        return true;
    },
    init: function () {
        var _context = this;
        var setting = {
            treeId: 'node_list',
            callback: {
                onClick: function (event, treeId, treeNode, clickFlag) {
                    var file = {
                        path: treeNode['data-path'],
                        name: treeNode['name']
                    };
                    _context.fetchFileList(file);
                }
            }
        };

        var nodes = _context.renderTreeList(PAGE_CONFIG.xmlData['nodes']);
        _context.zTreeObj = $.fn.zTree.init($('.node_list'), setting, nodes);
        $('#ztree a:first').click();
    },
    getBaseNode: function (node) {
        return  node['data-base_path'] ? node : node.getParentNode();
    },
    fetchFileList: function (node) {
        var _context = this;
        var path = node.path;
        var selectNode = _context.zTreeObj.getSelectedNodes()[0];
        var baseNode = _context.getBaseNode(selectNode);
        var fullpath = baseNode['data-base_path'] + '/' + path;
        $('.main').loader();
        _context.getFileList(fullpath, function (data) {
            $.loader.close();
            var files = [];
            PAGE_CONFIG.access = '';
            if (data) {
                if(data.list){
                    files = data.list;
                    $.each(files, function (i, file) {
                        file.icon = '/Common/images/icon/64_' + _context.getFileIconSuffix(file.filename, file.dir) + '.png';
                    });
                }
                PAGE_CONFIG.access = data.access || '';
                PAGE_CONFIG.uploadAllowExt =  data.uploadAllowExt;
            }
            PAGE_CONFIG.path = path;
            PAGE_CONFIG.basePath = baseNode['data-base_path'];

            var meta = {
                breads: _context.getBreads(PAGE_CONFIG.path, [baseNode.name]),
                files: files,
                current_node: node,
                access: PAGE_CONFIG.access
            };

            var jqContent = $('#contentTmpl').tmpl(meta);
            $('.content').empty().append(jqContent);
            _context.initFileItem($('.file_list .file_item'));
            _context.initShowUploadDialogBtn();
            _context.initCreateFolder();

        }, function () {
            $.loader.close();
        });
    },
    checkFileExt:function(filename){
        if(!PAGE_CONFIG.uploadAllowExt){
            return true;
        }
        var extArr = PAGE_CONFIG.uploadAllowExt.split('|');
        var ext = Util.String.getExt(filename);
        if($.inArray(ext,extArr)<0){
            var uploadTip = '只允许上传 '+ extArr.join('、');
            $.alert(uploadTip);
            return false;
        }
        return true;
    },
    removeEditFileItem:function(){
      $('.file_list .file_item_edit').remove();
    },
    initShowUploadDialogBtn:function(){
        var _context = this;
        var modal = $('#uploadVideoModal');
        //modal.on('show.bs.modal',function(){
            var col = $('#select_video_file').parents('.col-sm-10');
            col.find('.alert').remove();
            /**
             * 显示允许上传的文件格式
             */
            if(PAGE_CONFIG.uploadAllowExt){
                var uploadTip = '只允许上传 '+ PAGE_CONFIG.uploadAllowExt.split('|').join('、');
                $('<div class="alert alert-info" />').text(uploadTip).appendTo(col);
            }

        //});
        /**
         * modal显示后的回调
         */
        //modal.on('shown.bs.modal',function(){
            var _self = modal;
            var col = $('#select_video_file').parents('.col-sm-10');
            var fullpath = PAGE_CONFIG.basePath ? PAGE_CONFIG.basePath + '/' + PAGE_CONFIG.path : PAGE_COFNIG.path;
            var formData = {
                path:fullpath
            };

            /**
             * 上传本地文件
             */
            $('#select_video_file').fileupload({
                url: '/index/upload_file',
                dataType: 'json',
                formData:formData,
                add:function(e,data){
                    if (!data) {
                        return;
                    }
                    var files = data.files,file=files[0];
                    var fileInput = modal.find('#select_video_file');
                    if(typeof file !=='undefined' && file.name){
                        if(!_context.checkFileExt(file.name)){
                            return;
                        }
                    }
                    var videoNameInput = modal.find('#video_name');
                    if(!$.trim(videoNameInput.val())){
                        videoNameInput.val(file.name||'');
                    }
                    col.find(' > div').hide();
                    $('#uploadFileListTmpl').tmpl({files:files}).appendTo(col);
                    data.submit();
                },
                done: function (e, data) {
                    var result = data.result;
                    if(result){
                        if(result['error_code']){
                            $.alert(result['error_msg']);
                            return;
                        }
                        var tmpPath = result['tmp_path'];
                        _self.find('#video_tmp_path').val(tmpPath);
                        _self.find('.ok').removeProp('disabled');
                    }
                },

                progressall: function (e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    modal.find('.progress').show();
                    modal.find('.progress-bar').css(
                        'width',
                        progress + '%'
                    );
                }
            })

            /**
             * 从够快中选择
             */
            _self.find('button.select_from_gokuai').off('click').click(function(){
                new GKC({
                    client_id:'818f83a6e217eb7152b28ba14fd31377',
                    mode:'chooser',
                    link_type:'download_link',
                    style:{
                        'position':  'absolute',
                        'top': '50%',
                        'left': '50%',
                        'right':'auto',
                        'marginTop':'-200px',
                        'marginLeft':'-192px',
                        'height': '400px',
                        'width': '385px',
                        'borderRadius': '3px',
                        'borderColor': '#3B74BA',
                        'borderWidth': '3px',
                        'borderStyle': 'solid',
                        'backgroundColor': '#fff',
                        'zIndex':'99999',
                        'boxShadow':'0 0 20px 0 rgba(0,0,0,.3)'
                    },
                    ok:function(files){
                        if(!files || !files.length){
                            $.alert('请选择视频文件');
                            return;
                        }
                        var file = files[0];
                        var code = Util.String.getNextStr(file.link,'/'),
                            filename = Util.String.baseName(file.fullpath);
                        if(!_context.checkFileExt(filename)){
                            return;
                        }
                        _self.find('#video_code').val(code);
                        var videoNameInput = modal.find('#video_name');
                        if(!$.trim(videoNameInput.val())){
                            videoNameInput.val(filename);
                        }
                        var col = $('#select_video_file').parents('.col-sm-10');
                        col.find(' > div').hide();
                        var meta = [{
                            name:filename
                        }];
                        $('#uploadFileListTmpl').tmpl({files:meta}).appendTo(col).show();
                        _self.find('.ok').removeProp('disabled');
                    },
                    cancel:function(){

                    }
                });
                return false;
            })


            //提交视频信息
            _self.find('.ok').off('click').click(function(){
                var videoName = $.trim(_self.find('#video_name').val());
                if(!videoName.length){
                    $.alert('请输入视频名称');
                    return;
                }
                if(!_context.checkFilenameVaild(videoName)){
                    return;
                }
                var videoTmpPath = $.trim(_self.find('#video_tmp_path').val());
                var videoIntroduction = $.trim(_self.find('#video_introduction').val());
                var videoUploader = $.trim(_self.find('#video_uploader').val());
                if(!videoUploader.length){
                    $.alert('请输出上传者名称');
                    return;
                }
                var videoCode = _self.find('#video_code').val();
                var params = {
                  video_name:videoName,
                  video_tmp_path:videoTmpPath,
                  video_introduction:videoIntroduction,
                  video_uploader:videoUploader,
                  video_code:videoCode,
                  path:_context.getFullpath()
                };
                _self.find('.modal-content').loader();
                $.ajax({
                    url:'/index/set_video_info',
                    type:'POST',
                    data:params,
                    dataType:'json',
                    success:function(data){
                        $.loader.close();
                        var fullpath = gkHomeWorkDemo.getFullpath();
                        _gkDemoAfterUpload(fullpath);
                        _self.modal('hide');
                    },
                    error:function(request){
                        $.loader.close();
                        var errorMsg = _context.getErrorMsg(request);
                        $.alert(errorMsg);

                    }
                });
            });

        //})

        /**
         * modal隐藏后的回调
         */
        modal.on('hidden.bs.modal',function(){
            var _self = $(this);
            var col = _self.find('#select_video_file').parents('.col-sm-10');
            col.find('.alert').remove();
            col.find('>div').show();
            col.find('ul').remove();
            _self.find('form')[0].reset();
        })

    },
    initCreateFolder: function () {
        var _context = this;
        $('.cmd_create_folder').on('click', function () {
            var filename = '新建文件夹';
            _context.removeEditFileItem();
            var jqNewItem = $('#newFileItemTemplate').tmpl({
                filename: filename,
                imgpath: '/Common/images/icon/64_folder.png'
            });
            var jqInput = jqNewItem.find('input.input_filename');
            var jqBtns = jqNewItem.find('.edit_btns');
            var jqList = $('.file_list'), updir = $('.file_list .updir');
            updir.size() ? updir.after(jqNewItem) : jqList.prepend(jqNewItem);
            jqInput.on('keyup', function (e) {
                if (e.keyCode == 13) {
                    jqBtns.find('button:first').trigger('click');
                }
            });

            jqBtns.find('button:first').on('click', function () {
                var fullpath = _context.getFullpath();
                fullpath.length && (fullpath += '/');
                var name = $.trim(jqInput.val());
                if (!_context.checkFilenameValid(name)) {
                    return;
                }
                fullpath += name;
                if($('.file_list .file_item[data-fullpath="'+fullpath+'"]').size()){
                    $.alert('已存在相同名称的文件夹');
                    return;
                }
                jqNewItem.loader();
                $.ajax({
                    url: '/index/create_folder',
                    type:'POST',
                    data: {
                        path: fullpath
                    },
                    dataType: 'json',
                    success: function (data) {
                        $.loader.close();
                        if (!data) {
                            return;
                        }
                        var file = data;
                        var filename = Util.String.baseName(file.fullpath),
                            dir= 1,
                            icon =  '/Common/images/icon/64_' + _context.getFileIconSuffix(filename, dir) + '.png';
                        $.extend(file,{
                            dir:dir,
                            filename:filename,
                            icon : icon
                        });
                        var jqItem = _context.buildFileItem(file);

                        jqNewItem.after(jqItem);
                        jqNewItem.remove();
                        $('.file_list .empty').remove();
                        _context.initFileItem(jqItem);
                    },
                    error: function () {
                        $.loader.close();
                    }
                });

            });
            jqBtns.find('button:last').on('click', function () {
                jqNewItem.fadeOut(function () {
                    jqNewItem.remove();
                });
            });
//            jqInput.on('blur', function () {
//                jqBtns.find('button:first').trigger('click');
//            });
            jqInput[0].select();
            $('.file_list').scrollTop(0);
        });
    },
    getBreads: function (path, showNames) {
        path = Util.String.rtrim(Util.String.ltrim(path, '/'), '/');
        var paths = path.split('/'), breads = [], bread;
        for (var i = 0; i < paths.length; i++) {
            bread = {
                name: showNames[i] || paths[i]
            };
            var fullpath = '';
            for (var j = 0; j <= i; j++) {
                fullpath += paths[j] + '/'
            }
            fullpath = Util.String.rtrim(fullpath, '/');
            bread.path = fullpath;
            bread.href = 'javascript:void(gkHomeWorkDemo.fetchFileList({path:"' + fullpath + '"}))';
            breads.push(bread);
        }
        return breads;
    },
    initFileItem: function (items) {
        var _context = this;
        items.click(function () {
            var metaData = $(this).data();
             var dir = metaData.dir;
            if(dir ==1){
                metaData.path = PAGE_CONFIG.path + '/' + metaData.filename;
                _context.fetchFileList(metaData);
            }
        });
    },
    getFileList: function (path, success, error) {
        $.ajax({
            type: 'GET',
            url: '/index/file_list',
            data: {
                path: path
            },
            dataType: 'json',
            success: function (data) {
                $.isFunction(success) && success(data);
            },
            error: function (data) {
                $.isFunction(error) && success(error);
            }
        })
    },
    renderTreeList: function (nodes) {
        var _context = this;
        var renderList = [];
        if(!$.isArray(nodes)){
            nodes = [nodes];
        }
        //console.log(nodes);
        if (nodes && nodes.length) {
            $.each(nodes, function (i, n) {
                var node = _context.renderTreeItem(n);
                renderList.push(node);
            });
        }
        return renderList;
    },
    renderTreeItem: function (n) {
        var _context = this;
        var name = n['@attributes']['name'];
        var item = {
            'tId': '',
            'name': name
        };
        if (typeof n['@attributes']['base_path'] !== 'undefined') {
            item['data-base_path'] = n['@attributes']['base_path'];
        }
        if (typeof n['@attributes']['path'] !== 'undefined') {
            item['data-path'] = n['@attributes']['path'];
            item['data-access'] = n['@attributes']['access'];
        }
        return item;
    },
    getFileIconSuffix: function (filename, dir) {
        var suffix = '';
        var sorts = this.FILE_SORTS;
        if (dir) {
            suffix = 'folder';
        } else {
            var ext = Util.String.getExt(filename);
            if ($.inArray(ext, sorts['SORT_MOVIE']) > -1) {
                suffix = 'video';
            } else if ($.inArray(ext, sorts['SORT_MUSIC']) > -1) {
                suffix = 'music';
            } else if ($.inArray(ext, sorts['SORT_IMAGE']) > -1) {
                suffix = 'image';
            } else if ($.inArray(ext, sorts['SORT_DOCUMENT']) > -1) {
                suffix = 'document';
            } else if ($.inArray(ext, sorts['SORT_ZIP']) > -1) {
                suffix = 'compress';
            } else if ($.inArray(ext, sorts['SORT_EXE']) > -1) {
                suffix = 'execute';
            } else {
                suffix = 'other';
            }
        }
        return suffix;
    },
    checkAuth: function (auth, access) {
        return $.inArray(auth, access.split('|')) >= 0;
    },
    initUploadBtn: function () {
        var uploadBtn = $('.cmd_upload');
        if (!uploadBtn.size()) {
            return;
        }
        var fulllpath = PAGE_CONFIG.basePath ? PAGE_CONFIG.basePath + '/' + PAGE_CONFIG.path : PAGE_COFNIG.path;
        uploadBtn.gkUpload({
            url: '/index/upload',
            params: {
                fileSizeLimit: 300 * 1024 * 1024,
                stopCallback: "_gkDemoAfterUpload",
                uploadParams: encodeURIComponent(JSON.stringify({
                    path: fulllpath,
                    filefield: 'file'
                })),
                fullpath: fulllpath
            }
        });
    }
};


(function ($) {
    $.fn.gkUpload = function (options) {
        var opts = $.extend(true, {}, $.fn.gkUpload.defaults, options);
        return this.each(function () {
            var _self = $(this);
            _self.click(function () {
                var params = $.param(opts.params);
                var url = opts.url + '?' + params;
                $.fn.gkUpload.open(url, opts.width, opts.height, opts.name);
                return;
            });
        });
    };

    $.fn.gkUpload.open = function (url, width, height, name) {
        var top = (window.screen.availHeight - 30 - height) / 2;
        var left = (window.screen.availWidth - 10 - width) / 2;
        window.open(url, name, 'height=' + height + ',width=' + width + ',top=' + top + ',left=' + left + ',toolbar=no,menubar=no,scrollbars=no,resizable=no');
    };

    // 插件的defaults
    $.fn.gkUpload.defaults = {
        height: 400,
        width: 700,
        name: 'gk_upload_window',
        url: '/index/upload',
        params: {
            fileSizeLimit: 300 * 1024 * 1024,
            uploadParams: ''
        }
    };

    $.fn.gkUpload.init = function (options) {
        var defaults = {
            fileSizeLimit: 300 * 1024 * 1024,
            uploadURL: '',
            stopCallback: '',
            redirectURL: '',
            uploadParams: {},
            denyExts: '',
            allowExts: ''
        };
        var opts = $.extend({}, defaults, options);

        $(document).bind('drop,dragover', function (e) {
            e.preventDefault();
        });

        var uploadWrapper = $('#gk_upload_wrapper');
        var noContentText = '';
        var isMobile = Util.Browser.isMobile();
        if (isMobile && typeof opts.uploadParams.path !== 'undefined') {
            var toFileName = '当前目录';
            if (opts.uploadParams.path) {
                toFileName = Util.String.baseName(opts.uploadParams.path);
            } else if (opts.uploadParams.code && opts.uploadParams.filename) {
                toFileName = opts.uploadParams.filename;
            }
            noContentText = '上次到' + toFileName;
        } else if (!isMobile) {
            noContentText = '<div style="color:#738291">' + '拖拽文件到这里上传' + '</div>';
            if (!$.support.cors) {
                noContentText = '<div style="color:#738291">' + '你的浏览器不支持批量上传' + '</div>';
            }
            if (opts.maxUploadSize > 0) {
                noContentText += '<div style="font-size: 13px" >' + '最大只允许上传' + Util.Number.bitSize(opts.maxUploadSize) + '</div>';
            }
        }

        var redirectURL = opts.redirectURL;
        if ($.support.cors) {
            redirectURL = '';
        }
        var noContent = $('<div class="no_content"><div class="empty">' + noContentText + '</div></div>');
        uploadWrapper.find('.upload_list .no_content').remove();
        uploadWrapper.find('.upload_list').append(noContent);

        var target = uploadWrapper.find('.upload_list');
        var path = opts.uploadParams.path;
        $('#select_files').fileupload({
            url: opts.uploadURL + '?' + Math.random(),
            type: 'POST',
            dataType: 'json',
            sequentialUploads: true,
            redirect: redirectURL,
            formData: opts.uploadParams,
            add: function (e, data) {
                if (!data) {
                    return;
                }
                var files = data.files;
                var mobile = Util.Browser.isMobile();
                $.each(files, function (i, file) {
                    file.id = new Date().getTime();
                    file.gkFilename = file.name;
                    var fileData = $.extend({}, file);
                    if (mobile && $.inArray(mobile, ['ipad', 'iphone', 'ipod']) >= 0) {
                        var name_pre = fileData.name.slice(0, fileData.name.lastIndexOf('.'));
                        var ext = Util.String.getExt(fileData.name);
                        fileData.name = name_pre + '_' + file.id + '.' + ext;
                        file.gkFilename = fileData.name;
                    }
                    var fileProgress = new FileProgress(fileData, target);
                    data.context = fileProgress;
                });
                data.submit();
                return;
            },
            submit: function (e, data) {
                if (!data || !data.files) {
                    return;
                }

                data.formData = opts.uploadParams;
                var progress = data.context;
                var files = data.files;
                var file = files[0];

                data.formData.name = file.gkFilename;
                if (typeof file.relativePath !== 'undefined') {
                    if (file.relativePath) {
                        data.formData.path = path + '/' + Util.String.rtrim(file.relativePath, '/');
                    }
                }
                if (file) {
                    var ext = Util.String.getExt(file.name);
                    if (opts.allowExts && $.inArray(ext, opts.allowExts.split(',')) < 0) {
                        progress.setErrorMsg('只允许上传' + opts.allowExts);
                        return false;
                    }
                    if (opts.denyExts && $.inArray(ext, opts.denyExts.split(',')) > -1) {
                        progress.setErrorMsg(Util.String.getExt(file.name) + '文件请打包后再上传');
                        return false;
                    }
                    if ($.isNumeric(file.size) && file.size > opts.fileSizeLimit) {
                        progress.setErrorMsg('最大只允许上传' + Util.Number.bitSize(opts.fileSizeLimit) + '大小的文件');
                        return false;
                    }
                }
                progress.toggleCancel(true, data.jqXHR);
            },
            done: function (e, data) {
                var result = data.result, arr = [];
                if (typeof result === 'string') {
                    arr = $.parseJSON(decodeURIComponent(result));
                } else {
                    arr = result;
                }
                if (typeof arr !== 'object') {
                    return;
                }
                var isError = arr[0];
                var progress = data.context;
                if (isError == 1) {
                    var errorMsg = arr[1];
                    if (errorMsg) {
                        progress.setErrorMsg(errorMsg);
                        return;
                    }
                } else {
                    progress.setSuccess();
                }
            },
            fail: function (e, data) {
                var progress = data.context;
                progress.setFail('上传失败');
            },

            progress: function (e, data) {
                var bytesLoaded = data.loaded, bytesTotal = data.total;
                var percent = Math.ceil((bytesLoaded / bytesTotal) * 100);
                var progress = data.context;
                progress.setProgress(percent);
                progress.setLeaveSize(bytesLoaded, bytesTotal);
            },

            stop: function (e, data) {
                var win = window.opener;
                win && win[opts.stopCallback] && win[opts.stopCallback](opts.uploadParams.path);
                var isClose = $('input[name="close_when_finish"]:checked').size();
                if (isClose) {
                    if ($.browser.msie) {
                        var version = parseInt($.browser.version);
                        window.opener = null;
                        if (version < 9 && version > 6) {
                            window.open("", "_self");
                        }
                    }
                    window.close();
                }
            },

            drop: function (e, data) {
                $('body .ui-widget-overlay').hide();
                $('body #drop_zone').hide();
            },
            dragover: function (e, data) {
                var mask = $('.ui-widget-overlay');
                var dropZone = $('#drop_zone');
                mask.show();
                dropZone.show();
            }
        });
    };
})(jQuery);

function _gkDemoAfterUpload(path){
    path= Util.String.ltrim(path,'/');
    var fullpath = gkHomeWorkDemo.getFullpath();
    if (fullpath === path) {
        gkHomeWorkDemo.fetchFileList({
            path:PAGE_CONFIG.path
        });
    }
}
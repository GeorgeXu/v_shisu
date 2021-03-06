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
    fileSizeLimit: 1073741824, //1GB
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
        if (!file) {
            return '';
        }
        tmpl = tmpl === undefined ? $('#fileItemTmpl') : tmpl;
        var meta = {
            file: file,
            access:PAGE_CONFIG.access || ''
        };
        return tmpl.tmpl(meta);
    },
    getFullpath: function () {
        var basePath = Util.String.ltrim(PAGE_CONFIG.basePath, '/');
        basePath = Util.String.rtrim(basePath, '/');
        var path = Util.String.ltrim(PAGE_CONFIG.path, '/');
        path = Util.String.rtrim(path, '/');
        var fullpath = basePath;
        if (fullpath.length) {
            fullpath += '/';
        }
        fullpath += path;
        return Util.String.rtrim(fullpath, '/');
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
        var file = {
            path: '/' + PAGE_CONFIG.userName
        };
        _context.fetchFileList(file);
        _context.initShowUploadDialogBtn();
        _context.initShowCategoryDialogBtn();
        $('.main').on('click', '.cmd_show_upload_video', function(){
            var modal = $('#uploadVideoModal').modal('show');
            $('form', modal)[0].reset();
            $('#video_categories', modal).val('');
            $('#video_categories_name', modal).html('');
            var col = $('#select_video_file').parents('.col-sm-10');
            col.find('.alert').remove();
            //显示允许上传的文件格式
            if(PAGE_CONFIG.uploadAllowExt){
                var uploadTip = '只允许上传 '+ PAGE_CONFIG.uploadAllowExt.split('|').join('、');
                $('<div class="alert alert-info" />').text(uploadTip).appendTo(col);
            }
            col.find('>div').show();
            col.find('ul').remove();
        })
    },
    fetchFileList: function (node) {
        var _context = this;
        if (typeof(node.path) == 'undefined' || !node.path.length) {
            node.path = '/';
        }
        if (node.path.substr(0, 1) != '/') {
            node.path = '/' + node.path;
        }
        PAGE_CONFIG.path = node.path;
        var fullpath;
        if (typeof(node.fullpath) == 'undefined') {
            fullpath = PAGE_CONFIG.basePath + node.path;
        } else {
            fullpath = node.fullpath;
        }
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
            var meta = {
                breads: _context.getBreads(PAGE_CONFIG.path, [PAGE_CONFIG.userName]),
                files: files,
                current_node: node,
                access: PAGE_CONFIG.access
            };
            var jqContent = $('#contentTmpl').tmpl(meta);
            $('.content').empty().append(jqContent);
            _context.initFileItem($('.file_list .file_item'));
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
        var col = $('#select_video_file').parents('.col-sm-10');
        var fullpath = PAGE_CONFIG.basePath ? PAGE_CONFIG.basePath + PAGE_CONFIG.path : PAGE_COFNIG.path;
        var formData = {
            path:fullpath
        };
        //上传文件
        $('#select_video_file').fileupload({
            url: '/index/upload_file',
            dataType: 'json',
            formData:formData,
            add:function(e,data){
                if (!data) {
                    return;
                }
                var files = data.files,file=files[0];
                if(typeof file !=='undefined' && file.name){
                    if(!_context.checkFileExt(file.name)){
                        return;
                    }
                }
                $('#video_rawname', modal).val(file.name);
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
                    $('#video_tmp_path', modal).val(tmpPath);
                    $('.ok', modal).removeProp('disabled');
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
        });
        //从够快中选择
        $('button.select_from_gokuai', modal).on('click', function(){
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
                    $('#video_code', modal).val(code);
                    $('#video_rawname', modal).val(filename);
                    var videoNameInput = modal.find('#video_name');
                    if(!$.trim(videoNameInput.val())){
                        videoNameInput.val(filename);
                    }
                    col.find(' > div').hide();
                    var meta = [{
                        name:filename
                    }];
                    $('#uploadFileListTmpl').tmpl({files:meta}).appendTo(col).show();
                    $('.ok', modal).removeProp('disabled');
                },
                cancel:function(){

                }
            });
            return false;
        });
        //提交视频信息
        $('.ok', modal).on('click', function(){
            var videoName = $.trim($('#video_name', modal).val());
            if(!videoName.length){
                $.alert('请填写视频名称');
                return;
            }
            if(!_context.checkFilenameVaild(videoName)){
                return;
            }
            var videoCid = $('#video_categories', modal).val();
            if (!videoCid.length) {
                $.alert('请选择视频栏目');
                return;
            }
            var videoTmpPath = $.trim($('#video_tmp_path', modal).val());
            var videoIntroduction = $.trim($('#video_introduction', modal).val());
            var videoRawname = $.trim($('#video_rawname', modal).val());
            var videoCode = $('#video_code', modal).val();
            var params = {
              video_name:videoName,
              video_rawname:videoRawname,
              video_cid:videoCid,
              video_tmp_path:videoTmpPath,
              video_introduction:videoIntroduction,
              video_code:videoCode,
              path:_context.getFullpath()
            };
            modal.loader();
            $.ajax({
                url:'/index/set_video_info',
                type:'POST',
                data:params,
                dataType:'json',
                success:function(){
                    $.loader.close();
                    var fullpath = gkHomeWorkDemo.getFullpath();
                    _gkDemoAfterUpload(fullpath);
                    modal.modal('hide');
                },
                error:function(request){
                    $.loader.close();
                    var errorMsg = _context.getErrorMsg(request);
                    $.alert(errorMsg);

                }
            });
        });
    },
    initShowCategoryDialogBtn:function(){
        var modal = $('#categoryModal');
        PAGE_CONFIG.tree = $.fn.zTree.init($('#category_tree'), {
            view:{showIcon:false},
            check:{enable:true,chkboxType:{Y:'',N:''}},
            async:{enable:true,type:'get','url':'/account/categories'}
        }, []);
        modal.on('show.bs.modal',function(){
            $('#uploadVideoModal').modal('hide');
            var selected_cids = $('#video_categories').val().split(',');
            $.each(selected_cids, function(i,n){
                var node = PAGE_CONFIG.tree.getNodeByParam('id', n);
                if (node) {
                    PAGE_CONFIG.tree.checkNode(node, true);
                }
            });
        }).on('hidden.bs.modal',function(){
            PAGE_CONFIG.tree.checkAllNodes(false);
            $('#uploadVideoModal').modal('show');
        });
        $('.ok', modal).on('click', function(){
            var nodes = PAGE_CONFIG.tree.getCheckedNodes();
            var cids_input = $('#video_categories').val('');
            var cids_span = $('#video_categories_name').html('');
            nodes.forEach(function(n){
                if (cids_input.val().length) {
                    cids_input.val(cids_input.val() + ',');
                    cids_span.text(cids_span.html() + ', ');
                }
                cids_input.val(cids_input.val() + n.id);
                cids_span.text(cids_span.html() + n.name);
            });
            modal.modal('hide');
        });
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
            jqList.scrollTop(0);
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
        items.on('dblclick', function () {
            var metaData = $(this).data();
            var dir = metaData.dir;
            if(dir ==1){
                metaData.path = PAGE_CONFIG.path + '/' + metaData.filename;
                _context.fetchFileList(metaData);
            }
        });
        $('.folder_name', items).on('click', function () {
            var metaData = $(this).parents('.file_item').data();
            metaData.path = PAGE_CONFIG.path + '/' + metaData.filename;
            _context.fetchFileList(metaData);
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
            error: function () {
                $.isFunction(error) && success(error);
            }
        })
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
                fileSizeLimit: gkHomeWorkDemo.fileSizeLimit,
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
            fileSizeLimit: gkHomeWorkDemo.fileSizeLimit,
            uploadParams: ''
        }
    };

    $.fn.gkUpload.init = function (options) {
        var defaults = {
            fileSizeLimit: gkHomeWorkDemo.fileSizeLimit,
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
                    data.context = new FileProgress(fileData, target);
                });
                data.submit();
            },
            submit: function (e, data) {
                if (!data || !data.files) {
                    return false;
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
                return true;
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

            stop: function () {
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
            drop: function () {
                $('body .ui-widget-overlay').hide();
                $('body #drop_zone').hide();
            },
            dragover: function () {
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
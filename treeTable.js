/** 树形表格3.x Created by wangfan on 2020-04-06 https://gitee.com/whvse/treetable-lay */

layui.define(['laytpl', 'form'], function (exports) {
    var $ = layui.jquery;
    var laytpl = layui.laytpl;
    var form = layui.form;
    var device = layui.device();
    var MOD_NAME = 'treeTable';  // 模块名
    /* 表格默认参数 */
    var defaultOption = {
        elem: undefined,                        // 容器
        cols: undefined,                        // 列参数
        url: undefined,                         // url模式请求
        method: undefined,                      // url模式请求方式
        where: undefined,                       // url模式请求条件
        contentType: undefined,                 // url模式请求类型
        headers: undefined,                     // url模式请求headers
        parseData: undefined,                   // url模式处理请求数据
        request: {pidName: 'pid'},              // url模式请求字段自定义
        toolbar: undefined,                     // 表头工具栏
        defaultToolbar: undefined,              // 表头工具栏右侧按钮
        width: undefined,                       // 容器宽度
        height: undefined,                      // 容器高度
        cellMinWidth: 90,                       // 单元格最小宽度
        done: undefined,                        // 数据处理完回调
        data: undefined,                        // 直接赋值数据
        title: undefined,                       // 定义table大标题，文件导出会用到
        skin: undefined,                        // 表格风格
        even: undefined,                        // 是否开启隔行变色
        size: undefined,                        // 表格尺寸
        text: {
            none: '无数据'                      // 空数据提示
        },
        reqData: undefined,                     // 自定义加载数据方法
        tree: {
            idName: 'id',                       // id的字段名
            pidName: 'pid',                     // pid的字段名
            childName: 'children',              // children的字段名
            haveChildName: 'haveChild',         // 是否有children标识的字段名
            openName: 'open',                   // 是否默认展开的字段名
            iconIndex: 0,                       // 图标列的索引
            arrowType: undefined,               // 折叠箭头类型
            onlyIconControl: undefined,         // 仅点击图标控制展开折叠
            getIcon: function (d) {             // 自定义图标
                return getIcon(d, this);
            }
        }
    };
    /* 列默认参数 */
    var colDefaultOption = {
        field: undefined,     // 字段名
        title: undefined,     // 标题
        width: undefined,     // 宽度
        minWidth: undefined,  // 最小宽度
        type: undefined,      // 列类型
        fixed: undefined,     // 固定列
        hide: undefined,      // 是否初始隐藏列
        unresize: undefined,  // 禁用拖拽列宽
        style: undefined,     // 单元格样式
        align: undefined,     // 对齐方式
        colspan: undefined,   // 单元格所占的列数
        rowspan: undefined,   // 单元格所占的行数
        templet: undefined,   // 自定义模板
        toolbar: undefined,   // 工具列
        class: undefined,     // 单元格class
        singleLine: true,     // 是否一行显示
    };

    /** TreeTable类构造方法 */
    var TreeTable = function (options) {
        var that = this;
        // 初始化列参数
        if ('Array' !== isClass(options.cols[0])) options.cols = [options.cols];
        var colArrays = [], colIndex = 0;
        for (var i1 = 0; i1 < options.cols.length; i1++) {
            var item1 = options.cols[i1];
            for (var i2 = 0; i2 < item1.length; i2++) {
                var item2 = item1[i2];
                if (!item2) {
                    item1.splice(i2, 1);
                    continue;
                }
                if (!item2.INIT_OK) item2 = $.extend({INIT_OK: true}, colDefaultOption, item2);
                // 特殊列处理
                if (item2.type === 'space') {  // 空列
                    item2.width = 15;
                } else if (item2.type === 'numbers') {  // 序号列
                    item2.width = 40;
                    item2.singleLine = false;
                    item2.unresize = false;
                    if (!item2.align) item2.align = 'center';
                } else if (item2.type === 'checkbox' || item2.type === 'radio') {  // 复/单选框列
                    item2.width = 48;
                    item2.singleLine = false;
                    item2.unresize = false;
                    item2.align = 'center';
                }
                // 合并单元格处理
                item2.key = i1 + '-' + i2;
                var CHILD_COLS;
                if (item2.colGroup || item2.colspan > 1) {
                    item2.colGroup = true;
                    CHILD_COLS = [];
                    colIndex++;
                    var childIndex = 0;
                    for (var i22 = 0; i22 < options.cols[i1 + 1].length; i22++) {
                        var item22 = $.extend({INIT_OK: true}, colDefaultOption, options.cols[i1 + 1][i22]);
                        if (item22.HAS_PARENT || (childIndex > 1 && childIndex == item2.colspan)) {
                            options.cols[i1 + 1][i22] = item22;
                            continue;
                        }
                        item22.HAS_PARENT = true;
                        item22.parentKey = i1 + '-' + i2;
                        item22.PARENT_COL_INDEX = colIndex;
                        CHILD_COLS.push(item22);
                        childIndex = childIndex + parseInt(item22.colspan > 1 ? item22.colspan : 1);
                        options.cols[i1 + 1][i22] = item22;
                    }
                }
                if (!item2.PARENT_COL_INDEX) colArrays.push($.extend({CHILD_COLS: CHILD_COLS}, item2));
                options.cols[i1][i2] = item2;
            }
        }
        this.options = $.extend(true, {}, defaultOption, options);
        this.options.colArrays = colArrays;
        // url加载模式转为reqData模式
        if (this.options.url) {
            this.options.reqData = function (data, callback) {
                if (!that.options.where) that.options.where = {};
                that.options.where[that.options.request.pidName] = data[that.options.tree.idName];
                (layui.admin ? layui.admin : $).ajax({
                    url: that.options.url,
                    data: that.options.contentType && that.options.contentType.indexOf('application/json') === 0 ? JSON.stringify(that.options.where) : that.options.where,
                    headers: that.options.headers,
                    type: that.options.method,
                    dataType: 'json',
                    contentType: that.options.contentType,
                    success: function (res) {
                        callback(that.options.parseData ? that.options.parseData(res) : res);
                    },
                    error: function (xhr) {
                        callback({code: xhr.status, msg: xhr.statusText, xhr: xhr});
                    }
                });
            };
        } else if (this.options.data && this.options.data.length > 0 && this.options.tree.isPidData) {  // pid形式数据转children形式
            this.options.data = tt.pidToChildren(this.options.data, this.options.tree.idName, this.options.tree.pidName, this.options.tree.childName);
        }
        this.init();  // 初始化表格
        this.bindEvents();  // 绑定事件
    };

    /** 初始化表格 */
    TreeTable.prototype.init = function () {
        console.log(this.options)
        var options = this.options;
        var $elem = $(options.elem);  // 原始表格
        var tbFilter = options.elem.substring(1);  // 表格的filter
        // 第一次生成树表格dom
        $elem.removeAttr('lay-filter');
        if ($elem.next('.ew-tree-table').length === 0) {
            $elem.css('display', 'none');
            $elem.after([
                '<div class="layui-form ew-tree-table" lay-filter="', tbFilter, '" style="', options.style || '', '">',
                '   <div class="ew-tree-table-head">',
                '      <table class="layui-table"></table>',
                '   </div>',
                '   <div class="ew-tree-table-box">',
                '      <table class="layui-table"></table>',
                '      <div class="ew-tree-table-loading"><i class="layui-icon layui-icon-loading layui-anim layui-anim-rotate layui-anim-loop"></i></div>',
                '      <div class="ew-tree-table-empty">', options.text.none || '', '</div>',
                '   </div>',
                '</div>'
            ].join(''));
        }
        // 获取各个组件
        var components = this.getComponents();

        // 基础参数设置
        if (options.skin) components.$table.attr('lay-skin', options.skin);
        if (options.size) components.$table.attr('lay-size', options.size);
        if (options.even) components.$table.attr('lay-even', options.even);

        // 固定宽度
        if (options.width) {
            components.$view.css('width', options.width);
            components.$tHeadGroup.css('width', options.width);
            components.$tBodyGroup.css('width', options.width);
        }

        // 最小宽度
        var minWidth = 0;
        this.eachCols(function (i, item) {
            if (item.colGroup) return;
            if (item.minWidth) minWidth += item.minWidth;
            else if (item.width && item.width < options.cellMinWidth) minWidth += item.width;
            else minWidth += options.cellMinWidth;
        });
        if (minWidth) components.$tHead.css('min-width', minWidth);
        if (minWidth) components.$tBody.css('min-width', minWidth);
        // 生成colgroup
        var colgroupHtml = ['<colgroup>'];
        this.eachCols(function (i, item) {
            if (item.colGroup) return;
            colgroupHtml.push('<col');
            if (item.width) colgroupHtml.push(' width="' + item.width + '"');
            colgroupHtml.push('/>');
        });
        colgroupHtml.push('</colgroup>');
        colgroupHtml = colgroupHtml.join('');

        // 生成thead
        var headHtml = ['<thead>'];
        $.each(options.cols, function (i1, item1) {
            headHtml.push('<tr>');
            $.each(item1, function (i2, item2) {
                headHtml.push('<td');
                if (item2.colspan) headHtml.push(' colspan="' + item2.colspan + '"');
                if (item2.rowspan) headHtml.push(' rowspan="' + item2.rowspan + '"');
                headHtml.push(' align="' + item2.align + '"');
                headHtml.push('>');
                headHtml.push('<div class="ew-tree-table-cell' + (item2.singleLine ? ' single-line' : '') + '"><div>');
                // 标题
                var ca = '<input type="checkbox" lay-filter="' + components.chooseAllFilter + '" lay-skin="primary" class="ew-tree-table-checkbox"/>';
                if (item2.type === 'checkbox') headHtml.push(ca);
                else headHtml.push(item2.title || '');
                headHtml.push('</div><i class="layui-icon layui-icon-close ew-tree-tips-c"></i></div>');
                // 列宽拖拽
                if (!item2.unresize) headHtml.push('<span class="ew-tb-resize"></span>');
                headHtml.push('</td>');
            });
            headHtml.push('</tr>');
        });
        headHtml.push('</thead>');
        headHtml = headHtml.join('');

        // 渲染表结构
        if (options.height) {  // 固定表头
            components.$tHead.html(colgroupHtml + headHtml);
            components.$tBody.html(colgroupHtml + '<tbody></tbody>');
            if (options.height.indexOf('full-') === 0) {  // 差值高度
                var h = parseFloat(options.height.substring(5));
                components.$tBodyGroup.append([
                    '<style>[lay-filter="', tbFilter, '"] .ew-tree-table-box {',
                    '   height: ', getPageHeight() - h, 'px;',
                    '   height: -moz-calc(100vh - ', h, 'px);',
                    '   height: -webkit-calc(100vh - ', h, 'px);',
                    '   height: calc(100vh - ', h, 'px);',
                    '}</style>'
                ].join(''));
                components.$tBodyGroup.data('full', h);
            } else {  // 固定高度
                components.$tBodyGroup.css('height', options.height);
            }
        } else {
            components.$tBody.html(colgroupHtml + headHtml + '<tbody></tbody>');
        }
        form.render('checkbox', tbFilter);  // 渲染表头的表单元素

        // 渲染数据
        if (options.reqData) {  // 异步加载
            this.options.data = undefined;
            this.renderBodyAsync();
        } else if (options.data && options.data.length > 0) {
            this.renderBodyData(options.data);
        } else {
            components.$loading.hide();
            components.$empty.show();
        }
    };

    /** 绑定各项事件 */
    TreeTable.prototype.bindEvents = function () {
        var that = this;
        var options = this.options;
        var components = this.getComponents();
        var $allBody = components.$table.children('tbody');

        /* 根据获取行对应数据 */
        function getDataByTr($tr) {
            var data;
            if (!$tr || $tr.length === 0) return data;
            var index = $tr.data('index').split(',');
            for (var i = 0; i < index.length; i++) {
                if (data) data = data[options.tree.childName][index[i]];
                else data = options.data[index[i]];
            }
            return data;
        }

        /* 行事件公共返回对象 */
        var member = function (ext) {
            // 获取行dom
            var $tr = $(this);
            if (!$tr.is('tr')) {
                var $temp = $tr.parent('tr');
                if ($temp.length > 0) $tr = $temp;
                else $tr = $tr.parentsUntil('tr').last().parent();
            }
            var data = getDataByTr($tr);  // 行对应数据
            var obj = {
                tr: $tr,
                data: data,
                del: function () { // 删除行
                    var indent = parseInt($tr.data('indent'));
                    $tr.nextAll('tr').each(function () {
                        if (parseInt($(this).data('indent')) <= indent) return false;
                        $(this).remove();
                    });
                    var $pTr = $tr.prevAll('tr');
                    $tr.remove();
                    options.data.splice(index[0], 1);
                    if (options.data.length === 0) components.$empty.show();
                    that.renderNumberCol();  // 渲染序号列
                    // 联动父级
                    $pTr.each(function () {
                        var tInd = parseInt($(this).data('indent'));
                        if (tInd < indent) {
                            that.checkParentCB($(this));
                            indent = tInd;
                        }
                    });
                    that.checkChooseAllCB();  // 联动全选框
                },
                update: function (fields) {  // 修改行
                    data = $.extend(data, fields);
                    var indent = parseInt($tr.data('indent'));
                    that.renderBodyTr(data, indent, undefined, $tr);
                    form.render(null, components.filter);  // 渲染表单元素
                    that.checkChooseAllCB();  // 联动全选框
                }
            };
            return $.extend(obj, ext);
        };

        // 绑定折叠展开事件
        components.$tBody.off('click.fold').on('click.fold', '.ew-tree-pack', function (e) {
            layui.stope(e);
            var $tr = $(this).parentsUntil('tr').last().parent();
            if ($tr.hasClass('ew-tree-table-loading')) return; // 已是加载中
            var haveChild = $tr.data('have-child');
            if (haveChild !== true && haveChild !== 'true') return; // 子节点
            var open = $tr.hasClass('ew-tree-table-open');
            var data = getDataByTr($tr);
            if (!open && (!data[options.tree.childName] || data[options.tree.childName].length === 0)) {
                that.renderBodyAsync(data, $tr);
            } else {
                toggleRow($tr);
            }
        });

        // 绑定lay-event事件
        components.$tBody.off('click.tool').on('click.tool', '*[lay-event]', function (e) {
            layui.stope(e);
            var $this = $(this);
            layui.event.call(this, MOD_NAME, 'tool(' + components.filter + ')', member.call(this, {
                event: $this.attr('lay-event')
            }));
        });

        // 绑定单选框事件
        form.on('radio(' + components.radioFilter + ')', function (data) {
            var d = getDataByTr($(data.elem).parentsUntil('tr').last().parent());
            that.removeAllChecked();
            d.LAY_CHECKED = true;  // 同时更新数据
            layui.event.call(this, MOD_NAME, 'checkbox(' + components.filter + ')',
                {checked: true, data: d, type: 'one'});
        });

        // 绑定复选框事件
        form.on('checkbox(' + components.checkboxFilter + ')', function (data) {
            var checked = data.elem.checked;
            var $cb = $(data.elem);
            var $layCb = $cb.next('.layui-form-checkbox');
            // 如果是半选状态，点击全选
            if (!checked && $cb.hasClass('ew-form-indeterminate')) {
                checked = true;
                $cb.prop('checked', checked);
                $layCb.addClass('layui-form-checked');
                $cb.removeClass('ew-form-indeterminate');
            }
            var $tr = $cb.parentsUntil('tr').last().parent();
            var d = getDataByTr($tr);
            d.LAY_CHECKED = checked;  // 同时更新数据
            // 联动操作
            if (d[options.tree.childName] && d[options.tree.childName].length > 0) {
                that.checkSubCB($tr, checked);  // 联动子级
            }
            var indent = parseInt($tr.data('indent'));
            $tr.prevAll('tr').each(function () {
                var tInd = parseInt($(this).data('indent'));
                if (tInd < indent) {
                    that.checkParentCB($(this));  // 联动父级
                    indent = tInd;
                }
            });
            that.checkChooseAllCB();  // 联动全选框
            // 回调事件
            layui.event.call(this, MOD_NAME, 'checkbox(' + components.filter + ')',
                {checked: checked, data: d, type: 'more'});
        });

        // 绑定全选复选框事件
        form.on('checkbox(' + components.chooseAllFilter + ')', function (data) {
            var checked = data.elem.checked;
            var $cb = $(data.elem);
            var $layCb = $cb.next('.layui-form-checkbox');
            if (!options.data || options.data.length === 0) {  // 如果数据为空
                $cb.prop('checked', false);
                $layCb.removeClass('layui-form-checked');
                $cb.removeClass('ew-form-indeterminate');
                return;
            }
            // 如果是半选状态，点击全选
            if (!checked && $cb.hasClass('ew-form-indeterminate')) {
                checked = true;
                $cb.prop('checked', checked);
                $layCb.addClass('layui-form-checked');
                $cb.removeClass('ew-form-indeterminate');
            }
            layui.event.call(this, MOD_NAME, 'checkbox(' + components.filter + ')', {checked: checked, type: 'all'});
            that.checkSubCB(components.$tBody.children('tbody'), checked);  // 联动操作
        });

        // 绑定行单击事件
        $allBody.off('click.row').on('click.row', 'tr', function () {
            layui.event.call(this, MOD_NAME, 'row(' + components.filter + ')', member.call(this, {}));
        });

        // 绑定行双击事件
        $allBody.off('dblclick.rowDouble').on('dblclick.rowDouble', 'tr', function () {
            layui.event.call(this, MOD_NAME, 'rowDouble(' + components.filter + ')', member.call(this, {}));
        });

        // 绑定单元格点击事件
        $allBody.off('click.cell').on('click.cell', 'td', function (e) {
            var $td = $(this);
            var type = $td.data('type');
            // 判断是否是复选框、单选框列
            if (type === 'checkbox' || type === 'radio') return layui.stope(e);
            var edit = $td.data('edit');
            var field = $td.data('field');
            if (edit) {  // 开启了单元格编辑
                layui.stope(e);
                if ($allBody.find('.ew-tree-table-edit').length > 0) return;
                var index = $td.data('index');
                var indent = $td.find('.ew-tree-table-indent').length;
                var d = getDataByTr($td.parent());
                if ('text' === edit || 'number' === edit) {  // 文本框
                    var $input = $('<input type="' + edit + '" class="layui-input ew-tree-table-edit"/>');
                    $input[0].value = d[field];
                    $td.append($input);
                    $input.focus();
                    $input.blur(function () {
                        var value = $(this).val();
                        if (value == d[field]) return $(this).remove();
                        var rs = layui.event.call(this, MOD_NAME, 'edit(' + components.filter + ')', member.call(this,
                            {value: value, field: field}));
                        if (rs === false) {
                            $(this).addClass('layui-form-danger');
                            $(this).focus();
                        } else {
                            d[field] = value;  // 同步更新数据
                            that.renderBodyTd(d, indent, index, $td);  // 更新单元格
                        }
                    });
                } else {
                    console.error('不支持的单元格编辑类型:' + edit);
                }
            } else {  // 回调单元格点击事件
                var rs = layui.event.call(this, MOD_NAME, 'cell(' + components.filter + ')', member.call(this,
                    {td: $td, field: field}));
                if (rs === false) layui.stope(e);
            }
        });

        // 绑定单元格双击事件
        $allBody.off('dblclick.cellDouble').on('dblclick.cellDouble', 'td', function (e) {
            var $td = $(this);
            var type = $td.data('type');
            // 判断是否是复选框、单选框列
            if (type === 'checkbox' || type === 'radio') return layui.stope(e);
            var edit = $td.data('edit');
            var field = $td.data('field');
            if (edit) return layui.stope(e);  // 开启了单元格编辑
            // 回调单元格双击事件
            var rs = layui.event.call(this, MOD_NAME, 'cellDouble(' + components.filter + ')', member.call(this,
                {td: $td, field: field}));
            if (rs === false) layui.stope(e);
        });

        // 同步滚动条
        components.$tBodyGroup.on('scroll', function () {
            var $this = $(this);
            components.$tHeadGroup.scrollLeft($this.scrollLeft());
            // $headGroup.scrollTop($this.scrollTop());
        });

        // 列宽拖拽调整
        /*$view.off('mousedown.resize').on('mousedown.resize', '.ew-tb-resize', function (e) {
            layui.stope(e);
            var index = $(this).parent().data('index');
            $(this).data('move', 'true');
            $(this).data('x', e.clientX);
            var w = $(this).parent().parent().parent().parent().children('colgroup').children('col').eq(index).attr('width');
            $(this).data('width', w);
        });
        $view.off('mousemove.resize').on('mousemove.resize', '.ew-tb-resize', function (e) {
            layui.stope(e);
            var move = $(this).data('move');
            if ('true' == move) {
                var x = $(this).data('x');
                var w = $(this).data('width');
                var index = $(this).parent().data('index');
                var nw = parseFloat(w) + e.clientX - parseFloat(x);
                $(this).parent().parent().parent().parent().children('colgroup').children('col').eq(index).attr('width', nw);
            }
        });
        $view.off('mouseup.resize').on('mouseup.resize', '.ew-tb-resize', function (e) {
            layui.stope(e);
            $(this).data('move', 'false');
        });
        $view.off('mouseleave.resize').on('mouseleave.resize', '.ew-tb-resize', function (e) {
            layui.stope(e);
            $(this).data('move', 'false');
        });*/

    };

    /** 获取各个组件 */
    TreeTable.prototype.getComponents = function () {
        var $view = $(this.options.elem).next('.ew-tree-table');   // 容器
        var tbFilter = $view.attr('lay-filter');                   // 容器filter
        var $tHeadGroup = $view.children('.ew-tree-table-head');  // 表头部分容器
        var $tBodyGroup = $view.children('.ew-tree-table-box');   // 主体部分容器
        return {
            $view: $view,
            filter: tbFilter,
            $tHeadGroup: $tHeadGroup,
            $tBodyGroup: $tBodyGroup,
            $tHead: $tHeadGroup.children('.layui-table'),              // 表头表格
            $tBody: $tBodyGroup.children('.layui-table'),              // 主体表格
            $table: $view.find('.layui-table'),                        // 所有表格
            $empty: $tBodyGroup.children('.ew-tree-table-empty'),      // 空视图
            $loading: $tBodyGroup.children('.ew-tree-table-loading'),  // 加载视图
            checkboxFilter: 'ew_tb_checkbox_' + tbFilter,              // 复选框filter
            radioFilter: 'ew_tb_radio_' + tbFilter,                    // 单选框filter
            chooseAllFilter: 'ew_tb_choose_all_' + tbFilter            // 全选按钮filter
        };
    };

    /**
     * 遍历表头
     * @param callback
     * @param obj
     */
    TreeTable.prototype.eachCols = function (callback, obj) {
        if (!obj) obj = this.options.colArrays;
        for (var i = 0; i < obj.length; i++) {
            var item = obj[i];
            if (item.CHILD_COLS) return this.eachCols(callback, item.CHILD_COLS);
            callback && callback(i, item);
        }
    };

    /**
     * 异步加载渲染
     * @param d 父级数据
     * @param $tr 父级dom
     */
    TreeTable.prototype.renderBodyAsync = function (d, $tr) {
        var that = this;
        var options = this.options;
        var components = this.getComponents();
        // 显示loading
        if ($tr) {
            $tr.addClass('ew-tree-table-loading');
            $tr.find('.ew-tree-pack').children('.ew-tree-table-arrow').addClass('layui-anim layui-anim-rotate layui-anim-loop');
        } else {
            components.$empty.hide();
            if (options.data && options.data.length > 0) components.$loading.addClass('ew-loading-float');
            components.$loading.show();
        }
        // 请求数据
        options.reqData(d, function (data) {
            if (data && data.length > 0 && options.tree.isPidData) {
                data = tt.pidToChildren(data, options.tree.idName, options.tree.pidName, options.tree.childName);
            }
            that.renderBodyData(data, d, $tr);  // 渲染内容
        });
    };

    /**
     * 根据数据渲染body
     * @param data  数据集合
     * @param d 父级数据
     * @param $tr 父级dom
     */
    TreeTable.prototype.renderBodyData = function (data, d, $tr) {
        var that = this;
        var options = this.options;
        var components = this.getComponents();
        // 更新到数据
        if (d === undefined) options.data = data;
        else d[options.tree.childName] = data;
        var indent;
        if ($tr) indent = parseInt($tr.data('indent')) + 1;
        var htmlStr = this.renderBody(data, indent, d);
        if ($tr) {
            // 移除旧dom
            $tr.nextAll('tr').each(function () {
                if (parseInt($(this).data('indent')) <= (indent - 1)) return false;
                $(this).remove();
            });
            // 渲染新dom
            $tr.after(htmlStr).addClass('ew-tree-table-open');
        } else {
            components.$tBody.children('tbody').html(htmlStr);
        }
        form.render(null, components.filter);  // 渲染表单元素
        this.renderNumberCol();  // 渲染序号列
        if ($tr) {
            // 更新父级复选框状态
            this.checkParentCB($tr);
            $tr.prevAll('tr').each(function () {
                var tInd = parseInt($(this).data('indent'));
                if (tInd < (indent - 1)) {
                    that.checkParentCB($(this));
                    indent = tInd + 1;
                }
            });
            // 移除loading
            $tr.removeClass('ew-tree-table-loading');
            $tr.find('.ew-tree-pack').children('.ew-tree-table-arrow').removeClass('layui-anim layui-anim-rotate layui-anim-loop');
        } else {
            // 移除loading
            components.$loading.hide();
            components.$loading.removeClass('ew-loading-float');
            // 显示空视图
            if (data && data.length > 0) components.$empty.hide();
            else components.$empty.show();
        }
        this.checkChooseAllCB();  // 联动全选框
        updateFixedTbHead(components.$view);  // 滚动条补丁
    };

    /**
     * 递归渲染表格主体部分
     * @param data 数据列表
     * @param indent 缩进大小
     * @param parent 父级
     * @returns {string}
     */
    TreeTable.prototype.renderBody = function (data, indent, parent) {
        var options = this.options;
        if (!indent) indent = 0;
        var html = '';
        if (!data || data.length === 0) return html;
        var hide = parent ? !parent[options.tree.openName] : undefined;
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            d.LAY_INDEX = (parent ? parent.LAY_INDEX + '-' : '') + i;
            html += this.renderBodyTr(d, indent, hide);
            // 递归渲染子集
            html += this.renderBody(d[options.tree.childName], indent + 1, d);
        }
        return html;
    };

    /**
     * 渲染每一行数据
     * @param d 行数据
     * @param indent 缩进大小
     * @param hide 是否隐藏
     * @param $tr
     * @returns {string}
     */
    TreeTable.prototype.renderBodyTr = function (d, indent, hide, $tr) {
        var that = this;
        var options = this.options;
        if (!indent) indent = 0;
        var haveChild = d[options.tree.haveChildName];
        if (haveChild === undefined) haveChild = d[options.tree.childName] && d[options.tree.childName].length > 0;
        if ($tr) {
            $tr.data('have-child', haveChild ? 'true' : 'false');
            $tr.data('index', d.LAY_INDEX);
            $tr.data('indent', indent);
            $tr.removeClass('ew-tree-table-loading');
        }
        var html = '<tr';
        var classNames = '';
        if (haveChild && d[options.tree.openName]) classNames += 'ew-tree-table-open';
        if (hide) classNames += 'ew-tree-tb-hide';
        html += (' class="' + classNames + '"');
        if (haveChild) html += (' data-have-child="' + haveChild + '"');
        html += (' data-index="' + d.LAY_INDEX + '"');
        html += (' data-indent="' + indent + '">');
        this.eachCols(function (i, col) {
            if (col.colGroup) return;
            html += that.renderBodyTd(d, indent, i, $tr ? $tr.children('td').eq(i) : undefined, col);
        });
        html += '</tr>';
        return html;
    };

    /**
     * 渲染每一个单元格数据
     * @param d 行数据
     * @param indent 缩进大小
     * @param index 第几列
     * @param $td
     * @param col
     * @returns {string}
     */
    TreeTable.prototype.renderBodyTd = function (d, indent, index, $td, col) {
        if (col.colGroup) return '';
        var options = this.options;
        var components = this.getComponents();
        if (!indent) indent = 0;
        // 内容填充
        var content = '', cell = '', icon = '';
        if (col.type === 'numbers') {  // 序号列
            content = '<span class="ew-tree-table-numbers"></span>';
        } else if (col.type === 'checkbox') {  // 复选框列
            content = [
                '<input type="checkbox"', ' value="', d.LAY_INDEX, '"',
                ' lay-filter="', components.checkboxFilter, '"',
                d.LAY_CHECKED ? ' checked="checked"' : '',
                ' lay-skin="primary" class="ew-tree-table-checkbox" />'
            ].join('');
        } else if (col.type === 'radio') {  // 单选框列
            content = [
                '<input type="radio"', ' value="', d.LAY_INDEX, '"',
                ' lay-filter="', components.radioFilter, '"',
                ' name="', components.radioFilter, '"',
                d.LAY_CHECKED ? ' checked="checked"' : '',
                ' class="ew-tree-table-radio" />'
            ].join('');
        } else if (col.templet) {  // 自定义模板
            if (typeof col.templet === 'function') {
                content = col.templet(d);
            } else if (typeof col.templet === 'string') {
                laytpl($(col.templet).html()).render(d, function (html) {
                    content = html;
                });
            }
        } else if (col.toolbar) {  // 操作列
            if (typeof col.toolbar === 'function') {
                content = col.toolbar(d);
            } else if (typeof col.toolbar === 'string') {
                laytpl($(col.toolbar).html()).render(d, function (html) {
                    content = html;
                });
            }
        } else if (col.field && d[col.field] !== undefined && d[col.field] !== null) {  // 普通字段
            content = d[col.field];
        }
        // 图标列处理
        if (index === options.tree.iconIndex) {
            // 缩进
            for (var i = 0; i < indent; i++) icon += '<span class="ew-tree-table-indent"></span>';
            icon += '<span class="ew-tree-pack">';
            // 加箭头
            var haveChild = d[options.tree.haveChildName];
            if (haveChild === undefined) haveChild = d[options.tree.childName];
            icon += ('<i class="ew-tree-table-arrow layui-icon' + (haveChild ? '' : ' ew-tree-table-arrow-hide'));
            icon += (' ' + (options.tree.arrowType || '') + '"></i>');
            // 加图标
            icon += options.tree.getIcon(d);
            content = '<span>' + content + '</span>';
            if (options.tree.onlyIconControl) content = icon + '</span>' + content;
            else content = icon + content + '</span>';
        }
        cell = [
            '<div class="ew-tree-table-cell', col.singleLine ? ' single-line' : '', '">',
            '   <div>', content, '</div>',
            '   <i class="layui-icon layui-icon-close ew-tree-tips-c"></i>',
            '</div>'
        ].join('');

        if ($td) $td.html(cell);

        var html = '<td data-index="' + index + '" ';
        if (col.field) html += (' data-field="' + col.field + '"');
        if (col.edit) html += (' data-edit="' + col.edit + '"');
        if (col.type) html += (' data-type="' + col.type + '"');
        if (col.align) html += (' align="' + col.align + '"');
        if (col.style) html += (' style="' + col.style + '"');
        if (col.class) html += (' class="' + col.class + '"');
        html += ('>' + cell + '</td>');
        return html;
    };

    /**
     * 联动子级复选框状态
     * @param $tr 当前tr的dom
     * @param checked
     */
    TreeTable.prototype.checkSubCB = function ($tr, checked) {
        var that = this;
        var components = this.getComponents();
        var cbFilter = components.checkboxFilter;
        var indent = -1, $trList;
        if ($tr.is('tbody')) {
            $trList = $tr.children('tr');
        } else {
            indent = parseInt($tr.data('indent'));
            $trList = $tr.nextAll('tr')
        }
        $trList.each(function () {
            if (parseInt($(this).data('indent')) <= indent) {
                return false;
            }
            var $cb = $(this).children('td').find('input[name="' + cbFilter + '"]');
            $cb.prop('checked', checked);
            if (checked) {
                $cb.data('indeterminate', 'false');
                $cb.next('.layui-form-checkbox').addClass('layui-form-checked');
                $cb.next('.layui-form-checkbox').removeClass('ew-form-indeterminate');
            } else {
                $cb.data('indeterminate', 'false');
                $cb.next('.layui-form-checkbox').removeClass('layui-form-checked ew-form-indeterminate');
            }
            that.update($(this).data('id'), {LAY_CHECKED: checked});  // 同步更新数据
        });
    };

    /**
     * 联动父级复选框状态
     * @param $tr 父级的dom
     */
    TreeTable.prototype.checkParentCB = function ($tr) {
        var that = this;
        var components = this.getComponents();
        var cbFilter = components.checkboxFilter;
        var indent = parseInt($tr.data('indent'));
        var ckNum = 0, unCkNum = 0;
        $tr.nextAll('tr').each(function () {
            if (parseInt($(this).data('indent')) <= indent) {
                return false;
            }
            var $cb = $(this).children('td').find('input[name="' + cbFilter + '"]');
            if ($cb.prop('checked')) {
                ckNum++;
            } else {
                unCkNum++;
            }
        });
        var $cb = $tr.children('td').find('input[name="' + cbFilter + '"]');
        if (ckNum > 0 && unCkNum == 0) {  // 全选
            $cb.prop('checked', true);
            $cb.data('indeterminate', 'false');
            $cb.next('.layui-form-checkbox').addClass('layui-form-checked');
            $cb.next('.layui-form-checkbox').removeClass('ew-form-indeterminate');
            that.update($tr.data('id'), {LAY_CHECKED: true});  // 同步更新数据
        } else if (ckNum == 0 && unCkNum > 0) {  // 全不选
            $cb.prop('checked', false);
            $cb.data('indeterminate', 'false');
            $cb.next('.layui-form-checkbox').removeClass('layui-form-checked ew-form-indeterminate');
            that.update($tr.data('id'), {LAY_CHECKED: false});  // 同步更新数据
        } else if (ckNum > 0 && unCkNum > 0) {  // 半选
            $cb.prop('checked', true);
            $cb.data('indeterminate', 'true');
            $cb.next('.layui-form-checkbox').addClass('layui-form-checked ew-form-indeterminate');
            that.update($tr.data('id'), {LAY_CHECKED: true});  // 同步更新数据
        }
    };

    /** 联动全选复选框 */
    TreeTable.prototype.checkChooseAllCB = function () {
        var components = this.getComponents();
        var cbAllFilter = components.cbAllFilter;
        var cbFilter = components.checkboxFilter;
        var $tbody = components.$table.children('tbody');
        var ckNum = 0, unCkNum = 0;
        $tbody.children('tr').each(function () {
            var $cb = $(this).children('td').find('input[name="' + cbFilter + '"]');
            if ($cb.prop('checked')) {
                ckNum++;
            } else {
                unCkNum++;
            }
        });
        var $cb = $('input[lay-filter="' + cbAllFilter + '"]');
        if (ckNum > 0 && unCkNum == 0) {  // 全选
            $cb.prop('checked', true);
            $cb.data('indeterminate', 'false');
            $cb.next('.layui-form-checkbox').addClass('layui-form-checked');
            $cb.next('.layui-form-checkbox').removeClass('ew-form-indeterminate');
        } else if ((ckNum == 0 && unCkNum > 0) || (ckNum == 0 && unCkNum == 0)) {  // 全不选
            $cb.prop('checked', false);
            $cb.data('indeterminate', 'false');
            $cb.next('.layui-form-checkbox').removeClass('layui-form-checked ew-form-indeterminate');
        } else if (ckNum > 0 && unCkNum > 0) {  // 半选
            $cb.prop('checked', true);
            $cb.data('indeterminate', 'true');
            $cb.next('.layui-form-checkbox').addClass('layui-form-checked ew-form-indeterminate');
        }
    };

    /** 填充序号列 */
    TreeTable.prototype.renderNumberCol = function () {
        this.getComponents().$tBody.children('tbody').children('tr').each(function (i) {
            $(this).children('td').find('.ew-tree-table-numbers').text(i + 1);
        });
    };

    /* 解决form.render之后半选框被重置的问题 */
    TreeTable.prototype.checkIndeterminateCB = function () {
        var components = this.getComponents();
        var cbFilter = components.checkboxFilter;
        $('input[lay-filter="' + cbFilter + '"]').each(function () {
            var $cb = $(this);
            if ($cb.data('indeterminate') == 'true' && $cb.prop('checked')) {
                $cb.next('.layui-form-checkbox').addClass('ew-form-indeterminate');
            }
        });
    };

    /**
     * 搜索数据
     * @param ids 关键字或数据id集合
     */
    TreeTable.prototype.filterData = function (ids) {
        var components = this.getComponents();
        var $trList = components.$table.children('tbody').children('tr');
        if (typeof ids == 'string') {  // 关键字
            var keyword = ids;
            ids = [];
            $trList.each(function () {
                var id = $(this).data('id');
                $(this).children('td').each(function () {
                    if ($(this).text().indexOf(keyword) != -1) {
                        ids.push(id);
                        return false;
                    }
                });
            });
        }
        $trList.addClass('ew-tree-table-filter-hide');
        for (var i = 0; i < ids.length; i++) {
            var $tr = $trList.filter('[data-id="' + ids[i] + '"]');
            $tr.removeClass('ew-tree-table-filter-hide');
            // 联动父级
            var indent = parseInt($tr.data('indent'));
            $tr.prevAll('tr').each(function () {
                var tInd = parseInt($(this).data('indent'));
                if (tInd < indent) {
                    $(this).removeClass('ew-tree-table-filter-hide');  // 联动父级
                    if (!$(this).hasClass('ew-tree-table-open')) {
                        toggleRow($(this));
                    }
                    indent = tInd;
                }
            });
        }
    };

    /** 重置搜索 */
    TreeTable.prototype.clearFilter = function () {
        var components = this.getComponents();
        var $trList = components.$table.children('tbody').children('tr');
        $trList.removeClass('ew-tree-table-filter-hide');
    };

    /** 展开指定行 */
    TreeTable.prototype.expand = function (id, cascade) {
        var components = this.getComponents();
        var $tr = components.$table.children('tbody').children('tr[data-id="' + id + '"]');
        if (!$tr.hasClass('ew-tree-table-open')) {
            $tr.children('td').find('.ew-tree-pack').trigger('click');
        }
        if (cascade == false) {
            return;
        }
        // 联动父级
        var indent = parseInt($tr.data('indent'));
        $tr.prevAll('tr').each(function () {
            var tInd = parseInt($(this).data('indent'));
            if (tInd < indent) {
                if (!$(this).hasClass('ew-tree-table-open')) {
                    $(this).children('td').find('.ew-tree-pack').trigger('click');
                }
                indent = tInd;
            }
        });
    };

    /** 折叠指定行 */
    TreeTable.prototype.fold = function (id, cascade) {
        var components = this.getComponents();
        var $tr = components.$table.children('tbody').children('tr[data-id="' + id + '"]');
        if ($tr.hasClass('ew-tree-table-open')) {
            $tr.children('td').find('.ew-tree-pack').trigger('click');
        }
        if (cascade == false) {
            return;
        }
        // 联动父级
        var indent = parseInt($tr.data('indent'));
        $tr.prevAll('tr').each(function () {
            var tInd = parseInt($(this).data('indent'));
            if (tInd < indent) {
                if ($(this).hasClass('ew-tree-table-open')) {
                    $(this).children('td').find('.ew-tree-pack').trigger('click');
                }
                indent = tInd;
            }
        });
    };

    /** 全部展开 */
    TreeTable.prototype.expandAll = function () {
        var that = this;
        var components = this.getComponents();
        var $trList = components.$table.children('tbody').children('tr');
        $trList.each(function () {
            that.expand($(this).data('id'), false);
        });
    };

    /** 全部折叠 */
    TreeTable.prototype.foldAll = function () {
        var that = this;
        var components = this.getComponents();
        var $trList = components.$table.children('tbody').children('tr');
        $trList.each(function () {
            that.fold($(this).data('id'), false);
        });
    };

    /** 获取当前数据 */
    TreeTable.prototype.getData = function () {
        return this.options.data;
    };

    /** 重载表格 */
    TreeTable.prototype.reload = function (opt) {
        tt.render($.extend(this.options, opt));
    };

    /** 根据id更新数据 */
    TreeTable.prototype.update = function (id, fields) {
        var data = getDataById(this.getData(), id, this.options.tree);
        $.extend(data, fields);
    };

    /** 根据id删除数据 */
    TreeTable.prototype.del = function (id) {
        delDataById(this.getData(), id, this.options.tree);
    };

    /** 获取当前选中行 */
    TreeTable.prototype.checkStatus = function (needIndeterminate) {
        (needIndeterminate == undefined) && (needIndeterminate = true);
        var that = this;
        var components = this.getComponents();
        var $table = components.$table;
        var checkboxFilter = components.checkboxFilter;
        var radioFilter = components.radioFilter;
        var list = [];
        // 获取单选框选中数据
        var $radio = $table.find('input[name="' + radioFilter + '"]');
        if ($radio.length > 0) {
            var id = $radio.filter(':checked').val();
            var d = getDataById(this.getData(), id, this.options.tree);
            if (d) {
                list.push(d);
            }
        } else {  // 获取复选框数据
            $table.find('input[name="' + checkboxFilter + '"]:checked').each(function () {
                var id = $(this).val();
                var isIndeterminate = $(this).next('.layui-form-checkbox').hasClass('ew-form-indeterminate');
                if (needIndeterminate || !isIndeterminate) {
                    var d = getDataById(that.getData(), id, that.options.tree);
                    if (d) {
                        d.isIndeterminate = isIndeterminate;
                        list.push(d);
                    }
                }
            });
        }
        return list;
    };

    /** 设置复/单选框选中 */
    TreeTable.prototype.setChecked = function (ids) {
        var components = this.getComponents();
        var $table = components.$table;
        var checkboxFilter = components.checkboxFilter;
        var radioFilter = components.radioFilter;
        var $radio = $table.find('input[name="' + radioFilter + '"]');
        if ($radio.length > 0) {  // 开启了单选框
            $radio.each(function () {
                if (ids[ids.length - 1] == $(this).val()) {
                    $(this).next('.layui-form-radio').trigger('click');
                    return false;
                }
            });
        } else {  // 开启了复选框
            $table.find('input[name="' + checkboxFilter + '"]').each(function () {
                var $cb = $(this);
                var value = $cb.val();
                var $layCb = $cb.next('.layui-form-checkbox');
                for (var i = 0; i < ids.length; i++) {
                    if (value == ids[i]) {
                        var checked = $cb.prop('checked');
                        var indeterminate = $layCb.hasClass('ew-form-indeterminate');
                        if (!checked || indeterminate) {
                            $layCb.trigger('click');
                        }
                    }
                }
            });
        }
    };

    /** 移除全部选中 */
    TreeTable.prototype.removeAllChecked = function () {
        var components = this.getComponents();
        var $table = components.$table;
        var checkboxFilter = components.checkboxFilter;
        this.checkSubCB($table.children('tbody'), false);
    };

    /**
     * 刷新指定父级下的节点
     * @param id 父级id,空则全部刷新
     * @param data 非异步模式替换的数据
     */
    TreeTable.prototype.refresh = function (id, data) {
        if (isClass(id) == 'Array') {
            data = id;
            id = undefined;
        }
        var components = this.getComponents();
        var $table = components.$table;
        var d, $tr;
        if (id != undefined) {
            d = getDataById(this.getData(), id, this.options.tree);
            $tr = $table.children('tbody').children('tr[data-id="' + id + '"]');
        }
        if (data) {  // 数据模式
            components.$tbLoading.addClass('ew-loading-float');
            components.$tbLoading.show();
            this.renderBodyData(data, d, $tr);
            components.$tbLoading.hide();
            components.$tbLoading.removeClass('ew-loading-float');
            if (data && data.length > 0) {
                components.$tbEmpty.hide();
            } else {
                components.$tbEmpty.show();
            }
        } else {  // 异步模式
            this.renderBodyAsync(d, $tr);
        }
    };

    /** 生成表头 */
    function getThead(options) {
        var htmlStr = '<tr>';
        for (var i = 0; i < options.cols.length; i++) {
            var col = options.cols[i];
            htmlStr += '<td data-index="' + i + '" ';
            col.align && (htmlStr += ' align="' + col.align + '"');  // 对齐方式
            htmlStr += ' >';
            if (col.singleLine && col.type != 'checkbox') {  // 单行显示
                htmlStr += '<div class="ew-tree-table-td-single"><i class="layui-icon layui-icon-close ew-tree-tips-c"></i><div class="ew-tree-tips">';
            }
            // 标题
            if (col.type == 'checkbox') {
                htmlStr += options.getAllChooseBox();
            } else {
                htmlStr += (col.title || '');
            }
            // 列宽拖拽
            if (!col.unresize && 'checkbox' != col.type && 'radio' != col.type && 'numbers' != col.type && 'space' != col.type) {
                htmlStr += '<span class="ew-tb-resize"></span>';
            }
            if (col.singleLine) {  // 单行显示
                htmlStr += '</div></div>';
            }
            htmlStr += '</td>';
        }
        htmlStr += '</tr>';
        return htmlStr;
    }

    /** 生成colgroup */
    function getColgroup(options) {
        var htmlStr = '<colgroup>';
        for (var i = 0; i < options.cols.length; i++) {
            var col = options.cols[i];
            htmlStr += '<col ';
            // 设置宽度
            if (col.width) {
                htmlStr += 'width="' + col.width + '"'
            } else if (col.type == 'space') {  // 空列
                htmlStr += 'width="15"'
            } else if (col.type == 'numbers') {  // 序号列
                htmlStr += 'width="40"'
            } else if (col.type == 'checkbox' || col.type == 'radio') {  // 复/单选框列
                htmlStr += 'width="48"'
            }
            htmlStr += ' />';
        }
        htmlStr += '</colgroup>';
        return htmlStr;
    }

    /** 计算table宽度 */
    function getTbWidth(options) {
        var minWidth = 0, setWidth = true;
        for (var i = 0; i < options.cols.length; i++) {
            var col = options.cols[i];
            if (col.type == 'space') {  // 空列
                minWidth += 15;
            } else if (col.type == 'numbers') {  // 序号列
                minWidth += 40;
            } else if (col.type == 'checkbox' || col.type == 'radio') {  // 复/单选框列
                minWidth += 48;
            } else if (!col.width || /\d+%$/.test(col.width)) {  // 列未固定宽度
                setWidth = false;
                if (col.minWidth) {
                    minWidth += col.minWidth;
                } else if (options.cellMinWidth) {
                    minWidth += options.cellMinWidth;
                }
            } else {  // 列固定宽度
                minWidth += col.width;
            }
        }
        return {minWidth: minWidth, setWidth: setWidth};
    }

    /** 生成全选按钮 */
    function getAllChooseBox(options) {
        var tbFilter = $(options.elem).next().attr('lay-filter');
        var cbAllFilter = 'ew_tb_choose_all_' + tbFilter;
        return '<input type="checkbox" lay-filter="' + cbAllFilter + '" lay-skin="primary" class="ew-tree-table-checkbox"/>';
    }

    /** 获取列图标 */
    function getIcon(d, treeOption) {
        if (getHaveChild(d, treeOption)) {
            return '<i class="ew-tree-icon layui-icon layui-icon-layer"></i>';
        } else {
            return '<i class="ew-tree-icon layui-icon layui-icon-file"></i>';
        }
    }

    /** 折叠/展开行 */
    function toggleRow($tr) {
        var indent = parseInt($tr.data('indent'));
        var isOpen = $tr.hasClass('ew-tree-table-open');
        if (isOpen) {  // 折叠
            $tr.removeClass('ew-tree-table-open');
            $tr.nextAll('tr').each(function () {
                if (parseInt($(this).data('indent')) <= indent) {
                    return false;
                }
                $(this).addClass('ew-tree-tb-hide');
            });
        } else {  // 展开
            $tr.addClass('ew-tree-table-open');
            var hideInd;
            $tr.nextAll('tr').each(function () {
                var ind = parseInt($(this).data('indent'));
                if (ind <= indent) {
                    return false;
                }
                if (hideInd != undefined && ind > hideInd) {
                    return true;
                }
                $(this).removeClass('ew-tree-tb-hide');
                if (!$(this).hasClass('ew-tree-table-open')) {
                    hideInd = parseInt($(this).data('indent'));
                } else {
                    hideInd = undefined;
                }
            });
        }
        updateFixedTbHead($tr.parent().parent().parent().parent().parent());
    }

    /** 固定表头滚动条补丁 */
    function updateFixedTbHead($view) {
        var $headBox = $view.children('.ew-tree-table-head');
        var $tbBox = $view.children('.ew-tree-table-box');
        var sWidth = $tbBox.width() - $tbBox.prop('clientWidth');
        if (sWidth > 0) {
            $headBox.css('border-right', sWidth + 'px solid #f2f2f2');
        } else {
            $headBox.css('border-right', 'none');
        }
    }

    // 监听窗口大小改变
    $(window).resize(function () {
        $('.ew-tree-table').each(function () {
            updateFixedTbHead($(this));
            var $tbBox = $(this).children('.ew-tree-table-group').children('.ew-tree-table-box');
            var full = $tbBox.attr('ew-tree-full');
            if (full && device.ie && device.ie < 10) {
                $tbBox.css('height', getPageHeight() - full);
            }
        });
    });

    // 表格溢出点击展开功能
    $(document).on('mouseenter', '.ew-tree-table td', function () {
        var $tdSingle = $(this).children('.ew-tree-table-td-single');
        var $content = $tdSingle.children('.ew-tree-tips');
        if ($tdSingle.length > 0 && $content.prop('scrollWidth') > $content.outerWidth()) {
            $(this).append('<div class="layui-table-grid-down"><i class="layui-icon layui-icon-down"></i></div>');
        }
    }).on('mouseleave', '.ew-tree-table td', function () {
        $(this).children('.layui-table-grid-down').remove();
    });
    // 点击箭头展开
    $(document).on('click', '.ew-tree-table td>.layui-table-grid-down', function (e) {
        hideAllTdTips();
        var $tdSingle = $(this).parent().children('.ew-tree-table-td-single');
        $tdSingle.addClass('ew-tree-tips-open');
        var $box = $tdSingle.parents().filter('.ew-tree-table-box');
        if ($box.length <= 0) {
            $box = $tdSingle.parents().filter('.ew-tree-table-head');
        }
        if (($tdSingle.outerWidth() + $tdSingle.parent().offset().left) > $box.offset().left + $box.outerWidth()) {
            $tdSingle.addClass('ew-show-left');
        }
        if (($tdSingle.outerHeight() + $tdSingle.parent().offset().top) > $box.offset().top + $box.outerHeight()) {
            $tdSingle.addClass('ew-show-bottom');
        }
        e.stopPropagation();
    });
    // 点击关闭按钮关闭
    $(document).on('click', '.ew-tree-table .ew-tree-tips-c', function (e) {
        hideAllTdTips();
    });
    // 点击空白部分关闭
    $(document).on('click', function () {
        hideAllTdTips();
    });
    $(document).on('click', '.ew-tree-table-td-single.ew-tree-tips-open', function (e) {
        e.stopPropagation();
    });

    /* 关闭所有单元格溢出提示框 */
    function hideAllTdTips() {
        var $single = $('.ew-tree-table-td-single');
        $single.removeClass('ew-tree-tips-open');
        $single.removeClass('ew-show-left');
    }

    /** 判断是否还有子节点 */
    function getHaveChild(d, treeOption) {
        var haveChild = false;
        if (d[treeOption.haveChildName] != undefined) {
            haveChild = d[treeOption.haveChildName];
            haveChild = haveChild == true || haveChild == 'true';
        } else if (d[treeOption.childName]) {
            haveChild = d[treeOption.childName].length > 0;
        }
        return haveChild;
    }

    /** 补充pid字段 */
    function addPidField(data, treeOption, parent) {
        for (var i = 0; i < data.length; i++) {
            if (parent) {
                data[i][treeOption.pidName] = parent[treeOption.idName];
            }
            if (data[i][treeOption.childName] && data[i][treeOption.childName].length > 0) {
                addPidField(data[i][treeOption.childName], treeOption, data[i]);
            }
        }
    }

    /** 根据id获取数据 */
    function getDataById(data, id, treeOption) {
        for (var i = 0; i < data.length; i++) {
            if (data[i][treeOption.idName] == id) {
                return data[i];
            }
            if (data[i][treeOption.childName] && data[i][treeOption.childName].length > 0) {
                var d = getDataById(data[i][treeOption.childName], id, treeOption);
                if (d != undefined) {
                    return d;
                }
            }
        }
    }

    /** 根据id删除数据 */
    function delDataById(data, id, treeOption) {
        for (var i = 0; i < data.length; i++) {
            if (data[i][treeOption.idName] == id) {
                data.splice(i, 1);
                return true;
            }
            if (data[i][treeOption.childName] && data[i][treeOption.childName].length > 0) {
                var rs = delDataById(data[i][treeOption.childName], id, treeOption);
                if (rs) {
                    return true;
                }
            }
        }
    }

    /** 获取顶级的pId */
    function getPids(data, idName, pidName) {
        var pids = [];
        for (var i = 0; i < data.length; i++) {
            var hasPid;
            for (var j = 0; j < data.length; j++) {
                if (i !== j && data[j][idName] == data[i][pidName]) {
                    hasPid = true;
                    break;
                }
            }
            if (!hasPid) pids.push(data[i][pidName]);
        }
        return pids;
    }

    /** 判断pId是否相等 */
    function pidEquals(pId, pIds) {
        if (isClass(pIds) === 'Array') {
            for (var i = 0; i < pIds.length; i++) {
                if (pId == pIds[i]) return true;
            }
        }
        return pId == pIds;
    }

    /** 获取变量类型 */
    function isClass(o) {
        if (o === null) return 'Null';
        if (o === undefined) return 'Undefined';
        return Object.prototype.toString.call(o).slice(8, -1);
    }

    /** 获取浏览器高度 */
    function getPageHeight() {
        return document.documentElement.clientHeight || document.body.clientHeight;
    }

    /** 获取浏览器宽度 */
    function getPageWidth() {
        return document.documentElement.clientWidth || document.body.clientWidth;
    }

    /** 对外提供的方法 */
    var tt = {
        /* 渲染 */
        render: function (options) {
            return new TreeTable(options);
        },
        /* 事件监听 */
        on: function (events, callback) {
            return layui.onevent.call(this, MOD_NAME, events, callback);
        },
        /* pid转children形式 */
        pidToChildren: function (data, idName, pidName, childName, pId) {
            if (!childName) childName = 'children';
            var newList = [];
            for (var i = 0; i < data.length; i++) {
                if (pId === undefined) pId = getPids(data, idName, pidName);
                if (pidEquals(data[i][pidName], pId)) {
                    var children = this.pidToChildren(data, idName, pidName, childName, data[i][idName]);
                    if (children.length > 0) data[i][childName] = children;
                    newList.push(data[i]);
                }
            }
            return newList;
        }
    };

    /** 添加样式 */
    $('head').append([
        '<style id="ew-tree-table-css">',
        '</style>'
    ].join(''));

    exports('treeTable', tt);
});

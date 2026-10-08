/* ===========================================================
 * view.js —— 模板层（纯字符串函数，不碰 DOM、不读存储）
 *   输入数据 -> 输出 HTML 字符串，因此可以脱离浏览器逻辑单独测试。
 *   所有用户输入一律经 Utils.escapeHtml 转义。
 * =========================================================== */
window.View = (function () {

  var esc = function (s) { return Utils.escapeHtml(s); };

  /* ---------- 空状态 ---------- */
  function emptyState(opts) {
    opts = opts || {};
    return '<div class="empty">' +
      '<div class="empty-ico">' + (opts.icon || '🗂️') + '</div>' +
      '<div class="empty-ttl">' + esc(opts.title || '暂时没有信息') + '</div>' +
      '<div class="empty-sub">' + esc(opts.sub || '换个关键词试试，或者自己发一条') + '</div>' +
      (opts.action ? '<button class="btn" data-act="' + esc(opts.action.act) + '">' + esc(opts.action.label) + '</button>' : '') +
      '</div>';
  }

  /* ---------- 信息卡片 ---------- */
  function itemCard(item) {
    var isFound = item.type === 'found';
    var done = item.status === 'done';
    var cls = ['item-card', isFound ? 'is-found' : 'is-lost', done ? 'is-done' : ''].join(' ');

    return '<article class="' + cls + '" data-id="' + esc(item.id) + '" tabindex="0" role="button">' +
      '<div class="item-thumb">' + Utils.categoryIcon(item.category) + '</div>' +
      '<div class="item-main">' +
        '<div class="item-head">' +
          '<span class="badge ' + (isFound ? 'badge-found' : 'badge-lost') + '">' + (isFound ? '招领' : '寻物') + '</span>' +
          '<span class="item-name">' + esc(item.name) + '</span>' +
        '</div>' +
        '<div class="item-meta">📍 ' + esc(item.place) + ' · ' + esc(Utils.friendlyDate(item.time)) +
          ' · ' + esc(item.category) + '</div>' +
        '<div class="item-foot">' +
          '<span class="status-text ' + (done ? 'status-done' : 'status-active') + '">' +
            (done ? '✅ ' : '🟢 ') + esc(Utils.statusOf(item)) + '</span>' +
          '<span>👁 ' + (Number(item.views) || 0) + '</span>' +
          '<span>' + esc(Utils.timeAgo(item.createdAt)) + '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function itemList(items) {
    if (!items || !items.length) return '';
    return '<div class="list">' + items.map(itemCard).join('') + '</div>';
  }

  /* ---------- 首页 ---------- */
  function homePage(opts) {
    var cnt = opts.counts || { all: 0, lost: 0, found: 0 };
    var type = opts.type || '';
    var html = '';

    html += '<button class="search-trigger" data-act="go-search">🔍 搜索物品名称、地点、描述…</button>';

    html += '<div class="publish-entry">' +
      '<button class="entry-btn entry-lost" data-act="go-publish" data-type="lost">' +
        '<span class="entry-ico">🔍</span><span class="entry-ttl">发布寻物</span>' +
        '<span class="entry-sub">我丢了东西</span></button>' +
      '<button class="entry-btn entry-found" data-act="go-publish" data-type="found">' +
        '<span class="entry-ico">🎁</span><span class="entry-ttl">发布招领</span>' +
        '<span class="entry-sub">我捡到东西</span></button>' +
      '</div>';

    html += '<div class="chips">' +
      chip('', '全部', cnt.all, type) +
      chip('lost', '寻物', cnt.lost, type) +
      chip('found', '招领', cnt.found, type) +
      '<button class="chip" data-act="toggle-active">' +
        (opts.onlyActive ? '✓ 只看进行中' : '只看进行中') + '</button>' +
      '</div>';

    html += '<div class="section-title"><span>最新信息</span><span>' +
      (opts.items ? opts.items.length : 0) + ' 条</span></div>';

    html += opts.items && opts.items.length
      ? itemList(opts.items)
      : emptyState({ icon: '📭', title: '还没有这类信息', sub: '点击上方按钮发布第一条',
                     action: { act: 'go-publish', label: '去发布' } });

    return '<section class="view" id="view-home">' + html + '</section>';
  }

  function chip(value, label, count, current) {
    var on = (current || '') === value;
    return '<button class="chip' + (on ? ' on' : '') + '" data-act="filter-type" data-type="' + value + '">' +
      label + ' <span class="cnt">' + (count || 0) + '</span></button>';
  }

  /* ---------- 搜索页 ---------- */
  function searchPage(opts) {
    var kw = opts.keyword || '';
    var html = '';

    html += '<div class="card" style="padding:10px 12px">' +
      '<input class="input" id="searchInput" type="search" autofocus ' +
        'placeholder="输入物品名称 / 地点 / 描述" value="' + esc(kw) + '">' +
      '<div class="chips" style="margin:10px 0 0">' +
        ['校园卡', '耳机', '钥匙', '水杯', '雨伞', '书籍'].map(function (k) {
          return '<button class="chip" data-act="hot-word" data-word="' + k + '">' + k + '</button>';
        }).join('') +
      '</div>' +
      '<div class="chips" style="margin:8px 0 0">' +
        '<button class="chip' + (opts.type ? '' : ' on') + '" data-act="filter-type" data-type="">全部类型</button>' +
        '<button class="chip' + (opts.type === 'lost' ? ' on' : '') + '" data-act="filter-type" data-type="lost">寻物</button>' +
        '<button class="chip' + (opts.type === 'found' ? ' on' : '') + '" data-act="filter-type" data-type="found">招领</button>' +
      '</div>' +
      '<div class="chips" style="margin:8px 0 0">' +
        '<button class="chip' + (opts.category ? '' : ' on') + '" data-act="filter-cat" data-cat="">全部分类</button>' +
        Store.CATEGORIES.map(function (c) {
          return '<button class="chip' + (opts.category === c ? ' on' : '') + '" data-act="filter-cat" data-cat="' + esc(c) + '">' +
            Utils.categoryIcon(c) + ' ' + c + '</button>';
        }).join('') +
      '</div>' +
      '</div>';

    html += '<div class="section-title"><span>搜索结果</span><span>' +
      (opts.items ? opts.items.length : 0) + ' 条</span></div>';

    if (!opts.items || !opts.items.length) {
      html += emptyState({
        icon: '🔍',
        title: kw ? '没有找到「' + kw + '」' : '没有符合筛选条件的信息',
        sub: '试试更短的关键词，或清空筛选条件',
        action: { act: 'clear-filter', label: '清空筛选条件' }
      });
    } else {
      html += itemList(opts.items);
    }
    return '<section class="view" id="view-search">' + html + '</section>';
  }

  /* ---------- 发布 / 编辑表单 ---------- */
  function fieldError(errors, key) {
    return errors && errors[key] ? '<span class="err-msg">' + esc(errors[key]) + '</span>' : '<span class="err-msg"></span>';
  }
  function errCls(errors, key) { return errors && errors[key] ? ' err' : ''; }

  function publishPage(opts) {
    opts = opts || {};
    var d = opts.data || {};
    var errors = opts.errors || {};
    var isEdit = !!opts.isEdit;
    var type = d.type === 'found' ? 'found' : 'lost';
    var timeWord = type === 'found' ? '拾取' : '丢失';

    var html = '<div class="card">';
    if (isEdit) {
      html += '<div class="section-title" style="margin-top:0"><span>编辑第 ' + esc(d.id) + ' 条信息</span></div>';
    }

    /* 类型选择 */
    html += '<div class="field"><label class="label">信息类型<span class="req">*</span></label>' +
      '<div class="seg">' +
        '<button type="button" class="seg-btn ' + (type === 'lost' ? 'on-lost' : '') + '" data-act="set-type" data-type="lost">🔍 寻物（我丢了）</button>' +
        '<button type="button" class="seg-btn ' + (type === 'found' ? 'on-found' : '') + '" data-act="set-type" data-type="found">🎁 招领（我捡到）</button>' +
      '</div>' + fieldError(errors, 'type') + '</div>';

    /* 名称 */
    html += '<div class="field"><label class="label" for="fName">物品名称<span class="req">*</span>' +
      '<span class="counter" id="cName">0/' + Store.LIMIT.name + '</span></label>' +
      '<input class="input' + errCls(errors, 'name') + '" id="fName" name="name" maxlength="' + Store.LIMIT.name + '" ' +
        'placeholder="例如：校园卡 / 黑色蓝牙耳机" value="' + esc(d.name) + '">' +
      fieldError(errors, 'name') + '</div>';

    /* 分类 */
    html += '<div class="field"><label class="label" for="fCategory">物品分类<span class="req">*</span></label>' +
      '<select class="select' + errCls(errors, 'category') + '" id="fCategory" name="category">' +
        '<option value="">请选择分类</option>' +
        Store.CATEGORIES.map(function (c) {
          return '<option value="' + esc(c) + '"' + (d.category === c ? ' selected' : '') + '>' +
            Utils.categoryIcon(c) + ' ' + c + '</option>';
        }).join('') +
      '</select>' + fieldError(errors, 'category') + '</div>';

    /* 日期 */
    html += '<div class="field"><label class="label" for="fTime">' + timeWord + '日期<span class="req">*</span></label>' +
      '<input class="input' + errCls(errors, 'time') + '" id="fTime" name="time" type="date" max="' + Utils.toDateStr(new Date()) + '" ' +
        'value="' + esc(d.time) + '">' +
      fieldError(errors, 'time') + '</div>';

    /* 地点 */
    html += '<div class="field"><label class="label" for="fPlace">' + timeWord + '地点<span class="req">*</span>' +
      '<span class="counter" id="cPlace">0/' + Store.LIMIT.place + '</span></label>' +
      '<input class="input' + errCls(errors, 'place') + '" id="fPlace" name="place" maxlength="' + Store.LIMIT.place + '" ' +
        'placeholder="例如：图书馆三楼自习区 / 紫荆园食堂" value="' + esc(d.place) + '">' +
      fieldError(errors, 'place') + '</div>';

    /* 描述 */
    html += '<div class="field"><label class="label" for="fDesc">补充描述' +
      '<span class="counter" id="cDesc">0/' + Store.LIMIT.desc + '</span></label>' +
      '<textarea class="textarea' + errCls(errors, 'desc') + '" id="fDesc" name="desc" maxlength="' + Store.LIMIT.desc + '" ' +
        'placeholder="颜色、特征、有没有贴纸、目前放在哪里…写得越细越容易被认出来">' + esc(d.desc) + '</textarea>' +
      fieldError(errors, 'desc') + '</div>';

    /* 图片链接（原型里的图片上传） */
    html += '<div class="field"><label class="label" for="fImage">物品图片链接（选填）</label>' +
      '<input class="input" id="fImage" name="image" placeholder="填一个 http(s) 图片地址即可，留空表示不展示图片" value="' + esc(d.image) + '">' +
      fieldError(errors, 'image') + '</div>';

    /* 联系方式 */
    html += '<div class="field"><label class="label" for="fContactName">称呼（选填）</label>' +
      '<input class="input' + errCls(errors, 'contactName') + '" id="fContactName" name="contactName" maxlength="' + Store.LIMIT.contactName + '" ' +
        'placeholder="例如：李同学" value="' + esc(d.contactName) + '">' +
      fieldError(errors, 'contactName') + '</div>';

    html += '<div class="field"><label class="label" for="fContact">联系方式<span class="req">*</span></label>' +
      '<input class="input' + errCls(errors, 'contact') + '" id="fContact" name="contact" maxlength="' + Store.LIMIT.contact + '" ' +
        'placeholder="手机号 / QQ / 微信号 / 邮箱" value="' + esc(d.contact) + '">' +
      fieldError(errors, 'contact') + '</div>';

    html += '<div class="btn-row" style="margin-top:16px">' +
      '<button class="btn btn-block" data-act="submit-publish" type="button">' +
        (isEdit ? '保存修改' : '立即发布') + '</button>' +
      '</div>';
    if (isEdit) {
      html += '<button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" data-act="cancel-edit" type="button">取消编辑</button>';
    }
    html += '<p class="hint">带 <span style="color:#e5484d">*</span> 为必填项。信息保存在本机浏览器里，换电脑看不到；发布后可以在「我的发布」里标记完成或删除。</p>';
    html += '</div>';

    return '<section class="view" id="view-publish">' + html + '</section>';
  }

  /* ---------- 详情页 ---------- */
  function detailPage(item, opts) {
    opts = opts || {};
    if (!item) {
      return '<section class="view" id="view-detail">' + emptyState({
        icon: '🕳️', title: '这条信息不存在', sub: '可能已经被发布者删除了',
        action: { act: 'go-home', label: '回到首页' }
      }) + '</section>';
    }
    var isFound = item.type === 'found';
    var done = item.status === 'done';
    var mine = !!opts.mine;

    var html = '<div class="hero' + (isFound ? ' hero-found' : '') + '">' +
      '<span class="hero-ico">' + Utils.categoryIcon(item.category) + '</span>' +
      '<span class="badge ' + (isFound ? 'badge-found' : 'badge-lost') + '" style="background:rgba(255,255,255,.24);color:#fff">' +
        Utils.typeLabel(item.type) + ' · ' + esc(Utils.statusOf(item)) + '</span>' +
      '</div>';

    html += '<div class="card detail-card">';
    html += '<h2 class="detail-title">' + esc(item.name) + '</h2>';
    html += '<div style="color:var(--ink-3);font-size:12.5px">发布于 ' + esc(Utils.timeAgo(item.createdAt)) +
      ' · 浏览 ' + (Number(item.views) || 0) + ' 次</div>';

    if (item.image) {
      html += '<div style="margin-top:10px"><img src="' + esc(item.image) + '" alt="物品图片" ' +
        'style="width:100%;border-radius:10px;display:block" ' +
        'onerror="this.style.display=\'none\'"></div>';
    }

    html += '<div style="margin-top:10px">' +
      '<div class="kv"><span class="k">分类</span><span class="v">' + Utils.categoryIcon(item.category) + ' ' + esc(item.category) + '</span></div>' +
      '<div class="kv"><span class="k">' + (isFound ? '拾取时间' : '丢失时间') + '</span><span class="v">' +
        esc(item.time) + '（' + esc(Utils.friendlyDate(item.time)) + '）</span></div>' +
      '<div class="kv"><span class="k">' + (isFound ? '拾取地点' : '丢失地点') + '</span><span class="v">' + esc(item.place) + '</span></div>' +
      '<div class="kv"><span class="k">当前状态</span><span class="v status-text ' + (done ? 'status-done' : 'status-active') + '">' +
        esc(Utils.statusOf(item)) + '</span></div>' +
      '</div>';

    if (item.desc) html += '<div class="desc">' + esc(item.desc) + '</div>';

    if (done) {
      html += '<div class="done-tip">该信息已标记为「' + esc(Utils.statusOf(item)) + '」，请勿再联系发布者</div>';
    } else {
      html += '<div class="contact-box">' +
        '<div><div class="c-name">发布者：' + esc(item.contactName || '热心同学') + '</div>' +
        '<div class="c-val" id="contactVal">' + esc(item.contact) + '</div></div>' +
        '<button class="btn btn-sm" data-act="copy-contact" data-contact="' + esc(item.contact) + '">复制</button>' +
        '</div>';
    }

    if (mine) {
      html += '<div class="section-title" style="margin-top:14px"><span>我是发布者</span></div>' +
        '<div class="btn-row">' +
          '<button class="btn btn-ok btn-sm" data-act="toggle-status" data-id="' + esc(item.id) + '" data-status="' + (done ? 'active' : 'done') + '">' +
            (done ? '恢复为进行中' : '标记为' + (isFound ? '已归还' : '已找到')) + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="edit-item" data-id="' + esc(item.id) + '">编辑</button>' +
          '<button class="btn btn-danger btn-sm" data-act="delete-item" data-id="' + esc(item.id) + '">删除</button>' +
        '</div>';
    } else {
      html += '<p class="hint">只有发布者本人（本机）可以修改状态或删除这条信息。</p>';
    }

    html += '<button class="btn btn-ghost btn-block btn-sm" style="margin-top:14px" data-act="go-home">返回列表</button>';
    html += '</div>';

    return '<section class="view" id="view-detail">' + html + '</section>';
  }

  /* ---------- 我的发布 ---------- */
  function minePage(items) {
    items = items || [];
    var total = items.length;
    var active = items.filter(function (i) { return i.status === 'active'; }).length;
    var done = total - active;

    var html = '<div class="stats">' +
      '<div class="stat"><div class="n">' + total + '</div><div class="t">共发布</div></div>' +
      '<div class="stat"><div class="n" style="color:#16a34a">' + active + '</div><div class="t">进行中</div></div>' +
      '<div class="stat"><div class="n" style="color:#98a1b3">' + done + '</div><div class="t">已完成</div></div>' +
      '</div>';

    if (!total) {
      html += emptyState({
        icon: '📝', title: '你还没有发布过信息',
        sub: '发布寻物或招领只需要 30 秒',
        action: { act: 'go-publish', label: '去发布一条' }
      });
      return '<section class="view" id="view-mine">' + html + '</section>';
    }

    html += '<div class="section-title"><span>我发布的信息</span><span>' + total + ' 条</span></div>';
    html += items.map(function (it) {
      var done2 = it.status === 'done';
      var isFound = it.type === 'found';
      return '<div class="card" style="margin-bottom:10px">' +
        '<div class="item-head">' +
          '<span class="badge ' + (isFound ? 'badge-found' : 'badge-lost') + '">' + Utils.typeLabel(it.type) + '</span>' +
          '<span class="item-name">' + esc(it.name) + '</span>' +
        '</div>' +
        '<div class="item-meta">📍 ' + esc(it.place) + ' · ' + esc(it.time) + '</div>' +
        '<div class="item-foot"><span class="status-text ' + (done2 ? 'status-done' : 'status-active') + '">' +
          (done2 ? '✅ ' : '🟢 ') + esc(Utils.statusOf(it)) + '</span>' +
          '<span>👁 ' + (Number(it.views) || 0) + '</span></div>' +
        '<div class="btn-row" style="margin-top:10px">' +
          '<button class="btn btn-ghost btn-sm" data-act="open-detail" data-id="' + esc(it.id) + '">查看详情</button>' +
          '<button class="btn ' + (done2 ? 'btn-ghost' : 'btn-ok') + ' btn-sm" data-act="toggle-status" data-id="' + esc(it.id) + '" data-status="' + (done2 ? 'active' : 'done') + '">' +
            (done2 ? '恢复为进行中' : '标记为' + (isFound ? '已归还' : '已找到')) + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="edit-item" data-id="' + esc(it.id) + '">编辑</button>' +
          '<button class="btn btn-danger btn-sm" data-act="delete-item" data-id="' + esc(it.id) + '">删除</button>' +
        '</div>' +
        '</div>';
    }).join('');

    html += '<button class="btn btn-block" style="margin-top:6px" data-act="go-publish">＋ 再发一条</button>';
    return '<section class="view" id="view-mine">' + html + '</section>';
  }

  /* ---------- 发布成功页 ---------- */
  function successPage(item) {
    return '<section class="view" id="view-success"><div class="card success">' +
      '<div class="s-ico">✅</div>' +
      '<div class="s-ttl">发布成功</div>' +
      '<div class="s-sub">「' + esc(item.name) + '」已出现在首页列表里，' +
        (item.type === 'found' ? '等待失主认领' : '等待拾主联系') + '</div>' +
      '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn" data-act="open-detail" data-id="' + esc(item.id) + '">查看这条信息</button>' +
        '<button class="btn btn-ghost" data-act="go-mine">去我的发布</button>' +
      '</div></div></section>';
  }

  /* ---------- 关于页 ---------- */
  function aboutPage() {
    return '<section class="view" id="view-about"><div class="card">' +
      '<h2 class="detail-title">关于「寻回」</h2>' +
      '<p class="hint" style="margin-top:0">校园失物招领 · 第二次结对作业程序实现（基于第一次作业原型）</p>' +
      '<div class="section-title"><span>核心流程</span></div>' +
      '<p style="margin:0;color:var(--ink-2);font-size:13.5px">发布信息 → 浏览或搜索 → 查看详情 → 联系发布者 → 更新状态（闭环）</p>' +
      '<div class="section-title"><span>已实现的功能</span></div>' +
      '<ul class="about-list">' +
        '<li>发布寻物 / 招领，必填项校验 + 红字定位提示</li>' +
        '<li>倒序列表，进行中优先展示，已完成置灰后置</li>' +
        '<li>关键词 + 类型 + 分类三维组合筛选</li>' +
        '<li>详情页一键复制联系方式（含降级方案）</li>' +
        '<li>发布者标记「已找到 / 已归还」、恢复、编辑、删除</li>' +
        '<li>「我的发布」统计与信息管理</li>' +
        '<li>数据保存在浏览器 localStorage，刷新不丢失</li>' +
      '</ul>' +
      '<div class="section-title"><span>运行说明</span></div>' +
      '<ul class="about-list">' +
        '<li>用 Chrome 直接打开 <code>index.html</code> 即可，无需服务器、无需构建</li>' +
        '<li>单元测试：打开页面后按 F12，把 <code>test/unit-test.js</code> 的内容粘贴进 Console 回车，再输入 <code>runTest()</code></li>' +
        '<li>重置数据：点下面的按钮（会清空本机所有信息和发布者标识）</li>' +
      '</ul>' +
      '<div class="btn-row" style="margin-top:14px">' +
        '<button class="btn btn-ghost btn-sm" data-act="reset-all">清空本机数据</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="reseed">重新载入演示数据</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="run-tests">在页面里跑一遍单元测试</button>' +
      '</div>' +
      '<div id="pageTestResult" style="margin-top:12px"></div>' +
      '</div></section>';
  }

  return {
    emptyState: emptyState,
    itemCard: itemCard,
    itemList: itemList,
    homePage: homePage,
    searchPage: searchPage,
    publishPage: publishPage,
    detailPage: detailPage,
    minePage: minePage,
    successPage: successPage,
    aboutPage: aboutPage
  };
})();

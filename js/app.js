/* ===========================================================
 * app.js —— 界面层（哈希路由 + 渲染 + 事件处理）
 *   路由表：
 *     #/              首页列表
 *     #/search?q=&type=&cat=
 *     #/publish?type=lost|found        发布
 *     #/edit/:id                       编辑
 *     #/detail/:id                     详情
 *     #/mine                           我的发布
 *     #/about                          关于 / 自检
 * =========================================================== */
(function () {

  var viewsEl = document.getElementById('views');
  var toastEl = document.getElementById('toast');
  var titleEl = document.getElementById('appTitle');
  var backBtn = document.getElementById('btnBack');
  var tabbarEl = document.getElementById('tabbar');

  /* ---------- 全局界面状态 ---------- */
  var state = {
    view: 'home',
    homeType: '',
    homeOnlyActive: false,
    search: { q: '', type: '', cat: '' },
    lastPublished: null,
    draft: null
  };

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }

  /* ---------- 剪贴板（优先 clipboard API，非 HTTPS / file 协议下降级） ---------- */
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? '联系方式已复制：' + text : '复制失败，请手动长按选中复制');
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(text)).then(
        function () { toast('联系方式已复制：' + text); },
        fallback
      );
    } else {
      fallback();
    }
  }

  /* ---------- 路由解析 ---------- */
  function parseHash() {
    var raw = (location.hash || '#/').replace(/^#/, '');
    var qIndex = raw.indexOf('?');
    var path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    var query = {};
    if (qIndex >= 0) {
      raw.slice(qIndex + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    var seg = path.split('/').filter(function (s) { return s !== ''; });
    return {
      name: seg[0] || 'home',
      id: seg[1] ? Number(seg[1]) : null,
      query: query
    };
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /* ---------- 渲染入口 ---------- */
  function render() {
    var route = parseHash();
    var html = '';

    /* 搜索页的筛选条件保存在 URL 里，方便把结果链接分享给别人 */
    if (route.name === 'search') {
      state.search.q = route.query.q !== undefined ? route.query.q : state.search.q;
      state.search.type = route.query.type !== undefined ? route.query.type : state.search.type;
      state.search.cat = route.query.cat !== undefined ? route.query.cat : state.search.cat;
    }

    switch (route.name) {
      case 'home':
        state.view = 'home';
        html = View.homePage({
          items: Store.searchItems({ type: state.homeType, onlyActive: state.homeOnlyActive }),
          counts: Store.countByType(),
          type: state.homeType,
          onlyActive: state.homeOnlyActive
        });
        setTitle('寻回 · 校园失物招领', false);
        break;

      case 'search':
        state.view = 'search';
        html = View.searchPage({
          items: Store.searchItems({
            keyword: state.search.q, type: state.search.type, category: state.search.cat
          }),
          keyword: state.search.q, type: state.search.type, category: state.search.cat
        });
        setTitle('搜索物品', true);
        break;

      case 'publish':
        state.view = 'publish';
        state.draft = blankDraft(route.query.type === 'found' ? 'found' : 'lost');
        state.draftErrors = {};
        html = View.publishPage({ data: state.draft, errors: {} });
        setTitle('发布信息', true);
        break;

      case 'edit': {
        state.view = 'edit';
        var editing = Store.getItem(route.id);
        if (!editing) {
          html = View.detailPage(null);
          setTitle('信息不存在', true);
          break;
        }
        if (!Store.isMine(editing)) {
          /* 不是本人发布的信息不允许通过地址栏直接进编辑页 */
          html = View.detailPage(editing, { mine: false });
          setTitle(editing.name, true);
          toast('只能编辑自己发布的信息');
          break;
        }
        state.draft = shallowCopy(editing);
        state.draftErrors = {};
        html = View.publishPage({ data: state.draft, errors: {}, isEdit: true });
        setTitle('编辑信息', true);
        break;
      }

      case 'detail': {
        state.view = 'detail';
        var item = Store.getItem(route.id);
        var alreadyCounted = state._countedViewId === String(route.id);
        if (item && !alreadyCounted) {
          Store.incrementViews(item.id);
          state._countedViewId = String(route.id);
          item = Store.getItem(route.id);
        }
        html = View.detailPage(item, { mine: Store.isMine(item) });
        setTitle(item ? item.name : '信息详情', true);
        break;
      }

      case 'mine':
        state.view = 'mine';
        html = View.minePage(Store.getMyItems());
        setTitle('我的发布', true);
        break;

      case 'about':
        state.view = 'about';
        html = View.aboutPage();
        setTitle('关于寻回', true);
        break;

      default:
        state.view = 'home';
        go('#/');
        return;
    }

    viewsEl.innerHTML = html;
    if (route.name !== 'detail') state._countedViewId = null;

    if (state.view === 'publish' || state.view === 'edit') {
      bindCounters();
    }
    if (state.view === 'search') {
      var input = document.getElementById('searchInput');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    window.scrollTo(0, 0);
    highlightTab();
  }

  function setTitle(text, showBack) {
    titleEl.textContent = text;
    backBtn.hidden = !showBack;
    document.title = text + ' · 寻回';
  }

  function highlightTab() {
    var map = { home: 'home', search: 'search', mine: 'mine', about: 'about', publish: 'publish', edit: 'mine', detail: '' };
    var cur = map[state.view] || '';
    Array.prototype.forEach.call(tabbarEl.querySelectorAll('.tab'), function (a) {
      a.classList.toggle('on', a.getAttribute('data-tab') === cur);
    });
  }

  function blankDraft(type) {
    return {
      type: type, name: '', category: '', time: Utils.toDateStr(new Date()),
      place: '', desc: '', image: '', contactName: '', contact: ''
    };
  }

  function shallowCopy(o) {
    var r = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    return r;
  }

  /* ---------- 表单：字符计数 ---------- */
  function bindCounters() {
    var pairs = [
      ['fName', 'cName', Store.LIMIT.name],
      ['fPlace', 'cPlace', Store.LIMIT.place],
      ['fDesc', 'cDesc', Store.LIMIT.desc]
    ];
    pairs.forEach(function (p) {
      var input = document.getElementById(p[0]);
      var out = document.getElementById(p[1]);
      if (!input || !out) return;
      var update = function () { out.textContent = input.value.length + '/' + p[2]; };
      input.addEventListener('input', update);
      update();
    });
  }

  /* ---------- 表单：把 DOM 里的输入收进 draft ---------- */
  function collectForm() {
    var ids = {
      name: 'fName', category: 'fCategory', time: 'fTime', place: 'fPlace',
      desc: 'fDesc', image: 'fImage', contactName: 'fContactName', contact: 'fContact'
    };
    for (var key in ids) {
      var el = document.getElementById(ids[key]);
      if (el) state.draft[key] = el.value;
    }
    return shallowCopy(state.draft);
  }

  /* ---------- 表单：把错误回显到界面上 ---------- */
  function showFormErrors(errors) {
    ['name', 'category', 'time', 'place', 'desc', 'contact', 'contactName', 'type'].forEach(function (key) {
      var el = document.querySelector('[name="' + key + '"]');
      if (!el) return;
      el.classList.toggle('err', !!errors[key]);
      var wrap = el.closest ? el.closest('.field') : el.parentNode;
      var slot = wrap ? wrap.querySelector('.err-msg') : null;
      if (slot) slot.textContent = errors[key] || '';
    });
    var firstKey = Object.keys(errors)[0];
    if (firstKey) {
      var first = document.querySelector('[name="' + firstKey + '"]');
      if (first && first.focus) first.focus();
      toast(errors[firstKey]);
    }
  }

  /* ---------- 事件：点击 ---------- */
  viewsEl.addEventListener('click', function (ev) {
    var card = ev.target.closest ? ev.target.closest('.item-card') : null;
    var actEl = ev.target.closest ? ev.target.closest('[data-act]') : null;

    /* 没点到 data-act 但点在卡片上 -> 进详情 */
    if (!actEl && card) { go('#/detail/' + card.getAttribute('data-id')); return; }

    if (!actEl) return;
    var act = actEl.getAttribute('data-act');

    switch (act) {
      case 'go-search': go('#/search'); break;
      case 'go-home': go('#/'); break;
      case 'go-mine': go('#/mine'); break;
      case 'go-publish': go('#/publish' + (actEl.getAttribute('data-type') ? '?type=' + actEl.getAttribute('data-type') : '')); break;
      case 'open-detail': go('#/detail/' + actEl.getAttribute('data-id')); break;

      case 'filter-type':
        if (state.view === 'home') {
          state.homeType = actEl.getAttribute('data-type') || '';
          render();
        } else {
          state.search.type = actEl.getAttribute('data-type') || '';
          go(buildSearchHash());
        }
        break;

      case 'filter-cat':
        state.search.cat = actEl.getAttribute('data-cat') || '';
        go(buildSearchHash());
        break;

      case 'hot-word':
        state.search.q = actEl.getAttribute('data-word') || '';
        go(buildSearchHash());
        break;

      case 'toggle-active':
        state.homeOnlyActive = !state.homeOnlyActive;
        render();
        break;

      case 'clear-filter':
        state.search = { q: '', type: '', cat: '' };
        go('#/search');
        break;

      case 'copy-contact':
        copyText(actEl.getAttribute('data-contact') || '');
        break;

      case 'set-type':
        collectForm();
        state.draft.type = actEl.getAttribute('data-type');
        state.draftErrors = {};
        viewsEl.innerHTML = View.publishPage({
          data: state.draft, errors: {}, isEdit: state.view === 'edit'
        });
        bindCounters();
        break;

      case 'submit-publish': {
        var data = collectForm();
        if (state.view === 'edit') {
          var res = Store.updateItem(state.draft.id, data);
          if (!res.ok) { showFormErrors(res.errors); return; }
          toast('修改已保存');
          go('#/detail/' + state.draft.id);
        } else {
          var created = Store.createItem(data);
          if (!created.ok) { showFormErrors(created.errors); return; }
          state.lastPublished = created.item.id;
          viewsEl.innerHTML = View.successPage(created.item);
          setTitle('发布成功', true);
          highlightTab();
        }
        break;
      }

      case 'edit-item':
        go('#/edit/' + actEl.getAttribute('data-id'));
        break;

      case 'cancel-edit':
        go('#/detail/' + state.draft.id);
        break;

      case 'toggle-status': {
        var id = actEl.getAttribute('data-id');
        var next = actEl.getAttribute('data-status');
        var updated = Store.updateStatus(id, next);
        if (!updated) { toast('操作失败：信息不存在'); return; }
        toast('已更新为「' + Utils.statusOf(updated) + '」');
        render();
        break;
      }

      case 'delete-item': {
        var did = actEl.getAttribute('data-id');
        var target = Store.getItem(did);
        if (!target) { toast('信息不存在'); return; }
        if (!window.confirm('确定要删除「' + target.name + '」吗？删除后无法恢复。')) return;
        Store.deleteItem(did);
        toast('已删除');
        go('#/mine');
        break;
      }

      case 'reset-all':
        if (!window.confirm('将清空本机全部失物招领信息与发布者标识，确定吗？')) return;
        Store.clearAll();
        toast('本机数据已清空');
        go('#/');
        break;

      case 'reseed':
        Store.clearAll();
        Store.seedIfEmpty();
        toast('演示数据已重新载入');
        go('#/');
        break;

      case 'run-tests':
        runPageTests();
        break;
    }
  });

  /* 卡片键盘可访问性：回车 / 空格进详情 */
  viewsEl.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var card = ev.target.closest ? ev.target.closest('.item-card') : null;
    if (card) { ev.preventDefault(); go('#/detail/' + card.getAttribute('data-id')); }
  });

  /* ---------- 事件：搜索框输入（防抖 300ms） ---------- */
  var onSearchInput = Utils.debounce(function (value) {
    state.search.q = value;
    var hash = buildSearchHash();
    /* 只重排列表、不重渲染整页，避免打断输入焦点 */
    var list = Store.searchItems({
      keyword: state.search.q, type: state.search.type, category: state.search.cat
    });
    var titleNode = viewsEl.querySelector('.section-title span:last-child');
    if (titleNode) titleNode.textContent = list.length + ' 条';
    var container = viewsEl.querySelector('.list, .empty');
    var holder = document.createElement('div');
    holder.innerHTML = list.length ? View.itemList(list) : View.emptyState({
      icon: '🔍', title: '没有找到相关信息', sub: '试试更短的关键词，或清空筛选条件',
      action: { act: 'clear-filter', label: '清空筛选条件' }
    });
    if (container) container.parentNode.replaceChild(holder.firstChild, container);
    history.replaceState(null, '', hash);
  }, 300);

  viewsEl.addEventListener('input', function (ev) {
    if (ev.target && ev.target.id === 'searchInput') onSearchInput(ev.target.value);
  });

  function buildSearchHash() {
    var parts = [];
    if (state.search.q) parts.push('q=' + encodeURIComponent(state.search.q));
    if (state.search.type) parts.push('type=' + state.search.type);
    if (state.search.cat) parts.push('cat=' + encodeURIComponent(state.search.cat));
    return '#/search' + (parts.length ? '?' + parts.join('&') : '');
  }

  /* ---------- 返回按钮 ---------- */
  backBtn.addEventListener('click', function () {
    if (history.length > 1) history.back();
    else go('#/');
  });

  /* ---------- 页面内运行单元测试（关于页按钮） ---------- */
  function runPageTests() {
    var box = document.getElementById('pageTestResult');
    if (!box) return;
    if (typeof runTest !== 'function') {
      box.innerHTML = '<p class="hint">未检测到 <code>test/unit-test.js</code>。请按 F12 打开控制台，' +
        '把该文件内容粘贴进来后输入 <code>runTest()</code>。</p>';
      return;
    }
    var logs = [];
    var origLog = console.log;
    console.log = function () {
      /* 去掉控制台用的 %c 着色参数，页面上只留纯文本 */
      var args = Array.prototype.slice.call(arguments).filter(function (a) {
        return typeof a !== 'string' || a.indexOf('color:') !== 0;
      }).filter(function (a) {
        return typeof a !== 'string' || a.indexOf('font-') !== 0;   /* 同时丢掉纯样式参数 */
      });
      logs.push(args.map(function (a) {
        return String(a).replace(/%c/g, '');
      }).join(' '));
      origLog.apply(console, arguments);
    };
    var summary;
    try { summary = runTest(); } finally { console.log = origLog; }
    box.innerHTML = '<div class="card" style="background:#f8f9fc"><pre style="margin:0;white-space:pre-wrap;' +
      'font-size:12px;max-height:320px;overflow:auto">' + Utils.escapeHtml(logs.join('\n')) + '</pre></div>';
    toast(summary.passed + ' 通过 / ' + summary.failed + ' 失败');
  }

  /* ---------- 启动 ---------- */
  function init() {
    Store.seedIfEmpty();                 // 首次打开灌演示数据；已有数据绝不覆盖
    if (!location.hash) location.hash = '#/';
    window.addEventListener('hashchange', render);
    render();
    if (!Store.isPersistent()) {
      toast('浏览器禁用了本地存储，数据只保存在本次会话中');
    }
  }

  init();
})();

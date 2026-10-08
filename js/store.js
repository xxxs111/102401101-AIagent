/* ===========================================================
 * store.js —— 数据层
 *   职责：localStorage 读写、数据校验、增删改查、组合搜索、演示数据
 *   特点：完全不依赖 DOM，因此单元测试可以直接引用（这是能写测试的关键）
 *   键名：lf_items_v1（信息列表） / lf_owner_v1（本机发布者标识）
 * =========================================================== */
window.Store = (function () {

  var KEY_ITEMS = 'lf_items_v1';
  var KEY_OWNER = 'lf_owner_v1';

  var TYPES = ['lost', 'found'];
  var CATEGORIES = ['校园卡', '证件', '钥匙', '电子产品', '书籍', '水杯', '雨伞', '衣物', '其他'];

  /* 字段长度上限（校验与前端字符计数共用一处定义） */
  var LIMIT = {
    name: 30,
    place: 50,
    desc: 200,
    contact: 50,
    contactName: 20
  };

  /* ---------- 存储适配：localStorage 不可用时（隐私模式等）降级为内存 ---------- */
  var memory = {};
  var storageOK = (function () {
    try {
      var k = '__lf_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function readRaw(key) {
    if (storageOK) {
      try { return window.localStorage.getItem(key); } catch (e) { /* 降级 */ }
    }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }
  function writeRaw(key, val) {
    if (storageOK) {
      try { window.localStorage.setItem(key, val); return true; } catch (e) { /* 降级 */ }
    }
    memory[key] = val;
    return false;
  }
  function removeRaw(key) {
    if (storageOK) { try { window.localStorage.removeItem(key); } catch (e) {} }
    delete memory[key];
  }
  function isPersistent() { return storageOK; }

  /* ---------- 基础读写 ---------- */
  function loadItems() {
    var raw = readRaw(KEY_ITEMS);
    if (!raw) return [];
    try {
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];   // 存储被写坏时不能让整个应用崩掉
    }
  }

  function saveItems(list) {
    writeRaw(KEY_ITEMS, JSON.stringify(list || []));
    return list;
  }

  /** 清空全部数据（含"本机标识"，用于一键重置演示） */
  function clearAll() {
    removeRaw(KEY_ITEMS);
    removeRaw(KEY_OWNER);
  }

  /* ---------- 本机发布者标识（没有账号系统，用它回答"谁能改状态"） ---------- */
  function getOwnerKey() {
    var k = readRaw(KEY_OWNER);
    if (!k) {
      k = Utils.uid('owner');
      writeRaw(KEY_OWNER, k);
    }
    return k;
  }
  function setOwnerKey(k) { writeRaw(KEY_OWNER, String(k || '')); }

  /* ---------- 自增 id ---------- */
  function generateId(list) {
    list = list || loadItems();
    var max = 0;
    for (var i = 0; i < list.length; i++) {
      var n = Number(list[i].id);
      if (!isNaN(n) && n > max) max = n;
    }
    return max + 1;
  }

  function getItem(id) {
    var list = loadItems();
    id = Number(id);
    for (var i = 0; i < list.length; i++) if (Number(list[i].id) === id) return list[i];
    return null;
  }

  /* ---------- 校验 ---------- */
  /**
   * 联系方式宽松校验：手机号 / 邮箱 / QQ(5-11 位数字) / 微信号(字母开头 6-20 位) 任一命中。
   * 注意：所有纯数字串都先走"手机号 / QQ"这一组规则，避免把
   *       "1380000123"（少一位的手机号）之类的乱码当成合法 QQ 放行。
   */
  function isValidContact(v) {
    v = String(v || '').trim();
    if (!v) return false;
    if (/^1[3-9]\d{9}$/.test(v)) return true;                        // 11 位手机号
    if (/^1[3-9]\d{8}$/.test(v)) return false;                       // 想写手机号却少一位 → 非法
    if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(v)) return true;         // 邮箱
    if (/^\d{5,11}$/.test(v)) return true;                           // QQ（5-11 位）
    if (/^[A-Za-z][A-Za-z0-9_-]{5,19}$/.test(v)) return true;        // 微信号
    return false;
  }

  function len(v) { return String(v === null || v === undefined ? '' : v).trim().length; }

  /**
   * 发布表单校验
   * @returns {{ok:boolean, errors:Object}} errors 的键即出错字段名，界面层按字段高亮
   */
  function isValidPublishData(data) {
    data = data || {};
    var errors = {};

    if (TYPES.indexOf(data.type) < 0) errors.type = '请选择信息类型（寻物 / 招领）';

    if (!len(data.name)) errors.name = '请填写物品名称';
    else if (len(data.name) > LIMIT.name) errors.name = '物品名称不能超过 ' + LIMIT.name + ' 个字';

    if (CATEGORIES.indexOf(data.category) < 0) errors.category = '请选择物品分类';

    if (!len(data.time)) errors.time = '请选择' + (data.type === 'found' ? '拾取' : '丢失') + '日期';
    else if (!Utils.parseDate(data.time)) errors.time = '日期格式应为 YYYY-MM-DD';
    else if (Utils.isFutureDate(data.time)) errors.time = '日期不能晚于今天';

    if (!len(data.place)) errors.place = '请填写' + (data.type === 'found' ? '拾取地点' : '丢失地点');
    else if (len(data.place) > LIMIT.place) errors.place = '地点不能超过 ' + LIMIT.place + ' 个字';

    if (len(data.desc) > LIMIT.desc) errors.desc = '描述不能超过 ' + LIMIT.desc + ' 个字';

    if (!len(data.contact)) errors.contact = '请填写联系方式，否则失主无法联系你';
    else if (!isValidContact(data.contact)) errors.contact = '联系方式格式不对（支持手机号 / QQ / 微信 / 邮箱）';

    if (len(data.contactName) > LIMIT.contactName) errors.contactName = '称呼不能超过 ' + LIMIT.contactName + ' 个字';

    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  /* ---------- 增删改 ---------- */
  /** 新建一条信息；校验不通过返回 {ok:false, errors}，不写入存储 */
  function createItem(data) {
    var check = isValidPublishData(data);
    if (!check.ok) return { ok: false, errors: check.errors };

    var list = loadItems();
    var now = new Date();
    var item = {
      id: generateId(list),
      type: data.type === 'found' ? 'found' : 'lost',
      name: String(data.name).trim(),
      category: data.category,
      time: data.time,
      place: String(data.place).trim(),
      desc: String(data.desc || '').trim(),
      image: String(data.image || '').trim(),
      contactName: String(data.contactName || '').trim() || '热心同学',
      contact: String(data.contact).trim(),
      status: 'active',
      publisherKey: data.publisherKey || getOwnerKey(),
      views: 0,
      createdAt: now.getTime(),
      updatedAt: now.getTime()
    };
    list.push(item);
    saveItems(list);
    return { ok: true, item: item };
  }

  /**
   * 更新状态：'active'（进行中） <-> 'done'（已找到 / 已归还）
   * 返回更新后的对象，界面层拿到后直接重渲染；非法状态或 id 不存在返回 null。
   */
  function updateStatus(id, status) {
    if (status !== 'active' && status !== 'done') return null;
    var list = loadItems();
    id = Number(id);
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].id) === id) {
        list[i].status = status;
        list[i].updatedAt = Date.now();
        saveItems(list);
        return list[i];
      }
    }
    return null;
  }

  /** 编辑已有信息（同样走一遍校验），只覆盖可编辑字段 */
  function updateItem(id, data) {
    var check = isValidPublishData(data);
    if (!check.ok) return { ok: false, errors: check.errors };
    var list = loadItems();
    id = Number(id);
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].id) === id) {
        var it = list[i];
        it.type = data.type === 'found' ? 'found' : 'lost';
        it.name = String(data.name).trim();
        it.category = data.category;
        it.time = data.time;
        it.place = String(data.place).trim();
        it.desc = String(data.desc || '').trim();
        it.image = String(data.image || '').trim();
        it.contactName = String(data.contactName || '').trim() || '热心同学';
        it.contact = String(data.contact).trim();
        it.updatedAt = Date.now();
        saveItems(list);
        return { ok: true, item: it };
      }
    }
    return { ok: false, errors: { _: '信息不存在' } };
  }

  /** 删除；返回被删除的对象或 null */
  function deleteItem(id) {
    var list = loadItems();
    id = Number(id);
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].id) === id) {
        var removed = list.splice(i, 1)[0];
        saveItems(list);
        return removed;
      }
    }
    return null;
  }

  /** 浏览数 +1 */
  function incrementViews(id) {
    var list = loadItems();
    id = Number(id);
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].id) === id) {
        list[i].views = (Number(list[i].views) || 0) + 1;
        saveItems(list);
        return list[i].views;
      }
    }
    return null;
  }

  /** 把列表按"进行中在前，同状态按发布时间倒序"排序 */
  function sortItems(list) {
    return list.slice().sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  /**
   * 组合搜索：关键词 × 类型 × 分类 × 只看进行中
   * @param {{keyword?:string,type?:string,category?:string,onlyActive?:boolean}} opts
   */
  function searchItems(opts) {
    opts = opts || {};
    var kw = String(opts.keyword || '').trim().toLowerCase();
    var list = loadItems();

    if (opts.type && TYPES.indexOf(opts.type) >= 0) {
      list = list.filter(function (i) { return i.type === opts.type; });
    }
    if (opts.category) {
      list = list.filter(function (i) { return i.category === opts.category; });
    }
    if (opts.onlyActive) {
      list = list.filter(function (i) { return i.status === 'active'; });
    }
    if (kw) {
      list = list.filter(function (i) {
        var hay = [i.name, i.desc, i.place, i.category, Utils.typeLabel(i.type)]
          .join(' ').toLowerCase();
        return hay.indexOf(kw) >= 0;
      });
    }
    return sortItems(list);
  }

  /** 本机发布的信息 */
  function getMyItems() {
    var owner = getOwnerKey();
    return sortItems(loadItems().filter(function (i) { return i.publisherKey === owner; }));
  }

  function isMine(item) {
    return !!item && item.publisherKey === getOwnerKey();
  }

  /** 各类型计数，用于首页"全部 / 寻物 / 招领"标签 */
  function countByType() {
    var list = loadItems();
    var r = { all: list.length, lost: 0, found: 0, done: 0 };
    list.forEach(function (i) {
      if (i.type === 'found') r.found++; else r.lost++;
      if (i.status === 'done') r.done++;
    });
    return r;
  }

  /* ---------- 演示数据 ---------- */
  /**
   * 首次打开（本地一条数据都没有时）播种演示数据。
   * 关键约束：只有在"完全没有任何数据"时才播种，绝不覆盖用户已有数据。
   */
  function seedIfEmpty() {
    var items = loadItems();
    if (items.length > 0) return { seeded: false, reason: 'already-has-data' };

    var demoOwner = 'demo-owner';
    var day = 86400000;
    var d = function (offset) { return Utils.toDateStr(new Date(Date.now() + offset * day)); };
    var t = function (offsetHours) { return Date.now() - offsetHours * 3600000; };

    var seed = [
      { type: 'lost',  name: '校园卡（李同学）', category: '校园卡', time: d(-1), place: '紫荆园食堂二楼',
        desc: '蓝色卡套，卡面有贴纸，卡号末尾 3721。昨天中午在食堂吃完饭就找不到了，急用，谢谢！',
        contactName: '李同学', contact: '13800001234', status: 'active', views: 26, createdAt: t(20) },
      { type: 'found', name: '黑色蓝牙耳机充电盒', category: '电子产品', time: d(0), place: '图书馆三楼自习区 A12 桌',
        desc: 'AirPods 充电盒，只有盒子没有耳机。已交到图书馆三楼服务台，凭特征认领。',
        contactName: '王同学', contact: 'wang_lib2026', status: 'active', views: 41, createdAt: t(5) },
      { type: 'lost',  name: '一串钥匙（带小熊挂件）', category: '钥匙', time: d(-2), place: '体育馆羽毛球场地',
        desc: '三把钥匙 + 一个棕色小熊挂件，可能是打球时从包里掉出来的。',
        contactName: '张同学', contact: '13900005678', status: 'done', views: 18, createdAt: t(52) },
      { type: 'found', name: '保温杯（银色）', category: '水杯', time: d(-1), place: '教学楼 5 号楼 302 教室',
        desc: '课后留在桌斗里，杯身贴有一张演出票根。放在 5 号楼值班室了。',
        contactName: '陈同学', contact: '3432211005', status: 'active', views: 12, createdAt: t(30) },
      { type: 'lost',  name: '《数据结构与算法分析》教材', category: '书籍', time: d(-3), place: '图书馆二楼还书处附近',
        desc: '书里夹着复习笔记，扉页写了班级和名字。对期末复习很重要，拜托了。',
        contactName: '刘同学', contact: 'liu_study@example.com', status: 'active', views: 9, createdAt: t(76) },
      { type: 'found', name: '深蓝色雨伞', category: '雨伞', time: d(-2), place: '一教门口的伞架',
        desc: '长柄雨伞，伞骨有一根是弯的，好辨认。一直挂在伞架最左边。',
        contactName: '赵同学', contact: '13700009999', status: 'done', views: 22, createdAt: t(60) }
    ];

    var list = seed.map(function (s, i) {
      s.id = i + 1;
      s.image = '';
      s.publisherKey = demoOwner;   // 全部归到演示发布者名下
      s.updatedAt = s.createdAt;
      return s;
    });
    saveItems(list);
    setOwnerKey(demoOwner);        // 于是"我的发布"里就能直接体验状态流转
    return { seeded: true, count: list.length };
  }

  return {
    KEYS: { items: KEY_ITEMS, owner: KEY_OWNER },
    TYPES: TYPES,
    CATEGORIES: CATEGORIES,
    LIMIT: LIMIT,

    // 存储
    loadItems: loadItems,
    saveItems: saveItems,
    clearAll: clearAll,
    isPersistent: isPersistent,

    // 标识
    getOwnerKey: getOwnerKey,
    setOwnerKey: setOwnerKey,

    // 查
    getItem: getItem,
    generateId: generateId,
    searchItems: searchItems,
    getMyItems: getMyItems,
    isMine: isMine,
    countByType: countByType,
    sortItems: sortItems,

    // 校验
    isValidContact: isValidContact,
    isValidPublishData: isValidPublishData,

    // 写
    createItem: createItem,
    updateItem: updateItem,
    updateStatus: updateStatus,
    deleteItem: deleteItem,
    incrementViews: incrementViews,

    // 演示数据
    seedIfEmpty: seedIfEmpty
  };
})();

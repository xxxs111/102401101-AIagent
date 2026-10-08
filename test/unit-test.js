/* ===========================================================
 * test/unit-test.js —— 原生 JS 手写断言的单元测试（零依赖、零框架）
 *
 * 三种运行方式（任选其一）：
 *   1) 打开 index.html 后按 F12 → Console，粘贴本文件全部内容 → 回车 → 输入 runTest()
 *   2) 直接打开 test/test.html，页面加载后自动运行并显示结果
 *   3) 打开 index.html → 底部「关于」→ 点「在页面里跑一遍单元测试」
 *
 * 设计要点：
 *   - 每个用例独立 try/catch，一个用例失败不影响其它用例（这是踩过的坑）
 *   - 每个用例运行前重置 localStorage，用例之间互不污染
 *   - 覆盖正常 / 边界 / 异常三类场景
 * =========================================================== */
(function (global) {

  /* ---------- 断言工具 ---------- */
  function AssertError(message, extra) {
    var e = new Error(message);
    e.name = 'AssertError';
    e.extra = extra || '';
    return e;
  }

  function stringify(v) {
    try {
      if (typeof v === 'string') return '"' + v + '"';
      return JSON.stringify(v);
    } catch (e) { return String(v); }
  }

  var assert = {
    ok: function (value, msg) {
      if (!value) throw AssertError((msg || '期望为真') + '，实际为 ' + stringify(value));
    },
    notOk: function (value, msg) {
      if (value) throw AssertError((msg || '期望为假') + '，实际为 ' + stringify(value));
    },
    equal: function (actual, expected, msg) {
      if (actual !== expected) {
        throw AssertError((msg || '值不相等') + '：期望 ' + stringify(expected) + '，实际 ' + stringify(actual));
      }
    },
    notEqual: function (actual, expected, msg) {
      if (actual === expected) throw AssertError((msg || '值不应相等') + '，两者都是 ' + stringify(actual));
    },
    deepEqual: function (actual, expected, msg) {
      var a = stringify(actual), b = stringify(expected);
      if (a !== b) throw AssertError((msg || '结构不相等') + '：期望 ' + b + '，实际 ' + a);
    },
    /** 断言 fn 会抛异常（例如传入非法参数） */
    throws: function (fn, msg) {
      var threw = false;
      try { fn(); } catch (e) { threw = true; }
      if (!threw) throw AssertError(msg || '期望抛出异常，但没有');
    }
  };

  /* ---------- 测试数据构造 ---------- */
  var VALID = {
    type: 'lost',
    name: '校园卡',
    category: '校园卡',
    time: null,           // 在 data() 里按"今天"填充，避免写死日期
    place: '紫荆园食堂二楼',
    desc: '蓝色卡套，卡号末尾 3721',
    image: '',
    contactName: '李同学',
    contact: '13800001234'
  };

  function data(over) {
    var d = {};
    for (var k in VALID) d[k] = VALID[k];
    d.time = Utils.toDateStr(new Date());
    if (over) for (var k2 in over) d[k2] = over[k2];
    return d;
  }

  /** 相对今天偏移 offset 天的日期字符串 */
  function dayStr(offset) {
    return Utils.toDateStr(new Date(Date.now() + offset * 86400000));
  }

  /** 4 条固定数据：不同类型、不同状态、不同地点，保证用例可重复 */
  function fixtures() {
    var base = Date.now();
    return [
      { id: 1, type: 'lost',  name: '校园卡',  category: '校园卡',   time: dayStr(-1), place: '紫荆园食堂',
        desc: '蓝色卡套', contact: '13800001234', contactName: '李同学',
        status: 'active', publisherKey: 'owner-a', views: 3, createdAt: base - 3000, updatedAt: base - 3000, image: '' },
      { id: 2, type: 'found', name: 'AirPods 充电盒', category: '电子产品', time: dayStr(0), place: '图书馆三楼',
        desc: '只有盒子', contact: 'wang_lib2026', contactName: '王同学',
        status: 'active', publisherKey: 'owner-b', views: 7, createdAt: base - 2000, updatedAt: base - 2000, image: '' },
      { id: 3, type: 'lost',  name: '保温杯',  category: '水杯',     time: dayStr(-3), place: '教学楼 5 号楼',
        desc: '银色杯身', contact: '13900005678', contactName: '张同学',
        status: 'done', publisherKey: 'owner-a', views: 1, createdAt: base - 1000, updatedAt: base - 500, image: '' },
      { id: 4, type: 'found', name: '深蓝色雨伞', category: '雨伞',    time: dayStr(-2), place: '一教门口伞架',
        desc: '伞骨折了一根', contact: 'liu@example.com', contactName: '刘同学',
        status: 'done', publisherKey: 'owner-b', views: 0, createdAt: base, updatedAt: base, image: '' }
    ];
  }

  function seed(list) { Store.saveItems(list); }

  /** 清空存储，保证用例之间不互相污染 */
  function resetStorage() {
    try { global.localStorage.clear(); } catch (e) {}
    Store.clearAll();
  }

  /* ---------- 用例注册表 ---------- */
  var cases = [];
  function test(name, fn) { cases.push({ name: name, fn: fn }); }

  /* =========================================================
   * 模块一：Utils 工具函数
   * ========================================================= */

  test('[Utils] escapeHtml 转义全部 5 个危险字符', function () {
    assert.equal(Utils.escapeHtml('<script>alert("x")</script>'),
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;', 'HTML 标签应被转义');
    assert.equal(Utils.escapeHtml('a & b'), 'a &amp; b', '& 应被转义');
    assert.equal(Utils.escapeHtml("it's"), 'it&#39;s', '单引号应被转义');
  });

  test('[Utils] escapeHtml 处理 null / undefined / 数字', function () {
    assert.equal(Utils.escapeHtml(null), '', 'null 应返回空串');
    assert.equal(Utils.escapeHtml(undefined), '', 'undefined 应返回空串');
    assert.equal(Utils.escapeHtml(0), '0', '数字 0 应正常输出');
  });

  test('[Utils] toDateStr 补零并且非法输入返回空串', function () {
    assert.equal(Utils.toDateStr(new Date(2026, 0, 5)), '2026-01-05', '月和日应补零');
    assert.equal(Utils.toDateStr('2026-1-5'), '2026-01-05', '字符串日期应被规整');
    assert.equal(Utils.toDateStr('2026/01/05'), '', '斜杠格式视为非法');
    assert.equal(Utils.toDateStr(''), '', '空串返回空串');
    assert.equal(Utils.toDateStr('not-a-date'), '', '乱码返回空串');
  });

  test('[Utils] parseDate 只接受 YYYY-MM-DD', function () {
    assert.ok(Utils.parseDate('2026-09-28') instanceof Date, '合法日期应返回 Date');
    assert.equal(Utils.parseDate('2026-13-01'), null, '不存在的月份应返回 null');
    assert.equal(Utils.parseDate('20260928'), null, '无分隔符应返回 null');
    assert.equal(Utils.parseDate(''), null, '空串应返回 null');
    assert.equal(Utils.parseDate(null), null, 'null 应返回 null');
  });

  test('[Utils] isFutureDate：今天/过去为假，明天/以后为真', function () {
    assert.notOk(Utils.isFutureDate(dayStr(0)), '今天不是未来日期');
    assert.notOk(Utils.isFutureDate(dayStr(-10)), '过去不是未来日期');
    assert.ok(Utils.isFutureDate(dayStr(1)), '明天是未来日期');
    assert.ok(Utils.isFutureDate(dayStr(30)), '下个月是未来日期');
    assert.notOk(Utils.isFutureDate('乱写的'), '格式错误不算未来日期（交给格式校验）');
  });

  test('[Utils] friendlyDate：今天带时间、昨天、N 天前、更早显示原日期', function () {
    var today = dayStr(0);
    assert.ok(Utils.friendlyDate(today).indexOf('今天 ') === 0, '今天应显示"今天 HH:MM"');
    assert.equal(Utils.friendlyDate(dayStr(-1)), '昨天', '昨天应显示"昨天"');
    assert.equal(Utils.friendlyDate(dayStr(-3)), '3 天前', '3 天前');
    assert.equal(Utils.friendlyDate(dayStr(-7)), '7 天前', '边界：第 7 天仍是 N 天前');
    assert.equal(Utils.friendlyDate(dayStr(-8)), dayStr(-8), '超过一周显示原始日期');
  });

  test('[Utils] timeAgo 分档正确', function () {
    var now = 1700000000000;
    assert.equal(Utils.timeAgo(now - 10 * 1000, now), '刚刚', '10 秒前');
    assert.equal(Utils.timeAgo(now - 5 * 60000, now), '5 分钟前', '5 分钟前');
    assert.equal(Utils.timeAgo(now - 3 * 3600000, now), '3 小时前', '3 小时前');
    assert.equal(Utils.timeAgo(now - 2 * 86400000, now), '2 天前', '2 天前');
    assert.equal(Utils.timeAgo(0, now), '', '无时间戳返回空串');
  });

  test('[Utils] statusOf：status × type 四种组合文案', function () {
    assert.equal(Utils.statusOf({ type: 'lost', status: 'active' }), '寻找中', '寻物 + 进行中');
    assert.equal(Utils.statusOf({ type: 'lost', status: 'done' }), '已找到', '寻物 + 已完成');
    assert.equal(Utils.statusOf({ type: 'found', status: 'active' }), '待认领', '招领 + 进行中');
    assert.equal(Utils.statusOf({ type: 'found', status: 'done' }), '已归还', '招领 + 已完成');
    assert.equal(Utils.statusOf(null), '', 'null 返回空串，不能报错');
  });

  test('[Utils] typeLabel / categoryIcon 兜底', function () {
    assert.equal(Utils.typeLabel('lost'), '寻物');
    assert.equal(Utils.typeLabel('found'), '招领');
    assert.equal(Utils.typeLabel('其他值'), '寻物', '未知类型兜底为寻物');
    assert.equal(Utils.categoryIcon('校园卡'), '💳');
    assert.equal(Utils.categoryIcon('不存在的分类'), '📦', '未知分类兜底为 📦');
  });

  test('[Utils] uid 连续生成不重复', function () {
    var a = Utils.uid('t'), b = Utils.uid('t');
    assert.notEqual(a, b, '两次生成不应相同');
    assert.ok(a.indexOf('t_') === 0, '应带上前缀');
  });

  /* =========================================================
   * 模块二：校验函数 isValidPublishData / isValidContact
   * ========================================================= */

  test('[校验] 完整合法数据应通过', function () {
    var r = Store.isValidPublishData(data());
    assert.ok(r.ok, '合法数据应通过，错误：' + JSON.stringify(r.errors));
    assert.deepEqual(r.errors, {}, 'errors 应为空对象');
  });

  test('[校验] 名称为空 / 纯空格 / 超长', function () {
    assert.ok(Store.isValidPublishData(data({ name: '' })).errors.name, '空名称应报错');
    assert.ok(Store.isValidPublishData(data({ name: '   ' })).errors.name, '纯空格应报错');
    assert.ok(Store.isValidPublishData(data({ name: '东'.repeat(31) })).errors.name, '超过 30 字应报错');
    assert.notOk(Store.isValidPublishData(data({ name: '东'.repeat(30) })).errors.name, '刚好 30 字应通过');
  });

  test('[校验] 分类必须是白名单之一', function () {
    assert.ok(Store.isValidPublishData(data({ category: '' })).errors.category, '空分类应报错');
    assert.ok(Store.isValidPublishData(data({ category: '不存在的分类' })).errors.category, '非白名单分类应报错');
    Store.CATEGORIES.forEach(function (c) {
      assert.notOk(Store.isValidPublishData(data({ category: c })).errors.category, c + ' 应通过');
    });
  });

  test('[校验] 日期：空 / 格式错误 / 未来日期', function () {
    assert.ok(Store.isValidPublishData(data({ time: '' })).errors.time, '空日期应报错');
    assert.ok(Store.isValidPublishData(data({ time: '2026/09/20' })).errors.time, '斜杠格式应报错');
    assert.ok(Store.isValidPublishData(data({ time: dayStr(1) })).errors.time, '明天应报错');
    assert.notOk(Store.isValidPublishData(data({ time: dayStr(0) })).errors.time, '今天应通过');
    assert.notOk(Store.isValidPublishData(data({ time: '2020-01-01' })).errors.time, '很久以前应通过');
  });

  test('[校验] 地点为空 / 超 50 字', function () {
    assert.ok(Store.isValidPublishData(data({ place: '' })).errors.place, '空地点应报错');
    assert.ok(Store.isValidPublishData(data({ place: '啊'.repeat(51) })).errors.place, '51 字应报错');
    assert.notOk(Store.isValidPublishData(data({ place: '啊'.repeat(50) })).errors.place, '50 字应通过');
  });

  test('[校验] 描述选填但不得超过 200 字；称呼不得超过 20 字', function () {
    assert.notOk(Store.isValidPublishData(data({ desc: '' })).errors.desc, '空描述允许');
    assert.ok(Store.isValidPublishData(data({ desc: '啊'.repeat(201) })).errors.desc, '201 字应报错');
    assert.notOk(Store.isValidPublishData(data({ desc: '啊'.repeat(200) })).errors.desc, '200 字应通过');
    assert.ok(Store.isValidPublishData(data({ contactName: '啊'.repeat(21) })).errors.contactName, '称呼超长应报错');
  });

  test('[校验] 类型必须为 lost / found', function () {
    assert.ok(Store.isValidPublishData(data({ type: '' })).errors.type, '空类型应报错');
    assert.ok(Store.isValidPublishData(data({ type: 'stolen' })).errors.type, '未知类型应报错');
    assert.notOk(Store.isValidPublishData(data({ type: 'found' })).errors.type, 'found 应通过');
  });

  test('[校验] 联系方式：合法格式应通过', function () {
    ['13800001234', '19912345678', '3432211005', 'wang_lib2026', 'liu_study@example.com', 'abc-def_123']
      .forEach(function (c) {
        assert.ok(Store.isValidContact(c), c + ' 应被判为合法');
      });
  });

  test('[校验] 联系方式：非法格式应被拦截（防止放行垃圾数据）', function () {
    ['', '   ', '12', '12!@#', 'abc', '1234', '1380000123', '138000012345678', '@example.com', 'a@b']
      .forEach(function (c) {
        assert.notOk(Store.isValidContact(c), '"' + c + '" 应被判为非法');
      });
  });

  test('[校验] 联系方式为空或非法时给出错误提示', function () {
    assert.ok(Store.isValidPublishData(data({ contact: '' })).errors.contact, '空联系方式应报错');
    assert.ok(Store.isValidPublishData(data({ contact: '12' })).errors.contact, '过短应报错');
    assert.ok(Store.isValidPublishData(data({ contact: 'abc!@#' })).errors.contact, '含特殊字符应报错');
  });

  test('[校验] 多个字段同时出错时一次性全部返回', function () {
    var r = Store.isValidPublishData({ type: 'lost', name: '', category: '', time: '', place: '', contact: '' });
    assert.notOk(r.ok, '应判定为不通过');
    ['name', 'category', 'time', 'place', 'contact'].forEach(function (k) {
      assert.ok(r.errors[k], '字段 ' + k + ' 应有错误信息');
    });
  });

  /* =========================================================
   * 模块三：数据读写 createItem / getItem / generateId
   * ========================================================= */

  test('[数据] 空存储读取出空数组而不是 null', function () {
    resetStorage();
    var list = Store.loadItems();
    assert.ok(Array.isArray(list), '应返回数组');
    assert.equal(list.length, 0, '应为空');
  });

  test('[数据] 存储内容被写坏时降级为空数组，不让页面崩', function () {
    try { global.localStorage.setItem(Store.KEYS.items, '{坏掉的JSON'); } catch (e) {}
    var list = Store.loadItems();
    assert.deepEqual(list, [], '损坏数据应降级为空数组');
  });

  test('[数据] generateId 从 1 递增，跳号也能取最大值 +1', function () {
    resetStorage();
    assert.equal(Store.generateId(), 1, '空表应从 1 开始');
    seed([{ id: 3 }, { id: 9 }, { id: 5 }]);
    assert.equal(Store.generateId(), 10, '应取最大 id + 1');
  });

  test('[数据] createItem 成功写入并补齐默认字段', function () {
    resetStorage();
    var r = Store.createItem(data());
    assert.ok(r.ok, '应创建成功');
    assert.equal(r.item.id, 1, '第一条 id 为 1');
    assert.equal(r.item.status, 'active', '默认状态为进行中');
    assert.equal(r.item.views, 0, '默认浏览数为 0');
    assert.equal(r.item.contactName, '李同学', '称呼应保留');
    assert.ok(r.item.createdAt > 0, '应写入创建时间戳');
    assert.equal(Store.loadItems().length, 1, '存储里应有 1 条');
  });

  test('[数据] createItem 校验不通过时不写入存储', function () {
    resetStorage();
    var r = Store.createItem(data({ name: '' }));
    assert.notOk(r.ok, '应创建失败');
    assert.ok(r.errors.name, '应返回 name 错误');
    assert.equal(Store.loadItems().length, 0, '失败时绝不能写库');
  });

  test('[数据] createItem 会裁掉首尾空格并兜底称呼', function () {
    resetStorage();
    var r = Store.createItem(data({ name: '  校园卡  ', place: '  食堂  ', contactName: '' }));
    assert.equal(r.item.name, '校园卡', '名称应 trim');
    assert.equal(r.item.place, '食堂', '地点应 trim');
    assert.equal(r.item.contactName, '热心同学', '未填称呼时给默认值');
  });

  test('[数据] 连续发布 3 条，id 依次为 1 / 2 / 3', function () {
    resetStorage();
    Store.createItem(data({ name: '第一条' }));
    Store.createItem(data({ name: '第二条' }));
    var third = Store.createItem(data({ name: '第三条' }));
    assert.equal(third.item.id, 3, '第三条 id 应为 3');
    assert.equal(Store.loadItems().length, 3, '共 3 条');
  });

  test('[数据] getItem：命中返回对象，不存在返回 null', function () {
    resetStorage();
    Store.createItem(data({ name: '校园卡' }));
    assert.equal(Store.getItem(1).name, '校园卡', '应能按 id 取到');
    assert.equal(Store.getItem(999), null, '不存在的 id 应返回 null');
    assert.equal(Store.getItem('1').name, '校园卡', '字符串 id 也能命中');
  });

  test('[数据] 中文与 emoji 经 JSON 往返后不出错', function () {
    resetStorage();
    Store.createItem(data({ name: '钥匙🔑挂件', place: '三区 & 四区之间 <测试>' }));
    var back = Store.getItem(1);
    assert.equal(back.name, '钥匙🔑挂件', 'emoji 应原样保存');
    assert.equal(back.place, '三区 & 四区之间 <测试>', '特殊字符应原样保存（渲染时才转义）');
  });

  /* =========================================================
   * 模块四：状态更新 / 删除 / 浏览数
   * ========================================================= */

  test('[数据] updateStatus：寻物标记 done 后文案变「已找到」', function () {
    resetStorage(); seed(fixtures());
    var updated = Store.updateStatus(1, 'done');
    assert.equal(updated.status, 'done', '状态应变为 done');
    assert.equal(Utils.statusOf(updated), '已找到', '寻物 + done = 已找到');
    assert.equal(Store.getItem(1).status, 'done', '应已持久化');
  });

  test('[数据] updateStatus：招领标记 done 后文案变「已归还」，可再恢复', function () {
    resetStorage(); seed(fixtures());
    var done = Store.updateStatus(2, 'done');
    assert.equal(Utils.statusOf(done), '已归还', '招领 + done = 已归还');
    var back = Store.updateStatus(2, 'active');
    assert.equal(Utils.statusOf(back), '待认领', '恢复后应回到待认领');
    assert.equal(back.id, 2, '返回的应是同一条');
  });

  test('[数据] updateStatus：不存在 id 返回 null 且数据不变', function () {
    resetStorage(); seed(fixtures());
    var before = JSON.stringify(Store.loadItems());
    assert.equal(Store.updateStatus(999, 'done'), null, '应返回 null');
    assert.equal(JSON.stringify(Store.loadItems()), before, '数据不应被改动');
  });

  test('[数据] updateStatus：非法状态值拒绝执行', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.updateStatus(1, 'deleted'), null, '非法状态应拒绝');
    assert.equal(Store.updateStatus(1, ''), null, '空状态应拒绝');
    assert.equal(Store.getItem(1).status, 'active', '状态应保持不变');
  });

  test('[数据] updateStatus 会刷新 updatedAt', function () {
    resetStorage(); seed(fixtures());
    var old = Store.getItem(1).updatedAt;
    var updated = Store.updateStatus(1, 'done');
    assert.ok(updated.updatedAt >= old, 'updatedAt 应不小于原值');
  });

  test('[数据] deleteItem：删除存在的元素并返回它', function () {
    resetStorage(); seed(fixtures());
    var removed = Store.deleteItem(2);
    assert.equal(removed.id, 2, '应返回被删除的对象');
    assert.equal(Store.loadItems().length, 3, '总数应减 1');
    assert.equal(Store.getItem(2), null, '应查不到了');
  });

  test('[数据] deleteItem：删除不存在的元素返回 null 且总数不变', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.deleteItem(999), null, '应返回 null');
    assert.equal(Store.loadItems().length, 4, '总数不应变化');
  });

  test('[数据] incrementViews 每次 +1，不存在返回 null', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.incrementViews(1), 4, '3 -> 4');
    assert.equal(Store.incrementViews(1), 5, '4 -> 5');
    assert.equal(Store.getItem(1).views, 5, '应已持久化');
    assert.equal(Store.incrementViews(404), null, '不存在应返回 null');
  });

  test('[数据] updateItem：合法数据可修改并保留 id 与创建时间', function () {
    resetStorage(); seed(fixtures());
    var created = Store.getItem(1).createdAt, views = Store.getItem(1).views;
    var r = Store.updateItem(1, data({ name: '校园卡（已换新）', place: '三区食堂' }));
    assert.ok(r.ok, '应修改成功');
    assert.equal(r.item.id, 1, 'id 不变');
    assert.equal(r.item.name, '校园卡（已换新）', '名称应更新');
    assert.equal(r.item.place, '三区食堂', '地点应更新');
    assert.equal(r.item.createdAt, created, '创建时间不应被覆盖');
    assert.equal(r.item.views, views, '浏览数不应被清零');
  });

  test('[数据] updateItem：非法数据不写库，原数据保持', function () {
    resetStorage(); seed(fixtures());
    var r = Store.updateItem(1, data({ contact: 'x' }));
    assert.notOk(r.ok, '应修改失败');
    assert.ok(r.errors.contact, '应返回联系方式错误');
    assert.equal(Store.getItem(1).contact, '13800001234', '原联系方式应保持');
  });

  test('[数据] updateItem：id 不存在返回失败', function () {
    resetStorage(); seed(fixtures());
    var r = Store.updateItem(8888, data());
    assert.notOk(r.ok, '应失败');
    assert.ok(r.errors._, '应带一条"信息不存在"提示');
  });

  /* =========================================================
   * 模块五：搜索 / 排序 / 统计 / 我的发布
   * ========================================================= */

  test('[搜索] 无条件时返回全部并按"进行中在前、时间倒序"排序', function () {
    resetStorage(); seed(fixtures());
    var list = Store.searchItems({});
    assert.equal(list.length, 4, '应返回 4 条');
    assert.deepEqual(list.map(function (i) { return i.id; }), [2, 1, 4, 3],
      '进行中(2,1)在前，同状态按 createdAt 倒序，然后是已完成(4,3)');
  });

  test('[搜索] 关键词忽略大小写', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.searchItems({ keyword: 'airpods' }).length, 1, '小写 airpods 应命中 AirPods');
    assert.equal(Store.searchItems({ keyword: 'AIRPODS' }).length, 1, '全大写也应命中');
  });

  test('[搜索] 关键词忽略首尾空格', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.searchItems({ keyword: '  校园卡  ' }).length, 1, '带空格应命中');
  });

  test('[搜索] 关键词能命中描述与地点，不只名称', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.searchItems({ keyword: '蓝色卡套' }).length, 1, '命中描述');
    assert.equal(Store.searchItems({ keyword: '图书馆' }).length, 1, '命中地点');
    assert.equal(Store.searchItems({ keyword: '雨伞' }).length, 1, '命中名称');
    assert.equal(Store.searchItems({ keyword: '电子产品' }).length, 1, '命中分类');
  });

  test('[搜索] 无匹配时返回空数组（界面据此显示空状态）', function () {
    resetStorage(); seed(fixtures());
    assert.deepEqual(Store.searchItems({ keyword: '不存在的物品xyz' }), [], '应返回空数组');
  });

  test('[搜索] 类型筛选 lost / found', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.searchItems({ type: 'lost' }).length, 2, '寻物 2 条');
    assert.equal(Store.searchItems({ type: 'found' }).length, 2, '招领 2 条');
    assert.ok(Store.searchItems({ type: 'lost' }).every(function (i) { return i.type === 'lost'; }), '结果应全为寻物');
    assert.equal(Store.searchItems({ type: '不合法' }).length, 4, '非法类型当作不过滤');
  });

  test('[搜索] 分类筛选', function () {
    resetStorage(); seed(fixtures());
    assert.equal(Store.searchItems({ category: '校园卡' }).length, 1, '校园卡 1 条');
    assert.equal(Store.searchItems({ category: '不存在的分类' }).length, 0, '未知分类 0 条');
  });

  test('[搜索] 只看进行中', function () {
    resetStorage(); seed(fixtures());
    var list = Store.searchItems({ onlyActive: true });
    assert.equal(list.length, 2, '只有 2 条进行中');
    assert.ok(list.every(function (i) { return i.status === 'active'; }), '结果应全为进行中');
  });

  test('[搜索] 多条件组合无结果时返回空数组', function () {
    resetStorage(); seed(fixtures());
    assert.deepEqual(Store.searchItems({ type: 'lost', category: '雨伞' }), [], '寻物 + 雨伞 = 空');
    assert.equal(Store.searchItems({ type: 'found', keyword: '雨伞', onlyActive: false }).length, 1, '招领 + 雨伞 = 1 条');
    assert.deepEqual(Store.searchItems({ type: 'found', keyword: '雨伞', onlyActive: true }), [],
      '招领 + 雨伞 + 只看进行中 = 空（那条已完成）');
  });

  test('[搜索] 搜索结果不改变原始数据顺序', function () {
    resetStorage(); seed(fixtures());
    var before = Store.loadItems().map(function (i) { return i.id; });
    Store.searchItems({});
    var after = Store.loadItems().map(function (i) { return i.id; });
    assert.deepEqual(after, before, 'sortItems 必须返回副本，不能就地排序');
  });

  test('[统计] countByType 计数正确', function () {
    resetStorage(); seed(fixtures());
    var c = Store.countByType();
    assert.equal(c.all, 4, '总数 4');
    assert.equal(c.lost, 2, '寻物 2');
    assert.equal(c.found, 2, '招领 2');
    assert.equal(c.done, 2, '已完成 2');
  });

  test('[我的发布] 只返回本机标识发布的信息', function () {
    resetStorage();
    Store.setOwnerKey('owner-a');
    seed(fixtures());
    var mine = Store.getMyItems();
    assert.equal(mine.length, 2, 'owner-a 发了 2 条');
    assert.ok(mine.every(function (i) { return i.publisherKey === 'owner-a'; }), '应全是自己的');
    assert.deepEqual(mine.map(function (i) { return i.id; }), [1, 3], '进行中在前');
  });

  test('[我的发布] 没有发布过时返回空数组', function () {
    resetStorage(); seed(fixtures());
    Store.setOwnerKey('owner-nobody');
    assert.deepEqual(Store.getMyItems(), [], '应返回空数组');
  });

  test('[我的发布] isMine 判定发布者归属', function () {
    resetStorage(); seed(fixtures());
    Store.setOwnerKey('owner-a');
    assert.ok(Store.isMine(Store.getItem(1)), '1 号是自己的');
    assert.notOk(Store.isMine(Store.getItem(2)), '2 号是别人的');
    assert.notOk(Store.isMine(null), 'null 应为 false 而不是报错');
  });

  test('[我的发布] 本机标识首次访问自动生成并保持不变', function () {
    resetStorage();
    var k1 = Store.getOwnerKey(), k2 = Store.getOwnerKey();
    assert.ok(k1, '应生成标识');
    assert.equal(k1, k2, '两次调用应返回同一个');
  });

  /* =========================================================
   * 模块六：演示数据 seedIfEmpty
   * ========================================================= */

  test('[演示数据] 空库时播种成功并归到本机名下', function () {
    resetStorage();
    var r = Store.seedIfEmpty();
    assert.ok(r.seeded, '应执行播种');
    assert.equal(Store.loadItems().length, 6, '应播种 6 条演示数据');
    assert.ok(Store.getMyItems().length > 0, '播种后"我的发布"应有内容，方便体验状态流转');
  });

  test('[演示数据] 已有数据时绝不覆盖用户数据（关键回归用例）', function () {
    resetStorage();
    Store.setOwnerKey('owner-me');
    Store.createItem(data({ name: '我自己发的唯一一条' }));
    var r = Store.seedIfEmpty();
    assert.notOk(r.seeded, '不应再播种');
    assert.equal(r.reason, 'already-has-data', '应说明原因');
    assert.equal(Store.loadItems().length, 1, '用户数据不应被覆盖');
    assert.equal(Store.loadItems()[0].name, '我自己发的唯一一条', '内容应原样保留');
  });

  test('[演示数据] 重复播种不会重复灌数据', function () {
    resetStorage();
    Store.seedIfEmpty();
    Store.seedIfEmpty();
    assert.equal(Store.loadItems().length, 6, '仍是 6 条');
  });

  test('[演示数据] 播种数据自身必须全部能通过校验规则', function () {
    resetStorage();
    Store.seedIfEmpty();
    Store.loadItems().forEach(function (i) {
      var r = Store.isValidPublishData(i);
      assert.ok(r.ok, '演示数据「' + i.name + '」不合规：' + JSON.stringify(r.errors));
    });
  });

  test('[演示数据] clearAll 能彻底重置（保证演示可重复）', function () {
    resetStorage();
    Store.seedIfEmpty();
    Store.setOwnerKey('owner-x');
    Store.clearAll();
    assert.equal(Store.loadItems().length, 0, '信息应被清空');
    assert.notEqual(Store.getOwnerKey(), 'owner-x', '发布者标识应被重置');
  });

  /* =========================================================
   * 运行器
   * ========================================================= */

  function runTest(options) {
    options = options || {};
    var quiet = options.quiet === true;
    var passed = 0, failed = 0, failures = [];
    var started = Date.now();

    /* 用例会反复清库，所以先把用户真实数据备份下来，跑完原样还原，
       这样测试可以随时运行而不会弄丢演示/自建数据 */
    var backupItems, backupOwner;
    try {
      backupItems = global.localStorage.getItem(Store.KEYS.items);
      backupOwner = global.localStorage.getItem(Store.KEYS.owner);
    } catch (e) { backupItems = null; backupOwner = null; }

    if (!quiet) {
      console.log('%c=== 寻回 · 校园失物招领 单元测试 ===',
        'font-weight:bold;color:#4353ff;font-size:13px');
    }

    try {
      for (var i = 0; i < cases.length; i++) {
        var c = cases[i];
        var t0 = Date.now();
        try {
          resetStorage();
          c.fn();
          passed++;
          if (!quiet) console.log('%c  ✔ ' + c.name, 'color:#16a34a', '(' + (Date.now() - t0) + 'ms)');
        } catch (e) {
          failed++;
          failures.push({ name: c.name, error: e });
          if (!quiet) {
            console.log('%c  ✘ ' + c.name, 'color:#e5484d;font-weight:bold');
            console.log('      原因：' + e.message);
            if (e.stack) console.log('      ' + String(e.stack).split('\n')[1]);
          }
        }
      }
    } finally {
      /* 还原现场 */
      try {
        if (backupItems === null) global.localStorage.removeItem(Store.KEYS.items);
        else global.localStorage.setItem(Store.KEYS.items, backupItems);
        if (backupOwner === null) global.localStorage.removeItem(Store.KEYS.owner);
        else global.localStorage.setItem(Store.KEYS.owner, backupOwner);
      } catch (e) {}
    }

    var total = cases.length;
    var cost = Date.now() - started;
    if (!quiet) {
      console.log('%c----------------------------------------', 'color:#98a1b3');
      console.log('%c用例：' + total + '　通过：' + passed + '　失败：' + failed + '　耗时：' + cost + 'ms',
        failed === 0 ? 'color:#16a34a;font-weight:bold' : 'color:#e5484d;font-weight:bold');
      console.log(failed === 0 ? '%c✔ 全部通过' : '%c✘ 存在失败用例，请查看上面的原因',
        failed === 0 ? 'color:#16a34a;font-weight:bold;font-size:13px'
                     : 'color:#e5484d;font-weight:bold;font-size:13px');
    }
    return { total: total, passed: passed, failed: failed, failures: failures, cost: cost };
  }

  /* 对外暴露 */
  global.LFTest = { assert: assert, test: test, cases: cases, runTest: runTest, fixtures: fixtures, data: data };
  global.runTest = runTest;
  global.assert = assert;

})(window);

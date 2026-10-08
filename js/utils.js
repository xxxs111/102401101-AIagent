/* ===========================================================
 * utils.js —— 工具层（纯函数，不依赖 DOM / localStorage）
 * 这一层刻意做成"可单独引用"的，单元测试直接调用它。
 * =========================================================== */
window.Utils = (function () {

  /** HTML 转义：所有用户输入渲染到页面前必须过一遍，防止 XSS */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 补零 */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /**
   * Date -> 'YYYY-MM-DD'
   * @param {Date|string|number} d
   * @param {boolean} [endOfMonth] 传入 true 时按"整月"处理（收尾日）
   */
  function toDateStr(d, endOfMonth) {
    if (d === null || d === undefined || d === '') return '';
    var date;
    if (d instanceof Date) date = d;
    else if (typeof d === 'string') {
      var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d.trim());
      if (!m) return '';
      date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    } else date = new Date(d);
    if (isNaN(date.getTime())) return '';
    if (endOfMonth) return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  /** 'YYYY-MM-DD' -> Date（本地零点），非法返回 null */
  function parseDate(str) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str || '').trim());
    if (!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
    if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;   // 2026-13-01 这类直接判非法
    var d = new Date(y, mo - 1, da);
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null; // 2026-02-30 会溢出
    return d;
  }

  /** 今天零点 */
  function today() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  /** 相对今天的天数差：昨天 = -1，今天 = 0，明天 = 1；非法输入返回 null */
  function dayDiff(str) {
    var d = parseDate(str);
    if (!d) return null;
    return Math.round((d.getTime() - today().getTime()) / 86400000);
  }

  /** 丢失/拾取时间是否早于明天（即：不允许填未来日期） */
  function isFutureDate(str) {
    var diff = dayDiff(str);
    if (diff === null) return false;   // 格式不对由别的校验负责
    return diff > 0;
  }

  /** 时间友好化：今天→带时间，一周内→N 天前，更早→日期 */
  function friendlyDate(str, now) {
    var d = parseDate(str);
    if (!d) return str || '';
    now = now || new Date();
    var diff = Math.round((d.getTime() - today().getTime()) / 86400000);
    if (diff === 0) {
      var hh = pad2(now.getHours()), mm = pad2(now.getMinutes());
      return '今天 ' + hh + ':' + mm;
    }
    if (diff === -1) return '昨天';
    if (diff < -1 && diff >= -7) return Math.abs(diff) + ' 天前';
    return str;
  }

  /** 时间戳 -> "刚刚 / N 分钟前 / N 小时前 / N 天前 / 日期" */
  function timeAgo(ts, now) {
    now = now || Date.now();
    if (!ts) return '';
    var s = Math.floor((now - ts) / 1000);
    if (s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
    if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' 天前';
    var d = new Date(ts);
    return toDateStr(d);
  }

  /** 防抖：只保留最后一次调用 */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 0);
    };
  }

  /** 类型 -> 中文 */
  function typeLabel(type) { return type === 'found' ? '招领' : '寻物'; }

  /** 类型 -> emoji（列表缩略图 / 详情页大图） */
  function typeIcon(type) { return type === 'found' ? '🎁' : '🔍'; }

  /** 分类 -> emoji */
  var CATEGORY_ICON = {
    '校园卡': '💳', '证件': '🪪', '钥匙': '🔑', '电子产品': '🎧',
    '书籍': '📚', '水杯': '🥤', '雨伞': '☂️', '衣物': '🧥', '其他': '📦'
  };
  function categoryIcon(cat) { return CATEGORY_ICON[cat] || '📦'; }

  /**
   * 状态文案映射：status × type 两两组合，界面层只认这个函数，
   * 避免"寻找中 / 已找到 / 待认领 / 已归还"这些文案散落各处。
   */
  function statusOf(item) {
    if (!item) return '';
    var done = item.status === 'done';
    if (item.type === 'found') return done ? '已归还' : '待认领';
    return done ? '已找到' : '寻找中';
  }

  /** 生成短 id */
  function uid(prefix) {
    return (prefix || 'k') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    escapeHtml: escapeHtml,
    toDateStr: toDateStr,
    parseDate: parseDate,
    today: today,
    dayDiff: dayDiff,
    isFutureDate: isFutureDate,
    friendlyDate: friendlyDate,
    timeAgo: timeAgo,
    debounce: debounce,
    typeLabel: typeLabel,
    typeIcon: typeIcon,
    categoryIcon: categoryIcon,
    statusOf: statusOf,
    uid: uid
  };
})();

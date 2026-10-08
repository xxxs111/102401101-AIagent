/* 把 docs/博客正文.md 转成可直接粘贴进博客园编辑器的自包含 HTML。
 *
 * 为什么用 Node 写：Python 版在拼接 ~1MB 的 HTML 字符串时明显吃力（跑几分钟没结束），
 * 而 Node 处理同样的字符串拼接是毫秒级。
 *
 * 图片统一走占位符 @@FIGn@@：先在 Markdown 文本里插占位符，全部插完再一次性替换成
 * 内嵌 base64 的 <img>，避免"在已插入的图片后面又追加"的顺序错乱。
 *
 * 用法：node docs/tools-build-blog-html.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'screenshots');
const SRC = path.join(HERE, '博客正文.md');
const OUT = path.join(HERE, '博客正文（可直接粘贴）.html');

/** 图号 -> [文件名, 说明文字, 显示宽度 px]
 *  11–19 是「八、实现成果展示」里的界面与测试结果截图；
 *  20–23 是插入正文对应小节的流程图 / 架构图 / 数据模型图；
 *  24 是博客里唯一需要你自己补的图（GitHub 提交记录），正文留了位置说明。 */
const FIGURES = {
  11: ['01-home.png', '首页：搜索触发框、发布入口、计数标签与倒序信息流（进行中在前，已完成置灰后置）', 430],
  12: ['02-search.png', '搜索结果：关键词实时命中 + 类型 / 分类筛选', 430],
  13: ['03-detail-owner.png', '详情页（本人发布）：渐变大图、状态徽章、一键复制、标记已找到 / 编辑 / 删除', 430],
  14: ['04-detail-visitor.png', '详情页（非本人发布）：只读，提示只有发布者本人可以修改状态或删除', 430],
  15: ['05-publish-validation.png', '发布表单校验：必填项缺失时字段标红并给出具体提示', 430],
  16: ['06-publish-filled.png', '发布表单填写完成：分类下拉、日期不能选未来日期、字符计数', 430],
  17: ['07-publish-success.png', '发布成功页：可直达详情或去我的发布', 430],
  18: ['08-mine.png', '我的发布：共发布 / 进行中 / 已完成统计卡与信息管理按钮', 430],
  19: ['09-about-tests.png', '应用内一键运行单元测试（关于页）', 430],
  20: ['10-unit-test-all-pass.png', '单元测试全部通过：用例总数 61 / 通过 61 / 失败 0', 430],
  21: ['11-home-filter.png', '「只看进行中」：6 条筛到 4 条，已完结的信息自动被过滤掉', 430],
  22: ['12-search-category.png', '分类筛选：点「🎧 电子产品」只看这一类；筛选条件同步进地址栏，链接可直接分享到班群', 430],
  23: ['13-search-empty.png', '空状态引导：搜索无结果时给出「清空筛选条件」，而不是干巴巴一行“暂无数据”', 430],
  24: ['14-mine-empty.png', '「我的发布」空状态：没有发布过时给出「去发布一条」入口', 430],
  25: ['15-detail-done.png', '已完成的信息（招领 → 已归还）：详情页不再展示联系方式，改为「请勿再联系发布者」提示', 430],
  26: ['diagram-arch.png', '分层架构：界面层只碰 DOM，数据层 / 模板层 / 工具层都是纯函数，所以能被单元测试直接引用', 860],
  27: ['diagram-flow.png', '用户使用流程：核心闭环（上）与发布分支（下）', 920],
  28: ['diagram-data.png', '数据模型 item 的字段设计，以及「进行中 ⇄ 已完成」的双向流转与权限 / 排序规则', 920],
};

/** 第八节的「图 N：xxx」说明行 -> 图号（对应 11–19 这批成果截图） */
const ANCHORS = [
  ['**图 11：首页**', '11'],
  ['**图 12：搜索结果**', '12'],
  ['**图 13：详情页（本人发布）**', '13'],
  ['**图 14：详情页（非本人发布）**', '14'],
  ['**图 15：发布表单校验**', '15'],
  ['**图 16：发布表单填写完成**', '16'],
  ['**图 17：发布成功页**', '17'],
  ['**图 18：我的发布**', '18'],
  ['**图 19：单元测试全部通过**', '19'],
];

/** 小节标题 -> 插在该标题之前的图（流程图 / 架构图 / 数据模型图） */
const BEFORE_HEADINGS = [
  ['### 3.2 技术选型', ['27']],
  ['### 3.3 架构与数据模型', ['26', '28']],
];

const memo = new Map();
function dataUri(name) {
  if (!memo.has(name)) {
    const buf = fs.readFileSync(path.join(SHOTS, name));
    memo.set(name, 'data:image/png;base64,' + buf.toString('base64'));
  }
  return memo.get(name);
}

function figureHtml(num) {
  const [name, caption, width] = FIGURES[num];
  return '<p style="text-align:center;margin:16px 0">'
    + `<img src="${dataUri(name)}" alt="${caption}" `
    + `style="max-width:${width}px;width:100%;border:1px solid #e5e7eb;border-radius:8px">`
    + `<br><span style="color:#6b7280;font-size:13px">图 ${num}　${caption}</span></p>`;
}

/* ---------- 行内元素 ----------
   注意顺序：要先把正文里出现的裸 HTML（例如举例说明 XSS 防护时写的
   `<img src=x onerror=alert(1)>`）转义成 &lt;...&gt;，否则贴进博客编辑器后
   浏览器会真的去加载那张图片、甚至执行 onerror。
   这个函数【只能作用在纯文本片段上】，不要作用在已经生成好标签的 HTML 上，
   否则 <h2>/<table> 这些标签会被一起转义掉。 */
function inline(text) {
  return text
    .replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => '&lt;' + tag.slice(1, -1) + '&gt;')
    .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;border-radius:4px;padding:1px 5px">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?<!["=>])(https?:\/\/[^\s<>）)，。]+)/g, '<a href="$1">$1</a>');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function convert(md) {
  const out = [];
  const lines = md.split('\n');
  let i = 0;
  const dbg = process.env.BLOG_DEBUG;
  let guard = 0;

  while (i < lines.length) {
    if (dbg && ++guard % 200 === 0) console.error(`[convert] i=${i}/${lines.length} : ${JSON.stringify(lines[i].slice(0, 60))}`);
    const line = lines[i];
    const t = line.trim();

    // 图片占位符：可能单独成行，也可能后面还跟着那句「图 N：xxx」的说明文字
    const figAtStart = /^@@FIG(\d+)@@/.exec(t);
    if (figAtStart) {
      out.push(`@@FIG${figAtStart[1]}@@`);
      const rest = t.slice(figAtStart[0].length).trim();
      if (rest) out.push(`<p style="margin:10px 0">${inline(rest)}</p>`);
      i++;
      continue;
    }

    // 围栏代码块
    if (t.startsWith('```')) {
      i++;
      const buf = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre style="background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;'
        + 'padding:12px;overflow-x:auto;font-size:13px;line-height:1.6"><code>'
        + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }

    // 标题
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const size = { 1: 24, 2: 20, 3: 17, 4: 15 }[level];
      out.push(`<h${level} style="font-size:${size}px;margin:22px 0 10px">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // 表格
    if (t.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const header = t.slice(1, -1).split('|').map((c) => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().slice(1, -1).split('|').map((c) => c.trim()));
        i++;
      }
      const th = header.map((c) => `<th style="border:1px solid #d0d7de;background:#f6f8fa;padding:6px 10px;text-align:left">${inline(c)}</th>`).join('');
      const trs = rows.map((r) => '<tr>' + r.map((c) => `<td style="border:1px solid #d0d7de;padding:6px 10px">${inline(c)}</td>`).join('') + '</tr>').join('');
      out.push('<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:14px">'
        + `<thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }

    // 引用
    if (t.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push('<blockquote style="border-left:4px solid #d0d7de;margin:12px 0;padding:4px 14px;'
        + 'color:#57606a;background:#f6f8fa">' + buf.map(inline).join('<br>') + '</blockquote>');
      continue;
    }

    // 无序列表
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push("<ul style='margin:10px 0;padding-left:24px'>"
        + buf.map((b) => `<li style='margin:5px 0'>${inline(b)}</li>`).join('') + '</ul>');
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push("<ol style='margin:10px 0;padding-left:24px'>"
        + buf.map((b) => `<li style='margin:5px 0'>${inline(b)}</li>`).join('') + '</ol>');
      continue;
    }

    // 分隔线
    if (/^-{3,}$/.test(t)) {
      out.push('<hr style="border:0;border-top:1px solid #e5e7eb;margin:22px 0">');
      i++;
      continue;
    }

    // 空行
    if (!t) { i++; continue; }

    // 普通段落（加断言：不推进索引就说明匹配规则打架了，直接报错而不是死循环）
    const buf = [];
    while (i < lines.length && lines[i].trim()
      && !/^(#{1,4}\s|\||>|\s*[-*]\s|\s*\d+\.\s|```|-{3,}$|@@FIG)/.test(lines[i])) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length === 0) {
      throw new Error(`convert 无法推进，第 ${i + 1} 行：${JSON.stringify(lines[i])}`);
    }
    out.push(`<p style="margin:10px 0">${inline(buf.join(' '))}</p>`);
  }

  return out.join('\n');
}

/* ---------- 组装 ---------- */
const stage = (m) => { if (process.env.BLOG_DEBUG) console.error('[stage] ' + m); };
stage('读取 Markdown');
let md = fs.readFileSync(SRC, 'utf8');
const warn = (m) => console.warn('warn: ' + m);
stage('Markdown 长度 ' + md.length);

for (const [anchor, num] of ANCHORS) {
  if (md.includes(anchor)) md = md.split(anchor).join(`${anchor}\n\n@@FIG${num}@@`);
  else warn(`未找到锚点 -> ${anchor}`);
}

for (const [heading, nums] of BEFORE_HEADINGS) {
  if (md.includes(heading)) {
    md = md.replace(heading, nums.map((n) => `@@FIG${n}@@`).join('\n\n') + '\n\n' + heading);
  } else warn(`未找到小节 -> ${heading}`);
}

// 更多界面截图：单独一节，放在「四、附加特点设计与展示」之前
const gallery = [
  '### 3.5 更多界面截图（与上面的设计决策一一对应）',
  '下面几张图对应第三节的设计决策与第四节列出的附加功能：',
  ...['21', '22', '23', '24'].map((n) => `@@FIG${n}@@`),
  '**已完成信息的展示效果**（招领 → 已归还）：',
  '@@FIG25@@',
].join('\n\n');

const sec4 = '## 四、附加特点设计与展示';
if (md.includes(sec4)) md = md.replace(sec4, gallery + '\n\n---\n\n' + sec4);
else warn('未找到「四、附加特点设计与展示」标题');

// 6.3 测试结果：测试页全览（图 20）
const t63 = '- 应用内一键运行（关于页）结果：见下方图 19。';
if (md.includes(t63)) md = md.replace(t63, `${t63}\n- 61 个用例全部通过的测试页全览（图 20）：\n\n@@FIG20@@`);
else warn('未找到 6.3 测试结果锚点');

// 7 节：GitHub 提交记录截图需要你自己补，这里补一句说明
const gh = '（此处请插入 GitHub 仓库首页与 Commits 页面的截图）';
if (md.includes(gh)) {
  md = md.replace(gh, gh + '\n\n> 说明：这张图需要仓库推送完成后自己截一张 —— 打开 '
    + 'https://github.com/xxxs111/102401101-AIagent/commits/main ，把提交列表整屏截下来贴到这里即可。');
} else warn('未找到 GitHub 截图占位说明');

/* convert 先把正文转成 HTML 片段，图片位置仍然是 @@FIGn@@ 占位符；
   最后按占位符切分，只对文本片段做行内替换，图片（base64）不参与任何正则匹配，
   否则巨大的 base64 串会让行内正则慢得离谱。 */
stage('开始 convert');
let body = convert(md);
stage('convert 完成，长度 ' + body.length);
const { length: nfig } = [...body.matchAll(/@@FIG(\d+)@@/g)];
stage('图片占位符 ' + nfig + ' 个');

const used = new Set([...body.matchAll(/@@FIG(\d+)@@/g)].map((m) => m[1]));
for (const n of used) if (!FIGURES[n]) warn(`缺少图片定义 -> 图 ${n}`);
for (const n of Object.keys(FIGURES)) if (!used.has(n)) warn(`图片未被引用 -> 图 ${n}（${FIGURES[n][0]}）`);

const parts = body.split(/(@@FIG\d+@@)/);
stage('切分后 ' + parts.length + ' 段，开始替换图片');
body = parts.map((seg) => {
  const m = /^@@FIG(\d+)@@$/.exec(seg);
  /* 文本片段已经在 convert 里做过 inline 了，这里只替换图片，不能再跑一次 inline，
     否则生成好的 <h2>/<table> 等标签会被当成裸 HTML 转义掉 */
  return m ? figureHtml(m[1]) : seg;
}).join('');
stage('图片替换完成，总长度 ' + body.length);

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>软件工程第二次结对作业 —— 校园失物招领程序实现（102401101 谢玲洁）</title>
</head>
<body style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',Arial,sans-serif;
             font-size:15px;line-height:1.8;color:#1f2328;max-width:880px;margin:0 auto;padding:28px 20px">
${body}
</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`written: ${OUT}`);
console.log(`  ${kb} KB，嵌入图片 ${[...body.matchAll(/<img /g)].length} 张`);

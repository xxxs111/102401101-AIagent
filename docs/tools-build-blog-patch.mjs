/* 生成"博客补丁"HTML：只包含那篇博客目前缺失的 6 张图与对应段落。
 * 用法：node docs/tools-build-blog-patch.mjs
 * 产出：docs/博客补丁（补这6张图）.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'screenshots');
const OUT = path.join(HERE, '博客补丁（补这6张图）.html');

const fig = (file, num, caption, width = 430) => {
  const b64 = fs.readFileSync(path.join(SHOTS, file)).toString('base64');
  return '<p style="text-align:center;margin:16px 0">'
    + `<img src="data:image/png;base64,${b64}" alt="${file.replace('.png', '')}" `
    + `style="max-width:${width}px;width:100%;border:1px solid #e5e7eb;border-radius:8px">`
    + `<br><span style="color:#6b7280;font-size:13px">图 ${num}　${caption}</span></p>`;
};

const bar = (title) => `<hr style="border:0;border-top:2px dashed #e5484d;margin:26px 0">`
  + `<p style="margin:10px 0;color:#e5484d;font-weight:700">▼▼▼ ${title} ▼▼▼</p>`
  + `<hr style="border:0;border-top:2px dashed #e5484d;margin:14px 0">`;

const part1 = [
  bar('第 1 段：整段粘到「3.4 关键代码片段与解释」结束之后、「四、附加特点设计与展示」之前'),
  '<h3 style="font-size:17px;margin:22px 0 10px">3.5 更多界面截图（与上面的设计决策一一对应）</h3>',
  '<p style="margin:10px 0">下面几张图对应第三节的设计决策与第四节列出的附加功能：</p>',
  fig('11-home-filter.png', 21, '「只看进行中」：6 条筛到 4 条，已完结的信息自动被过滤掉'),
  fig('12-search-category.png', 22, '分类筛选：点「🎧 电子产品」只看这一类；筛选条件同步进地址栏，链接可直接分享到班群'),
  fig('13-search-empty.png', 23, '空状态引导：搜索无结果时给出「清空筛选条件」，而不是干巴巴一行“暂无数据”'),
  fig('14-mine-empty.png', 24, '「我的发布」空状态：没有发布过时给出「去发布一条」入口'),
  '<p style="margin:10px 0"><strong>已完成信息的展示效果</strong>（招领 → 已归还）：</p>',
  fig('15-detail-done.png', 25, '已完成的信息（招领 → 已归还）：详情页不再展示联系方式，改为「请勿再联系发布者」提示'),
].join('\n');

const part2 = [
  bar('第 2 段：整段粘到「6.3 测试运行结果」那两行列表的下面'),
  fig('10-unit-test-all-pass.png', 20, '单元测试全部通过：用例总数 61 / 通过 61 / 失败 0'),
].join('\n');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>博客补丁 —— 补这 6 张图</title></head>
<body style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',Arial,sans-serif;
             font-size:15px;line-height:1.8;color:#1f2328;max-width:880px;margin:0 auto;padding:24px">

<h1 style="font-size:20px">博客补丁：把缺的 6 张图补进已发布的那篇随笔</h1>

<p style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;margin:14px 0">
<strong>怎么用（2 分钟）：</strong><br>
1. 用浏览器打开本文件（不是编辑器），页面上有 <strong>两段</strong>内容，用红虚线分隔；<br>
2. 全选本页内容（Ctrl+A）→ Ctrl+C；<br>
3. 打开随笔编辑页 → 右上角切到<strong>「源代码」模式</strong> → 在正文里 Ctrl+V；<br>
4. 粘完会看到两段内容都在<strong>同一处</strong>，把<strong>第 2 段整段剪下来</strong>（含那段红字提示条），
   移到「6.3 测试运行结果」那两行列表下面；<br>
5. 删掉所有红字提示条 → 更新发布。图片会自动上传，不用手动操作。
</p>

<p style="background:#f6f8fa;border-radius:8px;padding:10px 14px;color:#57606a;font-size:14px">
总共只需补 6 张：图 20（单元测试 61 通过 —— 作业硬性要求的那张）、图 21–25（附加功能的实测图）。
</p>

${part1}

${part2}

</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`written: ${OUT}`);
console.log(`  ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB，含图片 6 张`);

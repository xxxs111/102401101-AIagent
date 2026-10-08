"""把 docs/博客正文.md 转成可直接粘贴进博客园编辑器的 HTML。

环境里没有 markdown 库，所以这里按本文用到的 Markdown 子集手写一个够用的转换器：
标题 / 表格 / 围栏代码块 / 无序列表 / 引用 / 粗体 / 行内代码 / 链接 / 段落。
同时把「图 N」的位置替换成内嵌 base64 的截图，输出自包含 HTML（不需要图床）。
"""
import base64
import os
import re

ROOT = r"C:\Users\86173\Desktop\homework4"
SHOTS = os.path.join(ROOT, "docs", "screenshots")
SRC = os.path.join(ROOT, "docs", "博客正文.md")
OUT = os.path.join(ROOT, "docs", "博客正文（可直接粘贴）.html")

FIGURES = {
    "1": ("01-home.png", "首页：搜索触发框、发布入口、计数标签与倒序信息流（进行中在前，已完成置灰后置）"),
    "2": ("02-search.png", "搜索结果：关键词实时命中 + 类型 / 分类筛选"),
    "3": ("03-detail-owner.png", "详情页（本人发布）：渐变大图、状态徽章、一键复制、标记已找到 / 编辑 / 删除"),
    "4": ("04-detail-visitor.png", "详情页（非本人发布）：只读，提示只有发布者本人可以修改状态或删除"),
    "5": ("05-publish-validation.png", "发布表单校验：必填项缺失时字段标红并给出具体提示"),
    "6": ("06-publish-filled.png", "发布表单填写完成：分类下拉、日期不能选未来日期、字符计数"),
    "7": ("07-publish-success.png", "发布成功页"),
    "8": ("08-mine.png", "我的发布：共发布 / 进行中 / 已完成统计卡与信息管理按钮"),
    "9": ("09-about-tests.png", "应用内一键运行单元测试（关于页）"),
    "10": ("10-unit-test-all-pass.png", "单元测试运行结果：用例总数 61 / 通过 61 / 失败 0"),
}

# 「图 N」段落 -> 插到哪一段文字之后
ANCHORS = [
    ("**图 1：首页**", "1"),
    ("**图 2：搜索结果**", "2"),
    ("**图 3：详情页（本人发布）**", "3"),
    ("**图 4：详情页（非本人发布）**", "4"),
    ("**图 5：发布表单校验**", "5"),
    ("**图 6：发布表单填写完成**", "6"),
    ("**图 7：发布成功**", "7"),
    ("**图 8：我的发布**", "8"),
    ("**图 9：单元测试全部通过**", "9"),
]


def data_uri(name):
    with open(os.path.join(SHOTS, name), "rb") as fh:
        return "data:image/png;base64," + base64.b64encode(fh.read()).decode("ascii")


def figure_html(num):
    name, caption = FIGURES[num]
    return (
        '<p style="text-align:center;margin:16px 0">'
        f'<img src="{data_uri(name)}" alt="{caption}" '
        'style="max-width:430px;width:100%;border:1px solid #e5e7eb;border-radius:8px">'
        f'<br><span style="color:#6b7280;font-size:13px">图 {num}　{caption}</span></p>'
    )


# ---------- 行内元素 ----------
def inline(text):
    text = re.sub(r"`([^`]+)`", r'<code style="background:#f3f4f6;border-radius:4px;padding:1px 5px">\1</code>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', text)
    text = re.sub(r"(?<![\"=>])(https?://[^\s<>）)，。]+)", r'<a href="\1">\1</a>', text)
    return text


def split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def convert(md):
    out = []
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        # 围栏代码块
        if line.strip().startswith("```"):
            i += 1
            buf = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            code = "\n".join(buf)
            out.append(
                '<pre style="background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;'
                'padding:12px;overflow:auto;font-size:13px;line-height:1.6"><code>'
                + code.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                + "</code></pre>"
            )
            continue

        # 标题
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            size = {1: 24, 2: 20, 3: 17, 4: 15}[level]
            out.append(
                f'<h{level} style="font-size:{size}px;margin:22px 0 10px">{inline(m.group(2))}</h{level}>'
            )
            i += 1
            continue

        # 表格
        if line.strip().startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            header = split_row(line)
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(split_row(lines[i]))
                i += 1
            th = "".join(
                f'<th style="border:1px solid #d0d7de;background:#f6f8fa;padding:6px 10px;text-align:left">{inline(c)}</th>'
                for c in header
            )
            trs = "".join(
                "<tr>"
                + "".join(f'<td style="border:1px solid #d0d7de;padding:6px 10px">{inline(c)}</td>' for c in r)
                + "</tr>"
                for r in rows
            )
            out.append(
                '<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:14px">'
                f"<thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>"
            )
            continue

        # 引用
        if line.strip().startswith(">"):
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip().lstrip(">").strip())
                i += 1
            out.append(
                '<blockquote style="border-left:4px solid #d0d7de;margin:12px 0;padding:4px 14px;'
                'color:#57606a;background:#f6f8fa">' + "<br>".join(inline(b) for b in buf) + "</blockquote>"
            )
            continue

        # 无序列表
        if re.match(r"^\s*[-*]\s+", line):
            buf = []
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                buf.append(re.sub(r"^\s*[-*]\s+", "", lines[i]))
                i += 1
            out.append(
                "<ul style='margin:10px 0;padding-left:24px'>"
                + "".join(f"<li style='margin:5px 0'>{inline(b)}</li>" for b in buf)
                + "</ul>"
            )
            continue

        # 有序列表
        if re.match(r"^\s*\d+\.\s+", line):
            buf = []
            while i < len(lines) and re.match(r"^\s*\d+\.\s+", lines[i]):
                buf.append(re.sub(r"^\s*\d+\.\s+", "", lines[i]))
                i += 1
            out.append(
                "<ol style='margin:10px 0;padding-left:24px'>"
                + "".join(f"<li style='margin:5px 0'>{inline(b)}</li>" for b in buf)
                + "</ol>"
            )
            continue

        # 分隔线
        if re.match(r"^-{3,}$", line.strip()):
            out.append('<hr style="border:0;border-top:1px solid #e5e7eb;margin:22px 0">')
            i += 1
            continue

        # 空行
        if not line.strip():
            i += 1
            continue

        # 普通段落
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(
            r"^(#{1,4}\s|\||>|\s*[-*]\s|\s*\d+\.\s|```|-{3,}$)", lines[i]
        ):
            buf.append(lines[i].strip())
            i += 1
        out.append(f'<p style="margin:10px 0">{inline(" ".join(buf))}</p>')

    return "\n".join(out)


def main():
    with open(SRC, encoding="utf-8") as fh:
        md = fh.read()

    # 把「图 N：xxx」说明行替换成真正的图片
    for anchor, num in ANCHORS:
        if anchor in md:
            md = md.replace(anchor, anchor + "\n\n@@FIG" + num + "@@")
        else:
            print(f"warn: 未找到锚点 -> {anchor}")

    # 第六节的测试结果图（图 10）插到"6.3 测试运行结果"末尾，第七节的 commit 图插到 GitHub 小节
    md = md.replace(
        "- 应用内一键运行（关于页）结果：见下方图 9。",
        "- 应用内一键运行（关于页）结果：见下方图 9。\n- 61 个用例全部通过的测试页全览（图 10）：\n\n@@FIG10@@"
    )

    body = convert(md)
    body = re.sub(r"@@FIG(\d+)@@", lambda m: figure_html(m.group(1)), body)

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>软件工程第二次结对作业 —— 校园失物招领程序实现（102401101 谢玲洁）</title>
</head>
<body style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',Arial,sans-serif;
             font-size:15px;line-height:1.8;color:#1f2328;max-width:880px;margin:0 auto;padding:28px 20px">
{body}
</body>
</html>
"""
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"written: {OUT}  ({os.path.getsize(OUT)/1024:.0f} KB)")


if __name__ == "__main__":
    main()

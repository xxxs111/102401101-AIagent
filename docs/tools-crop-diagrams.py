"""把 diagram-src/ 里的三张 HTML 图渲染成 PNG（重建流程图的第 2 步）。

整套流程：
  1) 编辑 docs/diagram-src/*.html（架构图 / 流程图 / 数据模型图的源文件）
  2) 用浏览器打开这些 html 并整屏截图，存成 docs/_raw-diagram-*.png
  3) 运行本脚本，把整屏截图裁成只有图内容的 PNG，存到 docs/screenshots/
  4) 运行 node docs/tools-build-blog-html.mjs 重建自包含博客 HTML

裁切参数按 diagram-src 里写死的容器宽度来定（图 A/B 内容宽 1000px，图 C 略宽 1060px），
改图以后如果布局宽度变了，同步改下面的 JOBS 即可。
"""
import os
from PIL import Image

DOCS = os.path.dirname(os.path.abspath(__file__))
PAD = 16  # 裁完在四周留一点白边

JOBS = [
    ("_raw-diagram-arch.png", "diagram-arch.png", (0, 0, 1000, 596)),   # 图 A 分层架构
    ("_raw-diagram-flow.png", "diagram-flow.png", (0, 0, 1000, 704)),   # 图 B 用户流程
    ("_raw-diagram-data.png", "diagram-data.png", (0, 0, 1060, 796)),   # 图 C 数据模型与状态流转
]


def trim_white(im, tol=250):
    """自动裁掉底部 / 右侧多余的空白"""
    gray = im.convert("L")
    w, h = im.size
    box = gray.point(lambda p: 0 if p >= tol else 255).getbbox()
    if not box:
        return im
    _, _, right, bottom = box
    return im.crop((0, 0, min(w, right + PAD), min(h, bottom + PAD)))


def main():
    out_dir = os.path.join(DOCS, "screenshots")
    for src, dst, box in JOBS:
        src_path = os.path.join(DOCS, src)
        if not os.path.exists(src_path):
            print(f"skip  {src}（不存在，先按注释里的步骤截图）")
            continue
        with Image.open(src_path) as im:
            cropped = trim_white(im.crop(box))
            out = os.path.join(out_dir, dst)
            cropped.save(out, optimize=True)
            print(f"{dst}: {im.size} -> {cropped.size}  ({os.path.getsize(out)/1024:.0f} KB)")


if __name__ == "__main__":
    main()

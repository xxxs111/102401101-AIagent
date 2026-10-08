"""把浏览器整页截图裁成"手机主体"区域，便于放进博客。

原图 1440 宽，.phone 容器宽 480 且水平居中，所以有效内容在 x=480..960。
裁掉左右空白后图片更清晰、体积更小，上传到博客园也不会被压缩得看不清字。
"""
import os
from PIL import Image

SRC = r"C:\Users\86173\Desktop\homework4\docs\screenshots"
LEFT, RIGHT = 470, 970   # 左右各留 10px 余量，避免切掉阴影

def main():
    for name in sorted(os.listdir(SRC)):
        if not name.lower().endswith(".png"):
            continue
        if name.startswith("diagram"):
            print(f"skip  {name}（流程图/架构图由 tools-crop-diagrams.py 处理）")
            continue
        path = os.path.join(SRC, name)
        with Image.open(path) as im:
            w, h = im.size
            if w <= RIGHT:
                print(f"skip  {name} ({w}x{h}) 已经是窄图")
                continue
            cropped = im.crop((LEFT, 0, RIGHT, h))
            cropped.save(path, optimize=True)
            print(f"crop  {name}: {w}x{h} -> {cropped.size[0]}x{cropped.size[1]}")

if __name__ == "__main__":
    main()

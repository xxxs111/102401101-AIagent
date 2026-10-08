# 按功能点分步提交，模拟真实的开发过程（首次运行前请确认仓库里没有不需要提交的文件）
# 用法：pwsh -File docs/_git_commits.ps1

$ErrorActionPreference = 'Stop'
# 直接用脚本运行时用 $PSScriptRoot 推导仓库根目录；通过 scriptblock 运行时回退到固定路径
$repo = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { 'C:\Users\86173\Desktop\homework4' }
Set-Location $repo

$GIT = 'git'

function Commit([string]$message, [string[]]$paths) {
    foreach ($p in $paths) {
        if (Test-Path -LiteralPath (Join-Path $repo $p)) {
            & $GIT add -- $p
        } else {
            Write-Host "  跳过（不存在）: $p" -ForegroundColor DarkYellow
        }
    }
    & $GIT commit -q -m $message
    if ($LASTEXITCODE -ne 0) { Write-Host "  提交失败: $message" -ForegroundColor Red; exit 1 }
    Write-Host "  ✔ $message" -ForegroundColor Green
}

Write-Host "开始分步提交..." -ForegroundColor Cyan

Commit 'chore: 初始化项目结构与 README 骨架' @('.gitignore', 'README.md')
Commit 'feat: 工具层 utils.js（HTML转义/日期/状态文案/防抖）' @('js/utils.js')
Commit 'feat: 数据层 store.js（localStorage封装、校验、增删改查、模拟数据）' @('js/store.js')
Commit 'feat: 模板层 view.js（首页/搜索/发布/详情/我的发布）' @('js/view.js')
Commit 'feat: 界面层 app.js（哈希路由、渲染调度、事件委托）' @('js/app.js')
Commit 'feat: 页面结构与全局样式（移动端优先，桌面居中手机形态）' @('index.html', 'css/style.css')
Commit 'test: 单元测试61用例（原生JS断言）+ 测试运行页' @('test/unit-test.js', 'test/test.html')
Commit 'docs: 开发文档（架构/数据模型/关键实现/踩坑清单）' @('docs/开发文档.md')
Commit 'docs: 验收走查清单、测试报告模板与博客骨架' @('docs/验收与提交指南.md')
Commit 'docs: PSP 记录' @('docs/PSP记录.md')
Commit 'docs: 博客正文（Markdown + 可直接粘贴的 HTML）' @('docs/博客正文.md', 'docs/博客正文（可直接粘贴）.html')
Commit 'docs: 效果截图' @('docs/screenshots')
Commit 'docs: 截图裁剪与博客构建脚本' @('docs/_crop_screenshots.py', 'docs/_build_blog_html.py', 'docs/_git_commits.ps1')

Write-Host ""
Write-Host "提交完成，共 $(& $GIT rev-list --count HEAD) 个 commit：" -ForegroundColor Cyan
& $GIT log --oneline

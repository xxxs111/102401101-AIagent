@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   Push "XunHui - Campus Lost and Found" to GitHub
echo   Target: https://github.com/xxxs111/102401101-AIagent
echo ==========================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Not a git repository. Run this file in the project root.
  pause
  exit /b 1
)

echo --- local commits ---
git log --oneline
echo.

echo Pushing... (a GitHub login window may pop up the first time;
echo after you sign in once, Windows remembers it.)
git -c http.sslBackend=openssl push -u origin main
if errorlevel 1 (
  echo.
  echo [FAILED] Common reasons:
  echo   1) Not signed in yet -- run this file again and sign in in the popup.
  echo   2) You typed your account password. GitHub needs a Personal Access
  echo      Token instead: https://github.com/settings/tokens  (scope: repo)
  echo   3) Network problem -- try another network or a proxy.
  pause
  exit /b 1
)

echo.
echo [OK] Pushed to https://github.com/xxxs111/102401101-AIagent
echo Refresh the repository page to see the code.
pause

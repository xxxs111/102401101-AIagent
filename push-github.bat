@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================================
echo   Push to GitHub
echo   Target: https://github.com/xxxs111/102401101-AIagent
echo ==========================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Not a git repository. Put this file in the project root.
  pause
  exit /b 1
)

echo --- commits waiting to be pushed ---
git log --oneline origin/main..HEAD
echo.

echo --- pushing ---
git -c http.sslBackend=openssl push origin main
if errorlevel 1 (
  echo.
  echo [FAILED] Check the message above. Common causes:
  echo   1) "fetch first" / "non-fast-forward"  -- remote has new commits.
  echo      Fix:  git pull --rebase origin main    then run this file again.
  echo   2) Login expired -- a GitHub window should pop up; sign in again.
  echo      GitHub wants a Personal Access Token, not your account password:
  echo      https://github.com/settings/tokens   (scope: repo)
  echo   3) Network blocked -- try another network or a proxy.
  pause
  exit /b 1
)

echo.
echo [OK] Pushed. Refresh https://github.com/xxxs111/102401101-AIagent
pause

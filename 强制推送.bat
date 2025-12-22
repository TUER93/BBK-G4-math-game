@echo off
chcp 65001 >nul
echo ========================================
echo    BBK 数学游戏 - Git 推送工具
echo ========================================
echo.
echo 当前状态：
git status
echo.
echo ========================================
echo 即将推送的提交：
git log origin/main..HEAD --oneline
echo.
echo ========================================
echo 开始推送...
echo.

git push origin main 2>&1

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 推送成功！
    echo ========================================
    echo.
    echo Render 将在 2-3 分钟后自动部署更新
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 推送失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo 1. 需要 GitHub 身份验证
    echo 2. 网络连接问题
    echo 3. Token 过期
    echo.
    echo 解决方案：
    echo - 请查看"推送指南.md"文件
    echo - 或使用 GitHub Desktop 推送
    echo.
)

pause

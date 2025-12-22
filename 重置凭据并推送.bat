@echo off
chcp 65001 >nul
echo ========================================
echo    重置 Git 凭据并推送
echo ========================================
echo.

echo 步骤 1: 清除旧凭据...
git config --global --unset credential.helper
git config --global credential.helper manager-core
echo ✅ 凭据管理器已重置

echo.
echo 步骤 2: 尝试推送...
echo ⚠️  可能会弹出 GitHub 登录窗口，请登录！
echo.

git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 推送成功！
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ❌ 仍然失败
    echo ========================================
    echo.
    echo 请尝试以下方案：
    echo.
    echo 方案 1: 使用 GitHub Desktop
    echo   - 打开 GitHub Desktop
    echo   - 点击 Push origin 按钮
    echo.
    echo 方案 2: 使用 Personal Access Token
    echo   1. 访问 https://github.com/settings/tokens
    echo   2. 生成新的 token（勾选 repo 权限）
    echo   3. 运行: git push https://YOUR_TOKEN@github.com/TUER93/BBK-G4-math-game.git main
    echo.
)

pause

@echo off
chcp 65001 >nul
echo ========================================
echo 最终推送 - 干净的Git仓库
echo ========================================

cd /d "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_new"

set PATH=%PATH%;C:\Program Files\Git\bin

echo 1. 添加所有文件...
git add .

echo 2. 创建初始提交...
git commit -m "Initial commit by PAOBAI

PAOBAI Smart Restaurant System
- Complete restaurant management solution
- QR code ordering and payment
- Kitchen display system
- Cloud printing integration
- Real-time order tracking
- All files in UTF-8 encoding
- Fixed critical bugs
- Clean Git history"

echo 3. 强制推送到GitHub（覆盖旧历史）...
git push -f origin main

echo.
echo ========================================
echo 🎉 重构完成！
echo ========================================
echo 📂 新项目目录: PAOBAIyyds_new
echo 🌐 GitHub仓库: https://github.com/PAOBAI233/PAOBAIyyds
echo ✅ 无乱码，干净的历史记录
echo ========================================
pause
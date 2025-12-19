@echo off
chcp 65001 >nul
echo Cleaning GitHub repository...

set PATH=%PATH%;C:\Program Files\Git\bin

echo 1. Go to clean directory...
cd /d "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_new"

echo 2. Configure Git encoding...
git config core.quotepath false
git config i18n.commitencoding utf-8
git config i18n.logoutputencoding utf-8
git config gui.encoding utf-8

echo 3. Add files...
git add .

echo 4. Create clean commit (English only)...
git commit -m "Fixed critical bugs by PAOBAI

Bug fixes and improvements:
- Database initialization fix
- Security configuration update  
- API validation improvements
- Error handling enhancements
- UTF-8 encoding support
- Clean Git history

Author: PAOBAI"

echo 5. Force push to overwrite bad commits...
git push -f origin main

echo.
echo ========================================
echo GitHub should now be clean!
echo ========================================
echo Check: https://github.com/PAOBAI233/PAOBAIyyds
echo ========================================
pause
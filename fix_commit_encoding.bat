@echo off
chcp 65001 >nul
echo Fixing commit encoding issues...

cd /d "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_new"

set PATH=%PATH%;C:\Program Files\Git\bin

echo 1. Reset last commit (with bad encoding)...
git reset --soft HEAD~1

echo 2. Configure Git for UTF-8...
git config --local core.quotepath false
git config --local i18n.commitencoding utf-8
git config --local i18n.logoutputencoding utf-8
git config --local gui.encoding utf-8

echo 3. Create new commit with clean English message...
git commit -m "Fixed critical bugs by PAOBAI

Bug fixes and improvements:
- Fixed database initialization missing call
- Fixed insecure JWT secret key  
- Optimized database connection configuration
- Fixed API route validation and security
- Improved frontend error handling
- Added UTF-8 encoding support
- Clean Git history without encoding issues

Details: See BUG_FIX_REPORT.md"

echo 4. Force push to clean remote history...
git push -f origin main

echo.
echo ========================================
echo Commit encoding fixed!
echo ========================================
echo Check GitHub: https://github.com/PAOBAI233/PAOBAIyyds
echo ========================================
pause
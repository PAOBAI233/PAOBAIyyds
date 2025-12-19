@echo off
echo Creating clean version without backup folders...

mkdir "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean"

xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\.env" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\" /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\package.json" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\" /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\server.js" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\" /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\database.sql" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\" /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\README.md" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\" /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\BUG_FIX_REPORT.md" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\" /Y

xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\database" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\database\" /E /I /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\routes" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\routes\" /E /I /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\services" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\services\" /E /I /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\middleware" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\middleware\" /E /I /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\utils" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\utils\" /E /I /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\public" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\public\" /E /I /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\.github" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\.github\" /E /I /Y
xcopy "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds\xpyun-opensdk-php-demo" "C:\Users\paolo\CodeBuddy\20251220002523\PAOBAIyyds_clean\xpyun-opensdk-php-demo\" /E /I /Y

echo Clean copy created!
pause
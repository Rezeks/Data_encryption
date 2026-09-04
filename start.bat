@echo off
title CryptoLab - Zapusk proekta

echo ===================================================
echo             Zapusk CryptoLab...
echo ===================================================
echo.

cd /d "%~dp0"

:: Vybor interpretatora Python (virtualnoe okruzhenie ili sistemny)
set "PY_CMD=python"
if exist "%~dp0venv\Scripts\python.exe" (
    "%~dp0venv\Scripts\python.exe" -c "import uvicorn, fastapi" >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PY_CMD=%~dp0venv\Scripts\python.exe"
    )
)

:: Proverka nalichiya Python
where %PY_CMD% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python ne nayden! Ubedites, chto Python ustanovlen i dobavlen v PATH.
    pause
    exit /b 1
)

:: Proverka zavisimostey fastapi i uvicorn
%PY_CMD% -c "import uvicorn, fastapi" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Ustanovka neobhodimyh zavisimostey (fastapi, uvicorn)...
    %PY_CMD% -m pip install -r backend\requirements.txt
)

:: Zapusk otkrytiya brauzera cherez 2 sekundy v fonovom rezhime
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000/"

echo [INFO] Server zapuskaetsya: http://localhost:8000/
echo [INFO] Brauzer otkroetsya avtomaticheski...
echo.
echo Dlya zaversheniya raboty zakroyte eto okno (ili nazhmite Ctrl+C).
echo ---------------------------------------------------

cd /d "%~dp0backend"
%PY_CMD% -m uvicorn main:app --port 8000 --reload

pause

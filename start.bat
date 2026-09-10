@echo off
title CryptoLab - Zapusk proekta

echo ===================================================
echo             Zapusk CryptoLab...
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Proverka nalichiya venv
set "PYTHON_EXE="
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
)

:: 2. Esli venv net, probuem sozdat cherez py ili python
if not defined PYTHON_EXE (
    echo [INFO] Poisk interpretatora Python...
    where py >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Sozdanie venv cherez py launcher...
        py -3 -m venv "%~dp0venv"
    ) else (
        where python >nul 2>&1
        if not errorlevel 1 (
            echo [INFO] Sozdanie venv cherez python...
            python -m venv "%~dp0venv"
        )
    )
    if exist "%~dp0venv\Scripts\python.exe" (
        set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
    )
)

:: 3. Esli venv ne udalos sozdat, ispolzuem sistemny python
if not defined PYTHON_EXE (
    where python >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=python"
    ) else (
        where py >nul 2>&1
        if not errorlevel 1 (
            set "PYTHON_EXE=py"
        )
    )
)

if not defined PYTHON_EXE (
    echo [ERROR] Python ne nayden! Ubedites, chto Python ustanovlen i dobavlen v PATH.
    pause
    exit /b 1
)

:: 4. Proverka rabotosposobnosti Python
"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ne udalos zapustit Python: %PYTHON_EXE%
    pause
    exit /b 1
)

:: 5. Proverka zavisimostey (fastapi, uvicorn)
"%PYTHON_EXE%" -c "import uvicorn, fastapi" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Ustanovka neobhodimyh zavisimostey: fastapi, uvicorn...
    "%PYTHON_EXE%" -m pip install -r "%~dp0backend\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Ne udalos ustanovit zavisimosti!
        pause
        exit /b 1
    )
)

:: 6. Zapusk brauzera cherez 2 sekundy v fonovom rezhime
start "" cmd /c "ping 127.0.0.1 -n 3 >nul & start http://localhost:8000/"

echo [INFO] Server zapuskaetsya: http://localhost:8000/
echo [INFO] Brauzer otkroetsya avtomaticheski...
echo.
echo Dlya zaversheniya raboty zakroyte eto okno (ili nazhmite Ctrl+C).
echo ---------------------------------------------------

cd /d "%~dp0backend"
"%PYTHON_EXE%" -m uvicorn main:app --port 8000 --reload

pause

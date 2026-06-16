@echo off
title Sistema VEN 911 - Iniciando...
cls

echo ==================================================
echo   CONFIGURANDO Y LANZANDO SISTEMA VEN 911
echo ==================================================

:: Verifica si node_modules existe
if exist node_modules (
    echo [OK] Dependencias detectadas.
) else (
    echo [!] Instalando dependencias por primera vez...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo en la instalacion. Verifica tu conexion a internet.
        pause
        exit /b
    )
)

echo [OK] Iniciando servidor de desarrollo...
start "" http://localhost:3000
call npm run dev
pause
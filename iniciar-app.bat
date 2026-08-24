@echo off
title Etiquetas Gondola
cd /d "%~dp0"
cls

echo.
echo  ============================================
echo    ETIQUETAS GONDOLA - Iniciando...
echo  ============================================
echo.

:: Instalar dependencias si faltan
if not exist "node_modules\" (
    echo  [1/2] Instalando dependencias por primera vez...
    echo        Esto puede demorar 2-3 minutos.
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: No se pudo instalar. Verifica que Node.js este instalado.
        pause
        exit /b
    )
)

:: Construir la app si falta el build
if not exist ".next\" (
    echo  [2/2] Construyendo la aplicacion por primera vez...
    echo        Esto puede demorar 2-3 minutos.
    echo.
    npm run build
    if errorlevel 1 (
        echo.
        echo  ERROR: No se pudo construir la aplicacion.
        pause
        exit /b
    )
)

:: Abrir el navegador con retraso
echo.
echo  Abriendo el navegador en 5 segundos...
start /b cmd /c "timeout /t 5 /nobreak > nul && start http://localhost:3000"

:: Iniciar el servidor
echo  Servidor iniciado. Cierra esta ventana para detener la app.
echo.
npm start

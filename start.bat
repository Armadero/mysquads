@echo off
echo.
echo  ╔══════════════════════════════════════╗
echo  ║          MySquads - Iniciando        ║
echo  ╚══════════════════════════════════════╝
echo.

:: Executa o seed (idempotente — seguro de rodar sempre)
echo [1/3] Inicializando banco de dados...
call npm run seed
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERRO: Falha no seed do banco de dados.
    echo  Verifique se o servidor ja esta rodando e encerre-o antes de iniciar.
    pause
    exit /b 1
)

echo.
echo [2/3] Iniciando servidor Next.js...
start cmd /k "npm run dev"

:: Aguarda o servidor subir
echo  Aguardando o servidor iniciar...
timeout /t 7 /nobreak > nul

:: Abre o navegador
echo [3/3] Abrindo navegador...
start http://localhost:3000

echo.
echo  Aplicacao iniciada em http://localhost:3000
echo.

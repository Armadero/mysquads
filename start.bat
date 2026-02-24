@echo off
echo Iniciando o Squad Management System...

:: Inicia o servidor do Next.js em uma nova janela
start cmd /k "npm run dev"

:: Aguarda alguns segundos para o servidor subir
echo Aguardando o servidor iniciar...
timeout /t 7 /nobreak > nul

:: Abre o navegador padrão
echo Abrindo o navegador...
start http://localhost:3000

echo Aplicacao iniciada com sucesso.

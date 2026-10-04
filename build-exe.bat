@echo off
setlocal enabledelayedexpansion

REM ===============================================================
REM  MySquads - Gerador do executavel Windows (mysquads.exe)
REM ===============================================================
REM
REM  Empacota a aplicacao em um unico .exe que roda em qualquer
REM  Windows x64 sem Node.js instalado.
REM
REM  Pre-requisitos (apenas na maquina que COMPILA):
REM    - Node.js 22 ou superior
REM    - npm
REM
REM  Etapas:
REM    1. Valida ambiente (Node 22+, exe nao esta em uso)
REM    2. Instala dependencias
REM    3. Build do Next.js (modo standalone)
REM    4. Copia assets estaticos para o bundle standalone
REM    5. Empacota com @yao-pkg/pkg
REM
REM  Saida: mysquads.exe na raiz do projeto
REM ===============================================================

REM UTF-8 no console para os acentos das mensagens.
chcp 65001 > nul 2>&1

REM Trabalha sempre na pasta do script, nao no diretorio atual do usuario.
pushd "%~dp0"

set "EXE_NAME=mysquads.exe"
set "PKG_BIN=node_modules\.bin\pkg.cmd"
set "TARGET=node22-win-x64"

echo.
echo ===============================================================
echo   MySquads - Gerador do Executavel Windows
echo ===============================================================
echo.

REM ---------------------------------------------------------------
REM  Etapa 1 - Validacao do ambiente
REM ---------------------------------------------------------------
echo [1/5] Verificando ambiente...

where node > nul 2>&1
if errorlevel 1 (
    echo.
    echo   ERRO: Node.js nao encontrado no PATH.
    echo   Instale o Node.js 22+ em https://nodejs.org
    goto :fail
)

REM node:sqlite (usado pelo banco) so existe a partir do Node 22.
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%v"
if !NODE_MAJOR! LSS 22 (
    echo.
    echo   ERRO: Node.js 22 ou superior e necessario.
    for /f %%v in ('node -p "process.versions.node"') do echo   Versao encontrada: %%v
    echo   O modulo node:sqlite, usado pelo banco de dados, nao existe em versoes anteriores.
    goto :fail
)
for /f %%v in ('node -p "process.versions.node"') do echo   Node.js %%v ... OK

REM Um .exe em execucao fica bloqueado pelo Windows e o pkg falha no fim
REM do processo - depois de varios minutos de build. Detectamos antes.
tasklist /fi "imagename eq %EXE_NAME%" 2>nul | find /i "%EXE_NAME%" > nul
if not errorlevel 1 (
    echo.
    echo   ERRO: %EXE_NAME% esta em execucao e nao pode ser substituido.
    echo   Feche a aplicacao ^(ou encerre o processo^) e rode novamente.
    goto :fail
)

REM Remove o binario anterior: se o pkg falhar, sobra o .exe antigo com
REM data nova e a impressao falsa de que o build deu certo.
if exist "%EXE_NAME%" (
    del /f /q "%EXE_NAME%" 2>nul
    if exist "%EXE_NAME%" (
        echo.
        echo   ERRO: nao foi possivel remover o %EXE_NAME% anterior.
        echo   Verifique se ele esta aberto em outro programa.
        goto :fail
    )
    echo   Executavel anterior removido ... OK
)
echo.

REM ---------------------------------------------------------------
REM  Etapa 2 - Dependencias
REM ---------------------------------------------------------------
echo [2/5] Instalando dependencias...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo   ERRO: falha ao instalar as dependencias.
    goto :fail
)
echo.

REM ---------------------------------------------------------------
REM  Etapa 3 - Build do Next.js
REM ---------------------------------------------------------------
echo [3/5] Compilando a aplicacao Next.js...

REM Build limpo: restos de um build anterior com outra configuracao
REM podem ser empacotados junto e gerar erros so em tempo de execucao.
if exist ".next" rmdir /s /q ".next" 2>nul

call npm run build
if errorlevel 1 (
    echo.
    echo   ERRO: falha no build do Next.js.
    echo   Corrija os erros de TypeScript / lint acima e tente de novo.
    goto :fail
)

if not exist ".next\standalone\server.js" (
    echo.
    echo   ERRO: .next\standalone\server.js nao foi gerado.
    echo   Confirme que next.config.ts mantem "output: 'standalone'".
    goto :fail
)
echo   Bundle standalone gerado ... OK
echo.

REM ---------------------------------------------------------------
REM  Etapa 4 - Assets estaticos
REM ---------------------------------------------------------------
REM O modo standalone do Next.js NAO copia public/ nem .next/static.
REM Sem esse passo o app sobe, mas sem CSS, imagens e chunks do cliente.
echo [4/5] Copiando assets para o bundle standalone...

if exist "public" (
    xcopy /E /I /Y /Q "public" ".next\standalone\public" > nul
    if errorlevel 1 (
        echo.
        echo   ERRO: falha ao copiar a pasta public.
        goto :fail
    )
    echo   public ... OK
)

if exist ".next\static" (
    xcopy /E /I /Y /Q ".next\static" ".next\standalone\.next\static" > nul
    if errorlevel 1 (
        echo.
        echo   ERRO: falha ao copiar .next\static.
        goto :fail
    )
    echo   .next\static ... OK
) else (
    echo.
    echo   ERRO: .next\static nao existe - build incompleto.
    goto :fail
)
echo.

REM ---------------------------------------------------------------
REM  Etapa 5 - Empacotamento
REM ---------------------------------------------------------------
echo [5/5] Gerando o executavel ^(pode levar alguns minutos^)...

REM Usa o binario local do @yao-pkg/pkg. "npx pkg" pode baixar da npm o
REM pacote "pkg" original, descontinuado e sem suporte ao Node 22.
if not exist "%PKG_BIN%" (
    echo.
    echo   ERRO: @yao-pkg/pkg nao encontrado em node_modules.
    echo   Rode: npm install --save-dev @yao-pkg/pkg --legacy-peer-deps
    goto :fail
)

call "%PKG_BIN%" . --targets %TARGET% --output "%EXE_NAME%"
if errorlevel 1 (
    echo.
    echo   ERRO: falha ao gerar o executavel.
    goto :fail
)

if not exist "%EXE_NAME%" (
    echo.
    echo   ERRO: o pkg terminou sem erro, mas %EXE_NAME% nao foi criado.
    goto :fail
)

REM Tamanho em MB, so para conferencia rapida do resultado.
for %%A in ("%EXE_NAME%") do set /a "SIZE_MB=%%~zA/1048576"

echo.
echo ===============================================================
echo   Build concluido com sucesso
echo ===============================================================
echo.
echo   Arquivo : %EXE_NAME%  ^(!SIZE_MB! MB^)
echo   Pasta   : %CD%
echo.
echo   Como distribuir:
echo     1. Copie o %EXE_NAME% para uma pasta VAZIA na maquina destino
echo        ^(o banco dev.db e a chave de sessao sao criados ao lado dele^)
echo     2. De um duplo clique no arquivo
echo     3. Aguarde alguns segundos ate o servidor subir
echo     4. O navegador abre sozinho em http://localhost:3000
echo.
echo   Acesso padrao:
echo     Email : admin@mysquads.com
echo     Senha : admin123
echo.
echo   Troque a senha padrao apos o primeiro acesso.
echo.
popd
endlocal
pause
exit /b 0

:fail
echo.
echo ===============================================================
echo   BUILD INTERROMPIDO
echo ===============================================================
echo.
popd
endlocal
pause
exit /b 1

# MySquads — Building a Windows Executable

Este documento explica como transformar o projeto MySquads em um único arquivo `.exe` que pode ser executado em qualquer máquina Windows sem precisar instalar Node.js ou qualquer dependência.

---

## 📋 Pré-requisitos

Você precisa ter **Node.js 22+** instalado na máquina onde vai compilar o executável.

- ✅ Node.js 22+ (para compilação)
- ✅ npm (instalado junto com Node.js)

**A máquina onde vai USAR o executável não precisa de nada instalado.**

---

## 🚀 Como Gerar o Executável

### Opção 1: Usar o Script Automático (Recomendado)

Simplesmente execute o arquivo `build-exe.bat` na pasta do projeto:

```bash
build-exe.bat
```

Ele fará automaticamente:
1. Instalar dependências
2. Fazer build do Next.js
3. Gerar o `mysquads.exe`

### Opção 2: Passos Manuais

Se preferir fazer passo a passo:

```bash
# 1. Instalar dependências
npm install

# 2. Build do Next.js
npm run build

# 3. Criar o executável
npm run build:exe
```

---

## ⏱️ Tempo de Geração

- **Primeira vez:** 5-10 minutos (instala dependências)
- **Compilações seguintes:** 2-3 minutos

O executável final terá **~250-300 MB** de tamanho.

---

## 📦 Distribuindo o Executável

### Para Usar em Outra Máquina:

1. **Copie o arquivo `mysquads.exe`** para a máquina Windows destino
2. **Crie uma pasta vazia** para o aplicativo (ex: `C:\Programas\mysquads`)
3. **Coloque o `mysquads.exe`** dentro dessa pasta
4. **Duplo-clique no `mysquads.exe`** para executar

### O Que Acontece:

- ✅ Servidor inicia automaticamente na porta 3000
- ✅ Banco de dados SQLite é criado automaticamente na pasta do .exe
- ✅ Seu navegador abre em `http://localhost:3000`
- ✅ Login padrão: `admin@mysquads.com` / `admin123`

---

## 🔑 Login Padrão

```
Email : admin@mysquads.com
Senha : admin123
```

---

## 📂 Estrutura do Executável

O `.exe` contém:
- ✅ Node.js 22 (runtime)
- ✅ Código da aplicação Next.js
- ✅ Todas as dependências necessárias
- ✅ Banco de dados SQLite (criado na primeira execução)
- ✅ Seed script para inicializar dados

**Nada mais é necessário para rodar.**

---

## 🐛 Solução de Problemas

### O executável não inicia

**Causa:** Windows Defender pode bloquear executáveis desconhecidos.

**Solução:**
1. Clique em "Mais informações"
2. Clique em "Executar mesmo assim"

Você pode também adicionar uma exceção no Windows Defender.

### Erro: "Porta 3000 já está em uso"

**Causa:** Outro aplicativo já está usando a porta 3000.

**Solução:** Feche o outro aplicativo ou modifique a porta no código.

### Banco de dados corrompido

**Solução:** Delete o arquivo `dev.db` que fica na mesma pasta do `.exe`. Será criado novo na próxima execução.

---

## 🔄 Atualizando o Executável

Para atualizar o `.exe` após mudanças no código:

1. Faça as alterações necessárias
2. Execute `build-exe.bat` novamente
3. O novo `mysquads.exe` substituirá o anterior

---

## 📊 Informações Técnicas

- **Ferramenta:** pkg (https://github.com/vercel/pkg)
- **Runtime:** Node.js 22
- **Arquitetura:** x64 (Windows)
- **Modo Next.js:** Standalone (otimizado)
- **Banco de dados:** SQLite (embutido)

---

## ✨ Benefícios

✅ **Portável:** Um único arquivo, sem instalação  
✅ **Rápido:** Execução direta, sem overhead  
✅ **Seguro:** Contém versão específica de todas as dependências  
✅ **Offline:** Funciona sem internet após execução inicial  
✅ **Confiável:** Banco de dados local (SQLite)

---

## 🎯 Resumo

| Ação | Comando |
|------|---------|
| Gerar .exe | `build-exe.bat` ou `npm run build:exe` |
| Usar em outra máquina | Copiar `mysquads.exe` e executar |
| Atualizar após mudanças | Gerar `.exe` novamente |
| Login padrão | `admin@mysquads.com` / `admin123` |


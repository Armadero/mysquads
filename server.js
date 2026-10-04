#!/usr/bin/env node

/**
 * MySquads Windows Executable Entry Point
 *
 * When running via pkg, __dirname points to a virtual snapshot path (C:\snapshot\...)
 * which is read-only. The real .exe location is at process.execPath.
 *
 * We split file locations:
 *   • App code (read-only)  → __dirname inside snapshot
 *   • Writable data (db)    → directory where the .exe lives
 */

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

process.env.NODE_ENV = "production";

// Detect if we're running inside a pkg snapshot
const isPkg = typeof process.pkg !== "undefined";

// pkg's virtual FS rejects chdir into C:\snapshot\... paths.
// Next.js standalone's server.js calls process.chdir(__dirname), so we neutralize
// chdir when running packaged. The virtual FS in pkg resolves requires correctly
// without needing the cwd to match.
if (isPkg) {
  const _origChdir = process.chdir.bind(process);
  process.chdir = (dir) => {
    try {
      _origChdir(dir);
    } catch {
      // Ignore chdir failures into snapshot paths (expected under pkg)
    }
  };

  // pkg's compact Node binary ships without the `inspector` module.
  // Next.js / React server machinery calls require("inspector") during startup,
  // so we shim it with a no-op implementation to prevent ERR_INSPECTOR_NOT_AVAILABLE.
  const Module = require("module");
  const _origLoad = Module._load;
  const inspectorShim = {
    open: () => {},
    close: () => {},
    url: () => undefined,
    waitForDebugger: () => {},
    Session: class {
      connect() {}
      disconnect() {}
      post() {}
      on() {}
    },
    console: {},
  };
  Module._load = function (request, parent, isMain) {
    if (request === "inspector" || request === "node:inspector") {
      return inspectorShim;
    }
    return _origLoad.apply(this, arguments);
  };
}

// Writable directory = where the .exe or script actually lives on disk
const writableDir = isPkg ? path.dirname(process.execPath) : __dirname;

// App code directory = inside snapshot when packaged, __dirname otherwise
const appDir = __dirname;

// Point the SQLite database to the writable directory (next to the .exe)
process.env.DATABASE_PATH = path.join(writableDir, "dev.db");

/**
 * AUTH_SECRET
 *
 * Rodando empacotado, NODE_ENV=production e o Next standalone não consegue ler
 * o `.env` do projeto (ele vive dentro do snapshot read-only C:\snapshot\...).
 * Sem AUTH_SECRET, o login quebra com:
 *   "AUTH_SECRET environment variable is required in production"
 *
 * Como o .exe é distribuído para rodar localmente, geramos e PERSISTIMOS um
 * segredo aleatório em `mysquads-secret.key`, ao lado do .exe. Persistir é
 * essencial: um segredo novo a cada boot invalidaria todas as sessões ativas.
 *
 * Precedência: variável de ambiente > .env ao lado do .exe > arquivo gerado.
 */
function resolveAuthSecret() {
  const MIN_LEN = 32;

  // 1) Já veio do ambiente (ex.: definido pelo usuário ou por um serviço)
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= MIN_LEN) {
    return { secret: process.env.AUTH_SECRET, origin: "variável de ambiente" };
  }

  // 2) Arquivo .env colocado manualmente ao lado do .exe
  const envFile = path.join(writableDir, ".env");
  if (fs.existsSync(envFile)) {
    try {
      const match = fs
        .readFileSync(envFile, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => line.match(/^AUTH_SECRET\s*=\s*(.*)$/))
        .find(Boolean);

      if (match) {
        const value = match[1].trim().replace(/^["']|["']$/g, "");
        if (value.length >= MIN_LEN) {
          return { secret: value, origin: ".env ao lado do executável" };
        }
      }
    } catch {
      // arquivo ilegível — segue para o próximo passo
    }
  }

  // 3) Segredo gerado e persistido ao lado do .exe
  const keyFile = path.join(writableDir, "mysquads-secret.key");
  try {
    if (fs.existsSync(keyFile)) {
      const saved = fs.readFileSync(keyFile, "utf8").trim();
      if (saved.length >= MIN_LEN) {
        return { secret: saved, origin: "mysquads-secret.key" };
      }
    }

    const generated = require("crypto").randomBytes(48).toString("hex");
    fs.writeFileSync(keyFile, generated, { encoding: "utf8", mode: 0o600 });
    return { secret: generated, origin: "mysquads-secret.key (novo)" };
  } catch (err) {
    // Último recurso: sem disco gravável, mantém o app de pé nesta execução.
    // As sessões caem no próximo restart, mas o login funciona.
    console.warn(`⚠️  Não foi possível persistir o segredo de sessão: ${err.message}`);
    return {
      secret: require("crypto").randomBytes(48).toString("hex"),
      origin: "temporário (não persistido)",
    };
  }
}

const auth = resolveAuthSecret();
process.env.AUTH_SECRET = auth.secret;

console.clear();
console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║                   MySquads — Iniciando...                    ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log();
console.log(`📁 Banco de dados: ${process.env.DATABASE_PATH}`);
console.log(`🔐 Segredo de sessão: ${auth.origin}`);
console.log();

// Path to the Next.js standalone server (inside the snapshot when packaged)
const nextServerPath = path.join(appDir, ".next", "standalone", "server.js");

if (!fs.existsSync(nextServerPath)) {
  console.error("❌ ERRO: .next/standalone/server.js não encontrado!");
  console.error(`   Esperado em: ${nextServerPath}`);
  console.error("   Execute 'npm run build' antes de gerar o .exe");
  console.error();
  console.error("   Aguardando 10 segundos antes de fechar...");
  setTimeout(() => process.exit(1), 10000);
  return;
}

// Initialize DB with seed (idempotent)
console.log("🌱 Inicializando banco de dados...");
try {
  const seedScript = path.join(appDir, "scripts", "seed.js");
  if (fs.existsSync(seedScript)) {
    require(seedScript);
  }
} catch (err) {
  console.warn("⚠️  Aviso ao inicializar seed:", err.message);
}

// Wait a bit for seed to finish its async work
setTimeout(() => {
  console.log();
  console.log("🚀 Iniciando servidor Next.js...");
  console.log();

  // Load and run the Next.js standalone server
  // The server.js inside standalone expects process.cwd() to be the standalone dir
  // but we can't chdir into the snapshot. Next.js standalone reads from relative
  // paths; pkg's virtual FS handles require() transparently so it works.
  try {
    require(nextServerPath);
  } catch (err) {
    console.error("❌ Erro ao iniciar servidor:", err);
    setTimeout(() => process.exit(1), 10000);
    return;
  }

  // After server starts, show info and open browser
  setTimeout(() => {
    console.log();
    console.log("✅ Servidor iniciado com sucesso!");
    console.log();
    console.log("📱 Aplicação disponível em: http://localhost:3000");
    console.log();
    console.log("🔑 Login padrão:");
    console.log("   Email : admin@mysquads.com");
    console.log("   Senha : admin123");
    console.log();
    console.log("─".repeat(62));
    console.log();

    try {
      const url = "http://localhost:3000";
      if (process.platform === "win32") {
        spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
      } else if (process.platform === "darwin") {
        spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
      } else {
        spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
      }
      console.log("🌐 Abrindo navegador...");
    } catch (err) {
      console.warn("⚠️  Não foi possível abrir o navegador automaticamente.");
      console.log("   Acesse manualmente: http://localhost:3000");
    }
  }, 2500);
}, 1000);

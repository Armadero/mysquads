import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build artifacts / generated files
    ".next/types/**",
    "dev.db",
    "mysquads.exe",
    // Pure Node scripts – CommonJS, not part of the Next.js TS app
    "server.js",
    "scripts/**/*.js",
  ]),
  // Pragmatic adjustments:
  //   • `any` is widespread in the existing UI layer; keep it as a warning
  //     instead of an error so `npm run build` doesn't fail while we migrate
  //     to stronger types.
  //   • `react-hooks/set-state-in-effect` vem do conjunto de regras do React
  //     Compiler (eslint-plugin-react-hooks v7, trazido pelo eslint-config-next
  //     16). O projeto roda Next 15 sem o React Compiler habilitado, e a regra
  //     marca o padrão "busca dados no mount" usado em todas as telas
  //     (`useEffect(() => { fetchX() }, [...])`, onde fetchX faz
  //     `setLoading(true)` antes do await). Mantido como aviso: continua
  //     visível para uma futura migração, sem quebrar o build.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;

# MySquads — Seed do Banco de Dados

O script `scripts/seed.js` gerencia a inicialização e o reset do banco SQLite local (`dev.db`).

> **Importante:** o servidor Next.js deve estar **parado** antes de executar qualquer comando de seed, pois o SQLite não permite duas conexões simultâneas com escrita.

---

## Comandos disponíveis

### 1. Seed padrão (idempotente)
```bash
npm run seed
```
**O que faz:**
- Cria as tabelas se não existirem (`CREATE TABLE IF NOT EXISTS`)
- Cria o coordenador padrão se não houver nenhum cadastrado
- Insere os cargos padrão para cada coordenador que ainda não os possui
- Não apaga nenhum dado existente — seguro de rodar várias vezes

---

### 2. Truncate — apaga todos os dados
```bash
npm run seed:truncate
```
**O que faz:**
- Apaga **todos os registros** de todas as tabelas (DELETE)
- Mantém a estrutura das tabelas intacta
- Reinicia os auto-incrementos (IDs voltam para 1)
- Reinsere os registros padrão (coordenador + cargos)

**Quando usar:** quando quiser limpar o banco para um ambiente limpo sem perder o schema.

---

### 3. Reset completo — recria tudo do zero
```bash
npm run seed:reset
```
**O que faz:**
- Dropa **todas as tabelas** (`DROP TABLE IF EXISTS`) na ordem correta (FK-safe)
- Recria todas as tabelas com o schema atual
- Reinsere os registros padrão (coordenador + cargos)

**Quando usar:** após mudanças de schema (adição/remoção de colunas) ou para garantir que o banco está 100% sincronizado com o código.

---

## Execução direta com Node

Também é possível passar as flags diretamente:

```bash
node scripts/seed.js               # padrão
node scripts/seed.js --truncate    # apaga dados
node scripts/seed.js --reset       # recria tabelas
node scripts/seed.js --seed-only   # só insere registros (sem tocar no schema)
node scripts/seed.js --help        # exibe ajuda
```

---

## Registros padrão inseridos

### Coordenador padrão
| Campo  | Valor                  |
|--------|------------------------|
| Email  | admin@mysquads.com     |
| Senha  | admin123               |
| Tipo   | COORDINATOR            |

> Criado apenas se não existir nenhum coordenador no banco.

### Cargos padrão
| Cargo          | Enum             | Ordem | Qtd/Squad | Máx. Squads | Múltiplos Squads | Cor     |
|----------------|------------------|-------|-----------|-------------|------------------|---------|
| Scrum Master   | SCRUM_MASTER     | 1     | 1         | 2           | Sim              | #7C3AED |
| Analista Sist. | SYSTEM_ANALYST   | 2     | 1         | 2           | Sim              | #2563EB |
| Desenvolvedor  | DEVELOPER        | 3     | 1         | 1           | Não              | #16A34A |
| Analista Teste | QA_ANALYST       | 4     | 1         | 2           | Sim              | #EA580C |

> Os cargos são inseridos para **todos os coordenadores** existentes que ainda não possuem aquele cargo.

---

## Tabelas do banco

| Tabela                        | Descrição                              |
|-------------------------------|----------------------------------------|
| `User`                        | Coordenadores e Gerentes               |
| `Role`                        | Cargos por coordenador                 |
| `Collaborator`                | Colaboradores                          |
| `Squad`                       | Squads                                 |
| `SquadCollaborator`           | Relação Squad ↔ Colaborador            |
| `IntegrationEvent`            | Eventos de integração                  |
| `IntegrationEventCollaborator`| Relação Evento ↔ Colaborador           |
| `TimeBankEntry`               | Entradas de banco de horas             |
| `Feedback`                    | Feedbacks                              |
| `ManagerCoordinatorLink`      | Vínculo Gerente ↔ Coordenador          |

---

## Fluxo de inicialização (start.bat)

O `start.bat` executa o seed automaticamente antes de subir o servidor:

```
1. npm run seed    →  inicializa banco + registros padrão
2. npm run dev     →  inicia o servidor Next.js
3. Abre o browser  →  http://localhost:3000
```

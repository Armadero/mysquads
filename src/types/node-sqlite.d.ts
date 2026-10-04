/**
 * Type declarations for Node.js 22+ built-in SQLite module (node:sqlite)
 * https://nodejs.org/api/sqlite.html
 */
declare module "node:sqlite" {
  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
  }

  export interface StatementResultingChanges {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export type SQLiteValue =
    | null
    | number
    | bigint
    | string
    | Uint8Array;

  export class StatementSync {
    all(...params: SQLiteValue[]): Record<string, SQLiteValue>[];
    get(...params: SQLiteValue[]): Record<string, SQLiteValue> | undefined;
    run(...params: SQLiteValue[]): StatementResultingChanges;
    iterate(...params: SQLiteValue[]): Iterator<Record<string, SQLiteValue>>;
    readonly sourceSQL: string;
    readonly expandedSQL: string;
    setReadBigInts(enabled: boolean): void;
    setAllowBareNamedParameters(enabled: boolean): void;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    open(options?: DatabaseSyncOptions): void;
    loadExtension(path: string, entryPoint?: string): void;
  }
}

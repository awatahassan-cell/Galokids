/**
 * Runs the till's real offline code against a real SQLite database.
 *
 * expo-sqlite and expo-crypto cannot load outside a phone, so they are stood
 * in for here — but `database.ts`, `catalogue.ts`, `outbox.ts` and `sync.ts`
 * are the shipped files, imported directly and unmodified. The SQL, the
 * transactions, the three push outcomes and the sync ordering are the ones
 * that will run on the till.
 *
 * The shared state hangs off globalThis rather than module scope. The test
 * file is ESM and the app's files resolve as CommonJS, so this module is
 * instantiated twice; without a single anchor the test would arm one copy
 * while the app code called the other, and every push would look like a
 * network failure.
 */
import { DatabaseSync } from 'node:sqlite';

/* ---------------------------------------------------- the stand-ins --- */

class FakeSQLiteDatabase {
  constructor(private readonly handle: DatabaseSync) {}

  async execAsync(sql: string): Promise<void> {
    this.handle.exec(sql);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<void> {
    this.handle.prepare(sql).run(...(params as never[]));
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    return (this.handle.prepare(sql).get(...(params as never[])) as T) ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.handle.prepare(sql).all(...(params as never[])) as T[];
  }

  async withTransactionAsync(work: () => Promise<void>): Promise<void> {
    this.handle.exec('BEGIN');
    try {
      await work();
      this.handle.exec('COMMIT');
    } catch (error) {
      this.handle.exec('ROLLBACK');
      throw error;
    }
  }
}

interface Shared {
  /** One database for the whole run, however many times this module loads. */
  db: FakeSQLiteDatabase | null;
  uuidCounter: number;
  apiCalls: { body: unknown }[];
  behaviour: () => Promise<unknown>;
  ApiError: typeof ApiErrorStub;
}

class ApiErrorStub extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string[]>,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isOffline(): boolean {
    return this.status === 0;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

const KEY = '__galokidsPosTestHarness__';

function shared(): Shared {
  const host = globalThis as unknown as Record<string, Shared | undefined>;

  if (!host[KEY]) {
    host[KEY] = {
      db: null,
      uuidCounter: 0,
      apiCalls: [],
      behaviour: async () => {
        throw new Error('no behaviour set');
      },
      // One class object, so `instanceof` holds across both instantiations.
      ApiError: ApiErrorStub,
    };
  }

  return host[KEY]!;
}

export const sqliteStub = {
  openDatabaseAsync: async () => {
    const state = shared();
    if (!state.db) state.db = new FakeSQLiteDatabase(new DatabaseSync(':memory:'));
    return state.db;
  },
};

export const cryptoStub = {
  randomUUID: () => {
    const state = shared();
    state.uuidCounter += 1;
    return `uuid-${String(state.uuidCounter).padStart(4, '0')}`;
  },
};

/* --------------------------------------------- the API, as we script it --- */

export const apiCalls = {
  get list(): { body: unknown }[] {
    return shared().apiCalls;
  },
  get length(): number {
    return shared().apiCalls.length;
  },
  at(index: number): { body: unknown } | undefined {
    return shared().apiCalls[index];
  },
  reset(): void {
    shared().apiCalls.length = 0;
  },
};

export function whenCreatingOrder(next: () => Promise<unknown>): void {
  shared().behaviour = next;
}

export const coreStub = {
  get ApiError() {
    return shared().ApiError;
  },
  orders: {
    create: async (body: unknown) => {
      const state = shared();
      state.apiCalls.push({ body });
      return state.behaviour();
    },
  },
  catalogue: {
    products: async () => ({ data: [], last_page: 1 }),
    productsChangedSince: async () => ({ data: [], last_page: 1 }),
  },
};

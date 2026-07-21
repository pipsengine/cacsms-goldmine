import sql from "mssql";

type GlobalSqlState = typeof globalThis & {
  __goldmineSqlPoolPromise?: Promise<sql.ConnectionPool>;
};

const globalSqlState = globalThis as GlobalSqlState;
const connectionTimeout = readTimeout("DB_CONNECTION_TIMEOUT_MS", 5000);
const requestTimeout = readTimeout("DB_REQUEST_TIMEOUT_MS", 10000);

export function isDatabaseConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER);
}

export async function getSqlPool() {
  if (!isDatabaseConfigured()) {
    throw new Error("MSSQL connection is not configured. Expected DB_HOST, DB_NAME, and DB_USER.");
  }

  if (!globalSqlState.__goldmineSqlPoolPromise) {
    const pool = new sql.ConnectionPool({
      server: process.env.DB_HOST!,
      port: Number(process.env.DB_PORT ?? 1433),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD ?? "",
      connectionTimeout,
      requestTimeout,
      options: {
        encrypt: (process.env.DB_ENCRYPT ?? "true") !== "false",
        trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE ?? "true") !== "false",
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    });

    globalSqlState.__goldmineSqlPoolPromise = pool.connect().catch((error: unknown) => {
      globalSqlState.__goldmineSqlPoolPromise = undefined;
      throw error;
    });
  }

  return globalSqlState.__goldmineSqlPoolPromise;
}

function readTimeout(name: string, fallback: number) {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

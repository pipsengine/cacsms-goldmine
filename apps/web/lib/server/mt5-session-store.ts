import { randomUUID } from "node:crypto";
import sql from "mssql";
import { getMt5TerminalId } from "@/lib/server/mt5-local-bridge";
import { getSqlPool, isDatabaseConfigured } from "@/lib/server/mssql";
import { decryptSecret, encryptSecret } from "@/lib/server/secret-crypto";
import type { Mt5SessionProfileCreate, Mt5SessionProfileSummary } from "@/types/connectivity";

type Mt5SessionProfileSecret = Mt5SessionProfileSummary & {
  password: string;
};

type MemoryStore = {
  profiles: Mt5SessionProfileSecret[];
  activeSessionId: string | null;
};

type Mt5SessionRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  terminal_id: string;
  label: string;
  terminal_path: string | null;
  login: string | null;
  server_name: string | null;
  account_type: "Demo" | "Live" | "Prop Firm";
  encrypted_password: string;
  is_active: boolean;
  updated_at: string | Date;
};

const globalSessionStore = globalThis as typeof globalThis & {
  __mt5SessionStore?: MemoryStore;
  __mt5SessionSchemaReady?: Promise<void>;
};

const store =
  globalSessionStore.__mt5SessionStore ??
  {
    profiles: [],
    activeSessionId: null,
  };

globalSessionStore.__mt5SessionStore = store;

export async function listMt5SessionProfiles() {
  if (!isDatabaseConfigured()) return memoryState();

  try {
    await ensureSchema();
    const pool = await getSqlPool();
    const result = await pool.request().query(`
      SELECT
        id,
        tenant_id,
        user_id,
        terminal_id,
        label,
        terminal_path,
        login,
        server_name,
        account_type,
        encrypted_password,
        is_active,
        updated_at
      FROM dbo.mt5_session_profiles
      ORDER BY updated_at DESC
    `);

    const profiles = result.recordset.map((row: Mt5SessionRow) => fromDbRow(row));
    const active = profiles.find((profile: Mt5SessionProfileSecret) => profile.active) ?? null;

    return {
      profiles: profiles.map(toSummary),
      activeSessionId: active?.id ?? null,
      storageMode: "mssql" as const,
    };
  } catch (error) {
    logDatabaseFallback("list profiles", error);
    return memoryState();
  }
}

export async function getActiveMt5SessionProfile() {
  if (!isDatabaseConfigured()) return memoryActiveProfile();

  try {
    await ensureSchema();
    const pool = await getSqlPool();
    const result = await pool.request().query(`
      SELECT TOP 1
        id,
        tenant_id,
        user_id,
        terminal_id,
        label,
        terminal_path,
        login,
        server_name,
        account_type,
        encrypted_password,
        is_active,
        updated_at
      FROM dbo.mt5_session_profiles
      WHERE is_active = 1
      ORDER BY updated_at DESC
    `);

    return result.recordset[0] ? fromDbRow(result.recordset[0]) : null;
  } catch (error) {
    logDatabaseFallback("get active profile", error);
    return memoryActiveProfile();
  }
}

export async function upsertMt5SessionProfile(input: Mt5SessionProfileCreate) {
  if (!isDatabaseConfigured()) return upsertInMemory(input);

  try {
    await ensureSchema();
    const pool = await getSqlPool();
    const tenantId = input.tenantId.trim();
    const userId = input.userId.trim();
    const terminalId = input.terminalId.trim();
    const label = input.label.trim();
    const terminalPath = input.terminalPath?.trim() || null;
    const login = input.login?.trim() || null;
    const server = input.server?.trim() || null;
    const accountType = input.accountType;
    const encryptedPassword = encryptSecret(input.password.trim());

    const existing = await pool
      .request()
      .input("tenantId", sql.NVarChar(120), tenantId)
      .input("userId", sql.NVarChar(120), userId)
      .input("terminalId", sql.NVarChar(120), terminalId)
      .input("login", sql.NVarChar(64), login)
      .input("server", sql.NVarChar(160), server)
      .query(`
        SELECT TOP 1 id
        FROM dbo.mt5_session_profiles
        WHERE tenant_id = @tenantId
          AND user_id = @userId
          AND terminal_id = @terminalId
          AND ((login = @login) OR (login IS NULL AND @login IS NULL))
          AND ((server_name = @server) OR (server_name IS NULL AND @server IS NULL))
      `);

    const profileId = existing.recordset[0]?.id ?? randomUUID();

    if (input.activate) {
      await pool.request().query(`UPDATE dbo.mt5_session_profiles SET is_active = 0`);
    }

    const request = pool
      .request()
      .input("id", sql.UniqueIdentifier, profileId)
      .input("tenantId", sql.NVarChar(120), tenantId)
      .input("userId", sql.NVarChar(120), userId)
      .input("terminalId", sql.NVarChar(120), terminalId)
      .input("label", sql.NVarChar(200), label)
      .input("terminalPath", sql.NVarChar(500), terminalPath)
      .input("login", sql.NVarChar(64), login)
      .input("server", sql.NVarChar(160), server)
      .input("accountType", sql.NVarChar(40), accountType)
      .input("encryptedPassword", sql.NVarChar(sql.MAX), encryptedPassword)
      .input("isActive", sql.Bit, input.activate);

    if (existing.recordset[0]) {
      await request.query(`
        UPDATE dbo.mt5_session_profiles
        SET
          tenant_id = @tenantId,
          user_id = @userId,
          terminal_id = @terminalId,
          label = @label,
          terminal_path = @terminalPath,
          login = @login,
          server_name = @server,
          account_type = @accountType,
          encrypted_password = @encryptedPassword,
          is_active = @isActive,
          updated_at = SYSUTCDATETIME()
        WHERE id = @id
      `);
    } else {
      await request.query(`
        INSERT INTO dbo.mt5_session_profiles
          (id, tenant_id, user_id, terminal_id, label, terminal_path, login, server_name, account_type, encrypted_password, is_active, updated_at)
        VALUES
          (@id, @tenantId, @userId, @terminalId, @label, @terminalPath, @login, @server, @accountType, @encryptedPassword, @isActive, SYSUTCDATETIME())
      `);
    }

    return listMt5SessionProfiles();
  } catch (error) {
    logDatabaseFallback("save profile", error);
    return upsertInMemory(input);
  }
}

export async function setActiveMt5SessionProfile(profileId: string) {
  if (!isDatabaseConfigured()) {
    store.activeSessionId = profileId;
    syncActiveFlags();
    return listMt5SessionProfiles();
  }

  try {
    await ensureSchema();
    const pool = await getSqlPool();
    await pool.request().query(`UPDATE dbo.mt5_session_profiles SET is_active = 0`);
    await pool.request().input("profileId", sql.UniqueIdentifier, profileId).query(`
      UPDATE dbo.mt5_session_profiles
      SET is_active = 1, updated_at = SYSUTCDATETIME()
      WHERE id = @profileId
    `);
    return listMt5SessionProfiles();
  } catch (error) {
    logDatabaseFallback("activate profile", error);
    store.activeSessionId = profileId;
    syncActiveFlags();
    return memoryState();
  }
}

export async function deleteMt5SessionProfile(profileId: string) {
  if (!isDatabaseConfigured()) {
    store.profiles = store.profiles.filter((profile) => profile.id !== profileId);
    if (store.activeSessionId === profileId) {
      store.activeSessionId = null;
      syncActiveFlags();
    }
    return memoryState();
  }

  try {
    await ensureSchema();
    const pool = await getSqlPool();
    await pool.request().input("profileId", sql.UniqueIdentifier, profileId).query(`
      DELETE FROM dbo.mt5_session_profiles
      WHERE id = @profileId
    `);
    return listMt5SessionProfiles();
  } catch (error) {
    logDatabaseFallback("delete profile", error);
    store.profiles = store.profiles.filter((profile) => profile.id !== profileId);
    if (store.activeSessionId === profileId) {
      store.activeSessionId = null;
      syncActiveFlags();
    }
    return memoryState();
  }
}

function syncActiveFlags() {
  store.profiles = store.profiles.map((profile) => ({
    ...profile,
    active: profile.id === store.activeSessionId,
  }));
}

function toSummary(profile: Mt5SessionProfileSecret): Mt5SessionProfileSummary {
  return {
    id: profile.id,
    tenantId: profile.tenantId,
    userId: profile.userId,
    terminalId: profile.terminalId || getMt5TerminalId(profile.terminalPath ?? profile.id),
    label: profile.label,
    terminalPath: profile.terminalPath,
    login: profile.login,
    server: profile.server,
    accountType: profile.accountType ?? "Demo",
    hasPassword: profile.hasPassword,
    active: profile.active,
    lastUpdatedAt: profile.lastUpdatedAt,
  };
}

async function ensureSchema() {
  if (!globalSessionStore.__mt5SessionSchemaReady) {
    globalSessionStore.__mt5SessionSchemaReady = (async () => {
      const pool = await getSqlPool();
      await pool.request().query(`
        IF OBJECT_ID(N'dbo.mt5_session_profiles', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.mt5_session_profiles (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
            tenant_id NVARCHAR(120) NOT NULL,
            user_id NVARCHAR(120) NOT NULL,
            terminal_id NVARCHAR(120) NOT NULL,
            label NVARCHAR(200) NOT NULL,
            terminal_path NVARCHAR(500) NULL,
            login NVARCHAR(64) NULL,
            server_name NVARCHAR(160) NULL,
            account_type NVARCHAR(40) NOT NULL CONSTRAINT DF_mt5_session_profiles_account_type DEFAULT('Demo'),
            encrypted_password NVARCHAR(MAX) NOT NULL,
            is_active BIT NOT NULL CONSTRAINT DF_mt5_session_profiles_is_active DEFAULT(0),
            updated_at DATETIMEOFFSET NOT NULL
          );

          CREATE INDEX IX_mt5_session_profiles_tenant_user ON dbo.mt5_session_profiles (tenant_id, user_id, updated_at DESC);
        END

        IF COL_LENGTH('dbo.mt5_session_profiles', 'terminal_id') IS NULL
        BEGIN
          ALTER TABLE dbo.mt5_session_profiles ADD terminal_id NVARCHAR(120) NULL;
          EXEC(N'
            UPDATE dbo.mt5_session_profiles
            SET terminal_id = ISNULL(terminal_id, CONCAT(''terminal-'', ABS(CHECKSUM(ISNULL(terminal_path, id)))))
            WHERE terminal_id IS NULL;
          ');
          EXEC(N'ALTER TABLE dbo.mt5_session_profiles ALTER COLUMN terminal_id NVARCHAR(120) NOT NULL;');
        END

        IF COL_LENGTH('dbo.mt5_session_profiles', 'account_type') IS NULL
        BEGIN
          ALTER TABLE dbo.mt5_session_profiles ADD account_type NVARCHAR(40) NOT NULL CONSTRAINT DF_mt5_session_profiles_account_type_upgrade DEFAULT('Demo');
        END
      `);
    })().catch((error) => {
      globalSessionStore.__mt5SessionSchemaReady = undefined;
      throw error;
    });
  }

  await globalSessionStore.__mt5SessionSchemaReady;
}

function fromDbRow(row: Mt5SessionRow): Mt5SessionProfileSecret {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    terminalId: row.terminal_id || getMt5TerminalId(row.terminal_path ?? row.id),
    label: row.label,
    terminalPath: row.terminal_path,
    login: row.login,
    server: row.server_name,
    accountType: row.account_type ?? "Demo",
    hasPassword: Boolean(row.encrypted_password),
    password: decryptSecret(row.encrypted_password),
    active: Boolean(row.is_active),
    lastUpdatedAt: new Date(row.updated_at).toISOString(),
  };
}

function upsertInMemory(input: Mt5SessionProfileCreate) {
  const now = new Date().toISOString();
  const existingIndex = store.profiles.findIndex(
    (profile) =>
      profile.tenantId.trim().toLowerCase() === input.tenantId.trim().toLowerCase() &&
      profile.userId.trim().toLowerCase() === input.userId.trim().toLowerCase() &&
      profile.terminalId.trim().toLowerCase() === input.terminalId.trim().toLowerCase() &&
      profile.login === (input.login?.trim() || null) &&
      profile.server === (input.server?.trim() || null),
  );

  const nextProfile: Mt5SessionProfileSecret = {
    id: existingIndex >= 0 ? store.profiles[existingIndex].id : randomUUID(),
    tenantId: input.tenantId.trim(),
    userId: input.userId.trim(),
    terminalId: input.terminalId.trim() || getMt5TerminalId(input.terminalPath?.trim() || randomUUID()),
    label: input.label.trim(),
    terminalPath: input.terminalPath?.trim() || null,
    login: input.login?.trim() || null,
    server: input.server?.trim() || null,
    accountType: input.accountType ?? "Demo",
    hasPassword: Boolean(input.password.trim()),
    password: input.password.trim(),
    active: Boolean(input.activate),
    lastUpdatedAt: now,
  };

  if (existingIndex >= 0) {
    store.profiles[existingIndex] = nextProfile;
  } else {
    store.profiles.unshift(nextProfile);
  }

  if (input.activate) {
    store.activeSessionId = nextProfile.id;
  }

  syncActiveFlags();

  return {
    profiles: store.profiles.map(toSummary),
    activeSessionId: store.activeSessionId,
    storageMode: "memory" as const,
  };
}

function memoryState() {
  return {
    profiles: store.profiles.map(toSummary),
    activeSessionId: store.activeSessionId,
    storageMode: "memory" as const,
  };
}

function memoryActiveProfile() {
  if (!store.activeSessionId) return null;
  return store.profiles.find((profile) => profile.id === store.activeSessionId) ?? null;
}

function logDatabaseFallback(operation: string, error: unknown) {
  console.error(`[mt5-session-store] Unable to ${operation}; using memory fallback.`, error);
}

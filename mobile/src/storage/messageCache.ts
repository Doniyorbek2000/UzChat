import * as SQLite from "expo-sqlite";
import { Conversation, Message } from "../types";

// Local SQLite cache: chat list + recent messages open instantly (and fully
// offline), like Telegram. Messages are stored EXACTLY as the server sends
// them — i.e. still E2EE ciphertext — so nothing readable sits on disk;
// decryption happens in memory with keys from SecureStore. The outbox holds
// unsent text messages so they survive app restarts and flush on reconnect.

export interface OutboxEntry {
  localId: string;
  conversationId: string;
  text: string;
  replyToId: string | null;
  mentions: string[];
  createdAt: string;
}

const MAX_CACHED_MESSAGES_PER_CONVERSATION = 300;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("uzchat-cache.db");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          updatedAt TEXT NOT NULL,
          json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversationId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversationId, createdAt);
        CREATE TABLE IF NOT EXISTS outbox (
          localId TEXT PRIMARY KEY,
          conversationId TEXT NOT NULL,
          text TEXT NOT NULL,
          replyToId TEXT,
          mentions TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
        -- Telegram-style local retention (opt-in): the original ciphertext of
        -- messages the other side deleted, and previous versions of edited
        -- messages. Content stays encrypted at rest like the main cache.
        CREATE TABLE IF NOT EXISTS kept_deleted (
          id TEXT PRIMARY KEY,
          conversationId TEXT NOT NULL,
          deletedAt TEXT NOT NULL,
          json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_kept_deleted_conv ON kept_deleted(conversationId);
        CREATE TABLE IF NOT EXISTS edit_history (
          messageId TEXT NOT NULL,
          conversationId TEXT NOT NULL,
          editedAt TEXT NOT NULL,
          json TEXT NOT NULL,
          PRIMARY KEY (messageId, editedAt)
        );
        CREATE INDEX IF NOT EXISTS idx_edit_history_conv ON edit_history(conversationId);
      `);
      return db;
    })();
  }
  return dbPromise;
}

async function safe<T>(fallback: T, fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  // The cache is an accelerator, never a source of truth — any SQLite error
  // must degrade to "no cache", not break chat.
  try {
    return await fn(await getDb());
  } catch {
    return fallback;
  }
}

export const messageCache = {
  async getConversations(): Promise<Conversation[]> {
    return safe<Conversation[]>([], async (db) => {
      const rows = await db.getAllAsync<{ json: string }>(
        "SELECT json FROM conversations ORDER BY updatedAt DESC"
      );
      return rows.map((r) => JSON.parse(r.json) as Conversation);
    });
  },

  async saveConversations(conversations: Conversation[]): Promise<void> {
    await safe(undefined, async (db) => {
      await db.withTransactionAsync(async () => {
        await db.runAsync("DELETE FROM conversations");
        for (const c of conversations) {
          await db.runAsync(
            "INSERT OR REPLACE INTO conversations (id, updatedAt, json) VALUES (?, ?, ?)",
            c.id,
            c.updatedAt ?? "",
            JSON.stringify(c)
          );
        }
      });
    });
  },

  /** Most recent cached messages (raw server shape, ciphertext), oldest first. */
  async getMessages(conversationId: string, limit: number): Promise<Message[]> {
    return safe<Message[]>([], async (db) => {
      const rows = await db.getAllAsync<{ json: string }>(
        "SELECT json FROM messages WHERE conversationId = ? ORDER BY createdAt DESC LIMIT ?",
        conversationId,
        limit
      );
      return rows.reverse().map((r) => JSON.parse(r.json) as Message);
    });
  },

  async saveMessages(conversationId: string, messages: Message[]): Promise<void> {
    if (messages.length === 0) return;
    await safe(undefined, async (db) => {
      await db.withTransactionAsync(async () => {
        for (const m of messages) {
          await db.runAsync(
            "INSERT OR REPLACE INTO messages (id, conversationId, createdAt, json) VALUES (?, ?, ?, ?)",
            m.id,
            conversationId,
            m.createdAt,
            JSON.stringify(m)
          );
        }
        // Cap per-conversation history so the cache can't grow unbounded.
        await db.runAsync(
          `DELETE FROM messages WHERE conversationId = ? AND id NOT IN (
             SELECT id FROM messages WHERE conversationId = ? ORDER BY createdAt DESC LIMIT ?
           )`,
          conversationId,
          conversationId,
          MAX_CACHED_MESSAGES_PER_CONVERSATION
        );
      });
    });
  },

  async deleteMessage(messageId: string): Promise<void> {
    await safe(undefined, async (db) => {
      await db.runAsync("DELETE FROM messages WHERE id = ?", messageId);
    });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await safe(undefined, async (db) => {
      await db.runAsync("DELETE FROM messages WHERE conversationId = ?", conversationId);
      await db.runAsync("DELETE FROM conversations WHERE id = ?", conversationId);
      await db.runAsync("DELETE FROM outbox WHERE conversationId = ?", conversationId);
      await db.runAsync("DELETE FROM kept_deleted WHERE conversationId = ?", conversationId);
      await db.runAsync("DELETE FROM edit_history WHERE conversationId = ?", conversationId);
    });
  },

  async addToOutbox(entry: OutboxEntry): Promise<void> {
    await safe(undefined, async (db) => {
      await db.runAsync(
        "INSERT OR REPLACE INTO outbox (localId, conversationId, text, replyToId, mentions, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        entry.localId,
        entry.conversationId,
        entry.text,
        entry.replyToId,
        JSON.stringify(entry.mentions),
        entry.createdAt
      );
    });
  },

  async getOutbox(): Promise<OutboxEntry[]> {
    return safe<OutboxEntry[]>([], async (db) => {
      const rows = await db.getAllAsync<{
        localId: string;
        conversationId: string;
        text: string;
        replyToId: string | null;
        mentions: string;
        createdAt: string;
      }>("SELECT * FROM outbox ORDER BY createdAt ASC");
      return rows.map((r) => ({ ...r, mentions: JSON.parse(r.mentions) as string[] }));
    });
  },

  async removeFromOutbox(localId: string): Promise<void> {
    await safe(undefined, async (db) => {
      await db.runAsync("DELETE FROM outbox WHERE localId = ?", localId);
    });
  },

  /**
   * Snapshots the cached original of a message that just got deleted, so the
   * "keep deleted messages" setting can still show it. No-op when the
   * original was never cached or had no content.
   */
  async keepDeletedOriginal(messageId: string, deletedAt: string): Promise<void> {
    await safe(undefined, async (db) => {
      const row = await db.getFirstAsync<{ conversationId: string; json: string }>(
        "SELECT conversationId, json FROM messages WHERE id = ?",
        messageId
      );
      if (!row) return;
      const original = JSON.parse(row.json) as Message;
      if (!original.ciphertext || original.deletedAt) return;
      await db.runAsync(
        "INSERT OR IGNORE INTO kept_deleted (id, conversationId, deletedAt, json) VALUES (?, ?, ?, ?)",
        messageId,
        row.conversationId,
        deletedAt,
        row.json
      );
    });
  },

  /** Kept originals of deleted messages for a conversation, keyed by message id. */
  async getKeptDeleted(conversationId: string): Promise<Map<string, { deletedAt: string; message: Message }>> {
    return safe(new Map(), async (db) => {
      const rows = await db.getAllAsync<{ id: string; deletedAt: string; json: string }>(
        "SELECT id, deletedAt, json FROM kept_deleted WHERE conversationId = ?",
        conversationId
      );
      return new Map(rows.map((r) => [r.id, { deletedAt: r.deletedAt, message: JSON.parse(r.json) as Message }]));
    });
  },

  /** Snapshots the pre-edit version of a message for the edit-history setting. */
  async keepEditVersion(messageId: string, editedAt: string): Promise<void> {
    await safe(undefined, async (db) => {
      const row = await db.getFirstAsync<{ conversationId: string; json: string }>(
        "SELECT conversationId, json FROM messages WHERE id = ?",
        messageId
      );
      if (!row) return;
      const original = JSON.parse(row.json) as Message;
      // Nothing older to keep if the cache already holds this very version.
      if (!original.ciphertext || original.deletedAt || original.editedAt === editedAt) return;
      await db.runAsync(
        "INSERT OR IGNORE INTO edit_history (messageId, conversationId, editedAt, json) VALUES (?, ?, ?, ?)",
        messageId,
        row.conversationId,
        editedAt,
        row.json
      );
    });
  },

  /** All stored previous versions for a conversation, grouped by message id (oldest first). */
  async getEditHistory(conversationId: string): Promise<Map<string, { editedAt: string; message: Message }[]>> {
    return safe(new Map(), async (db) => {
      const rows = await db.getAllAsync<{ messageId: string; editedAt: string; json: string }>(
        "SELECT messageId, editedAt, json FROM edit_history WHERE conversationId = ? ORDER BY editedAt ASC",
        conversationId
      );
      const grouped = new Map<string, { editedAt: string; message: Message }[]>();
      for (const r of rows) {
        const list = grouped.get(r.messageId) ?? [];
        list.push({ editedAt: r.editedAt, message: JSON.parse(r.json) as Message });
        grouped.set(r.messageId, list);
      }
      return grouped;
    });
  },

  /** Wipes everything — called on logout so no ciphertext or metadata lingers. */
  async clearAll(): Promise<void> {
    await safe(undefined, async (db) => {
      await db.execAsync(
        "DELETE FROM messages; DELETE FROM conversations; DELETE FROM outbox; DELETE FROM kept_deleted; DELETE FROM edit_history;"
      );
    });
  },
};

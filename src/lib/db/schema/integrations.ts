import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { nanoid } from '@/lib/utils/nano-id';

export const integrationTokens = pgTable('integration_tokens', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  user_id: varchar('user_id', { length: 191 }).notNull(),
  integration: varchar('integration', { length: 50 }).notNull(), // 'slack', 'notion', etc.
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token'),
  team_id: varchar('team_id', { length: 191 }),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const userApiKeys = pgTable('user_api_keys', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  user_id: varchar('user_id', { length: 191 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'google' | 'openai' | 'groq'
  key_encrypted: text('key_encrypted').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

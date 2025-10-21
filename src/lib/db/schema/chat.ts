import { sql } from 'drizzle-orm';
import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { nanoid } from '@/lib/utils/nano-id';

export const chatThreads = pgTable('chat_threads', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  meeting_id: varchar('meeting_id', { length: 191 }),
  title: varchar('title', { length: 300 }),
  created_by: varchar('created_by', { length: 191 }).notNull(),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
});

export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  thread_id: varchar('thread_id', { length: 191 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // user | assistant | system | tool
  content: text('content').notNull(),
  model: varchar('model', { length: 100 }),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
});

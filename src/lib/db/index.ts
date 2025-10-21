import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import all schemas
import * as documentsSchema from './schema/documents';
import * as embeddingsSchema from './schema/embeddings';
import * as meetingsSchema from './schema/meetings';
import * as integrationsSchema from './schema/integrations';
import * as chatSchema from './schema/chat';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const dbClientPropertyName = `__prevent-name-collision__db`;
type GlobalThisWithDbClient = typeof globalThis & {
  [dbClientPropertyName]: any;
};

const getDbClient = () => {
  if (process.env.NODE_ENV === 'production') {
    const client = postgres(process.env.DATABASE_URL!);
    return drizzle(client, {
      schema: {
        ...documentsSchema,
        ...embeddingsSchema,
        ...meetingsSchema,
        ...integrationsSchema,
        ...chatSchema,
      },
    });
  } else {
    const newGlobalThis = globalThis as GlobalThisWithDbClient;
    if (!newGlobalThis[dbClientPropertyName]) {
      const client = postgres(process.env.DATABASE_URL!);
      newGlobalThis[dbClientPropertyName] = drizzle(client, {
        schema: {
          ...documentsSchema,
          ...embeddingsSchema,
          ...meetingsSchema,
          ...integrationsSchema,
          ...chatSchema,
        },
      });
    }
    return newGlobalThis[dbClientPropertyName];
  }
};

export const db = getDbClient();

// Export all schemas for easy access
export * from './schema/documents';
export * from './schema/embeddings';
export * from './schema/meetings';
export * from './schema/integrations';
export * from './schema/chat';

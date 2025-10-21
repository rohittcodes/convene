import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { desc, gt, sql, cosineDistance, inArray } from 'drizzle-orm';
import { chunk } from 'llm-chunk';

import { db } from '@/lib/db';
import { embeddings } from '@/lib/db/schema/embeddings';
import { getAIProviderAsync } from '@/lib/ai-provider';
import { listObjects, checkDocumentPermission } from '@/lib/fga/fga';

// Get embedding model based on the configured AI provider
async function getEmbeddingModel() {
  const providerCfg = await getAIProviderAsync();
  const providerName = providerCfg.provider as string;
  switch (providerName) {
    case 'google':
      return google.embedding('text-embedding-004') as any;
    case 'openai':
      return openai.embedding('text-embedding-3-small') as any; // 1536 dims
    case 'groq':
      // Groq does not provide embeddings; fallback to OpenAI small as standard
      return openai.embedding('text-embedding-3-small') as any;
    default:
      return google.embedding('text-embedding-004') as any;
  }
}

const TARGET_DIM = 1536;
function normalizeEmbeddingDim(vec: number[], source: string): number[] {
  if (vec.length === TARGET_DIM) return vec;
  if (vec.length > TARGET_DIM) {
    console.warn('[Embeddings] Truncating embedding from', vec.length, 'to', TARGET_DIM, 'source:', source);
    return vec.slice(0, TARGET_DIM);
  }
  // pad with zeros
  console.warn('[Embeddings] Padding embedding from', vec.length, 'to', TARGET_DIM, 'source:', source);
  const out = new Array(TARGET_DIM).fill(0);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i];
  return out;
}

export const generateEmbeddings = async (value: string): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = chunk(value);
  const embeddingModel = await getEmbeddingModel();
  const provider = await getAIProviderAsync();
  console.log('[Embeddings] generateEmbeddings using provider:', provider.provider);
  const { embeddings: vecs } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return vecs.map((e, i) => ({ content: chunks[i], embedding: normalizeEmbeddingDim(e, provider.provider) }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\n', ' ');
  const embeddingModel = await getEmbeddingModel();
  const provider = await getAIProviderAsync();
  console.log('[Embeddings] generateEmbedding using provider:', provider.provider);
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return normalizeEmbeddingDim(embedding, provider.provider);
};

export const findRelevantContent = async (userQuery: string, limit = 4) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, userQueryEmbedded)})`;
  const similarGuides = await db
    .select({ content: embeddings.content, similarity, documentId: embeddings.documentId })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy((t: any) => desc(t.similarity))
    .limit(limit);
  return similarGuides;
};

// FGA-aware version that only returns content from documents the user can read
export const findRelevantContentWithAuth = async (userQuery: string, userEmail: string, limit = 4) => {
  // Attempt multiple relation names to account for model variance
  const readRelations = ['can_read', 'viewer', 'reader'];
  let authorizedDocumentIds: string[] = [];
  for (const relation of readRelations) {
    try {
      const objs = await listObjects(userEmail, 'document', relation);
      if (objs && objs.length > 0) {
        authorizedDocumentIds = objs;
        break;
      }
    } catch (e) {
      console.warn('[RAG][FGA] listObjects failed for relation', relation, e);
    }
  }

  if (authorizedDocumentIds.length === 0) {
    console.info('[RAG] No authorized documents for user, skipping embeddings filter');
    return [];
  }

  // Extract document IDs from FGA format (document:id)
  const documentIds = authorizedDocumentIds.map(id => id.replace('document:', ''));
  console.log(`[RAG] Found ${documentIds.length} authorized documents: ${documentIds.join(', ')}`);

  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, userQueryEmbedded)})`;
  
  const similarGuides = await db
    .select({ content: embeddings.content, similarity, documentId: embeddings.documentId })
    .from(embeddings)
    .where(
      sql`${gt(similarity, 0.3)} AND ${inArray(embeddings.documentId, documentIds)}`
    )
    .orderBy((t: any) => desc(t.similarity))
    .limit(limit);
  
  console.log(`[RAG] Found ${similarGuides.length} similar documents with threshold 0.3`);
  if (similarGuides.length === 0) {
    console.log('[RAG] No similar documents found, trying with lower threshold...');
    // Try with even lower threshold
    const fallbackResults = await db
      .select({ content: embeddings.content, similarity, documentId: embeddings.documentId })
      .from(embeddings)
      .where(
        sql`${gt(similarity, 0.1)} AND ${inArray(embeddings.documentId, documentIds)}`
      )
      .orderBy((t: any) => desc(t.similarity))
      .limit(limit);
    console.log(`[RAG] Found ${fallbackResults.length} documents with threshold 0.1`);
    return fallbackResults;
  }
  
  return similarGuides;
};

// Helper function to filter embeddings by user permissions
export const filterEmbeddingsByPermission = async (userEmail: string, embeddings: any[]) => {
  const readRelations = ['can_read', 'viewer', 'reader'];
  let authorizedDocumentIds: string[] = [];
  for (const relation of readRelations) {
    try {
      const objs = await listObjects(userEmail, 'document', relation);
      if (objs && objs.length > 0) {
        authorizedDocumentIds = objs;
        break;
      }
    } catch (e) {
      console.warn('[RAG][FGA] listObjects failed for relation', relation, e);
    }
  }
  const documentIds = authorizedDocumentIds.map(id => id.replace('document:', ''));
  return embeddings.filter(embedding => embedding.documentId && documentIds.includes(embedding.documentId));
};

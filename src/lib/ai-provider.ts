import { google } from '@ai-sdk/google';
import { openai as openaiProvider } from '@ai-sdk/openai';
import { groq as groqProvider } from '@ai-sdk/groq';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userApiKeys } from '@/lib/db/schema/integrations';
import { decryptString } from '@/lib/crypto';
import { auth0 } from '@/lib/auth0';
import type { LanguageModelV1 } from 'ai';

// AI Provider Configuration
export type AIProvider = 'google' | 'openai' | 'groq';

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
}

/**
 * Get the configured AI provider based on user-provided API keys
 * Only uses user-provided keys from the database - no environment variable fallbacks
 */
export async function getAIProviderAsync(): Promise<AIProviderConfig> {
  const isValid = (key?: string) => !!key && !key.includes('your-') && !key.includes('********') && key.length > 10;
  // Prefer user-provided key if present (check in priority order: google, openai, groq)
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub;
    if (userId) {
      for (const prov of ['google','openai','groq'] as AIProvider[]) {
        const row = await db.query.userApiKeys.findFirst({
          where: and(eq(userApiKeys.user_id, userId), eq(userApiKeys.provider, prov)),
        }).catch(() => null);
        if (row && (row as any).key_encrypted) {
          const decrypted = decryptString((row as any).key_encrypted);
          if (isValid(decrypted)) {
            if (prov === 'google') return { provider: 'google', model: 'gemini-2.5-flash', apiKey: decrypted };
            if (prov === 'openai') return { provider: 'openai', model: 'gpt-4o-mini', apiKey: decrypted };
            if (prov === 'groq') return { provider: 'groq', model: 'llama-3.1-8b-instant', apiKey: decrypted };
          }
        }
      }
    }
  } catch {}
  throw new Error('No AI provider key available for this user. Please add a key in Settings → AI Keys.');
}

/**
 * Get the AI model instance based on the provider
 */
export function getAIModel(providerConfig: AIProviderConfig): LanguageModelV1 {
  const config = providerConfig;

  switch (config.provider) {
    case 'google':
      if (config.apiKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = config.apiKey;
      }
      return google(config.model) as unknown as LanguageModelV1;
    case 'openai':
      if (config.apiKey) {
        process.env.OPENAI_API_KEY = config.apiKey;
      }
      return openaiProvider(config.model) as unknown as LanguageModelV1;
    case 'groq':
      if (config.apiKey) {
        process.env.GROQ_API_KEY = config.apiKey;
      }
      return groqProvider(config.model) as unknown as LanguageModelV1;
  }
}

/**
 * Get model configuration for different use cases
 */
export async function getModelForUseCase(useCase: 'general' | 'fast' | 'powerful' | 'real-time'): Promise<AIProviderConfig> {
  const baseConfig = await getAIProviderAsync();

  switch (useCase) {
    case 'fast':
      return baseConfig.provider === 'google'
        ? { ...baseConfig, model: 'gemini-2.5-flash' }
        : baseConfig.provider === 'openai'
        ? { ...baseConfig, model: 'gpt-4o-mini' }
        : { ...baseConfig, model: 'llama-3.1-8b-instant' };

    case 'powerful':
      return baseConfig.provider === 'google'
        ? { ...baseConfig, model: 'gemini-2.5-pro' }
        : baseConfig.provider === 'openai'
        ? { ...baseConfig, model: 'gpt-4o' }
        : { ...baseConfig, model: 'llama-3.1-70b-versatile' };

    case 'real-time':
      // Use fast models for real-time
      return baseConfig.provider === 'google'
        ? { ...baseConfig, model: 'gemini-2.5-flash' }
        : baseConfig.provider === 'openai'
        ? { ...baseConfig, model: 'gpt-4o-mini' }
        : { ...baseConfig, model: 'llama-3.1-8b-instant' };

    case 'general':
    default:
      return baseConfig;
  }
}

/**
 * Get the current AI provider info for debugging
 */
export async function getAIProviderInfo(): Promise<{ provider: AIProvider; model: string; hasApiKey: boolean }> {
  const config = await getAIProviderAsync();
  return {
    provider: config.provider,
    model: config.model,
    hasApiKey: !!config.apiKey,
  };
}

/**
 * Get all available AI providers with their status
 */
export async function getAvailableProviders(): Promise<Array<{
  provider: AIProvider;
  name: string;
  model: string;
  hasApiKey: boolean;
  isActive: boolean;
}>> {
  let currentProvider: AIProvider | null = null;
  try { currentProvider = (await getAIProviderAsync()).provider; } catch {}
  const session = await auth0.getSession();
  const userId = session?.user?.sub || '';
  const hasKey = async (prov: AIProvider) => {
    if (!userId) return false;
    const row = await db.query.userApiKeys.findFirst({ where: and(eq(userApiKeys.user_id, userId), eq(userApiKeys.provider, prov)) }).catch(() => null);
    return !!row;
  };
  return [
    {
      provider: 'google',
      name: 'Google Gemini',
      model: 'gemini-2.5-flash',
      hasApiKey: await hasKey('google'),
      isActive: currentProvider === 'google',
    },
    {
      provider: 'openai',
      name: 'OpenAI',
      model: 'gpt-4o-mini',
      hasApiKey: await hasKey('openai'),
      isActive: currentProvider === 'openai',
    },
    {
      provider: 'groq',
      name: 'Groq',
      model: 'llama-3.1-8b-instant',
      hasApiKey: await hasKey('groq'),
      isActive: currentProvider === 'groq',
    },
  ];
}

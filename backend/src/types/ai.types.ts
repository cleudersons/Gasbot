export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
}

export interface TenantAIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string | null; // null = usa chave do .env
}

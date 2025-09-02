// AI App Factory - Core Provider System
// Real-time AI provider switching with RAG capabilities

export interface AIProvider {
  name: string;
  displayName: string;
  models: string[];
  
  validateApiKey(apiKey: string): Promise<boolean>;
  initialize(apiKey: string, model: string): Promise<void>;
  chat(messages: Message[], context?: string[]): Promise<string>;
  stream(messages: Message[], context?: string[]): AsyncIterable<string>;
  embedDocuments(texts: string[]): Promise<number[][]>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
    chunk?: number;
  };
  embedding?: number[];
}

// Provider Manager - handles real-time switching
export class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private currentProvider: AIProvider | null = null;
  private apiKeys: Map<string, string> = new Map(); // Memory only
  
  registerProvider(provider: AIProvider) {
    this.providers.set(provider.name, provider);
  }
  
  async switchProvider(
    providerName: string, 
    apiKey: string, 
    model: string
  ): Promise<{ success: boolean; error?: string }> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }
    
    try {
      // Validate API key first
      const isValid = await provider.validateApiKey(apiKey);
      if (!isValid) {
        return { success: false, error: 'Invalid API key' };
      }
      
      // Initialize provider
      await provider.initialize(apiKey, model);
      
      // Store in memory only
      this.apiKeys.set(providerName, apiKey);
      this.currentProvider = provider;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
  }
  
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  clearApiKeys() {
    this.apiKeys.clear();
  }
}

// OpenAI Provider Implementation
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  displayName = 'OpenAI';
  models = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  
  private llm: any = null;
  private embeddings: any = null;
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const { ChatOpenAI } = await import('@langchain/openai');
      const testLLM = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'gpt-3.5-turbo',
        maxTokens: 1
      });
      
      await testLLM.invoke([{ role: 'user', content: 'Hi' }]);
      return true;
    } catch {
      return false;
    }
  }
  
  async initialize(apiKey: string, model: string): Promise<void> {
    const { ChatOpenAI, OpenAIEmbeddings } = await import('@langchain/openai');
    
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature: 0.7,
      streaming: true
    });
    
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey
    });
  }
  
  async chat(messages: Message[], context?: string[]): Promise<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? {
      role: 'system' as const,
      content: `Use the following context to answer the user's question:\n\n${context.join('\n\n')}`
    } : null;
    
    const chatMessages = [
      ...(systemMessage ? [systemMessage] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    const response = await this.llm.invoke(chatMessages);
    return response.content as string;
  }
  
  async *stream(messages: Message[], context?: string[]): AsyncIterable<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? {
      role: 'system' as const,
      content: `Use the following context to answer the user's question:\n\n${context.join('\n\n')}`
    } : null;
    
    const chatMessages = [
      ...(systemMessage ? [systemMessage] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    const stream = await this.llm.stream(chatMessages);
    for await (const chunk of stream) {
      yield chunk.content as string;
    }
  }
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.embeddings) throw new Error('Provider not initialized');
    return await this.embeddings.embedDocuments(texts);
  }
}

// Grok (X AI) Provider Implementation
export class GrokProvider implements AIProvider {
  name = 'grok';
  displayName = 'Grok (X AI)';
  models = ['grok-beta', 'grok-vision-beta'];
  
  private llm: any = null;
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Grok uses OpenAI-compatible API, so we can use OpenAI SDK
      const { ChatOpenAI } = await import('@langchain/openai');
      const testLLM = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'grok-beta',
        configuration: {
          baseURL: 'https://api.x.ai/v1'
        },
        maxTokens: 1
      });
      
      await testLLM.invoke([{ role: 'user', content: 'Hi' }]);
      return true;
    } catch {
      return false;
    }
  }
  
  async initialize(apiKey: string, model: string): Promise<void> {
    const { ChatOpenAI } = await import('@langchain/openai');
    
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      configuration: {
        baseURL: 'https://api.x.ai/v1'
      },
      temperature: 0.7,
      streaming: true
    });
  }
  
  async chat(messages: Message[], context?: string[]): Promise<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? {
      role: 'system' as const,
      content: `Use the following context to answer the user's question:\n\n${context.join('\n\n')}`
    } : null;
    
    const chatMessages = [
      ...(systemMessage ? [systemMessage] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    const response = await this.llm.invoke(chatMessages);
    return response.content as string;
  }
  
  async *stream(messages: Message[], context?: string[]): AsyncIterable<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? {
      role: 'system' as const,
      content: `Use the following context to answer the user's question:\n\n${context.join('\n\n')}`
    } : null;
    
    const chatMessages = [
      ...(systemMessage ? [systemMessage] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    const stream = await this.llm.stream(chatMessages);
    for await (const chunk of stream) {
      yield chunk.content as string;
    }
  }
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    // Grok doesn't have native embedding models yet
    // Recommend using OpenAI or Google for RAG features
    console.warn('Grok does not support embeddings - use OpenAI or Google AI for RAG features');
    throw new Error('Embeddings not supported by Grok. Consider using OpenAI or Google AI for RAG functionality.');
  }
}

// Google AI Provider Implementation
export class GoogleProvider implements AIProvider {
  name = 'google';
  displayName = 'Google AI';
  models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
  
  private llm: any = null;
  private embeddings: any = null;
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const testLLM = new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        modelName: 'gemini-1.5-flash',
        maxOutputTokens: 1
      });
      
      await testLLM.invoke([{ role: 'user', content: 'Hi' }]);
      return true;
    } catch {
      return false;
    }
  }
  
  async initialize(apiKey: string, model: string): Promise<void> {
    const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai');
    
    this.llm = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      modelName: model,
      temperature: 0.7,
      streaming: true
    });
    
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey,
      modelName: 'embedding-001'
    });
  }
  
  async chat(messages: Message[], context?: string[]): Promise<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? {
      role: 'system' as const,
      content: `Use the following context to answer the user's question:\n\n${context.join('\n\n')}`
    } : null;
    
    const chatMessages = [
      ...(systemMessage ? [systemMessage] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    const response = await this.llm.invoke(chatMessages);
    return response.content as string;
  }
  
  async *stream(messages: Message[], context?: string[]): AsyncIterable<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? {
      role: 'system' as const,
      content: `Use the following context to answer the user's question:\n\n${context.join('\n\n')}`
    } : null;
    
    const chatMessages = [
      ...(systemMessage ? [systemMessage] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    const stream = await this.llm.stream(chatMessages);
    for await (const chunk of stream) {
      yield chunk.content as string;
    }
  }
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.embeddings) throw new Error('Provider not initialized');
    return await this.embeddings.embedDocuments(texts);
  }
}

// Anthropic Provider Implementation
export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  displayName = 'Anthropic';
  models = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
  
  private llm: any = null;
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const { ChatAnthropic } = await import('@langchain/anthropic');
      const testLLM = new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: 'claude-3-haiku-20240307',
        maxTokens: 1
      });
      
      await testLLM.invoke([{ role: 'user', content: 'Hi' }]);
      return true;
    } catch {
      return false;
    }
  }
  
  async initialize(apiKey: string, model: string): Promise<void> {
    const { ChatAnthropic } = await import('@langchain/anthropic');
    
    this.llm = new ChatAnthropic({
      anthropicApiKey: apiKey,
      modelName: model,
      temperature: 0.7,
      streaming: true
    });
  }
  
  async chat(messages: Message[], context?: string[]): Promise<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? 
      `Use the following context to answer the user's question:\n\n${context.join('\n\n')}` : 
      undefined;
    
    const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
    
    const response = await this.llm.invoke(chatMessages, {
      ...(systemMessage && { system: systemMessage })
    });
    return response.content as string;
  }
  
  async *stream(messages: Message[], context?: string[]): AsyncIterable<string> {
    if (!this.llm) throw new Error('Provider not initialized');
    
    const systemMessage = context ? 
      `Use the following context to answer the user's question:\n\n${context.join('\n\n')}` : 
      undefined;
    
    const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
    
    const stream = await this.llm.stream(chatMessages, {
      ...(systemMessage && { system: systemMessage })
    });
    
    for await (const chunk of stream) {
      yield chunk.content as string;
    }
  }
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    // For Anthropic, we'll use OpenAI embeddings as fallback
    // In production, you might use a different embedding service
    console.warn('Using OpenAI embeddings for Anthropic provider - requires OpenAI API key');
    throw new Error('Embeddings require OpenAI API key for Anthropic provider. Consider using OpenAI or Google for RAG features.');
  }
}

// Knowledge Base System
export class KnowledgeBase {
  private documents: Document[] = [];
  
  async addDocument(content: string, metadata: any): Promise<void> {
    const chunks = this.chunkText(content);
    const documents: Document[] = chunks.map((chunk, index) => ({
      id: `${metadata.source}_${index}`,
      content: chunk,
      metadata: { ...metadata, chunk: index }
    }));
    
    this.documents.push(...documents);
  }
  
  async createEmbeddings(provider: AIProvider): Promise<void> {
    if (this.documents.length === 0) return;
    
    const texts = this.documents.map(doc => doc.content);
    const embeddings = await provider.embedDocuments(texts);
    
    this.documents.forEach((doc, index) => {
      doc.embedding = embeddings[index];
    });
  }
  
  async search(query: string, provider: AIProvider, limit: number = 5): Promise<string[]> {
    if (this.documents.length === 0) return [];
    
    // Get query embedding
    const queryEmbedding = await provider.embedDocuments([query]);
    
    // Calculate similarities
    const similarities = this.documents.map(doc => ({
      document: doc,
      similarity: this.cosineSimilarity(queryEmbedding[0], doc.embedding!)
    }));
    
    // Sort by similarity and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.document.content);
  }
  
  private chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    
    return chunks;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  getDocumentCount(): number {
    return this.documents.length;
  }
  
  clear(): void {
    this.documents = [];
  }
}

// Main Application Class
export class AIAppFactory {
  private providerManager: ProviderManager;
  private knowledgeBase: KnowledgeBase;
  private messages: Message[] = [];
  
  constructor() {
    this.providerManager = new ProviderManager();
    this.knowledgeBase = new KnowledgeBase();
    
    // Register providers
    this.providerManager.registerProvider(new OpenAIProvider());
    this.providerManager.registerProvider(new AnthropicProvider());
    this.providerManager.registerProvider(new GoogleProvider());
    this.providerManager.registerProvider(new GrokProvider());
  }
  
  async switchProvider(providerName: string, apiKey: string, model: string) {
    const result = await this.providerManager.switchProvider(providerName, apiKey, model);
    
    if (result.success && this.knowledgeBase.getDocumentCount() > 0) {
      // Re-create embeddings for new provider if possible
      const provider = this.providerManager.getCurrentProvider()!;
      try {
        await this.knowledgeBase.createEmbeddings(provider);
      } catch (error) {
        console.warn('Could not create embeddings for this provider:', error);
      }
    }
    
    return result;
  }
  
  async addDocument(content: string, source: string) {
    await this.knowledgeBase.addDocument(content, { source });
    
    const provider = this.providerManager.getCurrentProvider();
    if (provider) {
      try {
        await this.knowledgeBase.createEmbeddings(provider);
      } catch (error) {
        console.warn('Could not create embeddings:', error);
      }
    }
  }
  
  async chat(userMessage: string): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    if (!provider) {
      throw new Error('No provider selected');
    }
    
    // Add user message to history
    this.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    // Search knowledge base for relevant context
    let context: string[] = [];
    try {
      context = await this.knowledgeBase.search(userMessage, provider);
    } catch (error) {
      console.warn('Could not search knowledge base:', error);
    }
    
    // Generate response
    const response = await provider.chat(this.messages, context);
    
    // Add assistant message to history
    this.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    return response;
  }
  
  async *chatStream(userMessage: string): AsyncIterable<string> {
    const provider = this.providerManager.getCurrentProvider();
    if (!provider) {
      throw new Error('No provider selected');
    }
    
    // Add user message to history
    this.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    // Search knowledge base for relevant context
    let context: string[] = [];
    try {
      context = await this.knowledgeBase.search(userMessage, provider);
    } catch (error) {
      console.warn('Could not search knowledge base:', error);
    }
    
    // Stream response
    let fullResponse = '';
    for await (const chunk of provider.stream(this.messages, context)) {
      fullResponse += chunk;
      yield chunk;
    }
    
    // Add complete assistant message to history
    this.messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date()
    });
  }
  
  getMessages(): Message[] {
    return [...this.messages];
  }
  
  clearChat(): void {
    this.messages = [];
  }
  
  clearKnowledge(): void {
    this.knowledgeBase.clear();
  }
  
  getAvailableProviders(): string[] {
    return this.providerManager.getAvailableProviders();
  }
  
  getCurrentProvider(): AIProvider | null {
    return this.providerManager.getCurrentProvider();
  }
}

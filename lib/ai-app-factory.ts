// AI App Factory - Core Provider System
// Real-time AI provider switching with RAG capabilities

export interface ImageData {
  base64Data: string;
  mimeType: string;
}

export interface AIProvider {
  name: string;
  displayName: string;
  models: string[];
  
  validateApiKey(apiKey: string): Promise<boolean>;
  initialize(apiKey: string, model: string): Promise<void>;
  chat(messages: Message[], context?: string[]): Promise<string>;
  stream(messages: Message[], context?: string[]): AsyncIterable<string>;
  embedDocuments(texts: string[]): Promise<number[][]>;
  generateImage?(prompt: string, images?: ImageData[]): Promise<string>; // Returns base64 image data
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  uploadedImages?: UploadedImage[];
}

export interface UploadedImage {
  id: string;
  file: File;
  base64Data: string;
  mimeType: string;
  preview: string;
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
  models = ['gemini-2.5-flash-image-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-preview-image-generation'];
  
  private llm: any = null;
  private embeddings: any = null;
  private genAI: any = null;
  private currentModel: string = '';
  private apiKey: string = '';
  private chatModel: string = ''; // Model used for chat (higher quota)
  private imageModel: string = ''; // Model used for images
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const genAI = new GoogleGenAI({ apiKey });
      
      // Use only valid Gemini models
      const modelsToTest = [
        'gemini-2.5-flash-image-preview',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-preview-image-generation'
      ];
      
      for (const modelName of modelsToTest) {
        try {
          console.log(`🔑 Testing API key with model: ${modelName}`);
          await genAI.models.generateContent({
            model: modelName,
            contents: 'test'
          });
          console.log(`✅ API key valid with model: ${modelName}`);
          return true; // Success with at least one model
        } catch (modelError) {
          const errorMsg = modelError instanceof Error ? modelError.message : 'Unknown error';
          
          // Quota exceeded = valid key, just no quota left
          if (errorMsg.includes('[429]') || errorMsg.includes('quota')) {
            console.log(`✅ API key valid with ${modelName} (quota exceeded)`);
            return true;
          }
          
          console.log(`❌ Model ${modelName} failed:`, errorMsg);
          continue; // Try next model
        }
      }
      
      console.error('❌ API key validation failed with all models');
      return false; // All models failed
    } catch (error) {
      console.error('❌ API key validation error:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
  
  private resetInternalState(): void {
    // Only reset internal state that should be cleared between model switches
    // Don't reset apiKey or currentModel during initialization
    this.llm = null;
    this.embeddings = null;
    this.genAI = null;
    this.chatModel = '';
    this.imageModel = '';
  }

  async initialize(apiKey: string, model: string): Promise<void> {
    // Reset internal state first, but keep apiKey and currentModel
    this.resetInternalState();
    
    this.currentModel = model;
    this.apiKey = apiKey;
    
    // Set up model configuration with proper response modalities support
    if (model === 'gemini-2.5-flash-image-preview' || model === 'gemini-2.0-flash-preview-image-generation') {
      // Both models support multimodal responses (text + image) with proper modality configuration
      this.chatModel = model; // Use the selected model directly for chat
      this.imageModel = model; // Use the selected model for image generation
    } else {
      // Other models support text-only responses
      this.chatModel = model;
      this.imageModel = ''; // No image support for text-only models
    }
    
    // Always initialize Google AI SDK for both chat and image generation
    const { GoogleGenAI } = await import('@google/genai');
    this.genAI = new GoogleGenAI({ apiKey });
    
    // Initialize LangChain for embeddings only
    const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai');
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey,
      modelName: 'embedding-001'
    });
  }
  
  async chat(messages: Message[], context?: string[]): Promise<string> {
    if (!this.genAI || !this.chatModel) {
      throw new Error(`Google AI chat not initialized for model ${this.currentModel}. Please reconnect.`);
    }
    
    console.log(`💬 GoogleProvider: Starting chat with model ${this.chatModel}`);
    
    try {
      // Build the conversation for native Google SDK
      let conversationHistory = '';
      
      if (context && context.length > 0) {
        conversationHistory += `Context: ${context.join('\n\n')}\n\n`;
      }
      
      const historyMessages = messages.slice(0, -1);
      for (const msg of historyMessages) {
        conversationHistory += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
      }
      
      const currentMessage = messages[messages.length - 1];
      const fullPrompt = conversationHistory + `Human: ${currentMessage.content}\nAssistant:`;
      
      // Use model-specific configuration for chat
      console.log('💬 GoogleProvider: Calling generateContent for chat...');
      
      let result;
      if (this.chatModel === 'gemini-2.0-flash-preview-image-generation') {
        // 2.0 model REQUIRES response modalities configuration even for chat
        const { Modality } = await import('@google/genai');
        console.log('💬 Using 2.0 model with required response modalities [TEXT, IMAGE]');
        result = await this.genAI.models.generateContent({
          model: this.chatModel,
          contents: fullPrompt,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          }
        });
      } else {
        // 2.5 and other models work without response modalities config
        console.log('💬 Using standard model with simplified configuration');
        result = await this.genAI.models.generateContent({
          model: this.chatModel,
          contents: fullPrompt
        });
      }
      
      // Extract text from the response
      const text = result.text;
      
      console.log(`✅ GoogleProvider: Chat completed successfully (${text.length} chars)`);
      return text;
      
    } catch (error) {
      console.error('❌ GoogleProvider: Chat failed:', error);
      throw new Error(`Google AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async *stream(messages: Message[], context?: string[]): AsyncIterable<string> {
    if (!this.genAI || !this.chatModel) {
      throw new Error(`Google AI stream not initialized for model ${this.currentModel}. Please reconnect.`);
    }
    
    console.log(`🔄 GoogleProvider: Starting native SDK streaming with model ${this.chatModel}...`);
    
    // Build the conversation history for Google SDK format - do this outside try block for error handling
    let conversationHistory = '';
    
    // Add context if provided
    if (context && context.length > 0) {
      conversationHistory += `Context: ${context.join('\n\n')}\n\n`;
    }
    
    // Add message history (skip the last message as it will be the prompt)
    const historyMessages = messages.slice(0, -1);
    for (const msg of historyMessages) {
      conversationHistory += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
    }
    
    // Get the current user message
    const currentMessage = messages[messages.length - 1];
    const fullPrompt = conversationHistory + `Human: ${currentMessage.content}\nAssistant:`;
    
    try {
      
      console.log('📤 GoogleProvider: Sending prompt to model...');
      
      // Use model-specific configuration for streaming
      console.log('🔄 GoogleProvider: Calling generateContentStream for chat...');
      
      // Add timeout wrapper to prevent hanging
      const STREAM_TIMEOUT_MS = 30000; // 30 seconds
      
      let streamPromise;
      if (this.chatModel === 'gemini-2.0-flash-preview-image-generation') {
        // 2.0 model REQUIRES response modalities configuration even for streaming
        const { Modality } = await import('@google/genai');
        console.log('🔄 Using 2.0 model with required response modalities [TEXT, IMAGE]');
        streamPromise = this.genAI.models.generateContentStream({
          model: this.chatModel,
          contents: fullPrompt,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          }
        });
      } else {
        // 2.5 and other models work without response modalities config
        console.log('🔄 Using standard model with simplified configuration');
        streamPromise = this.genAI.models.generateContentStream({
          model: this.chatModel,
          contents: fullPrompt
        });
      }
      
      let result;
      try {
        result = await Promise.race([
          streamPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stream timeout after 30 seconds')), STREAM_TIMEOUT_MS)
          )
        ]);
      } catch (timeoutError) {
        console.error('⏰ GoogleProvider: Stream timed out, falling back to non-streaming chat');
        // Fallback to non-streaming response with model-specific configuration
        let chatResult;
        if (this.chatModel === 'gemini-2.0-flash-preview-image-generation') {
          const { Modality } = await import('@google/genai');
          chatResult = await this.genAI.models.generateContent({
            model: this.chatModel,
            contents: fullPrompt,
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE]
            }
          });
        } else {
          chatResult = await this.genAI.models.generateContent({
            model: this.chatModel,
            contents: fullPrompt
          });
        }
        const text = chatResult.text;
        yield text;
        return;
      }
      
      console.log('📡 GoogleProvider: Streaming response started...');
      
      let totalChunks = 0;
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          totalChunks++;
          console.log(`📦 GoogleProvider: Chunk ${totalChunks} received (${chunkText.length} chars)`);
          yield chunkText;
        }
      }
      
      console.log(`✅ GoogleProvider: Streaming completed successfully (${totalChunks} chunks)`);
      
    } catch (error) {
      console.error('❌ GoogleProvider: Stream failed:', error);
      
      // Check if it's a quota error (429)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('[429]') || errorMessage.includes('quota')) {
        console.log('🔄 GoogleProvider: Quota exceeded, attempting fallback to gemini-1.5-flash...');
        
        // Try fallback to a different model if we hit quota limits
        if (this.chatModel !== 'gemini-1.5-flash') {
          try {
            const fallbackModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const fallbackResult = await fallbackModel.generateContent(fullPrompt);
            const response = fallbackResult.response;
            const text = response.text();
            
            console.log('✅ GoogleProvider: Fallback successful, streaming single response');
            yield text;
            return;
          } catch (fallbackError) {
            console.error('❌ GoogleProvider: Fallback also failed:', fallbackError);
          }
        }
      }
      
      throw new Error(`Google AI stream failed: ${errorMessage}`);
    }
  }
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.embeddings) throw new Error('Provider not initialized');
    return await this.embeddings.embedDocuments(texts);
  }
  
  async generateImage(prompt: string, images?: ImageData[]): Promise<string> {
    if (!this.genAI || !this.imageModel) {
      throw new Error('Image generation not available. Please select gemini-2.5-flash-image-preview or gemini-2.0-flash-preview-image-generation.');
    }
    
    console.log(`🎨 GoogleProvider: Starting image generation with model ${this.imageModel}`);
    
    try {
      // Build content based on official Google example structure
      let contents;
      
      if (!images || images.length === 0) {
        // Simple text-to-image: pass prompt directly like official example
        contents = prompt;
      } else {
        // Image-to-image: build content array with text and images
        contents = [{ text: prompt }];
        images.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.base64Data
            }
          });
        });
      }
      
      // Use model-specific configuration based on requirements
      console.log('🎨 GoogleProvider: Calling generateContent for image generation...');
      
      let result;
      if (this.imageModel === 'gemini-2.0-flash-preview-image-generation') {
        // 2.0 model REQUIRES response modalities configuration
        const { Modality } = await import('@google/genai');
        console.log('🎨 Using 2.0 model with required response modalities [TEXT, IMAGE]');
        result = await this.genAI.models.generateContent({
          model: this.imageModel,
          contents: contents,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          }
        });
      } else {
        // 2.5 model works without response modalities config (per official example)
        console.log('🎨 Using 2.5 model with simplified configuration');
        result = await this.genAI.models.generateContent({
          model: this.imageModel,
          contents: contents
        });
      }
      
      // Extract image data from the response using correct @google/genai structure
      console.log('🔍 GoogleProvider: Inspecting response structure for image data...');
      console.log('Response candidates:', result.candidates?.length);
      
      if (result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        console.log('Content parts:', candidate.content?.parts?.length);
        
        if (candidate.content && candidate.content.parts) {
          for (let i = 0; i < candidate.content.parts.length; i++) {
            const part = candidate.content.parts[i];
            console.log(`Part ${i}:`, { hasText: !!part.text, hasInlineData: !!part.inlineData });
            
            if (part.inlineData && part.inlineData.data) {
              console.log('✅ GoogleProvider: Found image data in response');
              return part.inlineData.data; // Return base64 image data
            }
          }
        }
      }
      
      console.error('❌ GoogleProvider: No image data found in response structure');
      console.error('Response structure:', JSON.stringify(result, null, 2));
      throw new Error('No image data received from the model');
    } catch (error) {
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
  
  async generateImage(prompt: string, images?: any[]): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    if (!provider) {
      throw new Error('No provider selected');
    }
    
    if (!provider.generateImage) {
      throw new Error('Current provider does not support image generation');
    }
    
    // Convert uploaded images to ImageData format
    const imageData: ImageData[] = images ? images.map(img => ({
      base64Data: img.base64Data,
      mimeType: img.mimeType
    })) : [];
    
    return await provider.generateImage(prompt, imageData);
  }
}

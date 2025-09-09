// Content Engine - Core Provider System
// Real-time AI provider switching with RAG capabilities

export interface ImageData {
  base64Data: string;
  mimeType: string;
}

export interface AIProvider {
  name: string;
  displayName: string;
  models: string[];
  
  validateApiKey(apiKey: string, model?: string): Promise<boolean>;
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
      // Validate API key first with the selected model
      const isValid = await provider.validateApiKey(apiKey, model);
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
  
  async validateApiKey(apiKey: string, model?: string): Promise<boolean> {
    try {
      // For security: Use server-side API route for validation
      // This ensures environment variables are accessed server-side only
      const response = await fetch('/api/validate-google-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          model: model || this.currentModel // Use provided model or fall back to current model
        })
      });
      
      const result = await response.json();
      
      if (result.valid) {
        console.log('Google AI API key validation successful via server');
        return true;
      } else {
        console.error('Google AI API key validation failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('GoogleProvider validateApiKey error:', error);
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
    // Reset internal state first
    this.resetInternalState();
    
    this.currentModel = model;
    
    // For security: Use server-side API route for initialization
    // This ensures environment variables are accessed server-side only
    try {
      const response = await fetch('/api/initialize-google-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize Google AI provider');
      }
      
      console.log('✅ Google AI provider initialized successfully via server');
      
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
      
      // For client-side operations, we'll create a lightweight initialization marker
      // The actual SDK instances will be created server-side when needed
      this.genAI = { initialized: true }; // Placeholder to indicate initialization
      this.apiKey = 'server-managed'; // Placeholder to indicate server-side management
      
      // Initialize LangChain embeddings (this will need server-side handling too for security)
      // For now, we'll mark it as initialized but handle actual embedding operations server-side
      this.embeddings = { initialized: true }; // Placeholder
      
    } catch (error) {
      console.error('GoogleProvider initialization error:', error);
      throw error;
    }
  }
  
  async chat(messages: Message[], context?: string[]): Promise<string> {
    if (!this.genAI || !this.chatModel) {
      throw new Error(`Google AI chat not initialized for model ${this.currentModel}. Please reconnect.`);
    }
    
    console.log(`GoogleProvider: Starting chat with model ${this.chatModel}`);
    
    try {
      // Use server-side API route for chat to ensure security
      const response = await fetch('/api/google-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          context,
          model: this.chatModel
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Chat request failed');
      }
      
      console.log(`GoogleProvider: Chat completed successfully via server (${result.response.length} chars)`);
      return result.response;
      
    } catch (error) {
      console.error('GoogleProvider: Chat failed:', error);
      throw new Error(`Google AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async *stream(messages: Message[], context?: string[]): AsyncIterable<string> {
    if (!this.genAI || !this.chatModel) {
      throw new Error(`Google AI stream not initialized for model ${this.currentModel}. Please reconnect.`);
    }
    
    console.log(`GoogleProvider: Starting streaming with model ${this.chatModel}...`);
    
    try {
      // Use server-side API route for streaming to ensure security
      const response = await fetch('/api/google-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          context,
          model: this.chatModel
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Stream request failed with status ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (buffer.length > 0) {
              yield buffer;
            }
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Yield complete lines or chunks
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line
          
          for (const line of lines) {
            if (line.trim()) {
              yield line;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      console.log('GoogleProvider: Streaming completed successfully via server');
      
    } catch (error) {
      console.error('GoogleProvider: Stream failed:', error);
      throw new Error(`Google AI stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    console.log(`GoogleProvider: Starting image generation with model ${this.imageModel}`);
    
    try {
      // Convert ImageData[] to uploaded images format for API
      const uploadedImages = images?.map(img => ({
        base64Data: img.base64Data,
        mimeType: img.mimeType,
        id: Date.now().toString() + Math.random().toString(),
        file: { name: 'uploaded-image' }
      })) || [];
      
      // Use server-side API route for image generation to ensure security
      const response = await fetch('/api/google-generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          model: this.imageModel,
          uploadedImages
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Image generation request failed');
      }
      
      console.log('GoogleProvider: Image generated successfully via server');
      return result.imageData;
      
    } catch (error) {
      console.error('GoogleProvider: Image generation failed:', error);
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
export class ContentEngine {
  private providerManager: ProviderManager;
  private knowledgeBase: KnowledgeBase;
  private messages: Message[] = [];
  
  constructor() {
    this.providerManager = new ProviderManager();
    this.knowledgeBase = new KnowledgeBase();
    
    // Register providers
    this.providerManager.registerProvider(new GoogleProvider());
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

// React UI Components for AI App Factory
// Streamlit-inspired clean interface with sidebar + chat

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { AIAppFactory, Message, UploadedImage } from '../lib/ai-app-factory';

// Main App Component
export default function AIAppFactoryUI() {
  const [appFactory] = useState(() => new AIAppFactory());
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For provider connection
  const [isProcessingMessage, setIsProcessingMessage] = useState(false); // For chat/image processing
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [chatMode, setChatMode] = useState<'chat' | 'image'>('chat');
  const [apiKeySource, setApiKeySource] = useState<'manual' | 'environment' | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check if current model supports image generation
  const isImageModel = selectedModel === 'gemini-2.5-flash-image-preview' || selectedModel === 'gemini-2.0-flash-preview-image-generation';
  
  // Both image models now support chat and image generation with proper response modalities
  const isImageOnlyModel = false; // No models are image-only anymore
  
  // Debug logging
  useEffect(() => {
    console.log('🐛 Model Selection Debug:', {
      selectedModel,
      isImageModel,
      isConnected,
      chatMode,
      expectedModel: 'gemini-2.5-flash-image-preview'
    });
  }, [selectedModel, isImageModel, isConnected, chatMode]);
  
  // Note: Removed forced image mode logic - both models now support chat and image modes

  // Auto-load Google API key from environment variables
  useEffect(() => {
    async function loadGoogleApiKey() {
      try {
        console.log('🔑 Attempting to load Google API key from environment...');
        const response = await fetch('/api/google-key');
        const data = await response.json();
        
        if (data.hasKey && data.key) {
          console.log('✅ Google API key loaded from environment');
          setApiKey(data.key);
          setApiKeySource('environment');
          setSelectedProvider('google');
          // Auto-select the first available model
          setSelectedModel('gemini-2.5-flash-image-preview');
          toast.success('Google API key loaded from environment');
        } else {
          console.log('ℹ️ No Google API key found in environment, using manual input');
          setApiKeySource('manual');
        }
      } catch (error) {
        console.error('❌ Failed to load Google API key from environment:', error);
        setApiKeySource('manual');
      }
    }
    
    loadGoogleApiKey();
  }, []); // Run once on component mount

  // Reset chat mode and clear images when switching models (passive cleanup for non-manual switches)
  useEffect(() => {
    if (!isImageModel) {
      if (uploadedImages.length > 0) {
        clearAllImages();
      }
      // Only set chat mode if not already in chat mode (avoid conflicts with handleModelChange)
      if (chatMode !== 'chat') {
        setChatMode('chat');
      }
    }
  }, [isImageModel, chatMode]);
  
  // Clear images when switching to chat mode
  useEffect(() => {
    if (chatMode === 'chat' && uploadedImages.length > 0) {
      clearAllImages();
    }
  }, [chatMode]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleProviderSwitch = async () => {
    if (!selectedProvider || !apiKey || !selectedModel) {
      toast.error('Please select provider, enter API key, and choose model');
      return;
    }
    
    setIsLoading(true);
    const result = await appFactory.switchProvider(selectedProvider, apiKey, selectedModel);
    
    if (result.success) {
      setIsConnected(true);
      toast.success(`Connected to ${selectedProvider} ${selectedModel}`);
    } else {
      setIsConnected(false);
      toast.error(result.error || 'Failed to connect');
    }
    setIsLoading(false);
  };

  const handleModelChange = async (newModel: string) => {
    // Clean UI state first (silent)
    const currentIsImageModel = selectedModel === 'gemini-2.5-flash-image-preview' || selectedModel === 'gemini-2.0-flash-preview-image-generation';
    const newIsImageModel = newModel === 'gemini-2.5-flash-image-preview' || newModel === 'gemini-2.0-flash-preview-image-generation';
    
    if (currentIsImageModel && !newIsImageModel) {
      setChatMode('chat');
      if (uploadedImages.length > 0) {
        clearAllImages();
      }
    }
    
    setSelectedModel(newModel);
    
    // If already connected, automatically reconnect to new model
    if (isConnected && selectedProvider && apiKey) {
      setIsLoading(true);
      toast(`🔄 Switching to ${newModel}...`);
      
      try {
        const result = await appFactory.switchProvider(selectedProvider, apiKey, newModel);
        
        if (result.success) {
          setIsConnected(true);
          toast.success(`✅ Switched to ${newModel}`);
        } else {
          setIsConnected(false);
          toast.error(`Failed to switch to ${newModel}: ${result.error}`);
        }
      } catch (error) {
        setIsConnected(false);
        toast.error(`Error switching to ${newModel}`);
        console.error('Model switch error:', error);
      }
      
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!currentInput.trim() || !isConnected || isProcessingMessage) return;
    
    const userMessage = currentInput.trim();
    setCurrentInput('');
    setIsProcessingMessage(true);
    
    console.log('🚀 Starting chat message processing:', { userMessage, provider: selectedProvider, model: selectedModel });
    
    try {
      // Add user message immediately
      const userMsg: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      
      // Stream assistant response
      let assistantResponse = '';
      const assistantMsg: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      console.log('📡 Starting stream from provider...');
      
      try {
        for await (const chunk of appFactory.chatStream(userMessage)) {
          assistantResponse += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...assistantMsg,
              content: assistantResponse
            };
            return newMessages;
          });
        }
        console.log('✅ Stream completed successfully. Full response length:', assistantResponse.length);
      } catch (streamError) {
        console.error('❌ Stream error:', streamError);
        throw streamError; // Re-throw to be caught by outer catch
      }
      
    } catch (error) {
      console.error('💥 Chat message failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to send message: ${errorMessage}`);
      
      // Remove the empty assistant message if it was added
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsProcessingMessage(false);
      console.log('🏁 Chat message processing completed');
    }
  };
  
  const handleImageUpload = async (files: FileList) => {
    const maxFiles = 5; // Limit to 5 images
    const maxSize = 10 * 1024 * 1024; // 10MB per file
    
    if (uploadedImages.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`);
      return;
    }
    
    const newImages: UploadedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      
      try {
        const base64Data = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        
        newImages.push({
          id: Date.now() + i + '',
          file,
          base64Data,
          mimeType: file.type,
          preview
        });
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
      }
    }
    
    setUploadedImages(prev => [...prev, ...newImages]);
  };
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = (imageId: string) => {
    setUploadedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Clean up preview URLs
      const removed = prev.find(img => img.id === imageId);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };
  
  const clearAllImages = () => {
    uploadedImages.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setUploadedImages([]);
  };
  
  const handleGenerateImage = async () => {
    if (!currentInput.trim() || !isConnected || isProcessingMessage) return;
    
    const imagePrompt = currentInput.trim();
    setCurrentInput('');
    setIsProcessingMessage(true);
    
    console.log('🎨 Starting image generation:', { imagePrompt, uploadedImageCount: uploadedImages.length, provider: selectedProvider, model: selectedModel });
    
    try {
      // Add user prompt as message (include uploaded images info)
      const userContent = uploadedImages.length > 0 
        ? `🎨 Image prompt: ${imagePrompt} (with ${uploadedImages.length} uploaded image${uploadedImages.length > 1 ? 's' : ''})`
        : `🎨 Image prompt: ${imagePrompt}`;
      
      const userMsg: Message = {
        role: 'user',
        content: userContent,
        timestamp: new Date(),
        uploadedImages: uploadedImages.length > 0 ? [...uploadedImages] : undefined
      };
      setMessages(prev => [...prev, userMsg]);
      
      console.log('🔄 Calling generateImage...');
      
      // Generate image with multiple images if available
      const imageData = await appFactory.generateImage(imagePrompt, uploadedImages);
      
      console.log('✅ Image generated successfully. Data length:', imageData.length);
      
      // Add image as assistant message
      const imageMsg: Message = {
        role: 'assistant',
        content: `data:image/png;base64,${imageData}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, imageMsg]);
      
      // Clear uploaded images after generation
      clearAllImages();
      
    } catch (error) {
      console.error('💥 Image generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate image: ${errorMessage}`);
    } finally {
      setIsProcessingMessage(false);
      console.log('🏁 Image generation completed');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isImageModel && chatMode === 'image') {
        handleGenerateImage();
      } else {
        handleSendMessage();
      }
    }
  };
  
  const handleSuggestedPrompt = (prompt: string) => {
    setCurrentInput(prompt);
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        appFactory={appFactory}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        apiKey={apiKey}
        setApiKey={setApiKey}
        apiKeySource={apiKeySource}
        setApiKeySource={setApiKeySource}
        selectedModel={selectedModel}
        setSelectedModel={handleModelChange}
        isConnected={isConnected}
        isLoading={isLoading}
        onProviderSwitch={handleProviderSwitch}
        onSuggestedPrompt={handleSuggestedPrompt}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-2xl font-bold text-gray-900">AI App Factory</h1>
          <p className="text-gray-600">Basic RAG with Provider Switching (OpenAI, Anthropic, Google AI, Grok)</p>
          {isConnected && (
            <div className="mt-2">
              <div className="text-sm text-green-600">
                ✅ Connected to {selectedProvider} {selectedModel}
              </div>
              {selectedModel === 'gemini-2.5-flash-image-preview' && (
                <div className="text-xs text-blue-600 mt-1">
                  🎨 Multimodal model: Supports both chat and image generation with proper response modalities
                </div>
              )}
              {selectedModel === 'gemini-2.0-flash-preview-image-generation' && (
                <div className="text-xs text-blue-600 mt-1">
                  🎨 Multimodal model: Supports both chat and image generation with enhanced visual capabilities
                </div>
              )}
            </div>
          )}
          
          {/* Mode Toggle for Image Models */}
          {isImageModel && (
            <div className="mt-3">
              {/* Both image models now support multimodal functionality */}
                  <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg inline-flex">
                    <button
                      onClick={() => setChatMode('chat')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        chatMode === 'chat'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      💬 Chat
                    </button>
                    <button
                      onClick={() => setChatMode('image')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        chatMode === 'image'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      🎨 Image
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {chatMode === 'chat' 
                      ? 'Chat with text-only responses using proper response modalities'
                      : 'Generate and edit images with text prompts'
                    }
                  </p>
            </div>
          )}
          
          {/* Debug Information */}
          <div className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded">
            🐛 Debug: Model="{selectedModel}" | Mode={chatMode} | IsImageModel={isImageModel.toString()} | IsConnected={isConnected.toString()} | IsLoading={isLoading.toString()} | IsProcessing={isProcessingMessage.toString()}
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <h3 className="text-lg font-medium mb-2">Welcome to AI App Factory!</h3>
              <p>1. Select an AI provider (OpenAI, Anthropic, Google AI, or Grok) and enter your API key</p>
              <p>2. Upload documents (optional)</p>
              <p>3. Start chatting!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Image Upload Zone (only for image models in image mode) */}
        {isImageModel && chatMode === 'image' && (
          <div className={`border-t border-gray-200 p-4 ${isConnected ? 'bg-gray-50' : 'bg-gray-100 opacity-50'}`}>
            {!isConnected && (
              <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                ⚠️ Please connect to Google AI first to enable image upload
              </div>
            )}
            <ErrorBoundary fallback={<div className="text-red-500">Error loading image upload component</div>}>
              <ImageUploadZone
                uploadedImages={uploadedImages}
                onImageUpload={isConnected ? handleImageUpload : () => {}}
                onRemoveImage={removeImage}
                onClearAll={clearAllImages}
              />
            </ErrorBoundary>
          </div>
        )}
        
        {/* Chat Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                !isConnected 
                  ? "Please connect to a provider first" 
                  : isImageModel && chatMode === 'image'
                    ? uploadedImages.length > 0
                      ? `Describe how to modify/combine these ${uploadedImages.length} images...`
                      : "Describe the image you want to generate, or upload images to modify..."
                    : "Type your message..."
              }
              disabled={!isConnected || isProcessingMessage}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              rows={2}
            />
            <button
              onClick={isImageModel && chatMode === 'image' ? handleGenerateImage : handleSendMessage}
              disabled={!isConnected || isProcessingMessage || !currentInput.trim()}
              className={`px-6 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed ${
                isImageModel && chatMode === 'image' 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessingMessage 
                ? '⏳ Processing...' 
                : isImageModel && chatMode === 'image' 
                  ? '🎨 Generate' 
                  : 'Send'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar Component
interface SidebarProps {
  appFactory: AIAppFactory;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  apiKeySource: 'manual' | 'environment' | null;
  setApiKeySource: (source: 'manual' | 'environment' | null) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void | Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  onProviderSwitch: () => void;
  onSuggestedPrompt: (prompt: string) => void;
}

function Sidebar({
  appFactory,
  selectedProvider,
  setSelectedProvider,
  apiKey,
  setApiKey,
  apiKeySource,
  setApiKeySource,
  selectedModel,
  setSelectedModel,
  isConnected,
  isLoading,
  onProviderSwitch,
  onSuggestedPrompt
}: SidebarProps) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const providers = {
    openai: {
      name: 'OpenAI',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      keyPlaceholder: 'sk-...'
    },
    anthropic: {
      name: 'Anthropic',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      keyPlaceholder: 'sk-ant-...'
    },
    google: {
      name: 'Google AI',
      models: ['gemini-2.5-flash-image-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-preview-image-generation'],
      keyPlaceholder: 'AIza...'
    },
    grok: {
      name: 'Grok (X AI)',
      models: ['grok-beta', 'grok-vision-beta'],
      keyPlaceholder: 'xai-...'
    }
  };
  
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setSelectedModel(providers[provider as keyof typeof providers]?.models[0] || '');
    setApiKey('');
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        const content = await readFileContent(file);
        await appFactory.addDocument(content, file.name);
        setUploadedFiles(prev => [...prev, file.name]);
        toast.success(`Added ${file.name} to knowledge base`);
      } else {
        toast.error(`Unsupported file type: ${file.type}`);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };
  
  const clearKnowledge = () => {
    appFactory.clearKnowledge();
    setUploadedFiles([]);
    toast.success('Knowledge base cleared');
  };
  
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🤖 AI Provider
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Provider</option>
            {Object.entries(providers).map(([key, provider]) => (
              <option key={key} value={key}>{provider.name}</option>
            ))}
          </select>
        </div>
        
        {/* Model Selection */}
        {selectedProvider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🧠 Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providers[selectedProvider as keyof typeof providers]?.models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* API Key Input */}
        {selectedProvider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔑 API Key
              {apiKeySource === 'environment' && (
                <span className="ml-2 text-xs text-green-600 font-normal">✅ Loaded from .env</span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setApiKeySource('manual');
              }}
              placeholder={providers[selectedProvider as keyof typeof providers]?.keyPlaceholder}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                apiKeySource === 'environment' 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300'
              }`}
              disabled={apiKeySource === 'environment'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {apiKeySource === 'environment' 
                ? 'Google API key loaded from environment variables (.env file)' 
                : 'Keys are stored in memory only and never saved'
              }
            </p>
          </div>
        )}
        
        {/* Connect Button */}
        {selectedProvider && apiKey && selectedModel && (
          <button
            onClick={onProviderSwitch}
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              isConnected 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Connecting...' : isConnected ? 'Connected ✅' : 'Connect'}
          </button>
        )}
        
        {/* Knowledge Management */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📚 Knowledge Base
          </label>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          <p className="text-xs text-gray-500 mt-1">
            Upload PDF or TXT files to add to knowledge base
          </p>
          
          {uploadedFiles.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Uploaded Files ({uploadedFiles.length})
                </span>
                <button
                  onClick={clearKnowledge}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    📄 {file}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Suggested Prompts */}
        {isConnected && (
          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💡 Try These Prompts
            </label>
            <div className="space-y-2">
              <SuggestedPrompt 
                text="What can you help me with?" 
                onClick={onSuggestedPrompt}
              />
              <SuggestedPrompt 
                text="Summarize the uploaded documents" 
                onClick={onSuggestedPrompt}
              />
              <SuggestedPrompt 
                text="What are the key insights from the knowledge base?" 
                onClick={onSuggestedPrompt}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Message Bubble Component
interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl rounded-lg px-4 py-2 ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900 border border-gray-200'
      }`}>
        <div className="flex items-start space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isUser ? 'bg-blue-700' : 'bg-gray-300'
          }`}>
            {isUser ? '👤' : '🤖'}
          </div>
          <div className="flex-1">
            {/* Show uploaded images for user messages */}
            {isUser && message.uploadedImages && message.uploadedImages.length > 0 && (
              <div className="space-y-2 mb-2">
                <div className="grid grid-cols-2 gap-2">
                  {message.uploadedImages.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.preview}
                        alt={image.file.name}
                        className="w-full h-16 object-cover rounded border border-blue-300"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b truncate">
                        {image.file.name}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs opacity-75">Uploaded images</p>
              </div>
            )}
            
            {/* Show generated image for assistant messages */}
            {!isUser && message.content.startsWith('data:image/') ? (
              <div className="space-y-2">
                <img 
                  src={message.content} 
                  alt="Generated image" 
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                  style={{ maxHeight: '400px' }}
                />
                <p className="text-sm opacity-75">Generated image</p>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
            <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Suggested Prompt Component
interface SuggestedPromptProps {
  text: string;
  onClick: (text: string) => void;
}

function SuggestedPrompt({ text, onClick }: SuggestedPromptProps) {
  return (
    <button
      onClick={() => onClick(text)}
      className="w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded border border-blue-200 hover:border-blue-300 transition-colors"
    >
      {text}
    </button>
  );
}

// Image Upload Zone Component
interface ImageUploadZoneProps {
  uploadedImages: UploadedImage[];
  onImageUpload: (files: FileList) => void;
  onRemoveImage: (imageId: string) => void;
  onClearAll: () => void;
}

function ImageUploadZone({ uploadedImages, onImageUpload, onRemoveImage, onClearAll }: ImageUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files) {
      onImageUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onImageUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          📸 Images for Generation (Max 5)
        </label>
        {uploadedImages.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Clear All
          </button>
        )}
      </div>
      
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-gray-500">
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm">
            Drop images here or <span className="text-blue-600">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PNG, JPEG, WebP • Max 10MB each
          </p>
        </div>
      </div>

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={image.preview}
                alt={image.file.name}
                className="w-full h-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => onRemoveImage(image.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                ×
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                {image.file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage Hints */}
      {uploadedImages.length > 0 && (
        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
          💡 Try prompts like: "Combine these images", "Apply the style from image 1 to image 2", "Place the object from the first image into the scene from the second"
        </div>
      )}
    </div>
  );
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('🚨 ImageUploadZone Error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ImageUploadZone Error Details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

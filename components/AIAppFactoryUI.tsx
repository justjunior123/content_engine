// React UI Components for AI App Factory
// Streamlit-inspired clean interface with sidebar + chat

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { AIAppFactory, Message } from '../lib/ai-app-factory';

// Main App Component
export default function AIAppFactoryUI() {
  const [appFactory] = useState(() => new AIAppFactory());
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  
  const handleSendMessage = async () => {
    if (!currentInput.trim() || !isConnected || isLoading) return;
    
    const userMessage = currentInput.trim();
    setCurrentInput('');
    setIsLoading(true);
    
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
      
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
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
            <div className="mt-2 text-sm text-green-600">
              ✅ Connected to {selectedProvider} {selectedModel}
            </div>
          )}
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
        
        {/* Chat Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Please connect to a provider first"}
              disabled={!isConnected || isLoading}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || isLoading || !currentInput.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Send'}
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
  selectedModel: string;
  setSelectedModel: (model: string) => void;
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
      models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
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
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={providers[selectedProvider as keyof typeof providers]?.keyPlaceholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Keys are stored in memory only and never saved
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
            <div className="whitespace-pre-wrap">{message.content}</div>
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

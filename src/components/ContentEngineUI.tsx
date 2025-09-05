// React UI Components for Content Engine
// Clean separated component architecture with sidebar + chat
// Streamlit-inspired interface with modular design

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ContentEngine } from '@/lib/content-engine';
import { Message, UploadedImage } from '@/types/chat.types';
import { fileToBase64 } from '@/utils/file-helpers';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/ui';
import { ChatInterface } from '@/components/chat';
import { ImageUploadZone } from '@/components/image';
import { ErrorBoundary } from '@/components/ui';

// Main App Component
export default function ContentEngineUI() {
  // =====================================
  // STATE MANAGEMENT
  // =====================================
  const [appFactory] = useState(() => new ContentEngine());
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For provider connection
  const [isProcessingMessage, setIsProcessingMessage] = useState(false); // For chat/image processing
  const [selectedProvider, setSelectedProvider] = useState('google'); // Default to google since it's env-only
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image-preview'); // Default model
  const [isConnected, setIsConnected] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [chatMode, setChatMode] = useState<'chat' | 'image'>('chat');
  
  // =====================================
  // COMPUTED VALUES
  // =====================================
  // Check if current model supports image generation
  const isImageModel = selectedModel === 'gemini-2.5-flash-image-preview' || selectedModel === 'gemini-2.0-flash-preview-image-generation';
  
  // Both image models now support chat and image generation with proper response modalities
  const isImageOnlyModel = false; // No models are image-only anymore
  
  // =====================================
  // EFFECTS AND LIFECYCLE
  // =====================================
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
  
  // Reset chat mode and clear images when switching models
  useEffect(() => {
    if (!isImageModel) {
      if (uploadedImages.length > 0) {
        clearAllImages();
      }
      // Set to chat mode for non-image models
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
  
  
  // =====================================
  // UTILITY FUNCTIONS
  // =====================================
  
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
  
  // =====================================
  
  // EVENT HANDLERS
  // =====================================
  const handleProviderSwitch = async () => {
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select provider and choose model');
      return;
    }
    
    setIsLoading(true);
    // API key will be read from environment variables server-side
    const result = await appFactory.switchProvider(selectedProvider, '', selectedModel);
    
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
    if (isConnected && selectedProvider) {
      setIsLoading(true);
      toast(`🔄 Switching to ${newModel}...`);
      
      try {
        // API key will be read from environment variables server-side
        const result = await appFactory.switchProvider(selectedProvider, '', newModel);
        
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
      } catch (streamError) {
        throw streamError; // Re-throw to be caught by outer catch
      }
      
    } catch (error) {
      console.error('Chat message failed:', error);
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
  
  const handleGenerateImage = async () => {
    if (!currentInput.trim() || !isConnected || isProcessingMessage) return;
    
    const imagePrompt = currentInput.trim();
    setCurrentInput('');
    setIsProcessingMessage(true);
    
    
    try {
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
      
      
      const imageData = await appFactory.generateImage(imagePrompt, uploadedImages);
      
      
      const imageMsg: Message = {
        role: 'assistant',
        content: `data:image/png;base64,${imageData}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, imageMsg]);
      
      clearAllImages();
      
    } catch (error) {
      console.error('Image generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate image: ${errorMessage}`);
    } finally {
      setIsProcessingMessage(false);
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
      <Sidebar
        appFactory={appFactory}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        selectedModel={selectedModel}
        setSelectedModel={handleModelChange}
        isConnected={isConnected}
        isLoading={isLoading}
        onProviderSwitch={handleProviderSwitch}
        onSuggestedPrompt={handleSuggestedPrompt}
      />
      
      <div className="flex-1 flex flex-col">
        <Header
          isConnected={isConnected}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          isImageModel={isImageModel}
          chatMode={chatMode}
          setChatMode={setChatMode}
          isLoading={isLoading}
          isProcessingMessage={isProcessingMessage}
        />
        
        <ChatInterface
          messages={messages}
          currentInput={currentInput}
          setCurrentInput={setCurrentInput}
          isConnected={isConnected}
          isProcessingMessage={isProcessingMessage}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          isImageModel={isImageModel}
          chatMode={chatMode}
          uploadedImages={uploadedImages}
          onSendMessage={handleSendMessage}
          onGenerateImage={handleGenerateImage}
          onKeyPress={handleKeyPress}
        />
        
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
      </div>
    </div>
  );
}

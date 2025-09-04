import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AIAppFactory, Message, UploadedImage } from '@/lib/ai-app-factory';
import { Sidebar } from './sidebar/Sidebar';
import { Header } from './ui/Header';
import { ChatInterface } from './chat/ChatInterface';
import { ImageUploadZone } from './image/ImageUploadZone';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { fileToBase64 } from '@/utils/file-helpers';

export default function AIAppFactoryUI() {
  const [appFactory] = useState(() => new AIAppFactory());
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('google');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image-preview');
  const [isConnected, setIsConnected] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [chatMode, setChatMode] = useState<'chat' | 'image'>('chat');
  
  // Check if current model supports image generation
  const isImageModel = selectedModel === 'gemini-2.5-flash-image-preview' || selectedModel === 'gemini-2.0-flash-preview-image-generation';
  
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
  
  const handleProviderSwitch = async () => {
    if (!selectedProvider || !selectedModel) {
      toast.error('Please select provider and choose model');
      return;
    }
    
    setIsLoading(true);
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
    const currentIsImageModel = selectedModel === 'gemini-2.5-flash-image-preview' || selectedModel === 'gemini-2.0-flash-preview-image-generation';
    const newIsImageModel = newModel === 'gemini-2.5-flash-image-preview' || newModel === 'gemini-2.0-flash-preview-image-generation';
    
    if (currentIsImageModel && !newIsImageModel) {
      setChatMode('chat');
      if (uploadedImages.length > 0) {
        clearAllImages();
      }
    }
    
    setSelectedModel(newModel);
    
    if (isConnected && selectedProvider) {
      setIsLoading(true);
      toast(`🔄 Switching to ${newModel}...`);
      
      try {
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
    
    console.log('🚀 Starting chat message processing:', { userMessage, provider: selectedProvider, model: selectedModel });
    
    try {
      const userMsg: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      
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
        throw streamError;
      }
      
    } catch (error) {
      console.error('💥 Chat message failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to send message: ${errorMessage}`);
      
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
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024;
    
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
  
  const removeImage = (imageId: string) => {
    setUploadedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
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
      
      const imageData = await appFactory.generateImage(imagePrompt, uploadedImages);
      
      console.log('✅ Image generated successfully. Data length:', imageData.length);
      
      const imageMsg: Message = {
        role: 'assistant',
        content: `data:image/png;base64,${imageData}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, imageMsg]);
      
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
      </div>
    </div>
  );
}
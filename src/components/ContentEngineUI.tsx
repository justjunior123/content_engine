// React UI Components for Content Engine
// Clean separated component architecture with sidebar + chat
// Streamlit-inspired interface with modular design

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ContentEngine } from '@/lib/content-engine';
import { Message, UploadedImage } from '@/types/chat.types';
import { CampaignBrief, CampaignPrompt, CampaignProgress } from '@/types/campaign.types';
import { fileToBase64 } from '@/utils/file-helpers';
import { generateCampaignPrompts, generatePromptSummary, validateAndEnhanceBrief } from '@/lib/campaign-prompt-generator';
import { CampaignResult } from '@/types/campaign.types';
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
  const [chatMode, setChatMode] = useState<'chat' | 'image' | 'campaign'>('chat');
  
  // Campaign-specific state
  const [campaignBrief, setCampaignBrief] = useState<CampaignBrief | null>(null);
  const [campaignPrompts, setCampaignPrompts] = useState<CampaignPrompt[]>([]);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>({
    current: 0,
    total: 0,
    currentProduct: '',
    currentFormat: '',
    status: 'generating'
  });
  
  // =====================================
  // COMPUTED VALUES
  // =====================================
  // Check if current model supports image generation
  const isImageModel = selectedModel === 'gemini-2.5-flash-image-preview' || selectedModel === 'gemini-2.0-flash-preview-image-generation';
  
  // Both image models now support chat and image generation with proper response modalities
  const isImageOnlyModel = false; // No models are image-only anymore
  
  // Campaign mode is available when connected to image model
  const isCampaignModeAvailable = isImageModel && isConnected;
  
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
  
  // Reset campaign data when switching away from campaign mode or disconnecting
  useEffect(() => {
    if (chatMode !== 'campaign' || !isCampaignModeAvailable) {
      if (campaignBrief || campaignPrompts.length > 0) {
        setCampaignBrief(null);
        setCampaignPrompts([]);
        setCampaignProgress({
          current: 0,
          total: 0,
          currentProduct: '',
          currentFormat: '',
          status: 'generating'
        });
      }
    }
  }, [chatMode, isCampaignModeAvailable]);
  
  
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
  
  // =====================================
  // CAMPAIGN HANDLERS
  // =====================================
  
  const validateCampaignBrief = (data: any): CampaignBrief => {
    if (!data.campaignId || typeof data.campaignId !== 'string') {
      throw new Error('Campaign ID is required and must be a string');
    }
    
    if (!Array.isArray(data.products) || data.products.length === 0) {
      throw new Error('Products array is required and must not be empty');
    }
    
    for (const product of data.products) {
      if (!product.name || !product.category || !Array.isArray(product.keyFeatures)) {
        throw new Error('Each product must have name, category, and keyFeatures array');
      }
    }
    
    if (!data.targetRegion || !data.targetAudience || !data.campaignMessage) {
      throw new Error('targetRegion, targetAudience, and campaignMessage are required');
    }
    
    if (!data.brandGuidelines || !Array.isArray(data.brandGuidelines.colors) || 
        !Array.isArray(data.brandGuidelines.fonts) || !data.brandGuidelines.tone) {
      throw new Error('brandGuidelines must include colors array, fonts array, and tone');
    }
    
    return data as CampaignBrief;
  };
  
  const handleCampaignUpload = async (files: FileList) => {
    if (!files.length) return;
    
    const file = files[0];
    
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON campaign brief');
      return;
    }
    
    if (file.size > 1024 * 1024) { // 1MB limit
      toast.error('Campaign brief file too large (max 1MB)');
      return;
    }
    
    try {
      setIsProcessingMessage(true);
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate campaign brief structure
      const validatedBrief = validateCampaignBrief(data);
      
      setCampaignBrief(validatedBrief);
      setCampaignPrompts([]); // Clear previous prompts
      
      const totalAssets = validatedBrief.products.length * 3; // 3 aspect ratios
      toast.success(`✅ Campaign loaded: ${validatedBrief.products.length} products, ${totalAssets} assets to generate`);
      
    } catch (error) {
      console.error('Campaign brief upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      toast.error(`Failed to load campaign brief: ${errorMessage}`);
      setCampaignBrief(null);
    } finally {
      setIsProcessingMessage(false);
    }
  };
  
  const handleGenerateCampaignPrompts = async () => {
    if (!campaignBrief || !isCampaignModeAvailable) return;
    
    setIsProcessingMessage(true);
    toast('🧠 Generating smart prompts...');
    
    try {
      console.log('🎯 Starting campaign prompt generation...');
      
      // Validate and enhance brief
      const enhancedBrief = validateAndEnhanceBrief({ ...campaignBrief });
      
      // Generate optimized prompts
      const prompts = await generateCampaignPrompts(enhancedBrief);
      setCampaignPrompts(prompts);
      
      // Generate summary for user feedback
      const summary = generatePromptSummary(prompts);
      console.log('📊 Prompt generation summary:', summary);
      
      toast.success(`✅ Generated ${prompts.length} optimized prompts`);
      
    } catch (error) {
      console.error('Campaign prompt generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate prompts: ${errorMessage}`);
      setCampaignPrompts([]);
    } finally {
      setIsProcessingMessage(false);
    }
  };
  
  const handleGenerateCampaignAssets = async () => {
    if (!campaignBrief || !campaignPrompts.length || !isCampaignModeAvailable) return;
    
    setIsProcessingMessage(true);
    
    // Reset progress
    setCampaignProgress({
      current: 0,
      total: campaignPrompts.length,
      currentProduct: '',
      currentFormat: '',
      status: 'generating'
    });
    
    toast('🚀 Starting campaign asset generation...');
    
    try {
      console.log(`🎯 Starting campaign generation for ${campaignPrompts.length} assets...`);
      
      // Create EventSource for real-time progress updates
      const response = await fetch('/api/campaign-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignBrief,
          campaignPrompts
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Process Server-Sent Events stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('📡 Campaign generation stream completed');
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('📊 Progress update:', data);
              
              if (data.type === 'progress') {
                // Update progress state
                setCampaignProgress({
                  current: data.current,
                  total: data.total,
                  currentProduct: data.product,
                  currentFormat: data.aspectRatio,
                  status: data.status
                });
                
                if (data.status === 'generating') {
                  toast(`🎨 Generating ${data.product} ${data.aspectRatio} (${data.current}/${data.total})`);
                } else if (data.status === 'completed') {
                  toast.success(`✅ Completed ${data.product} ${data.aspectRatio}`);
                } else if (data.status === 'error') {
                  toast.error(`❌ Failed ${data.product} ${data.aspectRatio}: ${data.error}`);
                }
                
              } else if (data.type === 'complete') {
                // Campaign generation completed
                console.log('🎉 Campaign generation completed:', data);
                
                setCampaignProgress({
                  current: data.totalCount,
                  total: data.totalCount,
                  currentProduct: '',
                  currentFormat: '',
                  status: 'completed'
                });
                
                toast.success(
                  `🎉 Campaign completed! Generated ${data.successCount}/${data.totalCount} assets (${data.summary.successRate}% success rate)`
                );
                
                // Add completion message to chat
                const completionMsg: Message = {
                  role: 'assistant',
                  content: `Campaign "${campaignBrief.campaignId}" completed successfully!\\n\\n📊 Results:\\n- Total assets: ${data.totalCount}\\n- Successful: ${data.successCount}\\n- Failed: ${data.errorCount}\\n- Success rate: ${data.summary.successRate}%\\n\\n🚩 Campaign assets are now ready for Claude review. Check the output/${data.campaignId}/ folder for organized assets.`,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, completionMsg]);
                
              } else if (data.type === 'error') {
                // Campaign generation failed
                throw new Error(data.error || 'Campaign generation failed');
              }
              
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Campaign generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Campaign generation failed: ${errorMessage}`);
      
      // Reset progress on error
      setCampaignProgress({
        current: 0,
        total: 0,
        currentProduct: '',
        currentFormat: '',
        status: 'generating'
      });
      
    } finally {
      setIsProcessingMessage(false);
    }
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
          isCampaignModeAvailable={isCampaignModeAvailable}
          campaignProgress={campaignProgress}
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
          campaignBrief={campaignBrief}
          campaignPrompts={campaignPrompts}
          onCampaignUpload={handleCampaignUpload}
        />
        
        {/* Campaign Preview and Progress */}
        {chatMode === 'campaign' && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {!isCampaignModeAvailable && (
              <div className="text-center text-gray-500 py-8">
                <p>⚠️ Campaign mode requires connection to an image model</p>
                <p className="text-sm mt-2">Please connect to Google AI first</p>
              </div>
            )}
            
            {isCampaignModeAvailable && !campaignBrief && (
              <div className="text-center py-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => e.target.files && handleCampaignUpload(e.target.files)}
                    className="hidden"
                    id="campaign-upload"
                  />
                  <label 
                    htmlFor="campaign-upload" 
                    className="cursor-pointer block text-center"
                  >
                    <div className="text-4xl mb-2">📄</div>
                    <h3 className="text-lg font-semibold text-gray-700">Upload Campaign Brief</h3>
                    <p className="text-gray-500 mt-1">Drop your JSON campaign brief here or click to browse</p>
                    <div className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block">
                      Choose File
                    </div>
                  </label>
                </div>
              </div>
            )}
            
            {campaignBrief && (
              <div className="campaign-preview bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Campaign: {campaignBrief.campaignId}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="font-medium">Products:</span> {campaignBrief.products.map(p => p.name).join(', ')}</p>
                    <p><span className="font-medium">Target:</span> {campaignBrief.targetAudience}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">Region:</span> {campaignBrief.targetRegion}</p>
                    <p><span className="font-medium">Assets to generate:</span> {campaignBrief.products.length * 3}</p>
                  </div>
                </div>
                <p className="mt-2 text-blue-800"><span className="font-medium">Message:</span> "{campaignBrief.campaignMessage}"</p>
                
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleGenerateCampaignPrompts}
                    disabled={isProcessingMessage}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingMessage ? '🧠 Generating...' : '🧠 Generate Smart Prompts'}
                  </button>
                  
                  {campaignPrompts.length > 0 && (
                    <button
                      onClick={handleGenerateCampaignAssets}
                      disabled={isProcessingMessage}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingMessage ? '🚀 Generating...' : `🚀 Generate Assets (${campaignPrompts.length})`}
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {campaignPrompts.length > 0 && (
              <div className="campaign-prompts bg-green-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-green-900 mb-2">🎯 Generated Prompts</h4>
                <p className="text-sm text-green-800 mb-3">
                  {generatePromptSummary(campaignPrompts)}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {campaignPrompts.slice(0, 6).map((prompt, index) => (
                    <div key={index} className="bg-white p-2 rounded border">
                      <strong>{prompt.productName}</strong> ({prompt.aspectRatio})
                      <p className="text-gray-600 mt-1 truncate">
                        {prompt.generatedPrompt.substring(0, 80)}...
                      </p>
                    </div>
                  ))}
                  {campaignPrompts.length > 6 && (
                    <div className="text-center text-gray-500 flex items-center justify-center">
                      +{campaignPrompts.length - 6} more prompts
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(campaignProgress.status === 'generating' || campaignProgress.status === 'completed') && campaignProgress.total > 0 && (
              <div className="campaign-progress bg-green-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-green-900 mb-2">🎨 Generation Progress</h4>
                <div className="text-sm text-green-800">
                  Generating {campaignProgress.currentProduct} {campaignProgress.currentFormat} 
                  ({campaignProgress.current}/{campaignProgress.total})
                </div>
                <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(campaignProgress.current / campaignProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
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

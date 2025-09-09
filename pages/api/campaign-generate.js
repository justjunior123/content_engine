// API endpoint for batch campaign image generation
// Extends existing google-generate-image.js with sequential processing and file organization

import { 
  saveAssetWithMetadata, 
  createReviewFlag, 
  generateCampaignId, 
  ensureDirectoryStructure,
  createDirectoryIndex,
  loadAssetsAsBase64,
  getMimeType
} from '@/src/lib/campaign-file-manager';

import { generateMultiImagePrompts } from '@/src/lib/campaign-prompt-generator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignBrief, campaignPrompts } = req.body;
  
  if (!campaignBrief) {
    return res.status(400).json({ 
      error: 'Campaign brief is required' 
    });
  }

  console.log(`🚀 Starting campaign generation: ${campaignBrief.campaignId}`);
  console.log(`🎨 Using multi-image asset generation`);
  
  // Load available assets
  const availableAssets = await loadAssetsAsBase64(
    campaignBrief.products.map(p => p.name)
  );
  console.log(`📦 Loaded ${availableAssets.length} assets from input/assets/`);
  
  // Generate multi-image prompts with asset awareness
  const enhancedPrompts = await generateMultiImagePrompts(campaignBrief, availableAssets);
  const totalPrompts = enhancedPrompts.length;
  console.log(`📝 Generated ${totalPrompts} multi-image prompts`);
  console.log(`🎯 Total prompts to process: ${totalPrompts}`);

  try {
    // Ensure directory structure exists
    await ensureDirectoryStructure();
    
    const campaignId = generateCampaignId();
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Set up Server-Sent Events for real-time progress updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });
    
    console.log(`🎯 Starting sequential generation for campaign: ${campaignId}`);
    
    // Sequential generation to avoid quota limits
    for (const [index, promptData] of enhancedPrompts.entries()) {
      const prompt = promptData.prompt;
      const assets = promptData.assets || [];
      
      const progress = {
        type: 'progress',
        current: index + 1,
        total: totalPrompts,
        product: prompt.productName,
        aspectRatio: prompt.aspectRatio,
        status: 'generating',
        campaignId,
        assetsUsed: assets.length
      };
      
      const generationMethod = assets.length > 0 ? 'multi-image' : 'text-only';
      console.log(`🎨 [${index + 1}/${totalPrompts}] Generating ${generationMethod}: ${prompt.productName} ${prompt.aspectRatio}`);
      if (assets.length > 0) {
        console.log(`🖼️ Using ${assets.length} assets: ${assets.map(a => a.filename).join(', ')}`);
      }
      
      // Send progress update
      res.write(`data: ${JSON.stringify(progress)}\\n\\n`);
      
      try {
        // Generate image with or without assets
        const imageResult = assets.length > 0 
          ? await generateWithMultipleAssets(prompt.generatedPrompt, assets)
          : await generateSingleImage(prompt.generatedPrompt);
        
        if (!imageResult.success) {
          throw new Error(imageResult.error || 'Image generation failed');
        }
        
        // Save asset with organized structure and asset metadata
        const assetPath = await saveAssetWithMetadata({
          campaignId,
          productName: prompt.productName,
          aspectRatio: prompt.aspectRatio,
          imageData: imageResult.imageData,
          prompt: prompt.generatedPrompt,
          brandContext: prompt.brandContext,
          usedAssets: assets.map(a => a.filename)
        });
        
        const result = {
          ...prompt,
          assetPath,
          success: true,
          generatedAt: new Date().toISOString(),
          usedAssets: assets.map(a => a.filename),
          generationMethod: assets.length > 0 ? 'multi-image-composition' : 'text-to-image'
        };
        
        results.push(result);
        successCount++;
        
        console.log(`✅ [${index + 1}/${totalPrompts}] Success: ${prompt.productName} ${prompt.aspectRatio} (${generationMethod})`);
        
        // Send completion update
        const completedProgress = { 
          ...progress, 
          status: 'completed',
          generationMethod: assets.length > 0 ? 'multi-image-composition' : 'text-to-image'
        };
        res.write(`data: ${JSON.stringify(completedProgress)}\\n\\n`);
        
      } catch (genError) {
        console.error(`❌ [${index + 1}/${totalPrompts}] Failed: ${prompt.productName} ${prompt.aspectRatio}:`, genError);
        
        const result = {
          ...prompt,
          assetPath: null,
          success: false,
          error: genError.message || 'Unknown generation error',
          generatedAt: new Date().toISOString(),
          usedAssets: assets.map(a => a.filename),
          generationMethod: assets.length > 0 ? 'multi-image-composition' : 'text-to-image'
        };
        
        results.push(result);
        errorCount++;
        
        // Send error update
        const errorProgress = { 
          ...progress, 
          status: 'error', 
          error: genError.message || 'Generation failed' 
        };
        res.write(`data: ${JSON.stringify(errorProgress)}\\n\\n`);
        
        // Continue with next asset instead of failing entire campaign
        continue;
      }
      
      // Brief delay between generations to avoid rate limits
      if (index < totalPrompts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`📊 Campaign generation complete: ${successCount} success, ${errorCount} errors`);
    
    // Create review flag for Claude MCP monitoring
    try {
      await createReviewFlag(campaignId, campaignBrief, results);
      console.log(`🚩 Review flag created for campaign: ${campaignId}`);
    } catch (flagError) {
      console.error('⚠️ Failed to create review flag:', flagError);
    }
    
    // Create directory index for organized browsing
    try {
      await createDirectoryIndex(campaignId);
      console.log(`📇 Directory index created for campaign: ${campaignId}`);
    } catch (indexError) {
      console.error('⚠️ Failed to create directory index:', indexError);
    }
    
    // Send final completion event
    const finalResult = {
      type: 'complete',
      campaignId,
      successCount,
      errorCount,
      totalCount: results.length,
      results: results.filter(r => r.success).slice(0, 5), // Sample of successful results
      summary: {
        totalAssets: results.length,
        successful: successCount,
        failed: errorCount,
        successRate: Math.round((successCount / results.length) * 100)
      }
    };
    
    res.write(`data: ${JSON.stringify(finalResult)}\\n\\n`);
    console.log(`🎉 Campaign ${campaignId} completed successfully!`);
    
  } catch (error) {
    console.error('❌ Campaign generation error:', error);
    
    const errorResult = {
      type: 'error',
      error: error.message || 'Campaign generation failed',
      details: error.stack
    };
    
    res.write(`data: ${JSON.stringify(errorResult)}\\n\\n`);
  } finally {
    res.end();
  }
}

// Generate image with multiple assets using Gemini's multi-image composition
async function generateWithMultipleAssets(prompt, assets) {
  try {
    console.log(`🖼️ Generating with ${assets.length} input assets`);
    
    // Check if environment variable exists
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }

    // Initialize Google AI SDK
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    // Use gemini-2.0 model for multi-image generation
    const model = 'gemini-2.0-flash-preview-image-generation';
    
    console.log(`🎨 Using model: ${model} with multi-image composition`);
    
    // Build contents array with text + multiple images
    const contents = [prompt]; // Text prompt first
    
    // Add each asset as image input
    for (const asset of assets) {
      contents.push({
        inlineData: {
          mimeType: getMimeType(asset.filename),
          data: asset.base64Data
        }
      });
    }
    
    console.log(`📝 Sending ${contents.length} content items (1 text + ${assets.length} images)`);
    
    let result;
    if (model === 'gemini-2.0-flash-preview-image-generation') {
      // 2.0 model requires response modalities configuration
      const { Modality } = await import('@google/genai');
      result = await genAI.models.generateContent({
        model: model,
        contents: contents,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE]
        }
      });
    } else {
      // Fallback for other models
      result = await genAI.models.generateContent({
        model: model,
        contents: contents
      });
    }
    
    // Extract image data using existing parsing logic
    let imageData = null;
    
    if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
      const parts = result.candidates[0].content.parts;
      
      for (const [index, part] of parts.entries()) {
        // Strategy 1: Check part.inlineData.data (most common)
        if (part.inlineData && part.inlineData.data) {
          imageData = part.inlineData.data;
          console.log(`✅ Multi-image composition successful via inlineData.data (${imageData.length} chars)`);
          break;
        }
        
        // Strategy 2: Check alternative naming
        if (part.inline_data && part.inline_data.data) {
          imageData = part.inline_data.data;
          console.log(`✅ Multi-image composition successful via inline_data.data (${imageData.length} chars)`);
          break;
        }
      }
    }
    
    if (!imageData) {
      throw new Error('No image data returned from multi-image composition');
    }
    
    return {
      success: true,
      imageData: imageData
    };
    
  } catch (genError) {
    console.error('Multi-image generation error:', genError);
    
    // Handle common Google AI errors gracefully
    let errorMessage = genError.message || 'Unknown error';
    
    if (genError.status === 429) {
      errorMessage = 'API quota exceeded - please wait and try again';
    } else if (genError.status === 401 || genError.status === 403) {
      errorMessage = 'Authentication failed - check API key';
    } else if (genError.status === 404) {
      errorMessage = 'Model not found or unavailable';
    } else if (genError.status >= 500) {
      errorMessage = 'Google AI service temporarily unavailable';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Generate single image using existing google-generate-image logic (fallback)
async function generateSingleImage(prompt) {
  try {
    console.log(`📸 Generating image with prompt length: ${prompt.length} chars`);
    
    // Check if environment variable exists
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }

    // Initialize Google AI SDK (reuse existing pattern)
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    // Use gemini-2.0 model for image generation (most reliable for campaign work)
    const model = 'gemini-2.0-flash-preview-image-generation';
    
    console.log(`🎨 Using model: ${model}`);
    
    let result;
    if (model === 'gemini-2.0-flash-preview-image-generation') {
      // 2.0 model requires response modalities configuration
      const { Modality } = await import('@google/genai');
      result = await genAI.models.generateContent({
        model: model,
        contents: [prompt],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE]
        }
      });
    } else {
      // Fallback for other models
      result = await genAI.models.generateContent({
        model: model,
        contents: [prompt]
      });
    }
    
    // Extract image data using existing parsing logic
    let imageData = null;
    
    if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
      const parts = result.candidates[0].content.parts;
      
      for (const [index, part] of parts.entries()) {
        // Strategy 1: Check part.inlineData.data (most common)
        if (part.inlineData && part.inlineData.data) {
          imageData = part.inlineData.data;
          console.log(`✅ Image data found via inlineData.data (${imageData.length} chars)`);
          break;
        }
        
        // Strategy 2: Check alternative naming
        if (part.inline_data && part.inline_data.data) {
          imageData = part.inline_data.data;
          console.log(`✅ Image data found via inline_data.data (${imageData.length} chars)`);
          break;
        }
      }
    }
    
    if (!imageData) {
      throw new Error('No image data returned from Google AI');
    }
    
    return {
      success: true,
      imageData: imageData
    };
    
  } catch (genError) {
    console.error('Single image generation error:', genError);
    
    // Handle common Google AI errors gracefully
    let errorMessage = genError.message || 'Unknown error';
    
    if (genError.status === 429) {
      errorMessage = 'API quota exceeded - please wait and try again';
    } else if (genError.status === 401 || genError.status === 403) {
      errorMessage = 'Authentication failed - check API key';
    } else if (genError.status === 404) {
      errorMessage = 'Model not found or unavailable';
    } else if (genError.status >= 500) {
      errorMessage = 'Google AI service temporarily unavailable';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}
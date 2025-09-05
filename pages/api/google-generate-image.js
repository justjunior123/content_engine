// API route for secure server-side Google AI image generation
// Handles image generation requests with model-specific configurations and uploaded images

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model, uploadedImages } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ 
      error: 'Prompt is required and must be a non-empty string' 
    });
  }

  if (!model) {
    return res.status(400).json({ 
      error: 'Model parameter is required' 
    });
  }

  try {
    // Check if environment variable exists
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'GOOGLE_AI_API_KEY environment variable is not set' 
      });
    }

    // Initialize Google AI SDK
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    console.log(`🎨 GoogleProvider: Starting image generation with model ${model}`);
    console.log(`🎨 Prompt: "${prompt}"`);
    
    if (uploadedImages && uploadedImages.length > 0) {
      console.log(`📸 Using ${uploadedImages.length} uploaded image${uploadedImages.length > 1 ? 's' : ''}`);
    }
    
    try {
      // Prepare the contents array for the API call
      let contents = [prompt];
      
      // Add uploaded images if provided
      if (uploadedImages && Array.isArray(uploadedImages) && uploadedImages.length > 0) {
        // Add image data to contents
        for (const img of uploadedImages) {
          if (img.base64Data && img.mimeType) {
            contents.push({
              inlineData: {
                data: img.base64Data,
                mimeType: img.mimeType
              }
            });
          }
        }
      }
      
      console.log('🔄 GoogleProvider: Calling generateContent for image generation...');
      
      let result;
      if (model === 'gemini-2.0-flash-preview-image-generation') {
        // 2.0 model REQUIRES response modalities configuration
        const { Modality } = await import('@google/genai');
        console.log('🔄 Using 2.0 model with required response modalities [TEXT, IMAGE]');
        result = await genAI.models.generateContent({
          model: model,
          contents: contents,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          }
        });
      } else {
        // 2.5 models work with simplified configuration
        console.log('🔄 Using 2.5 model with simplified configuration');
        result = await genAI.models.generateContent({
          model: model,
          contents: contents
        });
      }
      
      console.log('🔍 GoogleProvider: Parsing image generation response...');
      
      // Comprehensive response structure analysis
      console.log('Full response structure:', {
        hasResponse: !!result,
        hasCandidates: !!result.candidates,
        candidatesLength: result.candidates?.length || 0,
        topLevelKeys: Object.keys(result || {})
      });
      
      if (result.candidates?.[0]?.content?.parts) {
        console.log('Response parts count:', result.candidates[0].content.parts.length);
        result.candidates[0].content.parts.forEach((part, index) => {
          console.log(`Part ${index} detailed analysis:`, {
            hasText: !!part.text,
            textLength: part.text?.length || 0,
            hasInlineData: !!part.inlineData,
            hasInline_data: !!part.inline_data,
            hasData: !!part.data,
            allKeys: Object.keys(part),
            partType: typeof part,
            isString: typeof part === 'string',
            stringLength: typeof part === 'string' ? part.length : 0
          });
          
          // Log inline data structure if present
          if (part.inlineData) {
            console.log(`Part ${index} inlineData structure:`, {
              keys: Object.keys(part.inlineData),
              hasData: !!part.inlineData.data,
              dataType: typeof part.inlineData.data,
              dataLength: part.inlineData.data?.length || 0,
              hasMimeType: !!part.inlineData.mimeType,
              mimeType: part.inlineData.mimeType
            });
          }
          
          // Log alternate inline data structure if present
          if (part.inline_data) {
            console.log(`Part ${index} inline_data structure:`, {
              keys: Object.keys(part.inline_data),
              hasData: !!part.inline_data.data,
              dataType: typeof part.inline_data.data,
              dataLength: part.inline_data.data?.length || 0,
              hasMimeType: !!part.inline_data.mimeType,
              mimeType: part.inline_data.mimeType
            });
          }
        });
      } else {
        console.log('❌ No parts found in response structure');
        // Try alternative response structures
        console.log('Alternative response paths:', {
          hasDirectContent: !!result.content,
          hasDirectParts: !!result.parts,
          hasDirectData: !!result.data,
          hasDirectInlineData: !!result.inlineData
        });
      }
      
      // Extract image data from response with comprehensive parsing strategies
      let imageData = null;
      
      if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
        const parts = result.candidates[0].content.parts;
        console.log('🔍 Starting image data extraction from parts...');
        
        for (const [index, part] of parts.entries()) {
          console.log(`🔍 Analyzing part ${index} for image data...`);
          
          // Strategy 1: Check part.inlineData.data (current approach)
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            console.log(`✅ GoogleProvider: Image found via inlineData.data. Length: ${imageData.length} chars`);
            break;
          }
          
          // Strategy 2: Check part.inline_data.data (alternative naming)
          if (part.inline_data && part.inline_data.data) {
            imageData = part.inline_data.data;
            console.log(`✅ GoogleProvider: Image found via inline_data.data. Length: ${imageData.length} chars`);
            break;
          }
          
          // Strategy 3: Check for binary data directly
          if (part.data && typeof part.data === 'string') {
            imageData = part.data;
            console.log(`✅ GoogleProvider: Image found via direct data property. Length: ${imageData.length} chars`);
            break;
          }
          
          // Strategy 4: Check if the part itself has base64-like data
          if (typeof part === 'string' && part.length > 1000 && /^[A-Za-z0-9+/]+=*$/.test(part)) {
            imageData = part;
            console.log(`✅ GoogleProvider: Image found as direct base64 string. Length: ${imageData.length} chars`);
            break;
          }
          
          // Strategy 5: Check nested data structures
          if (part.content && part.content.data) {
            imageData = part.content.data;
            console.log(`✅ GoogleProvider: Image found via content.data. Length: ${imageData.length} chars`);
            break;
          }
          
          // Strategy 6: Check for file_data or fileData
          if (part.file_data && part.file_data.data) {
            imageData = part.file_data.data;
            console.log(`✅ GoogleProvider: Image found via file_data.data. Length: ${imageData.length} chars`);
            break;
          }
          
          if (part.fileData && part.fileData.data) {
            imageData = part.fileData.data;
            console.log(`✅ GoogleProvider: Image found via fileData.data. Length: ${imageData.length} chars`);
            break;
          }
          
          // Strategy 7: Check for blob or buffer data
          if (part.blob && typeof part.blob === 'string') {
            imageData = part.blob;
            console.log(`✅ GoogleProvider: Image found via blob property. Length: ${imageData.length} chars`);
            break;
          }
          
          // Strategy 8: Deep search for any base64-like strings in nested objects
          const deepSearch = (obj, path = '') => {
            for (const [key, value] of Object.entries(obj)) {
              if (typeof value === 'string' && value.length > 1000 && /^[A-Za-z0-9+/]+=*$/.test(value)) {
                console.log(`✅ GoogleProvider: Image found via deep search at ${path}.${key}. Length: ${value.length} chars`);
                return value;
              }
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const result = deepSearch(value, path ? `${path}.${key}` : key);
                if (result) return result;
              }
            }
            return null;
          };
          
          if (!imageData && typeof part === 'object' && part !== null) {
            const deepResult = deepSearch(part, `part${index}`);
            if (deepResult) {
              imageData = deepResult;
              break;
            }
          }
          
          console.log(`❌ No image data found in part ${index}`);
        }
      }
      
      // Alternative parsing if primary structure fails
      if (!imageData) {
        console.log('🔍 Trying alternative response structures...');
        
        // Try direct response paths
        if (result.content && result.content.parts) {
          console.log('🔍 Checking result.content.parts...');
          for (const [index, part] of result.content.parts.entries()) {
            if (part.inlineData && part.inlineData.data) {
              imageData = part.inlineData.data;
              console.log(`✅ GoogleProvider: Image found via alternative path result.content.parts[${index}].inlineData.data`);
              break;
            }
          }
        }
        
        // Try direct parts array
        if (!imageData && result.parts) {
          console.log('🔍 Checking result.parts...');
          for (const [index, part] of result.parts.entries()) {
            if (part.inlineData && part.inlineData.data) {
              imageData = part.inlineData.data;
              console.log(`✅ GoogleProvider: Image found via alternative path result.parts[${index}].inlineData.data`);
              break;
            }
          }
        }
        
        // Try result.data directly
        if (!imageData && result.data && typeof result.data === 'string') {
          imageData = result.data;
          console.log('✅ GoogleProvider: Image found via result.data directly');
        }
      }
      
      // Enhanced debugging for failed cases
      if (!imageData) {
        console.error('❌ GoogleProvider: No image data found in response');
        console.log('Full response keys:', Object.keys(result));
        
        // Try to access the raw response object more thoroughly
        if (result.candidates?.[0]?.content?.parts) {
          result.candidates[0].content.parts.forEach((part, index) => {
            console.log(`Detailed part ${index}:`, {
              allKeys: Object.keys(part),
              stringified: JSON.stringify(part).substring(0, 200) + '...',
              hasBuffer: part instanceof Buffer,
              hasArrayBuffer: part instanceof ArrayBuffer
            });
          });
        }
        
        throw new Error('No image data returned from Google AI');
      }
      
      return res.status(200).json({ 
        success: true,
        imageData: imageData
      });
      
    } catch (genError) {
      console.error('❌ GoogleProvider: Image generation error:', genError);
      console.error('Error details:', {
        status: genError.status,
        statusText: genError.statusText,
        message: genError.message,
        code: genError.code,
        details: genError.details
      });
      
      // Handle different types of Google AI API errors
      
      // Quota exceeded errors (429, RESOURCE_EXHAUSTED)
      if (genError.status === 429 || 
          genError.code === 'RESOURCE_EXHAUSTED' ||
          (genError.message && (
            genError.message.includes('quota') ||
            genError.message.includes('429') ||
            genError.message.includes('RESOURCE_EXHAUSTED') ||
            genError.message.includes('rate limit') ||
            genError.message.includes('too many requests')
          ))) {
        console.log('⚠️ GoogleProvider: API quota/rate limit exceeded');
        return res.status(200).json({ 
          success: false,
          error: 'API quota exceeded. Please wait a moment and try again, or try switching to a different model.',
          errorType: 'quota_exceeded'
        });
      }
      
      // Authentication errors (401, 403)
      if (genError.status === 401 || genError.status === 403 ||
          genError.code === 'UNAUTHENTICATED' || genError.code === 'PERMISSION_DENIED') {
        console.log('⚠️ GoogleProvider: Authentication/permission error');
        return res.status(200).json({
          success: false,
          error: 'Authentication failed. Please check your API key configuration.',
          errorType: 'auth_error'
        });
      }
      
      // Model not found or unavailable (404)
      if (genError.status === 404 || genError.code === 'NOT_FOUND') {
        console.log('⚠️ GoogleProvider: Model not found or unavailable');
        return res.status(200).json({
          success: false,
          error: 'The selected model is not available. Please try a different model.',
          errorType: 'model_not_found'
        });
      }
      
      // Invalid request errors (400)
      if (genError.status === 400 || genError.code === 'INVALID_ARGUMENT') {
        console.log('⚠️ GoogleProvider: Invalid request');
        return res.status(200).json({
          success: false,
          error: 'Invalid request. Please check your input and try again.',
          errorType: 'invalid_request',
          details: genError.message
        });
      }
      
      // Server errors (500+)
      if (genError.status >= 500 || genError.code === 'INTERNAL') {
        console.log('⚠️ GoogleProvider: Google AI server error');
        return res.status(200).json({
          success: false,
          error: 'Google AI service is temporarily unavailable. Please try again in a moment.',
          errorType: 'server_error'
        });
      }
      
      // Generic network errors
      if (genError.code === 'NETWORK_ERROR' || genError.message?.includes('network')) {
        console.log('⚠️ GoogleProvider: Network error');
        return res.status(200).json({
          success: false,
          error: 'Network error occurred. Please check your connection and try again.',
          errorType: 'network_error'
        });
      }
      
      // Safety filter or content policy violations
      if (genError.message?.includes('safety') || genError.message?.includes('policy') || 
          genError.message?.includes('blocked') || genError.code === 'SAFETY') {
        console.log('⚠️ GoogleProvider: Content policy violation');
        return res.status(200).json({
          success: false,
          error: 'Your request was blocked by content safety filters. Please try a different prompt.',
          errorType: 'safety_filter'
        });
      }
      
      // Re-throw for unhandled errors to be caught by outer try-catch
      throw genError;
    }
    
  } catch (error) {
    console.error('Google AI image generation error:', error);
    
    return res.status(500).json({ 
      success: false,
      error: 'Image generation failed: ' + (error.message || 'Unknown error')
    });
  }
}
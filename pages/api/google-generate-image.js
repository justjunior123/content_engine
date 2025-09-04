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
      
      // Extract image data from response
      let imageData = null;
      
      if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
        const parts = result.candidates[0].content.parts;
        
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            console.log(`✅ GoogleProvider: Image generated successfully. Data length: ${imageData.length} chars`);
            break;
          }
        }
      }
      
      if (!imageData) {
        console.error('❌ GoogleProvider: No image data found in response');
        console.log('Response structure:', JSON.stringify(result, null, 2));
        throw new Error('No image data returned from Google AI');
      }
      
      return res.status(200).json({ 
        success: true,
        imageData: imageData
      });
      
    } catch (genError) {
      console.error('❌ GoogleProvider: Image generation error:', genError);
      
      // Handle quota exceeded errors
      if (genError.status === 429 || 
          (genError.message && genError.message.includes('quota')) ||
          (genError.message && genError.message.includes('429'))) {
        return res.status(200).json({ 
          success: false,
          error: 'API quota exceeded. Please wait a moment and try again.'
        });
      }
      
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
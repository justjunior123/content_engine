// API route for secure server-side Google API key validation
// This endpoint validates the environment variable without exposing the actual key

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model: requestedModel } = req.body;

  try {
    // Check if environment variable exists
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        valid: false, 
        error: 'GOOGLE_AI_API_KEY environment variable is not set' 
      });
    }

    // Validate the key by testing it with Google AI
    const { GoogleGenAI, Modality } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    // Smart fallback hierarchy - prioritize requested model, then reliable fallbacks
    const fallbackModels = [
      'gemini-2.5-flash-lite',    // Most reliable, lowest quota usage
      'gemini-2.5-flash',         // Fallback option
      'gemini-2.5-pro'           // Last resort
    ];
    
    // If a specific model was requested, test it first, then fall back to reliable models
    const modelsToTest = requestedModel 
      ? [requestedModel, ...fallbackModels.filter(m => m !== requestedModel)]
      : fallbackModels;
    
    console.log('Starting Google AI API key validation with smart fallback...');
    if (requestedModel) {
      console.log(`Prioritizing requested model: ${requestedModel}`);
    }
    
    // Try each model in cascade until one works or we get a real auth error
    let lastError = null;
    let quotaErrors = [];
    
    for (let i = 0; i < modelsToTest.length; i++) {
      const modelName = modelsToTest[i];
      console.log(`Testing validation with model: ${modelName} (attempt ${i + 1}/${modelsToTest.length})`);
      
      try {
        // Check if this is an image generation model that requires special handling
        const isImageGenerationModel = modelName === 'gemini-2.0-flash-preview-image-generation' || 
                                      modelName === 'gemini-2.5-flash-image-preview';
        
        let result;
        if (isImageGenerationModel) {
          // Image generation models require both TEXT and IMAGE response modalities
          result = await genAI.models.generateContent({
            model: modelName,
            contents: 'Generate a simple test image', // Image generation prompt
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE] // Required for image generation models
            }
          });
        } else {
          // Standard text-only models
          result = await genAI.models.generateContent({
            model: modelName,
            contents: 'Hi' // Minimal test prompt to minimize quota usage
          });
        }
        
        // If we get here without throwing, the key is valid
        console.log(`✅ Google AI API key validation successful using model: ${modelName}`);
        return res.status(200).json({ 
          valid: true,
          message: `API key validation successful using ${modelName}`,
          testedModel: modelName
        });
        
      } catch (apiError) {
        console.log(`Model ${modelName} failed: ${apiError.message}`);
        lastError = apiError;
        
        // Check if it's a quota exceeded error
        const isQuotaError = apiError.status === 429 || 
                           (apiError.message && (
                             apiError.message.includes('quota') ||
                             apiError.message.includes('429') ||
                             apiError.message.includes('RESOURCE_EXHAUSTED')
                           ));
        
        if (isQuotaError) {
          quotaErrors.push({ model: modelName, error: apiError.message });
          console.log(`Quota exceeded for ${modelName}, trying next model...`);
          continue; // Try next model
        } else {
          // Real auth/API error - no point trying other models
          console.error(`Authentication/API error with ${modelName}:`, apiError);
          return res.status(400).json({ 
            valid: false, 
            error: `Invalid Google AI API key or API access denied (tested with ${modelName})`,
            details: apiError.message
          });
        }
      }
    }
    
    // If we get here, all models failed with quota errors
    // This actually means the API key is valid, just quota exhausted
    if (quotaErrors.length > 0) {
      console.log('API key is valid - all models failed due to quota limits only');
      return res.status(200).json({ 
        valid: true,
        message: 'API key validation successful (quota exceeded on all test models indicates valid key)',
        quotaStatus: 'exhausted',
        testedModels: quotaErrors.map(e => e.model)
      });
    }
    
    // Final fallback - if we have a lastError but no quota errors, return it
    console.error('All validation attempts failed:', lastError);
    return res.status(400).json({ 
      valid: false, 
      error: 'Google AI API key validation failed on all test models',
      details: lastError?.message || 'Unknown error'
    });
    
  } catch (error) {
    console.error('Key validation error:', error);
    return res.status(500).json({ 
      valid: false, 
      error: 'Server error during key validation' 
    });
  }
}
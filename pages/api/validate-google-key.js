// API route for secure server-side Google API key validation
// This endpoint validates the environment variable without exposing the actual key

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    // Use only valid Gemini models for testing
    const modelsToTest = [
      'gemini-2.5-flash-image-preview',
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ];
    
    // Try to list models or make a simple call to verify the key works
    try {
      // Simple validation - try to generate a minimal response
      const result = await genAI.models.generateContent({
        model: modelsToTest[0], // Use the first available model
        contents: 'Hello' // Minimal test prompt
      });
      
      // If we get here without throwing, the key is valid
      return res.status(200).json({ 
        valid: true,
        message: 'API key validation successful'
      });
      
    } catch (apiError) {
      console.error('Google AI API validation failed:', apiError);
      
      // Check if it's a quota exceeded error - this means the key is valid but quota is reached
      if (apiError.status === 429 || 
          (apiError.message && apiError.message.includes('quota')) ||
          (apiError.message && apiError.message.includes('429'))) {
        console.log('✅ API key is valid (quota exceeded)');
        return res.status(200).json({ 
          valid: true,
          message: 'API key validation successful (quota exceeded indicates valid key)'
        });
      }
      
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid Google AI API key or API access denied' 
      });
    }
    
  } catch (error) {
    console.error('Key validation error:', error);
    return res.status(500).json({ 
      valid: false, 
      error: 'Server error during key validation' 
    });
  }
}
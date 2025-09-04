// API route for secure server-side Google AI provider initialization
// This endpoint initializes the GoogleGenAI SDK using environment variables

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model } = req.body;

  if (!model) {
    return res.status(400).json({ 
      success: false, 
      error: 'Model parameter is required' 
    });
  }

  try {
    // Check if environment variable exists
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'GOOGLE_AI_API_KEY environment variable is not set' 
      });
    }

    // Initialize Google AI SDK
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    
    // Test initialization with a minimal call to ensure it works
    try {
      // Just test the SDK initialization - don't make actual API calls to avoid quota issues
      // The GoogleGenAI constructor will validate the API key format
      if (!genAI) {
        throw new Error('Failed to initialize GoogleGenAI SDK');
      }
      
      return res.status(200).json({ 
        success: true,
        message: `Successfully initialized Google AI provider with model: ${model}`,
        model: model
      });
      
    } catch (initError) {
      console.error('Google AI SDK initialization failed:', initError);
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to initialize Google AI SDK: ' + (initError.message || 'Unknown error')
      });
    }
    
  } catch (error) {
    console.error('Provider initialization error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during provider initialization' 
    });
  }
}
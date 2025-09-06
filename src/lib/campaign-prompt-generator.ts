// LangChain-powered Campaign Prompt Generation Service
// Generates smart, brand-consistent prompts for social media asset creation

import { PromptTemplate } from "@langchain/core/prompts";
import { CampaignBrief, CampaignPrompt } from "@/types/campaign.types";

// Smart prompt template optimized for different aspect ratios and brand consistency
const CAMPAIGN_PROMPT_TEMPLATE = new PromptTemplate({
  template: `Create a professional product marketing image for social media:

PRODUCT DETAILS:
- Product: {productName}
- Category: {category}
- Key Features: {keyFeatures}
- Target Audience: {targetAudience}
- Campaign Message: "{campaignMessage}"

BRAND REQUIREMENTS:
- Brand Colors: {brandColors}
- Visual Tone: {brandTone}
- Required Elements: {requiredElements}

TECHNICAL SPECIFICATIONS:
- Aspect Ratio: {aspectRatio}
- Platform Optimization: {platformOptimization}
- Composition Style: {compositionGuide}

CREATIVE DIRECTION:
Generate a high-quality, photorealistic product image that:

1. PRODUCT FOCUS: Showcase the {productName} prominently with clear visibility of its key features: {keyFeatures}

2. BRAND CONSISTENCY: 
   - Use brand color palette: {brandColors}
   - Maintain {brandTone} visual aesthetic
   - Include required brand elements: {requiredElements}

3. AUDIENCE APPEAL: Design to resonate with {targetAudience}, conveying the message "{campaignMessage}"

4. FORMAT OPTIMIZATION: {formatSpecificGuidance}

5. COMPOSITION: {compositionDetails}

Style: Professional product photography, clean and modern, high resolution, excellent lighting, premium quality aesthetic, marketing-ready commercial image.`,

  inputVariables: [
    "productName", "category", "keyFeatures", "targetAudience", "campaignMessage",
    "brandColors", "brandTone", "requiredElements", "aspectRatio", 
    "platformOptimization", "compositionGuide", "formatSpecificGuidance", "compositionDetails"
  ],
});

// Aspect ratio specific optimizations
const ASPECT_RATIO_CONFIGS = {
  '1:1': {
    platformOptimization: 'Instagram feed, Facebook post, LinkedIn post',
    compositionGuide: 'Centered, balanced composition with equal spacing',
    formatSpecificGuidance: 'Perfect for square Instagram posts - center the product with balanced negative space, ensure all key elements are visible within the square frame',
    compositionDetails: 'Use central focal point, symmetrical balance, avoid elements that would be cut off in square format'
  },
  '9:16': {
    platformOptimization: 'Instagram Stories, TikTok, Snapchat, vertical social formats',
    compositionGuide: 'Vertical composition, top-to-bottom visual flow',
    formatSpecificGuidance: 'Optimized for mobile viewing in vertical orientation - stack elements vertically, use the full height effectively, ensure text readability on mobile devices',
    compositionDetails: 'Utilize vertical space with layered composition, place key messaging in top third for better story visibility, bottom third clear for CTA overlays'
  },
  '16:9': {
    platformOptimization: 'YouTube thumbnails, LinkedIn cover, Facebook cover, Twitter header',
    compositionGuide: 'Horizontal landscape composition, left-to-right flow',
    formatSpecificGuidance: 'Landscape format perfect for cover photos and headers - use horizontal space for storytelling, create dynamic left-to-right visual flow',
    compositionDetails: 'Leverage wide format for environmental context, use rule of thirds, create depth with foreground/background elements'
  }
} as const;

// Enhanced prompt generation with brand intelligence
export const generateCampaignPrompts = async (brief: CampaignBrief): Promise<CampaignPrompt[]> => {
  const prompts: CampaignPrompt[] = [];
  const aspectRatios: ('1:1' | '9:16' | '16:9')[] = ['1:1', '9:16', '16:9'];
  
  console.log(`🧠 Generating smart prompts for campaign: ${brief.campaignId}`);
  console.log(`📦 Products: ${brief.products.length}, Total prompts: ${brief.products.length * 3}`);
  
  for (const product of brief.products) {
    console.log(`🏷️ Processing product: ${product.name} (${product.category})`);
    
    for (const ratio of aspectRatios) {
      console.log(`📐 Generating ${ratio} prompt for ${product.name}...`);
      
      const aspectConfig = ASPECT_RATIO_CONFIGS[ratio];
      
      try {
        // Generate smart prompt using LangChain template
        const generatedPrompt = await CAMPAIGN_PROMPT_TEMPLATE.format({
          productName: product.name,
          category: product.category,
          keyFeatures: product.keyFeatures.join(', '),
          targetAudience: brief.targetAudience,
          campaignMessage: brief.campaignMessage,
          brandColors: brief.brandGuidelines.colors.join(', '),
          brandTone: brief.brandGuidelines.tone,
          requiredElements: brief.brandGuidelines.requiredElements?.join(', ') || 'brand logo',
          aspectRatio: ratio,
          platformOptimization: aspectConfig.platformOptimization,
          compositionGuide: aspectConfig.compositionGuide,
          formatSpecificGuidance: aspectConfig.formatSpecificGuidance,
          compositionDetails: aspectConfig.compositionDetails
        });
        
        prompts.push({
          productName: product.name,
          aspectRatio: ratio,
          generatedPrompt,
          brandContext: JSON.stringify(brief.brandGuidelines),
          targetAudience: brief.targetAudience
        });
        
        console.log(`✅ Generated ${ratio} prompt for ${product.name} (${generatedPrompt.length} chars)`);
        
      } catch (error) {
        console.error(`❌ Failed to generate ${ratio} prompt for ${product.name}:`, error);
        
        // Fallback prompt if LangChain fails
        const fallbackPrompt = generateFallbackPrompt(product, ratio, brief);
        
        prompts.push({
          productName: product.name,
          aspectRatio: ratio,
          generatedPrompt: fallbackPrompt,
          brandContext: JSON.stringify(brief.brandGuidelines),
          targetAudience: brief.targetAudience
        });
        
        console.log(`🔄 Used fallback prompt for ${product.name} ${ratio}`);
      }
    }
  }
  
  console.log(`✅ Campaign prompt generation complete: ${prompts.length} prompts generated`);
  return prompts;
};

// Fallback prompt generator for error scenarios
const generateFallbackPrompt = (
  product: any, 
  aspectRatio: string, 
  brief: CampaignBrief
): string => {
  const aspectConfig = ASPECT_RATIO_CONFIGS[aspectRatio as keyof typeof ASPECT_RATIO_CONFIGS];
  
  return `Professional ${product.name} product photography for ${aspectRatio} social media format. 
Product features: ${product.keyFeatures.join(', ')}. 
Brand colors: ${brief.brandGuidelines.colors.join(', ')}. 
Visual tone: ${brief.brandGuidelines.tone}. 
Target audience: ${brief.targetAudience}. 
Campaign message: "${brief.campaignMessage}". 
${aspectConfig.formatSpecificGuidance}. 
High-quality, commercial photography style with professional lighting and composition.`;
};

// Validate and enhance campaign briefs before prompt generation
export const validateAndEnhanceBrief = (brief: CampaignBrief): CampaignBrief => {
  // Ensure required elements exist
  if (!brief.brandGuidelines.requiredElements) {
    brief.brandGuidelines.requiredElements = ['brand logo', 'legal disclaimer'];
  }
  
  // Add default prohibited content if not specified
  if (!brief.brandGuidelines.prohibitedContent) {
    brief.brandGuidelines.prohibitedContent = ['competitor mentions', 'unsubstantiated claims'];
  }
  
  // Ensure color palette is comprehensive
  if (brief.brandGuidelines.colors.length < 2) {
    console.warn(`⚠️ Limited color palette (${brief.brandGuidelines.colors.length} colors) - consider adding more brand colors for better visual consistency`);
  }
  
  return brief;
};

// Preview prompt summary for UI display
export const generatePromptSummary = (prompts: CampaignPrompt[]): string => {
  const productCounts = prompts.reduce((acc, prompt) => {
    acc[prompt.productName] = (acc[prompt.productName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const products = Object.keys(productCounts);
  const totalAssets = prompts.length;
  
  return `Generated ${totalAssets} optimized prompts for ${products.length} products (${products.join(', ')}). Each product includes 3 social media formats: square (1:1), story (9:16), and landscape (16:9) with brand-consistent messaging and platform-specific optimization.`;
};
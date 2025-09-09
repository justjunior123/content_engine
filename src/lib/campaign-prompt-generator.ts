// LangChain-powered Campaign Prompt Generation Service
// Generates smart, brand-consistent prompts for social media asset creation

import { PromptTemplate } from "@langchain/core/prompts";
import { CampaignBrief, CampaignPrompt, AssetData, EnhancedCampaignPrompt } from "@/types/campaign.types";

// Multi-image prompt template for asset composition
const MULTI_IMAGE_PROMPT_TEMPLATE = new PromptTemplate({
  template: `Create a professional product marketing image for {productName}:

ASSET COMPOSITION INSTRUCTIONS:
{assetInstructions}

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
Seamlessly compose all provided images into a cohesive marketing asset that:

1. ASSET INTEGRATION: {assetIntegrationGuidance}

2. PRODUCT FOCUS: Showcase the {productName} prominently with clear visibility of its key features: {keyFeatures}

3. BRAND CONSISTENCY: 
   - Use brand color palette: {brandColors}
   - Maintain {brandTone} visual aesthetic
   - Include required brand elements: {requiredElements}

4. AUDIENCE APPEAL: Design to resonate with {targetAudience}, conveying the message "{campaignMessage}"

5. FORMAT OPTIMIZATION: {formatSpecificGuidance}

6. COMPOSITION: {compositionDetails}

Style: Professional product photography, clean and modern, high resolution, excellent lighting, premium quality aesthetic, marketing-ready commercial image.`,

  inputVariables: [
    "productName", "category", "keyFeatures", "targetAudience", "campaignMessage",
    "brandColors", "brandTone", "requiredElements", "aspectRatio", 
    "platformOptimization", "compositionGuide", "formatSpecificGuidance", "compositionDetails",
    "assetInstructions", "assetIntegrationGuidance"
  ],
});

// Fallback text-only prompt template (existing functionality)
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

// Select best assets for a specific product (moved from campaign-file-manager to avoid import issues)
const selectBestAssetsForProduct = (productName: string, allAssets: AssetData[]): AssetData[] => {
  const productAssets: AssetData[] = [];
  
  // Priority 1: Assets specifically matched to this product
  const productSpecificAssets = allAssets.filter(asset => asset.productMatch === productName);
  
  // Priority 2: Generic assets (no product match) as fallbacks
  const genericAssets = allAssets.filter(asset => !asset.productMatch);
  
  // Select best asset of each type
  const assetTypes: ('logo' | 'background' | 'product-image')[] = ['logo', 'background', 'product-image'];
  
  for (const assetType of assetTypes) {
    // Try product-specific first
    let selectedAsset = productSpecificAssets.find(asset => asset.type === assetType);
    
    // Fall back to generic if no product-specific asset
    if (!selectedAsset) {
      selectedAsset = genericAssets.find(asset => asset.type === assetType);
    }
    
    if (selectedAsset) {
      productAssets.push(selectedAsset);
      console.log(`Selected ${assetType} for ${productName}: ${selectedAsset.filename}`);
    } else {
      console.log(`No ${assetType} asset found for ${productName}`);
    }
  }
  
  return productAssets;
};

// Generate multi-image prompts with asset awareness
export const generateMultiImagePrompts = async (
  brief: CampaignBrief, 
  assets: AssetData[]
): Promise<{ prompt: EnhancedCampaignPrompt; assets: AssetData[] }[]> => {
  const results: { prompt: EnhancedCampaignPrompt; assets: AssetData[] }[] = [];
  const aspectRatios: ('1:1' | '9:16' | '16:9')[] = ['1:1', '9:16', '16:9'];
  
  console.log(`Generating multi-image prompts for campaign: ${brief.campaignId}`);
  console.log(`Products: ${brief.products.length}, Available assets: ${assets.length}`);
  
  for (const product of brief.products) {
    console.log(`Processing product: ${product.name} (${product.category})`);
    
    // Select best assets for this product
    const productAssets = selectBestAssetsForProduct(product.name, assets);
    
    for (const ratio of aspectRatios) {
      console.log(`Generating ${ratio} multi-image prompt for ${product.name}...`);
      
      const aspectConfig = ASPECT_RATIO_CONFIGS[ratio];
      
      try {
        // Build asset instructions
        const { assetInstructions, assetIntegrationGuidance } = buildAssetInstructions(productAssets, ratio);
        
        // Generate smart prompt using multi-image template
        const generatedPrompt = await MULTI_IMAGE_PROMPT_TEMPLATE.format({
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
          compositionDetails: aspectConfig.compositionDetails,
          assetInstructions,
          assetIntegrationGuidance
        });
        
        const enhancedPrompt: EnhancedCampaignPrompt = {
          productName: product.name,
          aspectRatio: ratio,
          generatedPrompt,
          brandContext: JSON.stringify(brief.brandGuidelines),
          targetAudience: brief.targetAudience,
          associatedAssets: productAssets
        };
        
        results.push({
          prompt: enhancedPrompt,
          assets: productAssets
        });
        
        console.log(`Generated ${ratio} multi-image prompt for ${product.name} with ${productAssets.length} assets`);
        
      } catch (error) {
        console.error(`Failed to generate ${ratio} multi-image prompt for ${product.name}:`, error);
        
        // Fallback to text-only prompt
        const fallbackPrompt = generateFallbackPrompt(product, ratio, brief);
        
        const enhancedPrompt: EnhancedCampaignPrompt = {
          productName: product.name,
          aspectRatio: ratio,
          generatedPrompt: fallbackPrompt,
          brandContext: JSON.stringify(brief.brandGuidelines),
          targetAudience: brief.targetAudience,
          associatedAssets: []
        };
        
        results.push({
          prompt: enhancedPrompt,
          assets: []
        });
        
        console.log(`Used fallback text-only prompt for ${product.name} ${ratio}`);
      }
    }
  }
  
  console.log(`✅ Multi-image campaign prompt generation complete: ${results.length} prompts generated`);
  return results;
};

// Build asset composition instructions
const buildAssetInstructions = (assets: AssetData[], aspectRatio: string): {
  assetInstructions: string;
  assetIntegrationGuidance: string;
} => {
  if (assets.length === 0) {
    return {
      assetInstructions: "No existing assets provided - generate all elements using AI.",
      assetIntegrationGuidance: "Create cohesive design elements that work together harmoniously."
    };
  }
  
  const instructions: string[] = [];
  const integrationGuidance: string[] = [];
  
  assets.forEach((asset, index) => {
    const imageRef = `image ${index + 1}`;
    
    switch (asset.type) {
      case 'logo':
        instructions.push(`- Logo: Use the logo from ${imageRef} (${asset.filename}) - ${getLogoPlacement(aspectRatio)}`);
        integrationGuidance.push(`Ensure the logo from ${imageRef} is prominently positioned and maintains brand visibility`);
        break;
      case 'background':
        instructions.push(`- Background: Use the background from ${imageRef} (${asset.filename}) as the base layer`);
        integrationGuidance.push(`Use the background from ${imageRef} as foundation, ensuring good contrast for text and product`);
        break;
        case 'product-image':
        instructions.push(`- Product Image: Incorporate the product visual from ${imageRef} (${asset.filename}) as hero element`);
        integrationGuidance.push(`Feature the product from ${imageRef} prominently while maintaining natural composition`);
        break;
    }
  });
  
  if (instructions.length === 0) {
    instructions.push("No existing assets provided - generate all elements using AI.");
  }
  
  return {
    assetInstructions: instructions.join('\n'),
    assetIntegrationGuidance: integrationGuidance.join(', ') || "Create cohesive design elements that work together harmoniously."
  };
};

// Get logo placement based on aspect ratio
const getLogoPlacement = (aspectRatio: string): string => {
  switch (aspectRatio) {
    case '1:1':
      return 'position in bottom right corner or top left corner';
    case '9:16':
      return 'position in top third area for story format visibility';
    case '16:9':
      return 'position in bottom right corner or integrate into header area';
    default:
      return 'position prominently while maintaining design balance';
  }
};

// Enhanced prompt generation with brand intelligence (original function - kept for backward compatibility)
export const generateCampaignPrompts = async (brief: CampaignBrief): Promise<CampaignPrompt[]> => {
  const prompts: CampaignPrompt[] = [];
  const aspectRatios: ('1:1' | '9:16' | '16:9')[] = ['1:1', '9:16', '16:9'];
  
  console.log(`Generating smart prompts for campaign: ${brief.campaignId}`);
  console.log(`Products: ${brief.products.length}, Total prompts: ${brief.products.length * 3}`);
  
  for (const product of brief.products) {
    console.log(`Processing product: ${product.name} (${product.category})`);
    
    for (const ratio of aspectRatios) {
      console.log(`Generating ${ratio} prompt for ${product.name}...`);
      
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
        
        console.log(`Generated ${ratio} prompt for ${product.name} (${generatedPrompt.length} chars)`);
        
      } catch (error) {
        console.error(`Failed to generate ${ratio} prompt for ${product.name}:`, error);
        
        // Fallback prompt if LangChain fails
        const fallbackPrompt = generateFallbackPrompt(product, ratio, brief);
        
        prompts.push({
          productName: product.name,
          aspectRatio: ratio,
          generatedPrompt: fallbackPrompt,
          brandContext: JSON.stringify(brief.brandGuidelines),
          targetAudience: brief.targetAudience
        });
        
        console.log(`Used fallback prompt for ${product.name} ${ratio}`);
      }
    }
  }
  
  console.log(`Campaign prompt generation complete: ${prompts.length} prompts generated`);
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
    console.warn(`Limited color palette (${brief.brandGuidelines.colors.length} colors) - consider adding more brand colors for better visual consistency`);
  }
  
  return brief;
};

// Preview multi-image prompt summary for UI display
export const generateMultiImagePromptSummary = (results: { prompt: EnhancedCampaignPrompt; assets: AssetData[] }[]): string => {
  const totalAssets = results.reduce((sum, result) => sum + result.assets.length, 0);
  const products = Array.from(new Set(results.map(r => r.prompt.productName)));
  const totalPrompts = results.length;
  
  const assetBreakdown = results.reduce((acc, result) => {
    result.assets.forEach(asset => {
      acc[asset.type] = (acc[asset.type] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  const assetSummary = Object.entries(assetBreakdown)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ') || 'no existing assets';
  
  return `Generated ${totalPrompts} multi-image prompts for ${products.length} products (${products.join(', ')}) using ${assetSummary}. Each product includes 3 social media formats with intelligent asset composition and brand-consistent messaging.`;
};

// Preview prompt summary for UI display (original function)
export const generatePromptSummary = (prompts: CampaignPrompt[]): string => {
  const productCounts = prompts.reduce((acc, prompt) => {
    acc[prompt.productName] = (acc[prompt.productName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const products = Object.keys(productCounts);
  const totalAssets = prompts.length;
  
  return `Generated ${totalAssets} optimized prompts for ${products.length} products (${products.join(', ')}). Each product includes 3 social media formats: square (1:1), story (9:16), and landscape (16:9) with brand-consistent messaging and platform-specific optimization.`;
};
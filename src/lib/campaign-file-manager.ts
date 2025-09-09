// Campaign File Organization System
// Manages structured asset output and Claude review flags

import fs from 'fs/promises';
import path from 'path';
import { CampaignBrief, CampaignPrompt, GeneratedAsset, ReviewStatus, AssetData } from '@/types/campaign.types';

// Ensure directory structure exists
export const ensureDirectoryStructure = async () => {
  const dirs = [
    'input/briefs',
    'input/assets/logos',
    'input/assets/backgrounds', 
    'input/assets/product-images',
    'output',
    'config'
  ];
  
  console.log('📁 Ensuring directory structure...');
  
  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`✅ Directory ready: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to create directory ${dir}:`, error);
    }
  }
};

// Save individual asset with metadata
export const saveAssetWithMetadata = async (params: {
  campaignId: string;
  productName: string;
  aspectRatio: string;
  imageData: string;
  prompt: string;
  brandContext: string;
  usedAssets?: string[];
}): Promise<string> => {
  const { campaignId, productName, aspectRatio, imageData, prompt, brandContext } = params;
  
  // Create structured folder path
  const basePath = path.join(process.cwd(), 'output', campaignId, productName, aspectRatio);
  await fs.mkdir(basePath, { recursive: true });
  
  // Generate consistent filename
  const sanitizedProductName = productName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const imageName = `${sanitizedProductName}_${aspectRatio}_v1.png`;
  const imagePath = path.join(basePath, imageName);
  
  try {
    // Convert base64 to buffer and save image
    const buffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(imagePath, buffer);
    console.log(`💾 Saved image: ${imagePath}`);
    
    // Save metadata for Claude context
    const metadata = {
      productName,
      aspectRatio,
      generatedPrompt: prompt,
      timestamp: new Date().toISOString(),
      brandContext: JSON.parse(brandContext),
      imagePath: path.relative(process.cwd(), imagePath),
      fileSize: buffer.length,
      format: 'png',
      usedAssets: params.usedAssets || [],
      generationMethod: params.usedAssets && params.usedAssets.length > 0 ? 'multi-image-composition' : 'text-to-image'
    };
    
    const metadataPath = path.join(basePath, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Saved metadata: ${metadataPath}`);
    
    return path.relative(process.cwd(), imagePath);
    
  } catch (error) {
    console.error(`❌ Failed to save asset ${productName} ${aspectRatio}:`, error);
    throw error;
  }
};

// Create review flag for Claude MCP monitoring
export const createReviewFlag = async (
  campaignId: string, 
  brief: CampaignBrief, 
  results: GeneratedAsset[]
): Promise<void> => {
  const campaignPath = path.join(process.cwd(), 'output', campaignId);
  
  try {
    // Store original brief for Claude context
    const briefPath = path.join(campaignPath, 'campaign_brief.json');
    await fs.writeFile(briefPath, JSON.stringify(brief, null, 2));
    console.log(`📄 Saved campaign brief: ${briefPath}`);
    
    // Create review flag with comprehensive information
    const reviewFlag: ReviewStatus = {
      campaignId,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      totalAssets: results.length,
      successfulAssets: results.filter(r => r.success).length,
      assetsGenerated: results.filter(r => r.success).map(r => r.assetPath),
      claudeReviewed: false,
      complianceScore: null,
      reviewStarted: null,
      reviewCompleted: null
    };
    
    const flagPath = path.join(campaignPath, 'review_status.json');
    await fs.writeFile(flagPath, JSON.stringify(reviewFlag, null, 2));
    console.log(`🚩 Review flag created: ${flagPath}`);
    
    // Create campaign summary for easy reference
    const summary = {
      campaignId: brief.campaignId,
      totalProducts: brief.products.length,
      totalAssets: results.length,
      successfulAssets: results.filter(r => r.success).length,
      failedAssets: results.filter(r => !r.success).length,
      brandGuidelines: brief.brandGuidelines,
      targetAudience: brief.targetAudience,
      generatedAt: new Date().toISOString(),
      readyForReview: true
    };
    
    const summaryPath = path.join(campaignPath, 'campaign_summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Campaign summary created: ${summaryPath}`);
    
  } catch (error) {
    console.error(`❌ Failed to create review flag for ${campaignId}:`, error);
    throw error;
  }
};

// Generate campaign ID with timestamp and randomization
export const generateCampaignId = (): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `campaign_${timestamp}_${randomSuffix}`;
};

// Create directory index for organized browsing
export const createDirectoryIndex = async (campaignId: string): Promise<void> => {
  const campaignPath = path.join(process.cwd(), 'output', campaignId);
  
  try {
    // Scan directory structure
    const products = await fs.readdir(campaignPath, { withFileTypes: true });
    const productDirs = products.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    
    const index = {
      campaignId,
      createdAt: new Date().toISOString(),
      totalProducts: productDirs.length,
      products: []
    } as any;
    
    // Build index for each product
    for (const productName of productDirs) {
      const productPath = path.join(campaignPath, productName);
      const aspectRatios = await fs.readdir(productPath, { withFileTypes: true });
      const aspectDirs = aspectRatios.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
      
      const productInfo = {
        name: productName,
        totalFormats: aspectDirs.length,
        formats: [] as any[]
      };
      
      // Build index for each aspect ratio
      for (const aspectRatio of aspectDirs) {
        const formatPath = path.join(productPath, aspectRatio);
        const files = await fs.readdir(formatPath);
        const imageFile = files.find(f => f.endsWith('.png'));
        const metadataFile = files.find(f => f.endsWith('metadata.json'));
        
        productInfo.formats.push({
          aspectRatio,
          imageFile: imageFile || null,
          metadataFile: metadataFile || null,
          hasImage: !!imageFile,
          hasMetadata: !!metadataFile
        });
      }
      
      index.products.push(productInfo);
    }
    
    const indexPath = path.join(campaignPath, 'directory_index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    console.log(`📇 Directory index created: ${indexPath}`);
    
  } catch (error) {
    console.error(`❌ Failed to create directory index for ${campaignId}:`, error);
  }
};

// Load assets as base64 for multi-image generation
export const loadAssetsAsBase64 = async (productNames: string[]): Promise<AssetData[]> => {
  const assetDirs = ['logos', 'backgrounds', 'product-images'];
  const loadedAssets: AssetData[] = [];
  
  console.log('🔍 Scanning input/assets/ for available assets...');
  
  for (const dir of assetDirs) {
    const dirPath = path.join(process.cwd(), 'input/assets', dir);
    try {
      const files = await fs.readdir(dirPath);
      console.log(`📁 Scanning ${dir}/: found ${files.length} files`);
      
      for (const file of files) {
        if (file.match(/\.(png|jpg|jpeg|svg)$/i) && !file.startsWith('.')) {
          try {
            const filePath = path.join(dirPath, file);
            const buffer = await fs.readFile(filePath);
            const base64 = buffer.toString('base64');
            
            // Match assets to products using filename fuzzy matching
            const productMatch = findBestProductMatch(file, productNames);
            
            loadedAssets.push({
              type: dir.slice(0, -1) as 'logo' | 'background' | 'product-image', // Remove 's' from plural
              filename: file,
              base64Data: base64,
              productMatch,
              filePath: path.relative(process.cwd(), filePath)
            });
            
            console.log(`✅ Loaded ${dir}/${file} (${Math.round(buffer.length / 1024)}KB)${productMatch ? ` -> ${productMatch}` : ''}`);
          } catch (fileError) {
            console.warn(`⚠️ Failed to load ${dir}/${file}:`, fileError instanceof Error ? fileError.message : fileError);
          }
        }
      }
    } catch (dirError) {
      console.warn(`⚠️ Could not read directory ${dir}:`, dirError instanceof Error ? dirError.message : dirError);
    }
  }
  
  console.log(`📦 Total assets loaded: ${loadedAssets.length}`);
  return loadedAssets;
};

// Find best product match for asset filename using fuzzy matching
const findBestProductMatch = (filename: string, productNames: string[]): string | undefined => {
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  
  for (const productName of productNames) {
    const cleanProductName = productName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const productWords = cleanProductName.split(/\s+/);
    
    // Check if any product words appear in filename
    const matchingWords = productWords.filter(word => 
      word.length > 2 && cleanFilename.includes(word)
    );
    
    // If majority of product words match, consider it a match
    if (matchingWords.length > 0 && matchingWords.length >= Math.ceil(productWords.length / 2)) {
      return productName;
    }
  }
  
  return undefined;
};


// Get MIME type for asset file
export const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg', 
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml'
  };
  return mimeTypes[ext || ''] || 'image/png';
};

// Validate campaign output structure
export const validateCampaignOutput = async (campaignId: string): Promise<{
  isValid: boolean;
  issues: string[];
  summary: any;
}> => {
  const campaignPath = path.join(process.cwd(), 'output', campaignId);
  const issues: string[] = [];
  
  try {
    // Check if campaign directory exists
    const stats = await fs.stat(campaignPath);
    if (!stats.isDirectory()) {
      issues.push('Campaign directory not found');
      return { isValid: false, issues, summary: null };
    }
    
    // Check for required files
    const requiredFiles = ['campaign_brief.json', 'review_status.json'];
    for (const file of requiredFiles) {
      try {
        await fs.stat(path.join(campaignPath, file));
      } catch {
        issues.push(`Missing required file: ${file}`);
      }
    }
    
    // Validate directory structure
    const products = await fs.readdir(campaignPath, { withFileTypes: true });
    const productDirs = products.filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'));
    
    let totalAssets = 0;
    for (const productDir of productDirs) {
      const productPath = path.join(campaignPath, productDir.name);
      const aspectRatios = await fs.readdir(productPath, { withFileTypes: true });
      const aspectDirs = aspectRatios.filter(dirent => dirent.isDirectory());
      
      for (const aspectDir of aspectDirs) {
        const formatPath = path.join(productPath, aspectDir.name);
        const files = await fs.readdir(formatPath);
        
        const hasImage = files.some(f => f.endsWith('.png'));
        const hasMetadata = files.some(f => f.endsWith('metadata.json'));
        
        if (hasImage) totalAssets++;
        if (!hasImage) issues.push(`Missing image for ${productDir.name}/${aspectDir.name}`);
        if (!hasMetadata) issues.push(`Missing metadata for ${productDir.name}/${aspectDir.name}`);
      }
    }
    
    const summary = {
      campaignId,
      totalProducts: productDirs.length,
      totalAssets,
      validationDate: new Date().toISOString(),
      issueCount: issues.length
    };
    
    return {
      isValid: issues.length === 0,
      issues,
      summary
    };
    
  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, issues, summary: null };
  }
};
// Campaign Processing Types for Adobe Creative Automation
// Defines interfaces for JSON campaign briefs and generated prompts

export interface CampaignProduct {
  name: string;
  category: string;
  keyFeatures: string[];
}

export interface BrandGuidelines {
  colors: string[];
  fonts: string[];
  tone: string;
  prohibitedContent?: string[];
  requiredElements?: string[];
}

export interface CampaignBrief {
  campaignId: string;
  products: CampaignProduct[];
  targetRegion: string;
  targetAudience: string;
  campaignMessage: string;
  brandGuidelines: BrandGuidelines;
}

export interface AssetData {
  type: 'logo' | 'background' | 'product-image';
  filename: string;
  base64Data: string;
  productMatch?: string;
  filePath: string;
}

export interface CampaignPrompt {
  productName: string;
  aspectRatio: '1:1' | '9:16' | '16:9';
  generatedPrompt: string;
  brandContext: string;
  targetAudience: string;
  associatedAssets?: AssetData[];
}

export interface EnhancedCampaignPrompt extends CampaignPrompt {
  associatedAssets: AssetData[];
}

export interface AssetMetadata {
  usedAssets: string[];
  assetSources: Record<string, string>; // filename -> type mapping
  generationMethod: 'text-to-image' | 'multi-image-composition';
}

export interface CampaignProgress {
  current: number;
  total: number;
  currentProduct: string;
  currentFormat: string;
  status: 'generating' | 'completed' | 'error';
  error?: string;
}

export interface GeneratedAsset {
  productName: string;
  aspectRatio: string;
  assetPath: string;
  prompt: string;
  success: boolean;
  error?: string;
  usedAssets?: string[];
  generationMethod?: 'text-to-image' | 'multi-image-composition';
}

export interface CampaignResult {
  campaignId: string;
  results: GeneratedAsset[];
  successCount: number;
  totalCount: number;
}

export interface ReviewStatus {
  campaignId: string;
  status: 'pending_review' | 'reviewed' | 'issues_found';
  createdAt: string;
  lastModified: string;
  totalAssets: number;
  successfulAssets: number;
  assetsGenerated: string[];
  claudeReviewed: boolean;
  complianceScore: number | null;
  reviewStarted: string | null;
  reviewCompleted: string | null;
}
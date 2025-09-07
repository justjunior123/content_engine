# Content Engine Workflow

## Complete Campaign Generation Process

This document describes the **actual workflow** of the Content Engine - what happens when you run a campaign from start to finish.

## Phase 1: Campaign Setup & Upload

### 1.1 User Interface Preparation
- User opens the Content Engine web application
- Switches to **Campaign Mode** from the mode selector (Chat, Image, Campaign)
- System validates Google AI API connection

### 1.2 Campaign Brief Upload
```
User Action: Upload JSON campaign brief
└── File validation (JSON format, required fields)
    └── Brief parsing and validation
        └── Campaign preview display
            └── Ready for generation
```

**Example Brief Structure:**
```json
{
  "campaignId": "ADOBE_TECH_Q4_2025_001",
  "products": [
    {
      "name": "Creative Cloud Pro",
      "category": "design software", 
      "keyFeatures": ["AI-powered design tools", "collaborative workflows"]
    }
  ],
  "targetRegion": "North America",
  "targetAudience": "creative professionals",
  "campaignMessage": "Unleash your creative potential",
  "brandGuidelines": {
    "colors": ["#FF0000", "#000000", "#FFFFFF"],
    "fonts": ["Adobe Clean", "Source Sans Pro"],
    "tone": "professional yet inspiring"
  }
}
```

## Phase 2: Processing & Prompt Generation

### 2.1 Campaign Analysis
```
Campaign Brief → Product Analysis → Aspect Ratio Planning → Prompt Matrix
```

**What Actually Happens:**
1. **Product Extraction**: System identifies each product in the brief
2. **Format Planning**: Creates matrix of products × aspect ratios (1:1, 9:16, 16:9)  
3. **Brand Context**: Extracts colors, fonts, tone for consistency
4. **Generation Queue**: Creates ordered list of assets to generate

### 2.2 LangChain Prompt Engineering
```typescript
// For each product + aspect ratio combination
const promptGeneration = {
  input: {
    productName: "Creative Cloud Pro",
    category: "design software",
    keyFeatures: ["AI-powered design tools", "collaborative workflows"],
    targetAudience: "creative professionals",
    aspectRatio: "1:1",
    brandGuidelines: { colors: [...], fonts: [...], tone: "..." }
  },
  processing: "LangChain PromptTemplate with brand-aware optimization",
  output: "Professional product marketing image for social media..."
}
```

**Template Processing Location**: `src/lib/campaign-prompt-generator.ts`

## Phase 3: Sequential Image Generation

### 3.1 Generation Loop (Server-Sent Events)
```
Start Campaign → For Each Product/Format → Generate → Save → Report Progress
```

**Real-time Progress Updates:**
```json
{
  "type": "progress",
  "current": 2,
  "total": 6,
  "product": "Creative Cloud Pro", 
  "aspectRatio": "9:16",
  "status": "generating",
  "campaignId": "campaign_20250906_200749_5otumg"
}
```

### 3.2 Google Gemini API Integration
**API Endpoint**: `/api/campaign-generate`

**Per-Asset Generation Process:**
1. **Prompt Preparation**: Use LangChain-generated prompt
2. **Gemini API Call**: Send to `gemini-2.5-flash-image-preview`
3. **Image Processing**: Extract base64 image data
4. **Quality Validation**: Check successful generation
5. **Progress Update**: Send SSE to frontend

### 3.3 Error Handling & Resilience
- **API Quota Limits**: Sequential generation with delays
- **Individual Failures**: Continue campaign, report errors
- **Rate Limiting**: 1-second delays between generations
- **Retry Logic**: Basic error recovery

## Phase 4: File Organization & Metadata

### 4.1 Structured Asset Storage
```
output/
└── campaign_20250906_200749_5otumg/          # Generated campaign ID
    ├── Creative Cloud Pro/                   # Product name
    │   ├── 1x1/                             # Square format
    │   │   ├── creative_cloud_pro_1x1_v1.png
    │   │   └── metadata.json
    │   ├── 9x16/                            # Story format  
    │   │   ├── creative_cloud_pro_9x16_v1.png
    │   │   └── metadata.json
    │   └── 16x9/                            # Landscape format
    │       ├── creative_cloud_pro_16x9_v1.png
    │       └── metadata.json
    ├── campaign_brief.json                   # Original brief
    ├── campaign_summary.json                 # Generation results
    ├── directory_index.json                  # File organization
    └── review_status.json                    # External monitoring flag
```

### 4.2 Metadata Generation
**Per-Asset Metadata** (`metadata.json`):
```json
{
  "productName": "Creative Cloud Pro",
  "aspectRatio": "1:1",
  "generatedPrompt": "Professional product marketing image...",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "brandContext": { /* brand guidelines */ },
  "imagePath": "output/campaign.../Creative Cloud Pro/1x1/...",
  "fileSize": 245760,
  "format": "png"
}
```

### 4.3 Campaign Summary Creation
**Campaign-Level Summary** (`campaign_summary.json`):
```json
{
  "campaignId": "campaign_20250906_200749_5otumg",
  "totalProducts": 1,
  "totalAssets": 3,
  "successfulAssets": 3,
  "failedAssets": 0,
  "brandGuidelines": { /* from original brief */ },
  "targetAudience": "creative professionals",
  "generatedAt": "2025-01-15T14:30:00.000Z",
  "readyForReview": true
}
```

## Phase 5: External Monitoring Setup

### 5.1 Review Flag Creation
**Purpose**: Signal external Claude MCP system that content is ready for review

**Review Status File** (`review_status.json`):
```json
{
  "campaignId": "campaign_20250906_200749_5otumg",
  "status": "pending_review",
  "createdAt": "2025-01-15T14:30:00.000Z",
  "totalAssets": 3,
  "successfulAssets": 3,
  "assetsGenerated": [
    "output/.../Creative Cloud Pro/1x1/creative_cloud_pro_1x1_v1.png",
    "output/.../Creative Cloud Pro/9x16/creative_cloud_pro_9x16_v1.png", 
    "output/.../Creative Cloud Pro/16x9/creative_cloud_pro_16x9_v1.png"
  ],
  "claudeReviewed": false,
  "complianceScore": null
}
```

### 5.2 Claude MCP Integration (External)
**How It Works:**
1. **File System Monitoring**: Claude MCP watches `output/` folder
2. **Detection**: New `review_status.json` triggers content review
3. **Analysis**: Claude examines generated images against brand guidelines
4. **Reporting**: Updates review status and compliance scores
5. **Alerts**: Notifies stakeholders of issues or completion

## Phase 6: User Experience & Completion

### 6.1 Real-Time Progress Display
**Frontend Updates** (via Server-Sent Events):
- Live progress bar (2/6 assets completed)
- Current asset being generated
- Success/error status per asset
- Total campaign completion

### 6.2 Final Results Summary
```json
{
  "type": "complete",
  "campaignId": "campaign_20250906_200749_5otumg", 
  "successCount": 3,
  "errorCount": 0,
  "totalCount": 3,
  "summary": {
    "totalAssets": 3,
    "successful": 3,
    "failed": 0,
    "successRate": 100
  }
}
```

## What Happens with Templates (Currently)

### Current State
- Templates exist in `config/templates/campaign-messages.example.json`
- **Not actively used** in generation process
- Serve as **reference documentation** and **future integration points**

### Potential Integration (Enhancement Opportunity)
```typescript
// Future workflow enhancement
const enhancedPromptGeneration = {
  step1: "Load campaign brief",
  step2: "Select appropriate template from config/templates/",
  step3: "Merge template with brand guidelines", 
  step4: "Generate LangChain prompt with template context",
  step5: "Send to Gemini API"
}
```

## Asset Reuse Workflow (Planned)

### Current State  
- Asset directories exist (`input/assets/logos/`, etc.)
- **Not checked** during generation
- System generates all assets from scratch

### Future Enhancement
```typescript
// Planned asset reuse workflow
const assetCheckWorkflow = {
  step1: "Parse campaign brief for required assets",
  step2: "Scan input/assets/ for existing brand assets",
  step3: "Match existing assets to campaign requirements",
  step4: "Generate only missing assets",
  step5: "Combine existing + generated for final output"
}
```

## Performance Characteristics

### Generation Speed
- **Per Asset**: ~30-60 seconds (depending on Gemini API response)
- **Campaign (3 assets)**: ~2-4 minutes total
- **Bottleneck**: Sequential processing to avoid quota limits

### Scalability
- **Concurrent Campaigns**: Multiple users can run different campaigns
- **Asset Limits**: Tested with 2-6 assets per campaign
- **Storage**: Linear growth with number of campaigns

### Error Recovery
- **Individual Failures**: Campaign continues, reports errors
- **API Issues**: Graceful degradation with error messages
- **File System**: Robust directory creation and cleanup
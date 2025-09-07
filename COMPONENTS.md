# Content Engine Components

## Technical Component Breakdown

This document details the **individual components** that make up the Content Engine, their responsibilities, and how they interact.

## Frontend Components

### 1. Main Application (`src/components/ContentEngineUI.tsx`)
**Purpose**: Root component that orchestrates the entire user experience

**Key Responsibilities**:
- Mode switching (Chat, Image, Campaign)
- Provider connection management (Google AI)
- State management for campaigns and progress
- File upload handling for campaign briefs

**Key State Management**:
```typescript
const [chatMode, setChatMode] = useState<'chat' | 'image' | 'campaign'>('chat')
const [campaignBrief, setCampaignBrief] = useState<CampaignBrief | null>(null)
const [campaignProgress, setCampaignProgress] = useState<CampaignProgress[]>([])
```

**Integration Points**:
- Campaign file upload → brief parsing
- Progress updates via Server-Sent Events
- Provider switching and connection validation

### 2. Campaign Interface Components

#### 2.1 Campaign File Upload
**Location**: Embedded in `ContentEngineUI.tsx`
**Function**: Handle JSON campaign brief uploads

```typescript
const handleCampaignUpload = async (files: FileList) => {
  const file = files[0]
  const content = await file.text()
  const brief = JSON.parse(content) as CampaignBrief
  setCampaignBrief(brief)
}
```

#### 2.2 Progress Tracking Display
**Function**: Real-time campaign generation progress
**Data Source**: Server-Sent Events from `/api/campaign-generate`

**Progress States**:
- `generating`: Asset currently being created
- `completed`: Asset successfully generated
- `error`: Asset generation failed

### 3. Chat Interface Components (`src/components/chat/`)

#### 3.1 ChatInterface (`ChatInterface.tsx`)
**Purpose**: Main chat container (used in all modes)
**Features**: Message display, input handling, mode-specific behavior

#### 3.2 ChatInput (`ChatInput.tsx`) 
**Purpose**: Input field with mode-aware functionality
**Campaign Mode**: Disabled during campaign generation
**Type Support**: Extended to handle `'campaign'` mode

## Backend API Components

### 1. Campaign Generation API (`pages/api/campaign-generate.js`)
**Purpose**: Core campaign processing endpoint with real-time progress

**Flow**:
```javascript
POST /api/campaign-generate
├── Validate campaign brief and prompts
├── Create directory structure
├── Generate campaign ID
├── Set up Server-Sent Events
├── Sequential generation loop:
│   ├── Generate prompts via LangChain
│   ├── Call Google Gemini API
│   ├── Save asset with metadata
│   ├── Send progress update
│   └── Handle errors gracefully
├── Create review flags for Claude MCP
└── Return completion summary
```

**Key Features**:
- **Sequential Processing**: Avoid API quota limits
- **Real-time Updates**: Server-Sent Events for progress
- **Error Resilience**: Continue campaign on individual failures
- **Metadata Creation**: Comprehensive asset documentation

### 2. Google AI Integration APIs

#### 2.1 Image Generation (`pages/api/google-generate-image.js`)
**Purpose**: Single image generation (used by campaign API)
**Model**: `gemini-2.5-flash-image-preview`
**Response**: Base64 image data

#### 2.2 Chat Streaming (`pages/api/google-stream.js`) 
**Purpose**: Real-time chat responses (Chat mode)
**Model**: Configurable Gemini models

#### 2.3 Provider Management
- `pages/api/validate-google-key.js`: API key validation
- `pages/api/initialize-google-provider.js`: Provider setup

## Core Business Logic Components

### 1. Campaign Prompt Generator (`src/lib/campaign-prompt-generator.ts`)
**Purpose**: LangChain-powered prompt engineering for brand consistency

**Key Features**:
- **Template-based**: Structured prompt generation
- **Aspect Ratio Optimization**: Format-specific composition guidance
- **Brand Integration**: Color, font, tone consistency
- **Audience Targeting**: Message optimization for target demographic

**Template Structure**:
```typescript
const CAMPAIGN_PROMPT_TEMPLATE = new PromptTemplate({
  template: `Create a professional product marketing image for social media:
  
  PRODUCT DETAILS: Product: {productName}, Category: {category}...
  BRAND REQUIREMENTS: Colors: {brandColors}, Tone: {brandTone}...
  TECHNICAL SPECIFICATIONS: Aspect Ratio: {aspectRatio}...`,
  
  inputVariables: ["productName", "category", "brandColors", ...]
})
```

### 2. Campaign File Manager (`src/lib/campaign-file-manager.ts`)
**Purpose**: File system organization and metadata management

**Core Functions**:

#### 2.1 Directory Structure Management
```typescript
export const ensureDirectoryStructure = async () => {
  // Creates: input/briefs, input/assets/*, output/, config/
}
```

#### 2.2 Asset Storage with Metadata
```typescript
export const saveAssetWithMetadata = async (params) => {
  // Structure: output/[campaignId]/[product]/[aspectRatio]/
  // Files: image.png + metadata.json
}
```

#### 2.3 External Monitoring Setup
```typescript
export const createReviewFlag = async (campaignId, brief, results) => {
  // Creates: review_status.json for Claude MCP detection
}
```

### 3. Content Engine Core (`src/lib/content-engine.ts`)
**Purpose**: Provider management and AI orchestration

**Current Implementation**: 
- Simplified to only Google AI provider (other providers removed)
- Provider switching and validation
- Connection management

## Type System Components

### 1. Campaign Types (`src/types/campaign.types.ts`)
**Purpose**: TypeScript definitions for campaign workflow

**Key Interfaces**:
```typescript
interface CampaignBrief {
  campaignId: string
  products: CampaignProduct[]
  targetRegion: string
  targetAudience: string
  campaignMessage: string
  brandGuidelines: BrandGuidelines
}

interface CampaignProgress {
  type: 'progress' | 'complete' | 'error'
  current?: number
  total?: number  
  product?: string
  aspectRatio?: string
  status?: 'generating' | 'completed' | 'error'
  campaignId: string
}
```

### 2. Supporting Type Definitions
- `src/types/chat.types.ts`: Chat and messaging types
- `src/types/provider.types.ts`: AI provider interfaces  
- `src/types/ui.types.ts`: UI component prop types
- `src/types/image.types.ts`: Image processing types

## Configuration Components

### 1. Brand Guidelines (`config/brand-guidelines.example.json`)
**Purpose**: Brand compliance rules and templates
**Current Status**: Reference documentation
**Future Integration**: Could be loaded by prompt generator

**Structure**:
```json
{
  "brandColors": { "primary": {...}, "secondary": {...} },
  "typography": { "primary": [...], "prohibited": [...] },
  "logoRequirements": { "required": true, "placement": [...] },
  "contentGuidelines": { "imageRequirements": {...} },
  "complianceScoring": { "brandColors": { "weight": 25 } }
}
```

### 2. Message Templates (`config/templates/campaign-messages.example.json`)
**Purpose**: Standardized messaging for different contexts
**Current Status**: Reference documentation
**Future Integration**: Could enhance LangChain prompt generation

**Template Categories**:
- Product category templates (software, mobile app, etc.)
- Regional templates (North America, Europe, Asia)
- Audience templates (creative professionals, students, etc.)
- Compliance templates (legal disclaimers, accessibility)

## Utility Components

### 1. File Helpers (`src/utils/file-helpers.ts`)
**Purpose**: File processing utilities
**Functions**: Base64 conversion, file reading, content processing

## External Integration Points

### 1. Claude MCP Interface (File-based)
**Communication Method**: File system monitoring
**Trigger Files**: 
- `output/[campaignId]/review_status.json`: Signals content ready for review
- `output/[campaignId]/campaign_summary.json`: Campaign metadata
- `output/[campaignId]/campaign_brief.json`: Original brief for context

**Expected MCP Actions**:
1. **File Detection**: Monitor `output/` for new campaigns
2. **Content Analysis**: Review generated images against brand guidelines  
3. **Compliance Scoring**: Rate brand adherence (1-10 scale)
4. **Status Updates**: Modify `review_status.json` with results
5. **Alert Generation**: Notify stakeholders of issues or completion

### 2. Google AI API Integration
**Primary Model**: `gemini-2.5-flash-image-preview`
**API Package**: `@google/genai`
**Authentication**: Environment variable (`GOOGLE_AI_API_KEY`)
**Usage Patterns**: Sequential requests with rate limiting

## Component Interaction Map

```
User Interface Layer:
├── ContentEngineUI (root orchestration)
├── ChatInterface (unified interface)
└── Progress Display (real-time updates)

API Layer:
├── /api/campaign-generate (main workflow)
├── /api/google-* (AI provider APIs)
└── Server-Sent Events (progress streaming)

Business Logic Layer:
├── campaign-prompt-generator (LangChain)
├── campaign-file-manager (file organization)
└── content-engine (provider management)

Type System:
├── campaign.types (workflow definitions)
├── chat.types (messaging)
└── provider.types (AI integration)

External Integration:
├── File System (structured output)
├── Claude MCP (monitoring)
└── Google Gemini (generation)
```

## Enhancement Opportunities

### 1. Template Integration
**Current Gap**: Templates exist but aren't used in generation
**Enhancement**: Load templates in `campaign-prompt-generator.ts`
**Benefit**: More sophisticated messaging, regional adaptation

### 2. Asset Reuse System
**Current Gap**: Asset directories exist but aren't checked  
**Enhancement**: Pre-generation asset scanning in `campaign-file-manager.ts`
**Benefit**: Cost reduction, brand consistency, faster generation

### 3. Advanced Progress Tracking
**Current**: Basic progress updates via SSE
**Enhancement**: Detailed metrics, error categorization, performance monitoring
**Benefit**: Better user experience, debugging capabilities

### 4. Configuration Loading
**Current**: Static configuration files
**Enhancement**: Dynamic loading of brand guidelines and templates
**Benefit**: Runtime configuration updates, multi-tenant support
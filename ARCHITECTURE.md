# Content Engine Architecture

## System Overview

The Content Engine is a **Creative Automation Pipeline** designed to generate scalable social media campaigns. It uses a clean, file-based architecture that separates content generation from content moderation.

## 3-Component Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Content Engine    │    │   File System    │    │   Claude MCP        │
│   (This Project)    │    │   (Interface)    │    │   (External)        │
├─────────────────────┤    ├──────────────────┤    ├─────────────────────┤
│ • Campaign Upload   │───▶│ input/briefs/    │    │ • File Monitoring   │
│ • Prompt Generation │    │ input/assets/    │    │ • Content Review    │
│ • Image Creation    │    │                  │    │ • Compliance Check  │
│ • Progress Tracking │    │ output/campaigns/│◀───│ • Quality Scoring   │
│ • File Organization │───▶│ - metadata.json  │    │                     │
└─────────────────────┘    │ - generated imgs │    └─────────────────────┘
                           └──────────────────┘
```

## Core Components

### 1. Content Engine (Next.js Application)
- **Purpose**: Generate campaign assets at scale
- **Input**: JSON campaign briefs
- **Output**: Organized image assets with metadata
- **Key Features**:
  - Multi-format generation (1:1, 9:16, 16:9)
  - Real-time progress tracking
  - Brand-aware prompt optimization
  - Structured file organization

### 2. File System (Communication Layer)
- **Purpose**: Interface between generation and monitoring
- **Structure**: 
  ```
  input/
  ├── briefs/           # Campaign specifications
  └── assets/           # Existing brand assets (for future reuse)
      ├── logos/
      ├── backgrounds/
      └── product-images/
  
  output/
  └── [campaign_id]/    # Generated campaign assets
      ├── [product]/
      │   ├── 1x1/      # Square format
      │   ├── 9x16/     # Story format
      │   └── 16x9/     # Landscape format
      ├── metadata.json
      └── review_status.json
  ```

### 3. Claude MCP (External Monitoring)
- **Purpose**: Content moderation and compliance checking
- **Approach**: File system monitoring (watches `output/` folder)
- **Benefits**: 
  - Clean separation of concerns
  - No API integration complexity  
  - Independent scaling and updates
  - External compliance validation

## Technology Stack

### Frontend & Backend
- **Framework**: Next.js 14.2.0 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks and context

### AI Integration
- **Primary Model**: Google Gemini (via `@google/genai`)
- **Prompt Engineering**: LangChain with PromptTemplate
- **Image Generation**: Gemini 2.5 Flash Image Preview
- **Progress Updates**: Server-Sent Events (SSE)

### File Management
- **Organization**: Hierarchical folder structure
- **Metadata**: JSON files with generation details
- **Asset Types**: PNG images, JSON metadata
- **Monitoring**: File watchers for external systems

## Data Flow

### 1. Input Processing
```
User Upload → Campaign Brief JSON → Validation → Asset Inventory Check
```

### 2. Generation Pipeline
```
Brief Parsing → LangChain Prompt Generation → Google Gemini API → Image Assets
```

### 3. Output Organization
```
Generated Images → Metadata Creation → File Structure → Review Flags
```

### 4. External Monitoring
```
File System Changes → Claude MCP Detection → Content Analysis → Compliance Report
```

## Key Architectural Decisions

### File-Based Communication
- **Why**: Simple, reliable, scales independently
- **vs API Integration**: Avoids complex auth, rate limiting, versioning issues
- **Benefits**: Each component can be developed, deployed, and scaled separately

### Server-Sent Events for Progress
- **Why**: Real-time updates without polling overhead
- **Implementation**: Streaming progress from `/api/campaign-generate`
- **User Experience**: Live campaign generation status

### LangChain for Prompt Engineering  
- **Why**: Professional prompt templating and brand consistency
- **Implementation**: Structured templates with variable substitution
- **Benefits**: Consistent output quality, easy template management

### Hierarchical File Organization
- **Why**: Scalable structure for hundreds of campaigns
- **Pattern**: `campaign/product/aspect-ratio/assets`
- **Benefits**: Easy navigation, automated organization, clear ownership

## Scalability Considerations

### Horizontal Scaling
- **Generation**: Multiple instances can process different campaigns
- **Monitoring**: Claude MCP scales independently
- **Storage**: File system can be distributed (S3, CDN)

### Performance Optimization
- **Sequential Generation**: Avoids API quota limits
- **Progress Streaming**: Non-blocking user experience  
- **Asset Reuse**: Check existing assets before generation (planned)

### Enterprise Readiness
- **Monitoring**: Comprehensive logging and error handling
- **Compliance**: External validation layer (Claude MCP)
- **Security**: Environment-based API key management
- **Documentation**: Complete technical and business documentation

## Enhancement Opportunities

### Template Integration
- **Current**: Templates exist in `config/` but aren't used
- **Future**: Integrate templates into LangChain prompt generation
- **Benefit**: More sophisticated messaging and regional adaptation

### Asset Reuse System
- **Current**: Asset folders exist but aren't checked
- **Future**: Scan `input/assets/` before generating new content
- **Benefit**: Cost reduction, brand consistency, faster generation

### Advanced Monitoring
- **Current**: Basic file organization and metadata
- **Future**: Performance metrics, success rates, compliance scores
- **Benefit**: Data-driven optimization and reporting
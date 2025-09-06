# Content Engine

Creative Automation Pipeline for scalable social media campaign generation with AI-powered content creation and real-time Claude MCP moderation.

## 🎯 Overview

The Content Engine is a Next.js application that automates the creation of social media campaigns at scale. It combines Google AI's Gemini models for image generation with Claude MCP integration for real-time content compliance checking.

## 🏗️ Architecture

### Core Features
- **Campaign Processing**: JSON-based campaign briefs with product specifications
- **AI Image Generation**: Google Gemini integration for creative asset generation  
- **Real-time Moderation**: Claude MCP integration for brand compliance checking
- **Multi-format Output**: 1:1, 9:16, and 16:9 aspect ratios for different platforms
- **Asset Management**: Intelligent reuse of existing brand assets
- **Progress Tracking**: Server-Sent Events for real-time campaign generation updates

### Project Structure
```
content_engine/
├── input/
│   ├── briefs/               # Campaign brief JSON files
│   └── assets/               # Existing brand assets
│       ├── logos/            # Brand logos for reuse
│       ├── backgrounds/      # Background images and templates  
│       └── product-images/   # Product photos and renders
├── output/                   # Generated campaign assets
├── config/                   # Brand guidelines and templates
│   ├── brand-guidelines.example.json
│   └── templates/
├── src/
│   ├── components/           # React UI components
│   ├── lib/                  # Core business logic
│   ├── types/                # TypeScript definitions
│   └── utils/                # Helper utilities
└── pages/
    ├── api/                  # API endpoints
    └── index.tsx             # Main application
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google AI API key (set in `.env.local` as `GOOGLE_AI_API_KEY`)
- Claude MCP connection (for content moderation)

### Installation
```bash
npm install
npm run dev
```

### Usage
1. **Upload Campaign Brief**: Use the Campaign mode to upload a JSON campaign brief
2. **Asset Processing**: System automatically checks for existing assets in `input/assets/`
3. **Generation**: Creates missing assets using Google AI Gemini models
4. **Moderation**: Claude MCP validates content against brand guidelines
5. **Output**: Organized assets saved to `output/[campaign_id]/`

### Example Campaign Brief
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

## 🎨 Modes

### Chat Mode
Interactive AI chat with Google Gemini models for creative assistance.

### Image Mode  
Direct image generation with prompt engineering and multi-format output.

### Campaign Mode
Automated campaign processing with:
- JSON brief upload
- Multi-product asset generation
- Real-time progress tracking
- Claude MCP compliance checking
- Organized file output structure

## 🔧 Configuration

### Brand Guidelines
Configure brand compliance rules in `config/brand-guidelines.example.json`:
- Brand colors and typography
- Logo placement requirements  
- Messaging tone and prohibited content
- Regional adaptations
- Compliance scoring thresholds

### Asset Management
Place existing brand assets in `input/assets/`:
- `logos/`: Brand and product logos
- `backgrounds/`: Background images and templates
- `product-images/`: Product photos and renders

## 📊 Monitoring & Alerts

### Real-time Progress
- Server-Sent Events for live campaign generation updates
- Per-asset completion status and error handling
- Compliance scoring and issue flagging

### Claude MCP Integration
- Automated content moderation after each asset generation
- Brand guideline compliance checking
- Quality assessment scoring (1-10 scale)
- Real-time alert system for compliance issues

## 🛠️ Development

### Tech Stack
- **Frontend**: Next.js 14.2.0, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Google AI Gemini, Claude MCP
- **State Management**: React hooks and context
- **File Processing**: Campaign briefs, asset management
- **Progress Tracking**: Server-Sent Events

### API Endpoints
- `/api/campaign-generate` - Campaign processing with SSE
- `/api/google-generate-image` - Single image generation
- `/api/google-stream` - Streaming chat responses
- `/api/validate-google-key` - API key validation
- `/api/initialize-google-provider` - Provider setup

## 📄 Documentation

- Brand asset requirements: See README files in `input/assets/` subdirectories
- Campaign brief format: See `input/briefs/adobe_tech_campaign.json`
- Brand guidelines: See `config/brand-guidelines.example.json`
- Message templates: See `config/templates/campaign-messages.example.json`

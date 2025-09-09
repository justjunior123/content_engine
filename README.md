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

## 🔧 Developer Setup Guide

### Prerequisites
- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **Google AI API Key** - Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Claude Desktop** (Optional) - For automated review system

### Step-by-Step Setup

#### 1. Clone and Install
```bash
git clone [your-repo-url]
cd content_engine
npm install
```

#### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your Google AI API key
# GOOGLE_AI_API_KEY=your_actual_api_key_here
```

#### 3. Verify Installation
```bash
# Start development server
npm run dev

# Visit http://localhost:3000
# The app should load without errors
```

#### 4. Test Basic Functionality
- Switch to "Image Mode"
- Try generating a simple image with prompt: "A red apple on a wooden table"
- If successful, your setup is working correctly

### Automated Review System (Optional)

The Content Engine includes an automated asset review system that works with Claude Desktop via MCP tools.

#### Prerequisites for Review System
- **Claude Desktop** installed and running
- **MCP tools** configured for file access
- **Gmail access** (for Claude to create draft emails)

#### Setup Automated Reviews

1. **Verify Script Permissions**
   ```bash
   # Make sure the review script is executable
   chmod +x scripts/auto-review.sh
   
   # Test the script manually
   ./scripts/auto-review.sh
   ```

2. **Configure Cron for Automated Monitoring**
   ```bash
   # Edit your crontab
   crontab -e
   
   # Add a schedule (example: every 30 minutes during business hours)
   # Replace [PROJECT_ROOT] with your actual project path
   */30 9-17 * * 1-5 [PROJECT_ROOT]/scripts/auto-review.sh
   ```

3. **Test the Complete Workflow**
   - Generate a campaign using the web interface
   - Wait for cron to detect the unreviewed assets
   - Tell Claude Desktop: "Check the review queue and process any pending campaigns"
   - Claude should review assets and create a Gmail draft

#### Environment Variables for Custom Deployments
```bash
# Optional: Override project root for the review script
export CONTENT_ENGINE_ROOT="/custom/path/to/content_engine"
```

### Common Setup Issues

#### Issue: "GOOGLE_AI_API_KEY environment variable is not set"
**Solution**: Ensure `.env.local` exists and contains your API key
```bash
# Check if file exists
ls -la .env.local

# Verify contents (without showing the actual key)
grep "GOOGLE_AI_API_KEY" .env.local
```

#### Issue: Script not found in cron
**Solution**: Use absolute paths in crontab
```bash
# Wrong (relative path)
*/30 * * * * scripts/auto-review.sh

# Correct (absolute path)  
*/30 * * * * /home/user/content_engine/scripts/auto-review.sh
```

#### Issue: Claude Desktop not processing queue
**Solution**: Verify Claude has file access permissions
- Check that Claude Desktop is running
- Verify MCP file access is configured
- Ensure `temp/review_queue.txt` exists and contains campaign paths

### Platform-Specific Notes

#### macOS Users
- Grant Terminal "Full Disk Access" in System Preferences > Privacy & Security
- Desktop notifications require accessibility permissions
- Use the provided `.sh` scripts directly

#### Linux Users  
- Install `notify-send` for desktop notifications: `sudo apt-get install libnotify-bin`
- Ensure cron service is running: `systemctl status cron`
- Use bash shell for scripts

#### Windows Users
- Use Git Bash or WSL for shell scripts
- Install Windows Subsystem for Linux for best compatibility
- Use the `dev:win`, `build:win`, `start:win` npm scripts

## 📄 Documentation

- **Automated Review System**: See `AUTOMATED_REVIEW_SYSTEM.md`
- **Project Architecture**: See `ARCHITECTURE.md` 
- **Workflow Guide**: See `WORKFLOW.md`
- **Component Details**: See `COMPONENTS.md`
- Brand asset requirements: See README files in `input/assets/` subdirectories
- Campaign brief format: See `input/briefs/adobe_tech_campaign.json`
- Brand guidelines: See `config/brand-guidelines.example.json`
- Message templates: See `config/templates/campaign-messages.example.json`

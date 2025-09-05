# 🚀 Content Engine - Installation Guide

## Quick Start (3 Commands)

```bash
cd /Users/thinking/Documents/coding/projects/ai_app_factory
npm install
npm run dev
```

Then open: http://localhost:3000

## What You Get

✅ **Provider Switching**: OpenAI ↔ Anthropic with live API validation  
✅ **RAG Knowledge**: Upload PDFs/TXT files for AI to reference  
✅ **Chat Interface**: Streamlit-style clean UI with streaming responses  
✅ **Privacy First**: API keys stored in memory only, never saved  
✅ **Local Only**: Runs entirely on your machine  

## How to Use

1. **Select Provider**: Choose OpenAI or Anthropic from dropdown
2. **Enter API Key**: Paste your key → Instant validation ✅
3. **Upload Documents**: (Optional) Add PDFs for AI to reference  
4. **Start Chatting**: Ask questions, switch providers anytime!

## Get API Keys

**OpenAI**: https://platform.openai.com/api-keys  
**Anthropic**: https://console.anthropic.com/

## File Structure

```
ai_app_factory/
├── lib/ai-app-factory.ts       # Core provider system
├── components/AIAppFactoryUI.tsx # React interface  
├── pages/index.tsx             # Main app page
├── styles/globals.css          # Tailwind styles
└── README.md                   # Full documentation
```

## Tech Stack

- **Frontend**: Next.js + React + TypeScript
- **AI**: LangChain.js (OpenAI, Anthropic SDKs)
- **Styling**: Tailwind CSS
- **Local**: Node.js 18+

## Troubleshooting

**Port in use?** → `npm run dev -- --port 3001`  
**Dependencies?** → `npm install`  
**Cache issues?** → `rm -rf .next && npm run dev`

---

**Ready to build more AI apps? This is your template foundation! 🤖**

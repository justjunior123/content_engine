#!/usr/bin/env node

// Setup script for AI App Factory
// This script helps non-technical users set up the application locally

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 AI App Factory Setup');
console.log('=======================\n');

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  console.log(`📋 Checking Node.js version: ${nodeVersion}`);
  
  if (majorVersion < 18) {
    console.error('❌ Node.js 18 or higher is required');
    console.log('Please visit https://nodejs.org to download the latest version');
    process.exit(1);
  }
  
  console.log('✅ Node.js version is compatible\n');
}

// Check if required directories exist
function checkDirectories() {
  console.log('📁 Checking project structure...');
  
  const requiredDirs = ['pages', 'components', 'lib', 'public'];
  const missingDirs = [];
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      missingDirs.push(dir);
    }
  });
  
  if (missingDirs.length > 0) {
    console.log('📂 Creating missing directories...');
    missingDirs.forEach(dir => {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   Created: ${dir}/`);
    });
  }
  
  console.log('✅ Project structure is ready\n');
}

// Create environment file template
function createEnvTemplate() {
  console.log('⚙️  Setting up environment configuration...');
  
  const envTemplate = `# AI App Factory Environment Variables
# Copy your API keys here (optional - you can also enter them in the UI)

# Disable Next.js telemetry for privacy
NEXT_TELEMETRY_DISABLED=1

# OpenAI API Key (get from https://platform.openai.com/api-keys)
# OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic API Key (get from https://console.anthropic.com/)
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Google AI API Key (get from https://aistudio.google.com/apikey)
# GOOGLE_AI_API_KEY=AIza-your-google-ai-key-here

# Grok API Key (get from https://x.ai/api)
# GROK_API_KEY=xai-your-grok-key-here

# Note: API keys can be entered directly in the UI instead of here
# This file is for convenience only and keys are never required to be stored
`;

  if (!fs.existsSync('.env.local')) {
    fs.writeFileSync('.env.local', envTemplate);
    console.log('✅ Created .env.local template');
  } else {
    console.log('✅ Environment file already exists');
  }
  
  console.log('');
}

// Main setup function
async function runSetup() {
  try {
    console.log('Starting setup process...\n');
    
    checkNodeVersion();
    checkDirectories();
    createEnvTemplate();
    
    console.log('🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Open: http://localhost:3000');
    console.log('3. Enter your API keys in the sidebar');
    console.log('4. Start chatting!\n');
    
    console.log('📖 For detailed instructions, see README.md');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  runSetup();
}

module.exports = { runSetup };

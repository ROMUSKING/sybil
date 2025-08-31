# Sybil AI Coding Agent - API Key Setup

## 🔐 API Key Configuration

**IMPORTANT:** Never commit API keys to version control. Follow these steps to set up your API keys securely:

### Option 1: VS Code Settings (Recommended)

1. **Open VS Code Settings** (Ctrl/Cmd + ,)
2. **Search for "sybil"**
3. **Configure API Keys:**
   - `Sybil: Api Keys > Openrouter` - Your OpenRouter API key
   - `Sybil: Api Keys > Huggingface` - Your HuggingFace token
   - `Sybil: Api Keys > Openai` - Your OpenAI API key
   - `Sybil: Api Keys > Anthropic` - Your Anthropic API key
   - `Sybil: Api Keys > Google` - Your Google AI API key

### Option 2: Local Configuration File (For Development)

1. **Create `config.local.json`** in the extension root:
   ```json
   {
     "api_keys": {
       "openrouter": "sk-or-v1-your-actual-key-here",
       "huggingface": "hf_your-actual-token-here",
       "openai": "sk-your-actual-key-here",
       "anthropic": "sk-ant-your-actual-key-here",
       "google": "your-actual-google-key-here"
     }
   }
   ```

2. **The `.gitignore` file already excludes** `config.local.json` from version control

### Option 3: Environment Variables (For Testing)

Set environment variables before running tests:
```bash
export OPENROUTER_API_KEY="sk-or-v1-your-key"
export HUGGINGFACE_API_KEY="hf_your-token"
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"
export GOOGLE_API_KEY="your-google-key"
```

### Getting API Keys

- **OpenRouter**: https://openrouter.ai/keys
- **HuggingFace**: https://huggingface.co/settings/tokens
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google AI**: https://makersuite.google.com/app/apikey

### Security Best Practices

✅ **DO:**
- Use VS Code settings for production
- Use `config.local.json` for development
- Keep API keys in environment variables for CI/CD
- Regularly rotate your API keys

❌ **DON'T:**
- Commit API keys to Git
- Share API keys in code
- Use the same key across multiple projects
- Store keys in plain text files that get committed

### Testing with Real Keys

Once you have your API keys configured, run the test:

```bash
# Using environment variables
npm run test:api

# Or using local config file
node load-config.js && npm run test:api
```

The extension will automatically detect and use your configured API keys.

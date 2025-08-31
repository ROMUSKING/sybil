#!/usr/bin/env node

// Load local config for testing
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.local.json');

if (fs.existsSync(configPath)) {
    try {
        const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Loaded local config from config.local.json');

        // Set environment variables from local config
        if (localConfig.api_keys) {
            Object.entries(localConfig.api_keys).forEach(([provider, key]) => {
                if (typeof key === 'string') {
                    process.env[`${provider.toUpperCase()}_API_KEY`] = key;
                    console.log(`Set API key for ${provider}`);
                }
            });
        }

        // Export config for use in tests
        module.exports = localConfig;
    } catch (error) {
        console.error('❌ Error loading config.local.json:', error.message);
        process.exit(1);
    }
} else {
    console.log('⚠️  config.local.json not found. Using default test configuration.');
    console.log('   Create config.local.json with your API keys for real testing.');
    module.exports = null;
}

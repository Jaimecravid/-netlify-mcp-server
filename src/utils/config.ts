import 'dotenv/config';

export const config = {
  netlify: {
    accessToken: process.env.NETLIFY_ACCESS_TOKEN || '',
    siteId: process.env.NETLIFY_SITE_ID || 'digitalzango-agricultural-calendar',
  },
  server: {
    name: 'netlify-mcp-server',
    version: '1.0.0',
  },
  development: {
    logLevel: process.env.LOG_LEVEL || 'info',
    debugMode: process.env.DEBUG === 'true',
  },
};

// Validate configuration
if (!config.netlify.accessToken) {
  console.error('⚠️ Warning: NETLIFY_ACCESS_TOKEN not found in environment variables');
  console.error('Please check your .env file and ensure NETLIFY_ACCESS_TOKEN is set');
}

if (!config.netlify.siteId) {
  console.warn('⚠️ Warning: NETLIFY_SITE_ID not set, using default value');
}

// Export individual configurations for easier imports
export const netlifyConfig = config.netlify;
export const serverConfig = config.server;
export const devConfig = config.development;

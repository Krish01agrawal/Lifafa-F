# Environment Setup

This document describes how to set up environment variables for the Lifafa app.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Environment
NODE_ENV=development

# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# Logging Configuration  
EXPO_PUBLIC_ENABLE_LOGGING=true
EXPO_PUBLIC_ENABLE_DETAILED_LOGGING=false

# Development Features
EXPO_PUBLIC_ENABLE_MOCK_API=true
```

## Environment Variable Descriptions

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8001` | Backend API URL (not used in local mode) |
| `EXPO_PUBLIC_ENABLE_LOGGING` | `true` | Enable console logging |
| `EXPO_PUBLIC_ENABLE_DETAILED_LOGGING` | `false` | Enable detailed debug logging |
| `EXPO_PUBLIC_ENABLE_MOCK_API` | `true` | Enable mock API responses |

## Local Development Mode

The app currently runs in **local-only mode** with the following features:

- **No backend required**: Chat functionality works entirely locally
- **Mock AI responses**: Simulated AI responses with random delays
- **Local chat storage**: Chats are stored in memory during the session
- **No authentication**: Authentication is mocked locally

## Development vs Production

### Development Mode
- Shows connection status in debug components
- Enables detailed logging
- Uses mock data and responses

### Production Mode  
- Hides debug components
- Reduced logging
- Would connect to real backend (when implemented)

## Configuration Files

The app configuration is managed through:

1. **`app.config.js`** - Expo configuration and environment variables
2. **`constants/Config.ts`** - Runtime configuration and helpers
3. **`.env`** - Environment-specific variables (create this file)

## Getting Started

1. Copy the environment variables above into a `.env` file
2. Install dependencies: `npm install`
3. Start the development server: `npx expo start`
4. The app will run in local mode with mock data

No backend setup is required for local development! 
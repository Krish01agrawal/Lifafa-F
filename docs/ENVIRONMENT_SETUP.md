# Environment Configuration Setup

This app uses Expo Constants for configuration management, allowing you to set environment variables that are accessible throughout your application.

## Setting Up Environment Variables

### 1. Create a `.env` file in your project root

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000

# App Information
EXPO_PUBLIC_APP_NAME=Lifafa
EXPO_PUBLIC_APP_VERSION=1.0.0

# Environment Configuration
NODE_ENV=development
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_LOGGING=true

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here

# Feature Flags
EXPO_PUBLIC_ENABLE_WEBSOCKET=false
EXPO_PUBLIC_ENABLE_ANALYTICS=false

# API Configuration
EXPO_PUBLIC_API_TIMEOUT=10000
EXPO_PUBLIC_RETRY_ATTEMPTS=3
```

### 2. Important Notes

- **EXPO_PUBLIC_ prefix**: Variables with this prefix are available in your app at runtime
- **Variables without prefix**: Only available during build time (like NODE_ENV)
- **Security**: Add `.env` to your `.gitignore` file to keep secrets safe
- **Default values**: The app has sensible defaults, so you only need to set what you want to override

### 3. Accessing Configuration in Code

The app uses a centralized configuration system via `constants/Config.ts`:

```typescript
import { Config, getApiUrl, log } from '../constants/Config';

// Access configuration
console.log(Config.apiUrl); // Gets EXPO_PUBLIC_API_URL or default

// Use helper functions
const endpoint = getApiUrl('/auth/login'); // Builds full URL
log('Debug message'); // Only logs if logging is enabled
```

### 4. Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | Backend API base URL |
| `EXPO_PUBLIC_APP_NAME` | `Lifafa` | App name displayed in logs |
| `EXPO_PUBLIC_DEBUG_MODE` | `false` | Enable debug features |
| `EXPO_PUBLIC_ENABLE_LOGGING` | `false` | Enable console logging |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | `""` | Google OAuth client ID |
| `EXPO_PUBLIC_ENABLE_WEBSOCKET` | `false` | Enable WebSocket features |
| `EXPO_PUBLIC_ENABLE_ANALYTICS` | `false` | Enable analytics tracking |
| `EXPO_PUBLIC_API_TIMEOUT` | `10000` | API request timeout (ms) |
| `EXPO_PUBLIC_RETRY_ATTEMPTS` | `3` | Number of API retry attempts |

### 5. Environment-Specific Configuration

For different environments (development, staging, production), you can:

1. Use different `.env` files (`.env.development`, `.env.production`)
2. Set up your deployment pipeline to inject the appropriate values
3. Use Expo's EAS Build secrets for production values

### 6. Expo Constants Integration

The configuration system leverages Expo Constants through `app.config.js`:

- Environment variables are loaded into the `extra` field
- Constants.expoConfig.extra provides runtime access
- Type-safe configuration through the `Config` utility
- Centralized default values and validation

### 7. Benefits

- **Type Safety**: Full TypeScript support for all configuration values
- **Centralized**: All configuration in one place
- **Environment Aware**: Easy switching between development/production
- **Secure**: Proper handling of sensitive data
- **Flexible**: Easy to add new configuration options 
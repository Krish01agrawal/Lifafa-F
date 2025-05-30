export default {
  expo: {
    name: "lifafa-app",
    slug: "lifafa-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "lifafaapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // API Configuration
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
      
      // App Information
      appName: process.env.EXPO_PUBLIC_APP_NAME || "Lifafa",
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
      
      // Environment Configuration
      environment: process.env.NODE_ENV || "development",
      debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === "true",
      enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING === "true",
      
      // OAuth Configuration
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
      
      // Feature Flags
      enableWebSocket: process.env.EXPO_PUBLIC_ENABLE_WEBSOCKET === "true",
      enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === "true",
      
      // API Configuration
      apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || "10000"),
      retryAttempts: parseInt(process.env.EXPO_PUBLIC_RETRY_ATTEMPTS || "3"),
    }
  }
}; 
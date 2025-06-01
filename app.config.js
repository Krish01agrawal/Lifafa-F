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
      // Environment Configuration
      env: process.env.NODE_ENV || "development",
      
      // API Configuration
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api",
      
      // Logging Configuration
      enableLogging: process.env.EXPO_PUBLIC_ENABLE_LOGGING !== "false",
      enableDetailedLogging: process.env.EXPO_PUBLIC_ENABLE_DETAILED_LOGGING === "true",
      
      // Development Features
      enableMockApi: process.env.EXPO_PUBLIC_ENABLE_MOCK_API === "true",
    }
  }
}; 
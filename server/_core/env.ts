export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  encryptKey: process.env.ENCRYPT_KEY ?? "",
};

// Email configuration
export const EMAIL_CONFIG = {
  ownerEmail: process.env.OWNER_EMAIL || "owner@example.com",
  serviceProvider: process.env.EMAIL_SERVICE_PROVIDER || "development",
  fromAddress: process.env.EMAIL_FROM_ADDRESS || "noreply@example.com",
  fromName: process.env.EMAIL_FROM_NAME || "Mint Experiment",
};

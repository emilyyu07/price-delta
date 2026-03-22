import { PrismaClient } from "@prisma/client";

import "dotenv/config";
import { env } from "./env.js";

// Construct the database URL with Supabase pooler params in production
const getDatabaseUrl = () => {
  const baseUrl = env.DATABASE_URL;
  
  if (env.NODE_ENV === "production") {
    // Append Supabase transaction pooler params
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}pgbouncer=true&connection_limit=1`;
  }
  
  return baseUrl;
};

const prisma = new PrismaClient({
  log: ["error", "warn"],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

//export client for use in other files
export default prisma;

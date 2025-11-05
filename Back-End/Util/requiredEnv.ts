import dotenv from "dotenv";

// Ensure .env is loaded even if this file is imported before index.ts runs
dotenv.config();

export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

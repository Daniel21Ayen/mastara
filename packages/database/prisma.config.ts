import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";
import path from "path";

// Load root .env file if DATABASE_URL is not already set in environment
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

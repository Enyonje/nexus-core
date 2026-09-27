// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    db: {
      adapter: "postgresql",
      url: process.env.DATABASE_URL, // must be defined in .env
    },
  },
});
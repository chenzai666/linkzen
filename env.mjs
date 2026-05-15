import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_URL: z.string().optional(),
    AUTH_SECRET: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    SCREENSHOTONE_BASE_URL: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_APP_NAME: z.string().optional(),
  },
  runtimeEnv: {
    AUTH_URL: process.env.AUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    SCREENSHOTONE_BASE_URL: process.env.SCREENSHOTONE_BASE_URL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  },
});

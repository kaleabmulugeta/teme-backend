import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_GALLERY_BUCKET: z.string().default("gallery"),
    ADMIN_USER_EMAILS: z.string().min(1),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(15)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid backend environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;

export const allowedAdminEmails = env.ADMIN_USER_EMAILS
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().default('3001'),
  CORS_ORIGIN: z.string(),
  ADMIN_USERNAME: z.string(),
  ADMIN_PASSWORD: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET should be long'),
  JWT_EXPIRES: z.coerce.number()
});

export const env = EnvSchema.parse(process.env);

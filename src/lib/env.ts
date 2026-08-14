import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  BOT_TREASURY_PRIVATE_KEY: z.string().min(1),
  NEXT_PUBLIC_USDT_CONTRACT_ADDRESS: z.string().min(1),
  NEXT_PUBLIC_PAYOUTS_CONTRACT_ADDRESS: z.string().min(1),
  WALLET_AUTH_SECRET: z.string().min(1),
});

export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.issues.map((e: z.ZodIssue) => e.path.join('.')),
    };
  }
  return { isValid: true, errors: [] };
};

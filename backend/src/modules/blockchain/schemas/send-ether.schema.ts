import { z } from 'zod';

export const sendEtherSchema = z.object({
  signerId: z.string(), // Changed to string to match User.id (UUID)
  to: z.string(),
  amountEther: z.string().min(0.001, 'Amount must be at least 0.001 ETH'),
});

export type SendEtherDto = z.infer<typeof sendEtherSchema>;

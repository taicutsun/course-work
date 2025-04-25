import { z } from 'zod';

export const sendEtherSchema = z.object({
  blockchainId: z.number(),
  to: z.string(),
  amountEther: z.string().min(0.001, 'Amount must be at least 0.001 ETH'),
});

export type SendEtherDto = z.infer<typeof sendEtherSchema>;

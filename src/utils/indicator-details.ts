
import { z } from "zod";

export const qIndicatorDetails = z.object({
  registration_id: z.string().min(5),
  code: z.string().min(1).max(10), // เช่น AD10001 / AD10002 / AD10003
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(200).default(50),
});
export type QIndicatorDetails = z.infer<typeof qIndicatorDetails>;

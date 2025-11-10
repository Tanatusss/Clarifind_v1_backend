import { z } from 'zod';

export const querySchema  = z.object({
  type: z.enum(["registration-number", "company-name"]).optional(),
  q: z.string().trim().min(1, "กรุณากรอกคำค้นหา"),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
});

export type ResolveCompanyQuery = z.infer<typeof querySchema >;


export const qSummary = z.object({ 
  registration_id: z.string().min(5).max(15) 
});

export const qDetailsMany = z.object({
  registration_id: z.string().min(5).max(15),
  codes: z.string().min(2), // "ad10000,d60000"
});

export type SummaryQuery = z.infer<typeof qSummary>;
export type DetailsManyQuery = z.infer<typeof qDetailsMany>;

export const qDetailsOne = z.object({ 
  registration_id: z.string().min(5).max(15)
 })

 export const qParamsOne = z.object({ 
  code: z.string().min(2) 
})

export type DetailsOneQuery = z.infer<typeof qDetailsOne>;
export type DetailsOneParams = z.infer<typeof qParamsOne>;
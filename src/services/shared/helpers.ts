

import { prisma } from "../../config/prisma";
import type { DetailResult } from "./types";

export async function getCompanyByReg(registration_id: string) {
  return prisma.company_profile.findFirst({
    where: { registration_id },
    select: { company_id: true, registration_id: true, name_th: true, name_en: true },
  });
}

export async function getDistinctAddressesForCompany(company_id: number): Promise<string[]> {
  const [a1, a2] = await Promise.all([
    prisma.address1.findMany({ where: { company_id, address_th: { not: null } }, select: { address_th: true } }),
    prisma.address2.findMany({ where: { company_id, address_th: { not: null } }, select: { address_th: true } }),
  ]);
  const set = new Set<string>();
  a1.forEach(x => x.address_th && set.add(x.address_th));
  a2.forEach(x => x.address_th && set.add(x.address_th));
  return [...set];
}

// ช่วยสร้างผลลัพธ์ว่าง
export function emptyTable(columns: { key: string; label: string }[], skip=0, take=50): DetailResult {
  return { rows: [], columns, pagination: { total: 0, take, skip } };
}

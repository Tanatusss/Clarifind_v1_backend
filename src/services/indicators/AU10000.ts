import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_AU10000(company_id: number, skip: number, take: number): Promise<DetailResult> {
  const cols = [
    { key: "year_fs", label: "ปีงบ" },
    { key: "financial_asof", label: "As of" },
    { key: "audit_name_th", label: "ผู้สอบ (TH)" },
    { key: "audit_name_en", label: "Auditor (EN)" },
    { key: "audit_nof_com_51_49", label: "#บริษัท 51:49" },
  ];
  const [total, rows] = await prisma.$transaction([
    prisma.auditor.count({ where: { company_id } }),
    prisma.auditor.findMany({
      where: { company_id }, orderBy: [{ year_fs: "desc" }], skip, take,
      select: { year_fs: true, financial_asof: true, audit_name_th: true, audit_name_en: true, audit_nof_com_51_49: true },
    }),
  ]);
  return { rows, columns: cols, pagination: { total, take, skip } };
}

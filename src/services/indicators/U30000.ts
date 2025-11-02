import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_U30000(company_id: number, skip: number, take: number): Promise<DetailResult> {
  const cols = [
    { key: "sh_upd_date", label: "วันที่อัปเดต" },
    { key: "shareholder_name_th", label: "ผู้ถือหุ้น (TH)" },
    { key: "shareholder_name_en", label: "Shareholder (EN)" },
    { key: "nation_th", label: "สัญชาติ (TH)" },
    { key: "nation_en", label: "Nationality (EN)" },
    { key: "percent_share", label: "% ทางตรง" },
    { key: "percent_bo", label: "% รวม (BO)" },
    { key: "diff_bo_direct", label: "% ทางอ้อม" },
  ];
  const [total, rows] = await prisma.$transaction([
    prisma.ubo_u30000.count({ where: { company_id } }),
    prisma.ubo_u30000.findMany({
      where: { company_id }, orderBy: [{ sh_upd_date: "desc" }], skip, take,
      select: { sh_upd_date: true, shareholder_name_th: true, shareholder_name_en: true, nation_th: true, nation_en: true, percent_share: true, percent_bo: true, diff_bo_direct: true },
    }),
  ]);
  return { rows, columns: cols, pagination: { total, take, skip } };
}

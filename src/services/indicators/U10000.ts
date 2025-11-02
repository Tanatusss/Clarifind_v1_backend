import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_U10000(company_id: number, skip: number, take: number): Promise<DetailResult> {
  const cols = [
    { key: "ubo_name_th", label: "UBO (TH)" },
    { key: "ubo_name_en", label: "UBO (EN)" },
    { key: "nation_th", label: "สัญชาติ (TH)" },
    { key: "nation_en", label: "Nationality (EN)" },
    { key: "percent_ubo", label: "% UBO" },
  ];
  const [total, rows] = await prisma.$transaction([
    prisma.ubo_u10000.count({ where: { company_id } }),
    prisma.ubo_u10000.findMany({
      where: { company_id }, orderBy: [{ id: "asc" }], skip, take,
      select: { ubo_name_th: true, ubo_name_en: true, nation_th: true, nation_en: true, percent_ubo: true },
    }),
  ]);
  return { rows, columns: cols, pagination: { total, take, skip } };
}

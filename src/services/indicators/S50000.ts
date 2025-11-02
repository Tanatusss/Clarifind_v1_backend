import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_S50000(company_id: number, skip: number, take: number): Promise<DetailResult> {
  const cols = [
    { key: "sh_upd_date", label: "วันที่อัปเดต" },
    { key: "nation_th", label: "สัญชาติ (TH)" },
    { key: "nation_en", label: "Nationality (EN)" },
    { key: "nof_person", label: "#บุคคลสัญชาตินี้" },
    { key: "nof_shareholder", label: "#ผู้ถือหุ้นรวม" },
    { key: "com_nof_shareholder", label: "#ผู้ถือหุ้นของบริษัท" },
    { key: "com_nof_person_th", label: "รายละเอียด (TH)" },
    { key: "com_nof_person_en", label: "Detail (EN)" },
  ];
  const [total, rows] = await prisma.$transaction([
    prisma.shareholder_s50000.count({ where: { company_id } }),
    prisma.shareholder_s50000.findMany({
      where: { company_id }, orderBy: [{ sh_upd_date: "desc" }], skip, take,
      select: { sh_upd_date: true, nation_th: true, nation_en: true, nof_person: true, nof_shareholder: true, com_nof_shareholder: true, com_nof_person_th: true, com_nof_person_en: true },
    }),
  ]);
  return { rows, columns: cols, pagination: { total, take, skip } };
}

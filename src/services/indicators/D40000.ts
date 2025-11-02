import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_D40000(company_id: number, skip: number, take: number): Promise<DetailResult> {
  const cols = [
    { key: "nof_director", label: "จำนวนกรรมการทั้งหมด" },
    { key: "nof_fr_director_auth_power", label: "ต่างชาติที่มีอำนาจลงนาม" },
    { key: "director_name_th", label: "กรรมการ (TH)" },
    { key: "director_name_en", label: "Director (EN)" },
    { key: "nation_th", label: "สัญชาติ (TH)" },
    { key: "nation_en", label: "Nationality (EN)" },
  ];
  const [total, rows] = await prisma.$transaction([
    prisma.director4.count({ where: { company_id } }),
    prisma.director4.findMany({
      where: { company_id }, orderBy: [{ id: "asc" }], skip, take,
      select: { nof_director: true, nof_fr_director_auth_power: true, director_name_th: true, director_name_en: true, nation_th: true, nation_en: true },
    }),
  ]);
  return { rows, columns: cols, pagination: { total, take, skip } };
}

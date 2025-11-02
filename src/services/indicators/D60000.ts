import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

function toNumericId(s: unknown): number | null {
  if (typeof s !== "string" && typeof s !== "number") return null;
  const raw = String(s).trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function resolve_D60000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "year_focus", label: "ปีโฟกัส" },
    { key: "nof_com", label: "#บริษัท" },
    { key: "company_id_detail", label: "บริษัทที่เกี่ยวข้อง (ID)" },
    { key: "registration_id", label: "เลขทะเบียน" },
    { key: "name_th", label: "ชื่อบริษัท (TH)" },
    { key: "name_en", label: "Company (EN)" },
    { key: "regist_date", label: "วันที่จดทะเบียน A" },
    { key: "regists_date", label: "วันที่จดทะเบียน B" },
  ];

  // ดึงข้อมูล director6
  const [total, baseRows] = await prisma.$transaction([
    prisma.director6.count({ where: { company_id } }),
    prisma.director6.findMany({
      where: { company_id },
      orderBy: [{ id: "asc" }],
      skip,
      take,
      select: {
        year_focus: true,
        nof_com: true,
        company_id_detail: true,
        regist_date: true,
        regists_date: true,
      },
    }),
  ]);

  // รวม company_id_detail ทั้งหมดที่แปลงได้เป็นตัวเลข
  const detailIds = Array.from(
    new Set(
      baseRows
        .map(r => toNumericId(r.company_id_detail))
        .filter((v): v is number => v !== null && v !== company_id)
    )
  );

  // ดึงข้อมูลบริษัท
  const profiles = detailIds.length
    ? await prisma.company_profile.findMany({
        where: { company_id: { in: detailIds } },
        select: {
          company_id: true,
          registration_id: true,
          name_th: true,
          name_en: true,
        },
      })
    : [];

  const profileById = new Map(profiles.map(p => [p.company_id, p]));

  // รวมผลลัพธ์ พร้อมชื่อบริษัท
  const rows = baseRows.map(r => {
    const cid = toNumericId(r.company_id_detail);
    const p = cid ? profileById.get(cid) : undefined;
    return {
      year_focus: r.year_focus,
      nof_com: r.nof_com,
      company_id_detail: r.company_id_detail,
      registration_id: p?.registration_id ?? null,
      name_th: p?.name_th ?? null,
      name_en: p?.name_en ?? null,
      regist_date: r.regist_date,
      regists_date: r.regists_date,
    };
  });

  return { rows, columns, pagination: { total, take, skip } };
}

import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

function toNumericId(s: unknown): number | null {
  if (typeof s !== "string" && typeof s !== "number") return null;
  const raw = String(s).trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function resolve_D70000(
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
    { key: "status_date", label: "วันที่สถานะ" },
    { key: "company_status_th", label: "สถานะ (TH)" },
    { key: "company_status_en", label: "Status (EN)" },
  ];

  // ดึงข้อมูล director7
  const [total, baseRows] = await prisma.$transaction([
    prisma.director7.count({ where: { company_id } }),
    prisma.director7.findMany({
      where: { company_id },
      orderBy: [{ id: "asc" }],
      skip,
      take,
      select: {
        year_focus: true,
        nof_com: true,
        company_id_detail: true,
        status_date: true,
        company_status_th: true,
        company_status_en: true,
      },
    }),
  ]);

  // รวม company_id_detail ทั้งหมด (แปลงเป็นตัวเลข และตัดบริษัทตัวเองออก)
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

  // ประกอบผลลัพธ์สุดท้าย
  const rows = baseRows
    .filter(r => {
      const cid = toNumericId(r.company_id_detail);
      return cid !== null && cid !== company_id; // ตัดบริษัทตัวเองออก
    })
    .map(r => {
      const cid = toNumericId(r.company_id_detail);
      const p = cid ? profileById.get(cid) : undefined;
      return {
        year_focus: r.year_focus,
        nof_com: r.nof_com,
        company_id_detail: r.company_id_detail,
        registration_id: p?.registration_id ?? null,
        name_th: p?.name_th ?? null,
        name_en: p?.name_en ?? null,
        status_date: r.status_date,
        company_status_th: r.company_status_th,
        company_status_en: r.company_status_en,
      };
    });

  return { rows, columns, pagination: { total, take, skip } };
}

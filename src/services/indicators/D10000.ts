import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { DetailResult } from "../shared/types";

function toNumericId(s: unknown): number | null {
  if (typeof s !== "string" && typeof s !== "number") return null;
  const raw = String(s).trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function resolve_D10000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "director_name_th", label: "กรรมการ (TH)" },
    { key: "director_name_en", label: "Director (EN)" },
    { key: "nof_com_same_director", label: "#บริษัทที่ใช้บอร์ดเดียวกัน" },
    { key: "company_id_detail", label: "Company ID อื่น" },
    { key: "registration_id", label: "เลขทะเบียน (บริษัทอื่น)" },
    { key: "name_th", label: "ชื่อบริษัท (TH) (บริษัทอื่น)" },
    { key: "name_en", label: "Company (EN) (บริษัทอื่น)" },
    { key: "is_parent", label: "Parent?" },
  ];

  // กรอง: ตัดบริษัทตัวเอง + ตัด null ตั้งแต่ใน DB
  const whereBase: Prisma.director1WhereInput = {
    company_id,
    AND: [
      { company_id_detail: { not: String(company_id) } }, // ไม่ใช่บริษัทตัวเอง
      { NOT: { company_id_detail: null } },               // ไม่เป็น null
    ],
  };

  const [total, baseRows] = await prisma.$transaction([
    prisma.director1.count({ where: whereBase }),
    prisma.director1.findMany({
      where: whereBase,
      orderBy: [{ id: "asc" }],
      skip,
      take,
      select: {
        director_name_th: true,
        director_name_en: true,
        nof_com_same_director: true,
        company_id_detail: true, // String?
        is_parent: true,
      },
    }),
  ]);

  // กันเคสข้อมูลสกปรกอีกชั้น (เช่นมีช่องว่าง/รูปแบบแปลก) แล้วตัดตัวเองอีกรอบแบบ numeric
  const filtered = baseRows.filter(r => {
    const cid = toNumericId(r.company_id_detail);
    return cid !== null && cid !== company_id;
  });

  // join company_profile ครั้งเดียว
  const detailIds = Array.from(
    new Set(
      filtered
        .map(r => toNumericId(r.company_id_detail))
        .filter((v): v is number => v !== null)
    )
  );

  const profiles = detailIds.length
    ? await prisma.company_profile.findMany({
        where: { company_id: { in: detailIds } },
        select: { company_id: true, registration_id: true, name_th: true, name_en: true },
      })
    : [];

  const profileById = new Map(profiles.map(p => [p.company_id, p]));

  const rows = filtered.map(r => {
    const cid = toNumericId(r.company_id_detail);
    const p = cid != null ? profileById.get(cid) : undefined;
    return {
      director_name_th: r.director_name_th,
      director_name_en: r.director_name_en,
      nof_com_same_director: r.nof_com_same_director,
      company_id_detail: r.company_id_detail,
      registration_id: p?.registration_id ?? null,
      name_th: p?.name_th ?? null,
      name_en: p?.name_en ?? null,
      is_parent: r.is_parent,
    };
  });

  return { rows, columns, pagination: { total, take, skip } };
}

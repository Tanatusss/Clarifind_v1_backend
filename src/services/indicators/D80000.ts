import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { DetailResult } from "../shared/types";

// รองรับกรณี company_id_detail เป็น String?
function toNumericId(s: unknown): number | null {
  if (typeof s !== "string" && typeof s !== "number") return null;
  const raw = String(s).trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function resolve_D80000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "nof_com", label: "#บริษัท" },
    { key: "company_id_detail", label: "บริษัทที่เกี่ยวข้อง (ID)" },
    { key: "registration_id", label: "เลขทะเบียน" },
    { key: "name_th", label: "ชื่อบริษัท (TH)" },
    { key: "name_en", label: "Company (EN)" },
    { key: "regist_date", label: "วันที่จดทะเบียน" },
    { key: "status_date", label: "วันที่สถานะ" },
    { key: "company_status_th", label: "สถานะ (TH)" },
    { key: "company_status_en", label: "Status (EN)" },
    { key: "diff_day", label: "อายุ (วัน)" },
  ];

  // ตัดบริษัทตัวเอง + null ออกจาก company_id_detail ตั้งแต่ใน DB
  const whereBase: Prisma.director8WhereInput = {
    company_id,
    AND: [
      { NOT: { company_id_detail: null } },
      { company_id_detail: { not: String(company_id) } },
    ],
  };

  const [total, baseRows] = await prisma.$transaction([
    prisma.director8.count({ where: whereBase }),
    prisma.director8.findMany({
      where: whereBase,
      orderBy: [{ id: "asc" }],
      skip,
      take,
      select: {
        nof_com: true,
        company_id_detail: true, // String?
        regist_date: true,
        status_date: true,
        company_status_th: true,
        company_status_en: true,
        diff_day: true,
      },
    }),
  ]);

  // กันข้อมูลสกปรกอีกรอบ (trim/ตัวเลข) และรวบรวม ID สำหรับ join
  const filtered = baseRows.filter(r => {
    const cid = toNumericId(r.company_id_detail);
    return cid !== null && cid !== company_id;
  });

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
      nof_com: r.nof_com,
      company_id_detail: r.company_id_detail,
      registration_id: p?.registration_id ?? null,
      name_th: p?.name_th ?? null,
      name_en: p?.name_en ?? null,
      regist_date: r.regist_date,
      status_date: r.status_date,
      company_status_th: r.company_status_th,
      company_status_en: r.company_status_en,
      diff_day: r.diff_day,
    };
  });

  return { rows, columns, pagination: { total, take, skip } };
}

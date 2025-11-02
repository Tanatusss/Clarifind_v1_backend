import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_C10000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "nof_path", label: "จำนวนเส้นทาง" },
    { key: "path_id", label: "Path ID" },
    { key: "company_id_detail", label: "บริษัทที่เกี่ยวข้อง (ID)" },
    { key: "registration_id", label: "เลขทะเบียน" },
    { key: "name_th", label: "ชื่อบริษัท (TH)" },
    { key: "name_en", label: "Company (EN)" },
    { key: "rec_update_when", label: "อัปเดตล่าสุด" },
  ];

  // ดึงรวม count + หน้าเพจของ circular
  const [total, baseRows] = await prisma.$transaction([
    prisma.circular.count({ where: { company_id } }),
    prisma.circular.findMany({
      where: { company_id },
      orderBy: [{ id: "asc" }],
      skip,
      take,
      select: {
        nof_path: true,
        path_id: true,
        company_id_detail: true,
        rec_update_when: true,
      },
    }),
  ]);

  // รวบรวม company_id_detail ที่ไม่ null เพื่อนำไป join company_profile ทีเดียว
  const detailIds = Array.from(
    new Set(
      baseRows
        .map(r => r.company_id_detail)
        .filter((v): v is number => typeof v === "number")
    )
  );

  let byId = new Map<number, { company_id: number; registration_id: string | null; name_th: string | null; name_en: string | null }>();
  if (detailIds.length) {
    const profiles = await prisma.company_profile.findMany({
      where: { company_id: { in: detailIds } },
      select: { company_id: true, registration_id: true, name_th: true, name_en: true },
    });
    byId = new Map(profiles.map(p => [p.company_id, p]));
  }

  // ผูกชื่อบริษัทเข้ากับแถว
  const rows = baseRows.map(r => {
    const p = r.company_id_detail != null ? byId.get(r.company_id_detail) : undefined;
    return {
      nof_path: r.nof_path,
      path_id: r.path_id,
      company_id_detail: r.company_id_detail ?? null,
      registration_id: p?.registration_id ?? null,
      name_th: p?.name_th ?? null,
      name_en: p?.name_en ?? null,
      rec_update_when: r.rec_update_when ?? null,
    };
  });

  return { rows, columns, pagination: { total, take, skip } };
}

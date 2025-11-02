import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

/**
 * F10000: เป็นบริษัทที่ดำเนินกิจการตั้งแต่ 2 ปีขึ้นไป แต่ไม่เคยนำส่งงบการเงิน
 * - ไม่มีตารางซัพพอร์ต → อิงจากตาราง indicators
 * - ถ้า indicators: { company_id, indicator_key: 'F10000', indicator_flag: 1 } → แสดงชื่อบริษัท (จาก company_profile)
 * - ถ้าไม่ตรงเงื่อนไข → ไม่แสดงอะไร (rows = [])
 * - รองรับ pagination (แม้ปกติจะได้ 0/1 แถว)
 */
export async function resolve_F10000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "registration_id", label: "เลขทะเบียน" },
    { key: "name_th",        label: "ชื่อบริษัท (TH)" },
    { key: "name_en",        label: "Company (EN)" },
    { key: "updated_at",     label: "อัปเดตล่าสุด (Indicators)" },
  ];

  // เช็คว่าบริษัทนี้ถูกปักธง F10000 หรือไม่
  const flagged = await prisma.indicators.findFirst({
    where: { company_id, indicator_key: "F10000", indicator_flag: 1 },
    select: { rec_update_when: true },
  });

  if (!flagged) {
    return { rows: [], columns, pagination: { total: 0, take, skip } };
  }

  // ดึงชื่อบริษัท
  const company = await prisma.company_profile.findUnique({
    where: { company_id },
    select: { registration_id: true, name_th: true, name_en: true },
  });

  if (!company) {
    return { rows: [], columns, pagination: { total: 0, take, skip } };
  }

  const row = {
    registration_id: company.registration_id ?? null,
    name_th: company.name_th ?? null,
    name_en: company.name_en ?? null,
    updated_at: flagged.rec_update_when ?? null,
  };

  // รองรับแบ่งหน้า (ปกติ 1 แถว)
  const all = [row];
  const total = all.length;
  const rows = all.slice(skip, skip + take);

  return { rows, columns, pagination: { total, take, skip } };
}

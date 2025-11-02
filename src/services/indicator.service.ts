// src/services/indicators/summary.service.ts
import { prisma } from "../config/prisma";

export type IndicatorSummaryItem = {
  indicator: string;          // = indicator_master.indicator_key
  name_th: string | null;
  name_en: string | null;
  flag: 0 | 1;                // มาจาก indicators.indicator_flag (ล่าสุดของโค้ดนั้น ๆ)
  updated_at: Date | null;    // max(rec_update_when, rec_create_when)
};

export async function getIndicatorSummaryByRegistration(registration_id: string) {
  // 1) หา company_id จากทะเบียน
  const company = await prisma.company_profile.findFirst({
    where: { registration_id },
    select: { company_id: true, registration_id: true, name_th: true, name_en: true },
  });
  if (!company) return null;

  // 2) โหลด master ทั้งหมด (หรือกรอง 23 ตัวตาม whitelist ถ้าต้องการ)
  const masters = await prisma.indicator_master.findMany({
    select: { indicator_key: true, name_th: true, name_en: true },
  });

  // 3) โหลดทุกแถว indicators ของบริษัทนี้
  const rows = await prisma.indicators.findMany({
    where: { company_id: company.company_id },
    select: {
      indicator_key: true,     // << ใช้คอลัมน์นี้
      indicator_flag: true,    // 0/1 (อาจเป็น null)
      rec_update_when: true,
      rec_create_when: true,
    },
  });

  // (ดีบัก) ดูว่ามีแถวไหม และมีแถวที่ flag=1 ไหม
  // console.log("[DBG] rows count =", rows.length);
  // console.log("[DBG] rows with flag=1 =", rows.filter(r => (r.indicator_flag ?? 0) >= 1).length);
  // console.log("[DBG] sample rows =", rows.slice(0, 5));

  // 4) เลือก “แถวล่าสุด” ต่อโค้ด (กันเคสมีหลาย revision)
  type V = { flag: 0 | 1; updated_at: Date | null };
  const latestByKey = new Map<string, V>();

  for (const r of rows) {
    const key = (r.indicator_key ?? "").trim().toUpperCase();
    if (!key) continue;

    const ts = r.rec_update_when ?? r.rec_create_when ?? null;
    const flag: 0 | 1 = (r.indicator_flag && r.indicator_flag >= 1) ? 1 : 0; // กัน null/ค่ามากกว่า 1

    const prev = latestByKey.get(key);
    if (!prev) {
      latestByKey.set(key, { flag, updated_at: ts });
    } else {
      const prevTs = prev.updated_at;
      if ((ts && !prevTs) || (ts && prevTs && ts > prevTs)) {
        latestByKey.set(key, { flag, updated_at: ts });
      }
    }
  }

  // 5) สร้างผลลัพธ์เทียบกับ master (ไม่พบ = flag 0)
  const indicators: IndicatorSummaryItem[] = masters.map((m) => {
    const key = (m.indicator_key ?? "").trim().toUpperCase();
    const v = latestByKey.get(key);
    return {
      indicator: key,
      name_th: m.name_th ?? null,
      name_en: m.name_en ?? null,
      flag: v ? v.flag : 0,
      updated_at: v ? v.updated_at : null,
    };
  });

  return {
    company: {
      company_id: company.company_id,
      registration_id: company.registration_id,
      name_th: company.name_th,
      name_en: company.name_en,
    },
    indicators,
  };
}

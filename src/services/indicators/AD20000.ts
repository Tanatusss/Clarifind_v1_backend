import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

// คีย์เวิร์ดตรวจจับสำนักงานบัญชี/กฎหมาย จาก industry_* ใน address2
const LAW_KEYS_TH = ["กฎหมาย", "ทนาย", "นิติ"];
const LAW_KEYS_EN = ["LAW", "LEGAL"];
const ACC_KEYS_TH = ["บัญชี", "สอบบัญชี", "ผู้สอบบัญชี", "ตรวจสอบบัญชี"];
const ACC_KEYS_EN = ["ACCOUNT", "ACCOUNTING", "AUDIT", "AUDITOR"];

function isLawOrAccounting(th?: string | null, en?: string | null) {
  const T = (th || "").toUpperCase();
  const E = (en || "").toUpperCase();
  const hit = (s: string, keys: string[]) => keys.some(k => s.includes(k));
  return (
    hit(T, LAW_KEYS_TH.map(k => k.toUpperCase())) ||
    hit(E, LAW_KEYS_EN) ||
    hit(T, ACC_KEYS_TH.map(k => k.toUpperCase())) ||
    hit(E, ACC_KEYS_EN)
  );
}

// ดึง address_th (distinct) ของบริษัทนี้จาก address2 เท่านั้น
async function getDistinctAddressesForCompanyAddress2(company_id: number): Promise<string[]> {
  const rows = await prisma.address2.findMany({
    where: { company_id, address_th: { not: null } },
    select: { address_th: true },
  });
  return [...new Set(rows.map(r => r.address_th!).filter(Boolean))];
}


export async function resolve_AD20000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "address_th", label: "ที่อยู่ (TH)" },
    { key: "dup_companies", label: "จำนวนบริษัทซ้ำ (เฉพาะบัญชี/กฎหมาย)" },
    { key: "sample_companies", label: "ตัวอย่างบริษัท (ไม่เกิน 5 บริษัท)" },
  ];

  // 1) ที่อยู่ของบริษัทนี้ (distinct) จาก address2
  const target = await getDistinctAddressesForCompanyAddress2(company_id);
  if (!target.length) {
    return { rows: [], columns, pagination: { total: 0, take, skip } };
  }

  // 2) address2 ของบริษัทอื่นที่ที่อยู่ซ้ำ
  const others = await prisma.address2.findMany({
    where: {
      address_th: { in: target },
      company_id: { not: company_id },
    },
    select: {
      address_th: true,
      company_id: true,
      industry_th_lv5: true,
      industry_en_lv5: true,
    },
  });

  // 3) จำกัดเฉพาะบริษัทที่เป็นสำนักงานบัญชี/กฎหมาย
  const filtered = others.filter(o => isLawOrAccounting(o.industry_th_lv5, o.industry_en_lv5));

  // 4) group เป็น address_th -> Set<company_id>
  const grouped = new Map<string, Set<number>>();
  for (const r of filtered) {
    if (!r.address_th) continue;
    if (!grouped.has(r.address_th)) grouped.set(r.address_th, new Set());
    grouped.get(r.address_th)!.add(r.company_id);
  }

  // 5) แปลงเป็นรายการสรุปต่อ address_th + จัดอันดับตามจำนวนบริษัทซ้ำ
  const all = [...grouped.entries()]
    .map(([addr, set]) => ({
      address_th: addr,
      dup_companies: set.size,
      company_ids: [...set], // เอาไว้คัดตัวอย่าง 5 ราย
    }))
    .sort(
      (a, b) =>
        b.dup_companies - a.dup_companies ||
        a.address_th.localeCompare(b.address_th)
    );

  const total = all.length;
  const page = all.slice(skip, skip + take);

  // 6) เลือก company_id ตัวอย่างไม่เกิน 5 ต่อที่อยู่
  const sampleIdUnion = new Set<number>();
  const sampleMap = new Map<string, number[]>(); // address_th -> number[]
  for (const item of page) {
    const picks = item.company_ids.slice(0, 5);
    sampleMap.set(item.address_th, picks);
    picks.forEach(id => sampleIdUnion.add(id));
  }

  // 7) ดึงข้อมูลบริษัทของชุดตัวอย่างทั้งหมดครั้งเดียว (ลด N+1)
  const profiles = await prisma.company_profile.findMany({
    where: { company_id: { in: [...sampleIdUnion] } },
    select: { company_id: true, registration_id: true, name_th: true, name_en: true },
  });
  const profById = new Map(profiles.map(p => [p.company_id, p]));

  // 8) ประกอบผลลัพธ์
  const rows = page.map(item => {
    const ids = sampleMap.get(item.address_th) ?? [];
    const sample_companies = ids.map(cid => {
      const p = profById.get(cid);
      return p
        ? {
            company_id: p.company_id,
            registration_id: p.registration_id,
            name_th: p.name_th,
            name_en: p.name_en,
          }
        : { company_id: cid, registration_id: null, name_th: null, name_en: null };
    });

    return {
      address_th: item.address_th,
      dup_companies: item.dup_companies,
      sample_companies, // ไม่เกิน 5 ราย
    };
  });

  return { rows, columns, pagination: { total, take, skip } };
}

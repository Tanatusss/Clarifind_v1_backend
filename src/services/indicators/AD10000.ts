import { prisma } from "../../config/prisma";
import { getDistinctAddressesForCompany } from "../shared/helpers";
import { DetailResult } from "../shared/types";


export async function resolve_AD10000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const target = await getDistinctAddressesForCompany(company_id);
  const cols = [
    { key: "address_th", label: "ที่อยู่ (TH)" },
    { key: "dup_companies", label: "จำนวนบริษัทซ้ำ (ไม่นับตัวเอง)" },
    { key: "sample_companies", label: "ตัวอย่างบริษัท (ไม่เกิน 5 บริษัท)" },
  ];

  if (!target.length) {
    return { rows: [], columns: cols, pagination: { total: 0, take, skip } };
  }

  // หา company อื่นที่มีที่อยู่ซ้ำในทั้ง address1/address2
  const [a1, a2] = await Promise.all([
    prisma.address1.findMany({
      where: { address_th: { in: target }, company_id: { not: company_id } },
      select: { address_th: true, company_id: true },
    }),
    prisma.address2.findMany({
      where: { address_th: { in: target }, company_id: { not: company_id } },
      select: { address_th: true, company_id: true },
    }),
  ]);

  // รวมและจัดกลุ่ม: address_th -> Set<company_id>
  const grouped = new Map<string, Set<number>>();
  for (const r of [...a1, ...a2]) {
    if (!r.address_th) continue;
    if (!grouped.has(r.address_th)) grouped.set(r.address_th, new Set());
    grouped.get(r.address_th)!.add(r.company_id);
  }

  // สร้างรายการทั้งหมด + คัดเฉพาะที่มีซ้ำ >= 5
  const all = [...grouped.entries()]
    .map(([addr, set]) => ({
      address_th: addr,
      dup_companies: set.size,
      company_ids: [...set], // เก็บไว้ใช้เลือก sample 5 บริษัท
    }))
    .filter(x => x.dup_companies >= 5)
    .sort(
      (a, b) =>
        b.dup_companies - a.dup_companies ||
        a.address_th.localeCompare(b.address_th)
    );

  const total = all.length;

  // ทำเพจ
  const page = all.slice(skip, skip + take);

  // เลือก company_id ตัวอย่างไม่เกิน 5 ต่อที่อยู่
  const sampleIdUnion = new Set<number>();
  const sampleMap = new Map<string, number[]>(); // address_th -> number[]
  for (const item of page) {
    const picks = item.company_ids.slice(0, 5);
    sampleMap.set(item.address_th, picks);
    picks.forEach(id => sampleIdUnion.add(id));
  }

  // ดึงข้อมูลบริษัทของชุดตัวอย่างทั้งหมดครั้งเดียว (ลด N+1)
  const profiles = await prisma.company_profile.findMany({
    where: { company_id: { in: [...sampleIdUnion] } },
    select: { company_id: true, registration_id: true, name_th: true, name_en: true },
  });
  const profById = new Map(profiles.map(p => [p.company_id, p]));

  // สร้างแถวผลลัพธ์ (ใส่ sample_companies ไม่เกิน 5 บริษัท)
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
      sample_companies, // <= จำกัดไว้ 5 record/ที่อยู่
    };
  });

  return { rows, columns: cols, pagination: { total, take, skip } };
}

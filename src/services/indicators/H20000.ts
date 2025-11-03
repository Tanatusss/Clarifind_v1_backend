import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

/** จัดกลุ่มสัญชาติ: ไทย / ต่างชาติ / ไม่ทราบ */
function classifyNationality(nationTh?: string | null, nationEn?: string | null): "THAI" | "FOREIGN" | "UNKNOWN" {
  const t = (nationTh ?? "").trim();
  const e = (nationEn ?? "").trim().toUpperCase();

  // ไม่มีข้อมูลเลย
  if (!t && !e) return "UNKNOWN";

  // กรณีที่ text เป็น null/ว่าง/ขีด/ไม่ระบุ
  const unknownMarks = ["-", "N/A", "NA", "NULL", "UNKNOWN", "NOT SPECIFIED", "NOT AVAILABLE", "ไม่ระบุ", "ไม่มี"];
  if (unknownMarks.includes(e) || unknownMarks.some(x => t === x)) return "UNKNOWN";

  // ไทย
  if (t.includes("ไทย")) return "THAI";
  if (e === "THAI" || e === "THAILAND" || e === "THAI NATIONAL") return "THAI";

  // ที่เหลือให้เป็นต่างชาติ
  return "FOREIGN";
}

/** ฟังก์ชันสรุปยอดรวม/นับจำนวนแต่ละกลุ่ม (ใช้ใน indicator) */
export async function get_H20000_totals(company_id: number) {
  // 1) หา snapshot แรกสุด
  const first = await prisma.company_histirical2.findFirst({
    where: { company_id, sh_upd_date: { not: null } },
    orderBy: [{ sh_upd_date: "asc" }, { id: "asc" }],
    select: { sh_upd_date: true },
  });
  if (!first?.sh_upd_date) {
    return {
      snapshot_at: null,
      counts: { THAI: 0, FOREIGN: 0, UNKNOWN: 0, ALL: 0 },
      sumsPct: { THAI: 0, FOREIGN: 0, UNKNOWN: 0, ALL: 0 },
    };
  }

  // 2) ดึงแถวทั้งหมดของ snapshot แรก
  const rows = await prisma.company_histirical2.findMany({
    where: { company_id, sh_upd_date: first.sh_upd_date },
    select: {
      nation_th: true,
      nation_en: true,
      percent_share: true,
    },
  });

  // 3) รวมตามกลุ่ม
  let thaiCount = 0, foreignCount = 0, unknownCount = 0;
  let thaiPct = 0, foreignPct = 0, unknownPct = 0;

  for (const r of rows) {
    const g = classifyNationality(r.nation_th, r.nation_en);
    const pct = Number(r.percent_share ?? 0);
    if (g === "THAI")       { thaiCount++;    thaiPct    += pct; }
    else if (g === "FOREIGN"){ foreignCount++; foreignPct += pct; }
    else                    { unknownCount++; unknownPct += pct; }
  }

  const allCount = rows.length;
  const allPct   = thaiPct + foreignPct + unknownPct;

  return {
    snapshot_at: first.sh_upd_date,
    counts: { THAI: thaiCount, FOREIGN: foreignCount, UNKNOWN: unknownCount, ALL: allCount },
    sumsPct: { THAI: thaiPct, FOREIGN: foreignPct, UNKNOWN: unknownPct, ALL: allPct },
  };
}

/** แสดงผู้ถือหุ้น “ทั้งหมด” ของ snapshot แรก (ไม่กรอง 49%) + ติดป้ายกลุ่มสัญชาติ */
export async function resolve_H20000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {

  const columns = [
    { key: "id",                 label: "ID" },
    { key: "company_id",         label: "Company ID" },
    { key: "sh_upd_date",        label: "วันที่ครั้งแรก" },
    { key: "shareholder_name_th",label: "ผู้ถือหุ้น (TH)" },
    { key: "shareholder_name_en",label: "Shareholder (EN)" },
    { key: "nation_th",          label: "สัญชาติ (TH)" },
    { key: "nation_en",          label: "Nationality (EN)" },
    { key: "nationality_group",  label: "กลุ่มสัญชาติ" },     // <-- เพิ่มคอลัมน์ระบุ THAI/FOREIGN/UNKNOWN
    { key: "percent_share",      label: "%ถือหุ้น" },
  ];

  // 1) หา snapshot แรกสุด
  const first = await prisma.company_histirical2.findFirst({
    where: { company_id, sh_upd_date: { not: null } },
    orderBy: [{ sh_upd_date: "asc" }, { id: "asc" }],
    select: { sh_upd_date: true },
  });

  if (!first?.sh_upd_date) {
    return { rows: [], columns, pagination: { total: 0, take, skip } };
  }

  // 2) ดึงผู้ถือหุ้นทั้งหมดของ snapshot แรก (ไม่กรอง)
  const allRows = await prisma.company_histirical2.findMany({
    where: { company_id, sh_upd_date: first.sh_upd_date },
    orderBy: [{ percent_share: "desc" }, { id: "asc" }],
    select: {
      id: true,
      company_id: true,
      sh_upd_date: true,
      shareholder_name_th: true,
      shareholder_name_en: true,
      nation_th: true,
      nation_en: true,
      percent_share: true,
    },
  });

  // 3) แปะกลุ่มสัญชาติให้ทุกแถว
  const withGroup = allRows.map(r => {
    const group = classifyNationality(r.nation_th, r.nation_en); // THAI | FOREIGN | UNKNOWN
    return {
      id: r.id,
      company_id: r.company_id,
      sh_upd_date: r.sh_upd_date,
      shareholder_name_th: r.shareholder_name_th ?? null,
      shareholder_name_en: r.shareholder_name_en ?? null,
      nation_th: r.nation_th ?? null,
      nation_en: r.nation_en ?? null,
      nationality_group: group,
      percent_share: r.percent_share ? Number(r.percent_share) : 0,
    };
  });

  // 4) pagination (ไม่กรอง 49%)
  const total = withGroup.length;
  const page  = withGroup.slice(skip, skip + take);

  return { rows: page, columns, pagination: { total, take, skip } };
}

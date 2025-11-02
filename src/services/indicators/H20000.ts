import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

// ฟังก์ชันช่วยตรวจว่าเป็นคนไทยไหม
function isThai(nationTh?: string | null, nationEn?: string | null) {
  const t = (nationTh || "").trim();
  const e = (nationEn || "").trim().toUpperCase();
  return t.includes("ไทย") || e === "THAI" || e === "THAILAND";
}

export async function resolve_H20000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "id", label: "ID" },
    { key: "company_id", label: "Company ID" },
    { key: "sh_upd_date", label: "วันที่ครั้งแรก" },
    { key: "shareholder_name_th", label: "ผู้ถือหุ้น (TH)" },
    { key: "shareholder_name_en", label: "Shareholder (EN)" },
    { key: "nation_th", label: "สัญชาติ (TH)" },
    { key: "nation_en", label: "Nationality (EN)" },
    { key: "percent_share", label: "%ถือหุ้น" },
  ];

  // 1️⃣ หาวันแรกสุดที่มีข้อมูลผู้ถือหุ้นของบริษัทนี้
  const first = await prisma.company_histirical2.findFirst({
    where: { company_id, sh_upd_date: { not: null } },
    orderBy: [{ sh_upd_date: "asc" }, { id: "asc" }],
    select: { sh_upd_date: true },
  });

  if (!first?.sh_upd_date) {
    return { rows: [], columns, pagination: { total: 0, take, skip } };
  }

  // 2️⃣ ดึงข้อมูล snapshot แรกทั้งหมด
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

  // 3️⃣ กรองเฉพาะ "ต่างชาติถือหุ้น ≥ 49%"
  const filtered = allRows.filter(r => {
    const isForeign = !isThai(r.nation_th, r.nation_en);
    const pct = Number(r.percent_share ?? 0);
    return isForeign && pct >= 49;
  });

  const total = filtered.length;
  const page = filtered.slice(skip, skip + take);

  const rows = page.map(r => ({
    id: r.id,
    company_id: r.company_id,
    sh_upd_date: r.sh_upd_date,
    shareholder_name_th: r.shareholder_name_th ?? null,
    shareholder_name_en: r.shareholder_name_en ?? null,
    nation_th: r.nation_th ?? null,
    nation_en: r.nation_en ?? null,
    percent_share: r.percent_share ? Number(r.percent_share) : null,
  }));

  return { rows, columns, pagination: { total, take, skip } };
}

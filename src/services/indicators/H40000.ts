import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

/**
 * H40000 (details): แสดงรายชื่อผู้ถือหุ้นจาก "สแนปช็อตล่าสุด" ของ company_histirical4
 * - ใช้เฉพาะตาราง company_histirical4
 * - หาวันที่ล่าสุด (max shareholder_upd_date) ของบริษัทนี้
 * - ดึงทุกเรคคอร์ดในวันนั้น เรียงตาม % ถือหุ้น จากมากไปน้อย
 * - รองรับ pagination (skip/take)
 */
export async function resolve_H40000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "company_id", label: "Company ID" },
    { key: "shareholder_upd_date", label: "วันที่ล่าสุด" },
    { key: "shareholder_name_th", label: "ผู้ถือหุ้น (TH)" },
    { key: "shareholder_name_en", label: "Shareholder (EN)" },
    { key: "percent_share", label: "%ถือหุ้น" },
  ];

  // 1) หา snapshot ล่าสุด (วันที่มากที่สุด)
  const latest = await prisma.company_histirical4.findFirst({
    where: { company_id, shareholder_upd_date: { not: null } },
    orderBy: [{ shareholder_upd_date: "desc" }, { id: "desc" }],
    select: { shareholder_upd_date: true },
  });

  if (!latest?.shareholder_upd_date) {
    return { rows: [], columns, pagination: { total: 0, take, skip } };
  }

  // 2) นับจำนวนเรคคอร์ดทั้งหมดใน snapshot ล่าสุด (ไว้ทำ pagination)
  const total = await prisma.company_histirical4.count({
    where: { company_id, shareholder_upd_date: latest.shareholder_upd_date },
  });

  // 3) ดึงรายการ snapshot ล่าสุด (แบ่งหน้า)
  const raw = await prisma.company_histirical4.findMany({
    where: { company_id, shareholder_upd_date: latest.shareholder_upd_date },
    orderBy: [{ percent_share: "desc" }, { id: "asc" }],
    skip,
    take,
    select: {
      company_id: true,
      shareholder_upd_date: true,
      shareholder_name_th: true,
      shareholder_name_en: true,
      percent_share: true, // Decimal(11,4)
    },
  });

  const rows = raw.map(r => ({
    company_id: r.company_id,
    shareholder_upd_date: r.shareholder_upd_date,
    shareholder_name_th: r.shareholder_name_th ?? null,
    shareholder_name_en: r.shareholder_name_en ?? null,
    percent_share: r.percent_share ? Number(r.percent_share) : null,
  }));

  return { rows, columns, pagination: { total, take, skip } };
}

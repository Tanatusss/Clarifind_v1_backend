import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

/**
 * I20000: ปัจจุบันอยู่ในอุตสาหกรรมตาม พ.ร.บ. ประกอบธุรกิจของคนต่างด้าว บัญชีที่ 2
 * - ใช้ตาราง industry_company
 * - เงื่อนไข category_i = 2 (List 2)
 * - เรียง rec_update_when ใหม่สุดก่อน (null ไปท้าย) จากนั้น id ลดหลั่น
 * - รองรับ pagination (skip/take)
 */
export async function resolve_I20000(
  company_id: number,
  skip: number,
  take: number
): Promise<DetailResult> {
  const columns = [
    { key: "indusrty_th_lv5", label: "อุตสาหกรรม (TH)" },
    { key: "indusrty_en_lv5", label: "Industry (EN)" },
    { key: "category_i",      label: "List" },
    { key: "rec_update_when", label: "อัปเดตล่าสุด" },
  ];

  // จำนวนทั้งหมดใน List 2
  const total = await prisma.industry_company.count({
    where: { company_id, category_i: 2 },
  });

  // รายการตามหน้า
  const rowsRaw = await prisma.industry_company.findMany({
    where: { company_id, category_i: 2 },
    orderBy: [
      { rec_update_when: "desc" }, // Prisma (SQL Server) ยังไม่รองรับ nullsLast
      { id: "desc" },
    ],
    skip,
    take,
    select: {
      indusrty_th_lv5: true,
      indusrty_en_lv5: true,
      category_i: true,
      rec_update_when: true,
    },
  });

  const rows = rowsRaw.map(r => ({
    indusrty_th_lv5: r.indusrty_th_lv5 ?? null,
    indusrty_en_lv5: r.indusrty_en_lv5 ?? null,
    category_i: r.category_i ?? null,
    rec_update_when: r.rec_update_when ?? null,
  }));

  return {
    rows,
    columns,
    pagination: { total, take, skip },
  };
}

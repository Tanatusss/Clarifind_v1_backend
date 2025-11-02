import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_H70000(company_id: number, skip: number, take: number): Promise<DetailResult> {
  const cols = [
    { key: "shareholder_name_th", label: "ผู้ถือหุ้น (TH)" },
    { key: "shareholder_name_en", label: "Shareholder (EN)" },
    { key: "nation_en", label: "Nationality" },
    { key: "sh_upd_date", label: "วันที่ก่อน" },
    { key: "percent_share", label: "% ก่อน" },
    { key: "next_sh_upd_date", label: "วันที่หลัง" },
    { key: "next_percent_share", label: "% หลัง" },
  ];
  const all = await prisma.company_histirical7.findMany({
    where: { company_id }, orderBy: [{ sh_upd_date: "desc" }],
    select: { shareholder_name_th: true, nation_en: true, sh_upd_date: true, percent_share: true, next_percent_share: true, next_sh_upd_date: true },
  });
  const isTH = (s?: string|null) => (s||"").toUpperCase()==="THAI" || (s||"").toUpperCase()==="THAILAND";
  const inc = all.filter(x => x.nation_en && !isTH(x.nation_en) && x.percent_share!=null && x.next_percent_share!=null && Number(x.next_percent_share)>Number(x.percent_share));
  const total = inc.length;
  const rows = inc.slice(skip, skip + take);
  return { rows, columns: cols, pagination: { total, take, skip } };
}

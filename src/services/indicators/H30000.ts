import { prisma } from "../../config/prisma";
import { DetailResult } from "../shared/types";

export async function resolve_H30000(company_id: number, skip: number, take: number): Promise<DetailResult> {
  const cols = [
    { key: "sh_upd_date", label: "วันที่ก่อน" },
    { key: "bf_pct_fr", label: "%FR ก่อน" },
    { key: "next_sh_upd_date", label: "วันที่หลัง" },
    { key: "next_pct_fr", label: "%FR หลัง" },
    { key: "bf_pct_th", label: "%TH ก่อน" },
    { key: "next_pct_th", label: "%TH หลัง" },
  ];
  const all = await prisma.company_histirical3.findMany({
    where: { company_id }, orderBy: [{ sh_upd_date: "desc" }],
    select: { sh_upd_date: true, bf_pct_fr: true, next_pct_fr: true, bf_pct_th: true, next_pct_th: true, next_sh_upd_date: true },
  });
  const filtered = all.filter(x => x.bf_pct_fr!=null && x.next_pct_fr!=null && Number(x.bf_pct_fr)<=49 && Number(x.next_pct_fr)>49);
  const total = filtered.length;
  const rows = filtered.slice(skip, skip + take);
  return { rows, columns: cols, pagination: { total, take, skip } };
}

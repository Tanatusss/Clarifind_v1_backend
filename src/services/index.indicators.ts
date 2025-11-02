import { prisma } from "../config/prisma";
import { resolve_AD10000 } from "./indicators/AD10000";
import { resolve_AD20000 } from "./indicators/AD20000";
import { resolve_AU10000 } from "./indicators/AU10000";
import { resolve_AU20000 } from "./indicators/AU20000";
import { resolve_C10000 } from "./indicators/C10000";
import { resolve_D10000 } from "./indicators/D10000";
import { resolve_D40000 } from "./indicators/D40000";
import { resolve_D60000 } from "./indicators/D60000";
import { resolve_D70000 } from "./indicators/D70000";
import { resolve_D80000 } from "./indicators/D80000";
import { resolve_F10000 } from "./indicators/F10000";
import { resolve_H20000 } from "./indicators/H20000";
import { resolve_H30000 } from "./indicators/H30000";
import { resolve_H40000 } from "./indicators/H40000";
import { resolve_H70000 } from "./indicators/H70000";
import { resolve_S20000 } from "./indicators/S20000";
import { resolve_S30000 } from "./indicators/S30000";
import { resolve_S50000 } from "./indicators/S50000";
import { resolve_U10000 } from "./indicators/U10000";
import { resolve_U30000 } from "./indicators/U30000";
import { getCompanyByReg } from "./shared/helpers";
import { DetailResult } from "./shared/types";


type R = (company_id: number, skip: number, take: number) => Promise<DetailResult>;
const resolvers: Record<string, R> = {
  AD10000: resolve_AD10000,
  AD20000: resolve_AD20000,
  AU10000: resolve_AU10000,
  AU20000: resolve_AU20000,
  C10000: resolve_C10000,
  D10000: resolve_D10000,
  D40000: resolve_D40000,
  D60000: resolve_D60000,
  D70000: resolve_D70000,
  D80000: resolve_D80000,
  F10000: resolve_F10000,
  H20000: resolve_H20000,
  H30000: resolve_H30000,
  H40000: resolve_H40000,
  H70000: resolve_H70000,
//   I10000: resolve_I10000,
//   I20000: resolve_I20000,
//   I30000: resolve_I30000,
  S20000: resolve_S20000,
  S30000: resolve_S30000,
  S50000: resolve_S50000,
  U10000: resolve_U10000,
  U30000: resolve_U30000,
};

export async function getIndicatorDetails(registration_id: string, code: string, skip=0, take=50) {
  const company = await getCompanyByReg(registration_id);
  if (!company) return { company: null, indicator: null, details: null };

  const resolver = resolvers[code.toUpperCase()];
  const details = resolver
    ? await resolver(company.company_id, skip, take)
    : { rows: [], columns: [], pagination: { total: 0, take, skip } };

  const master = await prisma.indicator_master.findUnique({
    where: { indicator_key: code.toUpperCase() },
    select: { name_th: true, name_en: true },
  });

  return {
    company,
    indicator: { code: code.toUpperCase(), name_th: master?.name_th ?? null, name_en: master?.name_en ?? null },
    details,
  };
}

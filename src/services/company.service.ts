import { prisma } from "../config/prisma";


export async function resolveCompanyByRegistrationId(registration_id: string) {
  return prisma.company_profile.findFirst({
    where: { registration_id },
    select: {
      company_id: true, registration_id: true, name_th: true, name_en: true,
      company_status_th: true, company_status_en: true, status_date: true,
    },
  });
}

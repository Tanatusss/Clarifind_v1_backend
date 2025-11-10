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

function normalizeForDB(input: string) {
  // ตัดช่องว่างหัวท้าย + บีบช่องว่างซ้อน
  const compact = input.trim().replace(/\s+/g, " ");
  // แปลงเป็นตัวพิมพ์ใหญ่ (EN) — ไทยไม่กระทบ
  return compact.toUpperCase(); // หรือ .toLocaleUpperCase("en-US")
}


export async function resolveCompanyByName(q: string, skip = 0, take = 10) {
  const qUpper = normalizeForDB(q);

  return prisma.company_profile.findMany({
    where: {
      OR: [
        { name_th: { contains: qUpper } },
        { name_en: { contains: qUpper } },
      ],
    },
    select: {
      company_id: true,
      registration_id: true,
      name_th: true,
      name_en: true,
      company_status_th: true,
      company_status_en: true,
      status_date: true,
    },
    orderBy: [{ name_th: "asc" }, { name_en: "asc" }],
    skip,
    take,
  });
}
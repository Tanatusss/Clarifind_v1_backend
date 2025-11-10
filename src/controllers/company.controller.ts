// src/controllers/companyController.ts
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { cleanCompanyRecord } from "../utils/textClean";

/* ---------------- helpers ---------------- */
function squashSpaces(s?: string | null) {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

/** ลบคำตกแต่งชื่อบริษัท (บริษัท, จำกัด, มหาชน, บจก., บมจ.) เพื่อให้ค้นคำกลางได้ดีขึ้น */
function stripCompanyDecorations(raw?: string | null) {
  let s = (raw ?? "").toString();
  // TH
  s = s.replace(/^บริษัท\s*/i, "");
  s = s
    .replace(/\s*\(มหาชน\)$/i, "")
    .replace(/\s*มหาชน$/i, "")
    .replace(/\s*จำกัด$/i, "")
    .replace(/\s*บจก\.?$/i, "")
    .replace(/\s*บมจ\.?$/i, "");
  // EN
  s = s
    .replace(/\s+PUBLIC\s+COMPANY\s+LIMITED$/i, "")
    .replace(/\s+COMPANY\s+LIMITED$/i, "")
    .replace(/\s+CO\.,?\s*LTD\.?$/i, "")
    .replace(/\s+LIMITED$/i, "");
  return squashSpaces(s);
}

/** ปรับ query ก่อนค้นหา */
function normalizeQuery(s?: string | null) {
  return squashSpaces(stripCompanyDecorations(s));
}

function onlyDigits(s?: string | null) {
  return (s ?? "").replace(/[^\d]/g, "");
}

function isRegistrationId(q: string) {
  return /^\d{8,13}$/.test(onlyDigits(q));
}

function toInt(v: unknown, def: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : def;
}
/* ----------------------------------------- */


/**
 * GET /v1/company/resolve?q=...&skip=0&take=10
 * - รองรับค้นหาทั้งเลขทะเบียนและชื่อบริษัท
 */
export async function resolveCompany(req: Request, res: Response) {
  const rawQ = (req.query.q as string) ?? "";
  const skip = Math.max(0, toInt(req.query.skip, 0));
  const take = Math.min(100, Math.max(1, toInt(req.query.take, 10)));
  const wantCount = ((req.query.count as string) ?? "auto") as "auto" | "yes" | "no";
  const deep = String(req.query.deep ?? "0") === "1";
  const minLen = Math.max(1, toInt(req.query.minLen, 2));

  if (!rawQ) return res.status(400).json({ error: "Missing query string: q" });

  try {
    // ====== ค้นด้วยเลขทะเบียน ======
    if (isRegistrationId(rawQ)) {
      const reg = onlyDigits(rawQ);
      const [one, cntMaybe] = await Promise.all([
        prisma.company_profile.findFirst({
          where: { registration_id: reg },
          select: {
            company_id: true,
            registration_id: true,
            name_th: true,
            name_en: true,
            company_status_th: true,
            company_status_en: true,
            status_date: true,
          },
        }),
        (skip === 0 && (wantCount === "yes" || wantCount === "auto"))
          ? prisma.company_profile.count({ where: { registration_id: reg } })
          : Promise.resolve(undefined),
      ]);

      const cleaned = one ? cleanCompanyRecord(one) : null;
      const company = cleaned ? [cleaned] : [];
      const total = typeof cntMaybe === "number" ? cntMaybe : (cleaned ? 1 : 0);

      if (company.length === 0)
        return res.status(404).json({ company: [], total: 0, totalPages: 0, page: 0, take, skip });

      const totalPages = Math.max(1, Math.ceil(total / take));
      const page = Math.floor(skip / take) + 1;
      return res.json({ company, total, totalPages, page, take, skip });
    }

    // ====== ค้นด้วยชื่อ ======
    const q = normalizeQuery(rawQ);
    if (q.length < minLen)
      return res.status(400).json({ error: `Query too short (min ${minLen} chars)` });

    const tokens = q.split(" ").filter(Boolean);
    const first = tokens[0];
    const rests = tokens.slice(1);

    const whereFast = {
      AND: [
        { OR: [{ name_th: { startsWith: first } }, { name_en: { startsWith: first } }] },
        ...rests.map((t) => ({
          OR: [{ name_th: { contains: t } }, { name_en: { contains: t } }],
        })),
      ],
    };

    let list = await prisma.company_profile.findMany({
      where: whereFast,
      select: {
        company_id: true,
        registration_id: true,
        name_th: true,
        name_en: true,
        company_status_th: true,
        company_status_en: true,
        status_date: true,
      },
      orderBy: [{ name_th: "asc" }, { company_id: "asc" }],
      skip,
      take,
    });

    // ถ้ายังไม่พอเติมด้วย contains เต็มคำ
    if ((skip === 0 || deep) && list.length < take) {
      const whereDeep = {
        OR: [{ name_th: { contains: q } }, { name_en: { contains: q } }],
      };
      const fill = await prisma.company_profile.findMany({
        where: whereDeep,
        select: {
          company_id: true,
          registration_id: true,
          name_th: true,
          name_en: true,
          company_status_th: true,
          company_status_en: true,
          status_date: true,
        },
        orderBy: [{ name_th: "asc" }, { company_id: "asc" }],
        take: take - list.length,
      });
      const seen = new Set(list.map((x) => x.company_id));
      for (const x of fill) if (!seen.has(x.company_id)) list.push(x);
    }

    list = list.map(cleanCompanyRecord);

    let total: number | undefined = undefined;
    if (skip === 0 && (wantCount === "yes" || wantCount === "auto")) {
      total = await prisma.company_profile.count({
        where: { OR: [{ name_th: { contains: q } }, { name_en: { contains: q } }] },
      });
    }

    if (list.length === 0)
      return res.status(404).json({ company: [], total: total ?? 0, totalPages: 0, page: 0, take, skip });

    const page = Math.floor(skip / take) + 1;
    const totalPages =
      typeof total === "number" ? Math.max(1, Math.ceil(total / take)) : undefined;

    return res.json({ company: list, total, totalPages, page, take, skip });
  } catch (error) {
    console.error("resolveCompany error:", error);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการค้นหา" });
  }
}


/**
 * GET /v1/company/suggest?q=...&limit=5&minLen=2&deep=0|1
 * - startsWith เร็ว และ fallback contains เมื่อ deep=1
 * - เพิ่ม strip คำ “บริษัท/จำกัด/บจก./บมจ.” ให้คำอย่าง “เรือ” ติด “บริษัท เรือโยง…” ได้
 */
export async function suggestCompanies(req: Request, res: Response) {
  const rawQ = (req.query.q as string) ?? "";
  const limit = Math.min(20, Math.max(1, toInt(req.query.limit, 5)));
  const minLen = Math.max(1, toInt(req.query.minLen, 2));
  const deep = String(req.query.deep ?? "0") === "1";
  const q = normalizeQuery(rawQ);

  if (!q || q.length < minLen) return res.json({ suggestions: [] });

  try {
    // เฟสแรก: startsWith ทั้งแบบตรงและมี "บริษัท " นำหน้า
    const startsPatterns = [q, `บริษัท ${q}`];

    let suggestions = await prisma.company_profile.findMany({
      where: {
        OR: [
          ...startsPatterns.map((p) => ({ name_th: { startsWith: p } })),
          { name_en: { startsWith: q } },
        ],
      },
      select: { company_id: true, registration_id: true, name_th: true, name_en: true },
      orderBy: [{ name_th: "asc" }, { company_id: "asc" }],
      take: limit,
    });

    // เติมด้วย contains ถ้า deep=1 และยังไม่เต็ม
    if (deep && suggestions.length < limit) {
      const fill = await prisma.company_profile.findMany({
        where: {
          OR: [
            { name_th: { contains: ` ${q}` } },
            { name_th: { contains: q } },
            { name_en: { contains: q } },
          ],
        },
        select: { company_id: true, registration_id: true, name_th: true, name_en: true },
        orderBy: [{ name_th: "asc" }, { company_id: "asc" }],
        take: limit - suggestions.length,
      });
      const seen = new Set(suggestions.map((s) => s.company_id));
      for (const x of fill) if (!seen.has(x.company_id)) suggestions.push(x);
    }

    suggestions = suggestions.map(cleanCompanyRecord);
    return res.json({ suggestions });
  } catch (e) {
    console.error("suggestCompanies error:", e);
    return res.status(500).json({ error: "suggest error" });
  }
}

// src/utils/textClean.ts

/**
 * ล้างอักขระล่องหน/คอนโทรล + ช่องว่างพิเศษ แล้วบีบช่องว่างซ้อน
 * ครอบคลุม NBSP, full-width space, ZW*, LRM/RLM, BOM, control ASCII ฯลฯ
 */
export function cleanDisplayText(input?: string | null): string {
  if (!input) return "";
  return (
    input
      // แทนช่องว่างพิเศษทั้งหมดให้เป็น space ปกติ
      .replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      // ตัดเครื่องหมายควบคุมกลุ่ม Cf (ZW*, LRM/RLM, directional marks, BOM, ฯลฯ)
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
      // ตัด control ASCII (tab, CR, LF, ฯลฯ)
      .replace(/[\u0000-\u001F\u007F]/g, "")
      // บีบช่องว่างซ้อน
      .replace(/\s+/g, " ")
      // ตัดหัว/ท้าย (รวม NBSP ที่อาจเหลือ)
      .replace(/^[\s\u00A0]+/, "")
      .replace(/[\s\u00A0]+$/, "")
  );
}

/** ทำความสะอาดฟิลด์ชื่อบริษัทในเรคคอร์ดที่ส่งออก */
export function cleanCompanyRecord<T extends {
  name_th?: string | null;
  name_en?: string | null;
}>(rec: T): T {
  return {
    ...rec,
    name_th: cleanDisplayText(rec.name_th),
    name_en: cleanDisplayText(rec.name_en),
  };
}


export type Column = { key: string; label: string };
export type Pagination = { total: number; take: number; skip: number };
export type DetailResult = { rows: any[]; columns: Column[]; pagination: Pagination };

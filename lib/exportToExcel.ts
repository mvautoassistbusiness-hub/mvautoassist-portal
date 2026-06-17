import * as XLSX from 'xlsx';

function buildSheet(data: Record<string, unknown>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(data);
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = { font: { bold: true } };
  }
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;
  return ws;
}

export function exportToExcel(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(data), 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Each entry in `groups` becomes one sheet in the workbook.
// Groups are written in the order provided (caller is responsible for sorting).
export function exportToExcelGrouped(
  groups: { label: string; rows: Record<string, unknown>[] }[],
  filename: string,
): void {
  const nonEmpty = groups.filter(g => g.rows.length > 0);
  if (nonEmpty.length === 0) return;
  const wb = XLSX.utils.book_new();
  for (const { label, rows } of nonEmpty) {
    // Excel sheet names: max 31 chars, no : / \ ? * [ ]
    const sheetName = label.replace(/[:/\\?*[\]]/g, '-').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, buildSheet(rows), sheetName);
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

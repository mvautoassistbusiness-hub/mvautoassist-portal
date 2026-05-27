import * as XLSX from 'xlsx';

export function exportToExcel(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(data);

  // Bold header row
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = { font: { bold: true } };
  }

  // Auto column width based on content
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

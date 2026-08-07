/**
 * Utility helper to export an array of records to a CSV spreadsheet file
 * directly within the client browser.
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: string[]
): void {
  if (!data || data.length === 0) return;

  const keys = Object.keys(data[0]);
  const headerRow = headers ? headers.join(",") : keys.join(",");

  const csvRows = [headerRow];

  for (const item of data) {
    const values = keys.map((key) => {
      const val = item[key];
      if (val === null || val === undefined) {
        return '""';
      }
      // Escape inner quotes and wrap in quotes to prevent column splitting
      const stringified = typeof val === "object" ? JSON.stringify(val) : String(val);
      const escaped = stringified.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

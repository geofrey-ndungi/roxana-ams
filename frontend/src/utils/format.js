// "2026-10-15" becomes "Thursday, October 15".
// timeZone "UTC" stops the day from shifting by one in some browsers.
export const formatDayLong = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

// "2026-10-15" becomes "Thu"
export const formatWeekdayShort = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

// "2026-10-15" becomes "Oct 15"
export const formatMonthDay = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// plural(1, "student") gives "1 student", plural(3, "class", "classes") gives "3 classes".
export const plural = (n, word, pluralWord) =>
  `${n} ${n === 1 ? word : pluralWord || word + "s"}`;

// ["Ann", "Ben", "Cara", "Dan", "Eve"] becomes "Ann, Ben, Cara +2 more"
export const listNames = (names) => {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
};

// Downloads rows (a list of lists) as a CSV file that Excel can open.
export const downloadCsv = (filename, rows) => {
  // Every cell goes in quotes, with any quote inside it doubled,
  // so names containing commas or quotes can't break the columns.
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  // The "\uFEFF" at the start makes Excel read names in UTF-8 correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/\s+/g, "-").toLowerCase();
  link.click();

  URL.revokeObjectURL(url);
};
const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

const getYearMonthFromBucket = (bucketKey) => {
  if (!bucketKey) return null;

  if (typeof bucketKey === "string") {
    const match = bucketKey.match(/^(\d{4})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return { year, monthIndex };
      }
    }
  }

  const parsed = new Date(bucketKey);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    monthIndex: parsed.getMonth(),
  };
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function exportStepsCsv({ rows = [], periodStats, granularity = "7d" }) {
  const isYear = granularity === "year";

  let header = [];
  let body = [];

  if (isYear) {
    const yearFromPeriod = parseInt(
      periodStats?.period?.start?.slice(0, 4),
      10,
    );
    const selectedYear = Number.isFinite(yearFromPeriod)
      ? yearFromPeriod
      : new Date().getFullYear();

    const totalsByMonth = new Array(12).fill(0);

    (periodStats?.data || []).forEach((row) => {
      const bucket = getYearMonthFromBucket(row.bucket_key);
      if (!bucket) return;
      if (bucket.year !== selectedYear) return;
      totalsByMonth[bucket.monthIndex] += parseInt(row.step_count, 10) || 0;
    });

    header = ["Mesec", "Ukupno koraka", "Rastojanje (km)"];
    body = totalsByMonth.map((total, monthIndex) => [
      `${MONTH_NAMES[monthIndex]} ${selectedYear}`,
      total,
      ((total * 0.75) / 1000).toFixed(2),
    ]);
  } else {
    header = ["Datum", "Koraci", "Cilj", "Rastojanje (km)", "Napomena"];
    body = rows.map((row) => {
      const normalized = row.step_date
        ? new Date(`${row.step_date}T00:00:00`)
        : new Date();
      const steps = parseInt(row.step_count, 10) || 0;
      return [
        Number.isNaN(normalized.getTime())
          ? row.step_date || ""
          : normalized.toLocaleDateString("sr-RS"),
        steps,
        parseInt(row.goal, 10) || 0,
        ((steps * 0.75) / 1000).toFixed(2),
        row.notes || "",
      ];
    });
  }

  const csv = [header, ...body]
    .map((line) => line.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `steps-${isYear ? "year" : "entries"}-${new Date().toISOString().slice(0, 10)}.csv`,
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

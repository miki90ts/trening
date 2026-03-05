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

const formatDurationHours = (minutesValue) => {
  const value = parseFloat(minutesValue);
  if (!Number.isFinite(value)) return "0.00";
  return (value / 60).toFixed(2);
};

const toDateDisplay = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("sr-RS");
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function exportSleepCsv({ rows = [], periodStats, granularity = "7d" }) {
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

    const monthly = Array.from({ length: 12 }, (_, monthIndex) => ({
      monthIndex,
      count: 0,
      durationSum: 0,
      qualitySum: 0,
      qualityCount: 0,
      hrSum: 0,
      hrCount: 0,
      hrvSum: 0,
      hrvCount: 0,
      deepSum: 0,
      deepCount: 0,
      lightSum: 0,
      lightCount: 0,
      remSum: 0,
      remCount: 0,
      awakeSum: 0,
      awakeCount: 0,
    }));

    (periodStats?.data || []).forEach((row) => {
      const bucket = getYearMonthFromBucket(row.bucket_key);
      if (!bucket || bucket.year !== selectedYear) return;

      const month = monthly[bucket.monthIndex];
      month.count += 1;

      const duration = parseFloat(row.duration_min);
      if (Number.isFinite(duration)) month.durationSum += duration;

      const quality = parseFloat(row.sleep_quality);
      if (Number.isFinite(quality)) {
        month.qualitySum += quality;
        month.qualityCount += 1;
      }

      const avgHr = parseFloat(row.avg_hr);
      if (Number.isFinite(avgHr)) {
        month.hrSum += avgHr;
        month.hrCount += 1;
      }

      const avgHrv = parseFloat(row.avg_hrv);
      if (Number.isFinite(avgHrv)) {
        month.hrvSum += avgHrv;
        month.hrvCount += 1;
      }

      const deep = parseFloat(row.deep_min);
      if (Number.isFinite(deep)) {
        month.deepSum += deep;
        month.deepCount += 1;
      }

      const light = parseFloat(row.light_min);
      if (Number.isFinite(light)) {
        month.lightSum += light;
        month.lightCount += 1;
      }

      const rem = parseFloat(row.rem_min);
      if (Number.isFinite(rem)) {
        month.remSum += rem;
        month.remCount += 1;
      }

      const awake = parseFloat(row.awake_min);
      if (Number.isFinite(awake)) {
        month.awakeSum += awake;
        month.awakeCount += 1;
      }
    });

    header = [
      "Mesec",
      "Prosek trajanja (h)",
      "Prosek kvaliteta (%)",
      "Avg HR",
      "Avg HRV (ms)",
      "Deep (h)",
      "Light (h)",
      "REM (h)",
      "Awake (h)",
      "Noci",
    ];

    body = monthly.map((month) => {
      const duration = month.count > 0 ? month.durationSum / month.count : 0;
      const quality =
        month.qualityCount > 0 ? month.qualitySum / month.qualityCount : 0;
      const avgHr = month.hrCount > 0 ? month.hrSum / month.hrCount : 0;
      const avgHrv = month.hrvCount > 0 ? month.hrvSum / month.hrvCount : 0;
      const deep = month.deepCount > 0 ? month.deepSum / month.deepCount : 0;
      const light =
        month.lightCount > 0 ? month.lightSum / month.lightCount : 0;
      const rem = month.remCount > 0 ? month.remSum / month.remCount : 0;
      const awake =
        month.awakeCount > 0 ? month.awakeSum / month.awakeCount : 0;

      return [
        `${MONTH_NAMES[month.monthIndex]} ${selectedYear}`,
        formatDurationHours(duration),
        quality.toFixed(2),
        avgHr > 0 ? avgHr.toFixed(2) : "",
        avgHrv > 0 ? avgHrv.toFixed(2) : "",
        formatDurationHours(deep),
        formatDurationHours(light),
        formatDurationHours(rem),
        formatDurationHours(awake),
        month.count,
      ];
    });
  } else {
    header = [
      "Datum",
      "Lezanje",
      "Budjenje",
      "Trajanje (h)",
      "Cilj (h)",
      "Kvalitet (%)",
      "Avg HR",
      "Min HR",
      "Avg HRV (ms)",
      "Deep (h)",
      "Light (h)",
      "REM (h)",
      "Awake (h)",
      "Napomena",
    ];

    body = rows.map((row) => [
      toDateDisplay(row.sleep_date),
      row.bedtime ? String(row.bedtime).slice(0, 5) : "",
      row.wake_time ? String(row.wake_time).slice(0, 5) : "",
      formatDurationHours(row.duration_min),
      formatDurationHours(row.target_min),
      Number.isFinite(parseFloat(row.sleep_quality))
        ? parseFloat(row.sleep_quality).toFixed(2)
        : "",
      Number.isFinite(parseFloat(row.avg_hr))
        ? parseFloat(row.avg_hr).toFixed(2)
        : "",
      Number.isFinite(parseFloat(row.min_hr))
        ? parseFloat(row.min_hr).toFixed(2)
        : "",
      Number.isFinite(parseFloat(row.avg_hrv))
        ? parseFloat(row.avg_hrv).toFixed(2)
        : "",
      formatDurationHours(row.deep_min),
      formatDurationHours(row.light_min),
      formatDurationHours(row.rem_min),
      formatDurationHours(row.awake_min),
      row.notes || "",
    ]);
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
    `sleep-${isYear ? "year" : "entries"}-${new Date().toISOString().slice(0, 10)}.csv`,
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

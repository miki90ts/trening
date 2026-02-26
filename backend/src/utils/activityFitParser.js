/**
 * FIT parser utility
 *
 * Parses exported files from the apps (Suunto, Garmin etc.)
 * and normalizes data into our activity DB schema.
 */

const FitParser = require("fit-file-parser").default;

/* ================================================================
   HELPER FUNCTIONS
   ================================================================ */

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const toFloat = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const mpsToKmh = (mps) => {
  const v = toFloat(mps);
  return v !== null ? Math.round(v * 3.6 * 100) / 100 : null;
};

const calcPace = (distanceMeters, durationSeconds) => {
  if (
    !distanceMeters ||
    distanceMeters <= 0 ||
    !durationSeconds ||
    durationSeconds <= 0
  ) {
    return null;
  }
  return (durationSeconds * 1000) / distanceMeters;
};

const toSqlDateTime = (value) => {
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    // JSON often has epoch ms
    date = new Date(value > 1e12 ? value : value * 1000);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return null;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
};

/**
 * Map sport/activity type to our activity_type code
 */
const mapSport = (sportName) => {
  if (!sportName) return "running";
  const lower = String(sportName).toLowerCase();

  if (lower.includes("trail")) return "trail_running";
  if (lower.includes("treadmill")) return "treadmill_running";
  if (lower.includes("run")) return "running";
  if (lower.includes("hik")) return "hiking";
  if (lower.includes("cycl") || lower.includes("bik")) return "outdoor_cycling";
  if (lower.includes("walk")) return "hiking";

  return "running";
};

/* ================================================================
   FIT FILE PARSER
   ================================================================ */

const parseFitBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "m/s",
      lengthUnit: "m",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "list",
    });

    parser.parse(buffer, (error, data) => {
      if (error) return reject(error);
      resolve(data);
    });
  });
};

const normalizeFitData = (fitData) => {
  // Session is the primary summary record in a FIT file
  const sessions = fitData.sessions || [];
  const session = sessions[0] || {};
  const laps = fitData.laps || [];
  const records = fitData.records || [];

  // Extract sport name
  const sportName = session.sport || session.sub_sport || "";

  // Distance & duration
  const distance =
    toInt(session.total_distance) || sumField(laps, "total_distance");
  const duration =
    toInt(session.total_elapsed_time || session.total_timer_time) ||
    sumField(laps, "total_elapsed_time");

  // Heart rate
  const avgHr =
    toInt(session.avg_heart_rate) || avgField(laps, "avg_heart_rate");
  const maxHr =
    toInt(session.max_heart_rate) || maxField(laps, "max_heart_rate");
  const minHr =
    toInt(session.min_heart_rate) || minFieldRecords(records, "heart_rate");

  // Elevation
  const ascent = toInt(session.total_ascent) || sumField(laps, "total_ascent");
  const descent =
    toInt(session.total_descent) || sumField(laps, "total_descent");
  const maxAlt =
    toFloat(session.max_altitude) || maxField(laps, "max_altitude");
  const minAlt =
    toFloat(session.min_altitude) || minField(laps, "min_altitude");

  // Speed
  const avgSpeed = mpsToKmh(session.avg_speed || session.enhanced_avg_speed);
  const maxSpeed = mpsToKmh(session.max_speed || session.enhanced_max_speed);

  // Cadence
  const cadenceAvg = toInt(session.avg_running_cadence || session.avg_cadence);
  const cadenceMax = toInt(session.max_running_cadence || session.max_cadence);

  // Calories
  const calories = toInt(session.total_calories);

  // Moving time
  const movingTime = toInt(session.total_timer_time);

  // Timestamp
  const startTime = session.start_time || session.timestamp;

  // Build splits from laps
  const splits = laps
    .map((lap, idx) => {
      const lapDistance = toInt(lap.total_distance);
      const lapDuration = toInt(lap.total_elapsed_time || lap.total_timer_time);
      return {
        split_order: idx + 1,
        label:
          lap.message_index !== undefined
            ? `Lap ${idx + 1}`
            : `Split ${idx + 1}`,
        distance_meters: lapDistance || 0,
        duration_seconds: lapDuration || 0,
        avg_pace_seconds_per_km: calcPace(lapDistance, lapDuration),
      };
    })
    .filter((s) => s.distance_meters > 0 && s.duration_seconds > 0);

  return {
    sport_code: mapSport(sportName),
    name: `${capitalize(sportName) || "Activity"} – import`,
    performed_at: toSqlDateTime(startTime),
    distance_meters: distance,
    duration_seconds: duration,
    avg_pace_seconds_per_km: calcPace(distance, duration),
    avg_heart_rate: avgHr,
    min_heart_rate: minHr,
    max_heart_rate: maxHr,
    ascent_meters: ascent,
    descent_meters: descent,
    min_elevation_meters: minAlt !== null ? toInt(Math.round(minAlt)) : null,
    max_elevation_meters: maxAlt !== null ? toInt(Math.round(maxAlt)) : null,
    calories,
    running_cadence_avg: cadenceAvg,
    running_cadence_min: null,
    running_cadence_max: cadenceMax,
    avg_speed_kmh: avgSpeed,
    max_speed_kmh: maxSpeed,
    moving_time_seconds: movingTime,
    splits,
    description: `Importovano iz FIT fajla`,
  };
};

/* ================================================================
   AGGREGATE HELPERS
   ================================================================ */

const sumField = (arr, key) => {
  const vals = (arr || [])
    .map((r) => toFloat(r[key]))
    .filter((v) => v !== null);
  return vals.length ? toInt(vals.reduce((s, v) => s + v, 0)) : null;
};

const avgField = (arr, key) => {
  const vals = (arr || [])
    .map((r) => toFloat(r[key]))
    .filter((v) => v !== null);
  return vals.length
    ? toInt(vals.reduce((s, v) => s + v, 0) / vals.length)
    : null;
};

const maxField = (arr, key) => {
  const vals = (arr || [])
    .map((r) => toFloat(r[key]))
    .filter((v) => v !== null);
  return vals.length ? Math.max(...vals) : null;
};

const minField = (arr, key) => {
  const vals = (arr || [])
    .map((r) => toFloat(r[key]))
    .filter((v) => v !== null);
  return vals.length ? Math.min(...vals) : null;
};

const minFieldRecords = (arr, key) => {
  const vals = (arr || [])
    .map((r) => toFloat(r[key]))
    .filter((v) => v !== null && v > 0);
  return vals.length ? Math.min(...vals) : null;
};

const capitalize = (str) => {
  if (!str) return "";
  const s = String(str).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ================================================================
   PUBLIC API
   ================================================================ */

/**
 * Parse a single file (FIT binary)
 * @param {Buffer|string|object} input  - file content
 * @param {string} fileType - "fit"
 * @returns {Promise<object>} normalized activity data
 */
const parseFile = async (input, fileType) => {
  if (fileType === "fit") {
    const fitData = await parseFitBuffer(input);
    return normalizeFitData(fitData);
  }
};

module.exports = { parseFile };

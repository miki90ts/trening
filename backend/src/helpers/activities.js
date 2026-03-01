const toInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDecimal = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toSqlDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const calcPaceSecondsPerKm = (distanceMeters, durationSeconds) => {
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

const validateHeartRates = ({
  avg_heart_rate,
  min_heart_rate,
  max_heart_rate,
}) => {
  const avg = avg_heart_rate !== undefined ? toInt(avg_heart_rate) : null;
  const min = min_heart_rate !== undefined ? toInt(min_heart_rate) : null;
  const max = max_heart_rate !== undefined ? toInt(max_heart_rate) : null;

  const values = [
    {
      key: "avg_heart_rate",
      value: avg,
      provided: avg_heart_rate !== undefined,
    },
    {
      key: "min_heart_rate",
      value: min,
      provided: min_heart_rate !== undefined,
    },
    {
      key: "max_heart_rate",
      value: max,
      provided: max_heart_rate !== undefined,
    },
  ];

  for (const item of values) {
    if (item.provided && (item.value === null || item.value < 0)) {
      return { error: `${item.key} mora biti broj >= 0` };
    }
  }

  if (min !== null && max !== null && min > max) {
    return { error: "min_heart_rate ne može biti veći od max_heart_rate" };
  }

  return {
    avg_heart_rate: avg_heart_rate !== undefined ? avg : undefined,
    min_heart_rate: min_heart_rate !== undefined ? min : undefined,
    max_heart_rate: max_heart_rate !== undefined ? max : undefined,
  };
};

const validateNumericField = (value, name) => {
  if (value === undefined) return { ok: true, value: undefined };
  const parsed = toInt(value);
  if (parsed === null || parsed < 0) {
    return { ok: false, error: `${name} mora biti broj >= 0` };
  }
  return { ok: true, value: parsed };
};

const validateDecimalField = (value, name) => {
  if (value === undefined) return { ok: true, value: undefined };
  const parsed = toDecimal(value);
  if (parsed === null || parsed < 0) {
    return { ok: false, error: `${name} mora biti broj >= 0` };
  }
  return { ok: true, value: parsed };
};

const validateSplits = (splits) => {
  if (splits === undefined) return { ok: true, splits: undefined };
  if (!Array.isArray(splits)) {
    return { ok: false, error: "splits mora biti niz" };
  }

  const normalized = [];
  for (let index = 0; index < splits.length; index += 1) {
    const split = splits[index] || {};

    const distance = toInt(split.distance_meters);
    const duration = toInt(split.duration_seconds);

    if (distance === null || distance <= 0) {
      return {
        ok: false,
        error: `Split #${index + 1}: distance_meters mora biti broj > 0`,
      };
    }

    if (duration === null || duration <= 0) {
      return {
        ok: false,
        error: `Split #${index + 1}: duration_seconds mora biti broj > 0`,
      };
    }

    normalized.push({
      split_order: index + 1,
      label: split.label ? String(split.label).trim().slice(0, 180) : null,
      distance_meters: distance,
      duration_seconds: duration,
      avg_pace_seconds_per_km: calcPaceSecondsPerKm(distance, duration),
    });
  }

  return { ok: true, splits: normalized };
};

const canAccessUserId = (user, targetUserId) => {
  if (user.role === "admin") return true;
  return user.id === targetUserId;
};

const buildVirtualKmRows = (splits = []) => {
  const normalizedSplits = splits
    .map((split) => ({
      distance_meters: Number(split.distance_meters),
      duration_seconds: Number(split.duration_seconds),
    }))
    .filter(
      (split) =>
        Number.isFinite(split.distance_meters) &&
        split.distance_meters > 0 &&
        Number.isFinite(split.duration_seconds) &&
        split.duration_seconds > 0,
    );

  if (normalizedSplits.length === 0) return [];

  const rows = [];
  let currentKmDistance = 0;
  let currentKmDuration = 0;
  let kmIndex = 1;

  normalizedSplits.forEach((split) => {
    let splitDistanceLeft = split.distance_meters;
    let splitDurationLeft = split.duration_seconds;

    while (splitDistanceLeft > 0) {
      const remainingToFullKm = 1000 - currentKmDistance;
      const usedDistance = Math.min(splitDistanceLeft, remainingToFullKm);
      const secPerMeter = splitDurationLeft / splitDistanceLeft;
      const usedDuration = usedDistance * secPerMeter;

      currentKmDistance += usedDistance;
      currentKmDuration += usedDuration;
      splitDistanceLeft -= usedDistance;
      splitDurationLeft -= usedDuration;

      if (currentKmDistance >= 999.999) {
        rows.push({
          km_label: `${kmIndex}`,
          distance_meters: 1000,
          duration_seconds: currentKmDuration,
          avg_pace_seconds_per_km: currentKmDuration,
          is_partial: false,
        });

        kmIndex += 1;
        currentKmDistance = 0;
        currentKmDuration = 0;
      }
    }
  });

  if (currentKmDistance > 0) {
    rows.push({
      km_label: `${kmIndex}*`,
      distance_meters: currentKmDistance,
      duration_seconds: currentKmDuration,
      avg_pace_seconds_per_km: (currentKmDuration * 1000) / currentKmDistance,
      is_partial: true,
    });
  }

  return rows;
};

module.exports = {
  toInt,
  toDecimal,
  toSqlDateTime,
  calcPaceSecondsPerKm,
  validateHeartRates,
  validateNumericField,
  validateDecimalField,
  validateSplits,
  canAccessUserId,
  buildVirtualKmRows,
};

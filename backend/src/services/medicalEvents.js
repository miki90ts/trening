const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

const VALID_EVENT_TYPES = ["illness", "injury", "operation"];

function normalizeDate(value, fieldLabel) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw httpError(
      400,
      `${fieldLabel} je obavezan i mora biti u formatu YYYY-MM-DD.`,
    );
  }

  return String(value);
}

function normalizeEventType(value) {
  if (!VALID_EVENT_TYPES.includes(value)) {
    throw httpError(400, "Nevažeći tip medicinskog događaja.");
  }

  return value;
}

function normalizeTitle(value) {
  const title = String(value || "").trim();
  if (!title) {
    throw httpError(400, "Naziv događaja je obavezan.");
  }
  if (title.length > 160) {
    throw httpError(400, "Naziv događaja može imati najviše 160 karaktera.");
  }

  return title;
}

function normalizeNotes(value) {
  if (value == null) return null;
  const notes = String(value).trim();
  if (!notes) return null;
  if (notes.length > 5000) {
    throw httpError(400, "Beleške mogu imati najviše 5000 karaktera.");
  }

  return notes;
}

function ensureDateOrder(startDate, endDate) {
  if (startDate > endDate) {
    throw httpError(400, "Krajnji datum ne može biti pre početnog datuma.");
  }
}

function buildRowPayload(row) {
  return {
    ...row,
    start_date: row.start_date ? String(row.start_date).slice(0, 10) : null,
    end_date: row.end_date ? String(row.end_date).slice(0, 10) : null,
  };
}

async function getEventById(id) {
  const [rows] = await pool.query(
    `
      SELECT id, user_id, event_type, title,
             DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
             DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
             notes, created_at, updated_at
      FROM medical_events
      WHERE id = ?
    `,
    [id],
  );
  return rows[0] || null;
}

async function getEvents(user, query) {
  const { event_type, start_date, end_date, active_on, limit } = query;
  let where = "WHERE user_id = ?";
  const params = [user.id];

  if (event_type) {
    where += " AND event_type = ?";
    params.push(normalizeEventType(event_type));
  }

  if (active_on) {
    const activeDate = normalizeDate(active_on, "Datum");
    where += " AND start_date <= ? AND end_date >= ?";
    params.push(activeDate, activeDate);
  } else {
    if (start_date) {
      const fromDate = normalizeDate(start_date, "Početni datum filtera");
      where += " AND end_date >= ?";
      params.push(fromDate);
    }

    if (end_date) {
      const toDate = normalizeDate(end_date, "Krajnji datum filtera");
      where += " AND start_date <= ?";
      params.push(toDate);
    }
  }

  const rowLimit = Math.min(parseInt(limit, 10) || 500, 2000);
  const [rows] = await pool.query(
    `
      SELECT id, user_id, event_type, title,
             DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
             DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
             notes, created_at, updated_at
      FROM medical_events
      ${where}
      ORDER BY start_date DESC, end_date DESC, created_at DESC
      LIMIT ?
    `,
    [...params, rowLimit],
  );

  return rows.map(buildRowPayload);
}

async function createEvent(user, body) {
  const eventType = normalizeEventType(body.event_type);
  const title = normalizeTitle(body.title);
  const startDate = normalizeDate(body.start_date, "Početni datum");
  const endDate = normalizeDate(
    body.end_date || body.start_date,
    "Krajnji datum",
  );
  const notes = normalizeNotes(body.notes);

  ensureDateOrder(startDate, endDate);

  const [result] = await pool.query(
    `
      INSERT INTO medical_events (user_id, event_type, title, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [user.id, eventType, title, startDate, endDate, notes],
  );

  const created = await getEventById(result.insertId);
  return buildRowPayload(created);
}

async function updateEvent(id, user, body) {
  const existing = await getEventById(id);
  if (!existing) {
    throw httpError(404, "Medicinski događaj nije pronađen.");
  }
  if (existing.user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }

  const nextValues = {
    event_type:
      body.event_type !== undefined
        ? normalizeEventType(body.event_type)
        : existing.event_type,
    title:
      body.title !== undefined ? normalizeTitle(body.title) : existing.title,
    start_date:
      body.start_date !== undefined
        ? normalizeDate(body.start_date, "Početni datum")
        : existing.start_date,
    end_date:
      body.end_date !== undefined
        ? normalizeDate(body.end_date, "Krajnji datum")
        : existing.end_date,
    notes:
      body.notes !== undefined ? normalizeNotes(body.notes) : existing.notes,
  };

  ensureDateOrder(nextValues.start_date, nextValues.end_date);

  const updates = [];
  const params = [];

  if (body.event_type !== undefined) {
    updates.push("event_type = ?");
    params.push(nextValues.event_type);
  }
  if (body.title !== undefined) {
    updates.push("title = ?");
    params.push(nextValues.title);
  }
  if (body.start_date !== undefined) {
    updates.push("start_date = ?");
    params.push(nextValues.start_date);
  }
  if (body.end_date !== undefined) {
    updates.push("end_date = ?");
    params.push(nextValues.end_date);
  }
  if (body.notes !== undefined) {
    updates.push("notes = ?");
    params.push(nextValues.notes);
  }

  if (updates.length === 0) {
    throw httpError(400, "Nema podataka za izmenu.");
  }

  params.push(id);
  await pool.query(
    `UPDATE medical_events SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );

  const updated = await getEventById(id);
  return buildRowPayload(updated);
}

async function deleteEvent(id, user) {
  const existing = await getEventById(id);
  if (!existing) {
    throw httpError(404, "Medicinski događaj nije pronađen.");
  }
  if (existing.user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }

  await pool.query("DELETE FROM medical_events WHERE id = ?", [id]);
  return { success: true, id: parseInt(id, 10) };
}

module.exports = {
  VALID_EVENT_TYPES,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};

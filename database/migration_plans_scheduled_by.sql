ALTER TABLE workout_sessions
  ADD COLUMN scheduled_by INT NULL AFTER user_id,
  ADD CONSTRAINT fk_workout_sessions_scheduled_by
    FOREIGN KEY (scheduled_by) REFERENCES users(id)
    ON DELETE SET NULL;

CREATE INDEX idx_workout_sessions_scheduled_by
  ON workout_sessions (scheduled_by);

UPDATE workout_sessions ws
LEFT JOIN workout_plans wp ON wp.id = ws.plan_id
SET ws.scheduled_by = COALESCE(ws.scheduled_by, wp.user_id)
WHERE ws.scheduled_by IS NULL;

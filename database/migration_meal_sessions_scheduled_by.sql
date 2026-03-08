ALTER TABLE meal_sessions
  ADD COLUMN scheduled_by INT NULL AFTER user_id,
  ADD CONSTRAINT fk_meal_sessions_scheduled_by
    FOREIGN KEY (scheduled_by) REFERENCES users(id)
    ON DELETE SET NULL;

CREATE INDEX idx_meal_sessions_scheduled_by
  ON meal_sessions (scheduled_by);

UPDATE meal_sessions ms
LEFT JOIN meal_plans mp ON mp.id = ms.plan_id
SET ms.scheduled_by = COALESCE(ms.scheduled_by, mp.user_id, ms.user_id)
WHERE ms.scheduled_by IS NULL;
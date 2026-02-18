import React from "react";

function WorkoutDot({ color, title, type = "workout" }) {
  return (
    <span
      className={`workout-dot ${type === "scheduled" ? "workout-dot--scheduled" : ""}`}
      style={{ backgroundColor: color || "#6366f1" }}
      title={title}
    />
  );
}

export default WorkoutDot;

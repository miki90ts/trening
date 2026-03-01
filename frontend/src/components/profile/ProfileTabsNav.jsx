import React from "react";

function ProfileTabsNav({ activeTab, onChange }) {
  return (
    <aside className="profile-tabs card">
      <button
        type="button"
        className={`profile-tab ${activeTab === "profile" ? "active" : ""}`}
        onClick={() => onChange("profile")}
      >
        Opšte informacije
      </button>
      <button
        type="button"
        className={`profile-tab ${activeTab === "password" ? "active" : ""}`}
        onClick={() => onChange("password")}
      >
        Promena lozinke
      </button>
      <button
        type="button"
        className={`profile-tab ${activeTab === "notifications" ? "active" : ""}`}
        onClick={() => onChange("notifications")}
      >
        Obaveštenja
      </button>
    </aside>
  );
}

export default ProfileTabsNav;

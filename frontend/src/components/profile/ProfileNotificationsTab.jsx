import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as api from "../../services/api";

const CATEGORY_INFO = {
  workout_plan: { label: "Plan treninga", icon: "🏋️", hasEmail: true },
  meal_plan: { label: "Plan ishrane", icon: "🍽️", hasEmail: true },
  nutrition: { label: "Ishrana", icon: "🥗", hasEmail: false },
  hydration: { label: "Hidratacija", icon: "💧", hasEmail: false },
  sleep: { label: "San", icon: "😴", hasEmail: false },
  steps: { label: "Koraci", icon: "👣", hasEmail: false },
  weight: { label: "Kilaža", icon: "⚖️", hasEmail: false },
  activity: { label: "Aktivnosti", icon: "🏃", hasEmail: false },
};

function ProfileNotificationsTab() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getNotificationPreferences()
      .then((prefs) => setPreferences(prefs))
      .catch(() => toast.error("Greška pri učitavanju preferenci."))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (category, field) => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.category === category ? { ...p, [field]: p[field] ? 0 : 1 } : p,
      ),
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.updateNotificationPreferences(preferences);
      setPreferences(result);
      toast.success("Preference obaveštenja sačuvane.");
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="form" style={{ padding: "20px", textAlign: "center" }}>
        Učitavanje...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="form">
      <p className="notification-pref-desc">
        Izaberi za koje kategorije želiš da primaš obaveštenja. Dashboard
        prikazuje dnevne zadatke na početnoj strani, a Zvonce prikazuje
        notifikacije u padajućem meniju.
      </p>

      <div className="notification-pref-grid">
        {/* Header */}
        <div className="notification-pref-row notification-pref-header">
          <span className="notification-pref-label">Kategorija</span>
          <span className="notification-pref-col">Dashboard</span>
          <span className="notification-pref-col">Zvonce</span>
          <span className="notification-pref-col">Email</span>
        </div>

        {preferences.map((pref) => {
          const info = CATEGORY_INFO[pref.category] || {};
          return (
            <div key={pref.category} className="notification-pref-row">
              <span className="notification-pref-label">
                <span className="notification-pref-icon">
                  {info.icon || pref.icon}
                </span>
                {info.label || pref.label}
              </span>
              <span className="notification-pref-col">
                <label className="pref-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(pref.dashboard_enabled)}
                    onChange={() =>
                      handleToggle(pref.category, "dashboard_enabled")
                    }
                  />
                  <span className="pref-toggle-slider" />
                </label>
              </span>
              <span className="notification-pref-col">
                <label className="pref-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(pref.bell_enabled)}
                    onChange={() => handleToggle(pref.category, "bell_enabled")}
                  />
                  <span className="pref-toggle-slider" />
                </label>
              </span>
              <span className="notification-pref-col">
                {info.hasEmail ? (
                  <label className="pref-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(pref.email_enabled)}
                      onChange={() =>
                        handleToggle(pref.category, "email_enabled")
                      }
                    />
                    <span className="pref-toggle-slider" />
                  </label>
                ) : (
                  <span className="notification-pref-na">—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={saving}
      >
        {saving ? "Čuvanje..." : "Sačuvaj preference"}
      </button>
    </form>
  );
}

export default ProfileNotificationsTab;

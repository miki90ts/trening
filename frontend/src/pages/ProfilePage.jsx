import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    nickname: user?.nickname || "",
    show_in_users_list:
      user?.show_in_users_list === undefined
        ? true
        : Boolean(user?.show_in_users_list),
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        nickname: form.nickname,
        show_in_users_list: form.show_in_users_list,
      };
      if (imageFile) payload.profile_image = imageFile;

      const updated = await api.updateUser(user.id, payload);
      updateUser(updated);
      toast.success("Profil uspešno ažuriran.");
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🙍 Moj profil</h1>
      </div>

      <div className="card form-card">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user?.email || ""} disabled />
          </div>

          <div className="form-group">
            <label>Ime *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, first_name: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Prezime</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, last_name: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label>Nadimak</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nickname: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.show_in_users_list}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    show_in_users_list: e.target.checked,
                  }))
                }
              />
              <span>Prikaži me na listi učesnika</span>
            </label>
            <small className="form-hint">
              Ako isključiš, ostali korisnici te neće videti na stranici
              Učesnici.
            </small>
          </div>

          <div className="form-group">
            <label>Profilna slika</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={saving}
          >
            {saving ? "Čuvanje..." : "Sačuvaj profil"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;

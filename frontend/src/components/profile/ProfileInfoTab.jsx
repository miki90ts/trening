import React from "react";

function ProfileInfoTab({
  user,
  form,
  setForm,
  setImageFile,
  saving,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="form">
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
          Ako isključiš, ostali korisnici te neće videti na stranici Učesnici.
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
  );
}

export default ProfileInfoTab;

import React from "react";

function ProfilePasswordTab({
  passwordForm,
  setPasswordForm,
  changingPassword,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="form">
      <div className="form-group">
        <label>Trenutna lozinka *</label>
        <input
          type="password"
          value={passwordForm.currentPassword}
          onChange={(e) =>
            setPasswordForm((prev) => ({
              ...prev,
              currentPassword: e.target.value,
            }))
          }
          required
        />
      </div>

      <div className="form-group">
        <label>Nova lozinka *</label>
        <input
          type="password"
          value={passwordForm.newPassword}
          onChange={(e) =>
            setPasswordForm((prev) => ({
              ...prev,
              newPassword: e.target.value,
            }))
          }
          required
        />
        <small className="form-hint">
          Minimum 8 karaktera, veliko i malo slovo, i broj.
        </small>
      </div>

      <div className="form-group">
        <label>Potvrdi novu lozinku *</label>
        <input
          type="password"
          value={passwordForm.confirmPassword}
          onChange={(e) =>
            setPasswordForm((prev) => ({
              ...prev,
              confirmPassword: e.target.value,
            }))
          }
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={changingPassword}
      >
        {changingPassword ? "Čuvanje..." : "Promeni lozinku"}
      </button>
    </form>
  );
}

export default ProfilePasswordTab;

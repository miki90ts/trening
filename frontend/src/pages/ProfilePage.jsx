import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import ProfileTabsNav from "../components/profile/ProfileTabsNav";
import ProfileInfoTab from "../components/profile/ProfileInfoTab";
import ProfilePasswordTab from "../components/profile/ProfilePasswordTab";
import ProfileNotificationsTab from "../components/profile/ProfileNotificationsTab";

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    nickname: user?.nickname || "",
    show_in_users_list:
      user?.show_in_users_list === undefined
        ? true
        : Boolean(user?.show_in_users_list),
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Unesi trenutnu i novu lozinku.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Nova lozinka mora imati najmanje 8 karaktera.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Potvrda lozinke se ne poklapa.");
      return;
    }

    setChangingPassword(true);
    try {
      const result = await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success(result?.message || "Lozinka je uspešno promenjena.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error("Greška: " + (err.response?.data?.error || err.message));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🙍 Moj profil</h1>
      </div>

      <div className="profile-layout">
        <ProfileTabsNav activeTab={activeTab} onChange={setActiveTab} />

        <div className="profile-content card form-card">
          {activeTab === "profile" ? (
            <ProfileInfoTab
              user={user}
              form={form}
              setForm={setForm}
              setImageFile={setImageFile}
              saving={saving}
              onSubmit={handleSubmit}
            />
          ) : activeTab === "password" ? (
            <ProfilePasswordTab
              passwordForm={passwordForm}
              setPasswordForm={setPasswordForm}
              changingPassword={changingPassword}
              onSubmit={handleChangePassword}
            />
          ) : (
            <ProfileNotificationsTab />
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;

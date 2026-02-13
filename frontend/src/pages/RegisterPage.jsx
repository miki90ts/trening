import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLock, FiUserPlus, FiEye, FiEyeOff } from 'react-icons/fi';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.first_name || !form.email || !form.password) {
      toast.error('Popunite sva obavezna polja.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Lozinke se ne poklapaju.');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Lozinka mora imati najmanje 8 karaktera.');
      return;
    }

    setSubmitting(true);
    try {
      const { first_name, last_name, nickname, email, password } = form;
      await register({ first_name, last_name, nickname, email, password });
      toast.success('Registracija uspešna! Vaš nalog čeka odobrenje administratora. 📬', { autoClose: 6000 });
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error || 'Greška pri registraciji.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <span className="auth-logo">🏋️</span>
          <h1>FitRecords</h1>
          <p>Kreirajte novi nalog</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row">
            <div className="auth-field">
              <FiUser className="field-icon" />
              <input
                type="text"
                placeholder="Ime *"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="auth-field">
              <FiUser className="field-icon" />
              <input
                type="text"
                placeholder="Prezime"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="auth-field">
            <FiUser className="field-icon" />
            <input
              type="text"
              placeholder="Nadimak"
              value={form.nickname}
              onChange={e => setForm({ ...form, nickname: e.target.value })}
            />
          </div>

          <div className="auth-field">
            <FiMail className="field-icon" />
            <input
              type="email"
              placeholder="Email adresa *"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <FiLock className="field-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Lozinka * (min 8 karaktera)"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <div className="auth-field">
            <FiLock className="field-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Potvrdite lozinku *"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="auth-hint">
            <p>🔒 Lozinka mora sadržati: veliko slovo, malo slovo i broj.</p>
          </div>

          <button type="submit" className="auth-submit" disabled={submitting}>
            <FiUserPlus />
            {submitting ? 'Registracija...' : 'Registruj se'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Već imate nalog? <Link to="/login">Prijavite se</Link></p>
        </div>

        <div className="auth-note">
          <p>⏳ Nakon registracije, vaš nalog mora biti odobren od strane administratora pre korišćenja.</p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;

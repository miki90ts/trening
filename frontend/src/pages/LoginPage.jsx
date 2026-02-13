import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Unesite email i lozinku.');
      return;
    }
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      toast.success('Uspešna prijava! 🎉');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || 'Greška pri prijavi.';
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
          <p>Prijavite se na svoj nalog</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <FiMail className="field-icon" />
            <input
              type="email"
              placeholder="Email adresa"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <FiLock className="field-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Lozinka"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
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

          <button type="submit" className="auth-submit" disabled={submitting}>
            <FiLogIn />
            {submitting ? 'Prijavljivanje...' : 'Prijavi se'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Nemate nalog? <Link to="/register">Registrujte se</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

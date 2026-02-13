import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import { toast } from 'react-toastify';
import { useApp } from '../context/AppContext';
import { FiCheck, FiX, FiShield, FiUser } from 'react-icons/fi';

function AdminPage() {
  const { users } = useApp();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPending = async () => {
    try {
      const data = await api.getPendingUsers();
      setPending(data);
    } catch (err) {
      toast.error('Greška pri učitavanju.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPending(); }, []);

  const handleApprove = async (id, name) => {
    try {
      await api.approveUser(id);
      toast.success(`${name} je odobren! ✅`);
      setPending(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Greška: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Odbiti i obrisati korisnika "${name}"?`)) return;
    try {
      await api.rejectUser(id);
      toast.success(`${name} je odbijen.`);
      setPending(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      toast.error('Greška: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRoleChange = async (id, currentRole, name) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Promeniti rolu za "${name}" u ${newRole}?`)) return;
    try {
      await api.changeUserRole(id, newRole);
      toast.success(`${name} je sada ${newRole}.`);
    } catch (err) {
      toast.error('Greška: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <h1 className="page-title">🛡️ Admin Panel</h1>

      {/* Pending Users */}
      <section className="dashboard-section">
        <h2>⏳ Čekaju odobrenje ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="empty-state">Nema korisnika na čekanju.</p>
        ) : (
          <div className="cards-grid">
            {pending.map(u => (
              <Card key={u.id} className="pending-card">
                <div className="pending-info">
                  <div className="pending-avatar">
                    <span className="avatar-placeholder">{u.first_name[0]}</span>
                  </div>
                  <div>
                    <h3>{u.first_name} {u.last_name || ''}</h3>
                    {u.nickname && <span className="user-nickname">"{u.nickname}"</span>}
                    <p className="pending-email">{u.email}</p>
                    <p className="pending-date">
                      Registrovan: {new Date(u.created_at).toLocaleDateString('sr-RS')}
                    </p>
                  </div>
                </div>
                <div className="pending-actions">
                  <button className="btn btn-sm btn-success" onClick={() => handleApprove(u.id, u.first_name)}>
                    <FiCheck /> Odobri
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleReject(u.id, u.first_name)}>
                    <FiX /> Odbij
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* All Users with Roles */}
      <section className="dashboard-section">
        <h2>👥 Svi korisnici</h2>
        <div className="results-table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Ime</th>
                <th>Email</th>
                <th>Rola</th>
                <th>Akcija</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.first_name} {u.last_name || ''} {u.nickname ? `"${u.nickname}"` : ''}</td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {u.role === 'admin' ? <><FiShield /> Admin</> : <><FiUser /> User</>}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleRoleChange(u.id, u.role, u.first_name)}
                    >
                      {u.role === 'admin' ? 'Postavi User' : 'Postavi Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminPage;

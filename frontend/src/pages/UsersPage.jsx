import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

function UsersPage() {
  const { users, loading, addUser, editUser, removeUser } = useApp();
  const { user: currentUser, isAdmin } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', nickname: '' });
  const [imageFile, setImageFile] = useState(null);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ first_name: '', last_name: '', nickname: '' });
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ first_name: user.first_name, last_name: user.last_name || '', nickname: user.nickname || '' });
    setImageFile(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (imageFile) data.profile_image = imageFile;

      if (editingUser) {
        await editUser(editingUser.id, data);
        toast.success('Učesnik ažuriran!');
      } else {
        await addUser(data);
        toast.success('Učesnik dodat!');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error('Greška: ' + err.message);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Obrisati ${user.first_name}?`)) return;
    try {
      await removeUser(user.id);
      toast.success('Učesnik obrisan!');
    } catch (err) {
      toast.error('Greška: ' + err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👥 Učesnici</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <FiPlus /> Dodaj učesnika
          </button>
        )}
      </div>

      <div className="cards-grid">
        {users.map(user => (
          <Card key={user.id} className="user-card">
            <Link to={`/users/${user.id}`} className="card-link">
              <div className="user-avatar">
                {user.profile_image
                  ? <img src={user.profile_image} alt={user.first_name} />
                  : <span className="avatar-placeholder">{user.first_name[0]}</span>
                }
              </div>
              <div className="user-info">
                <h3>{user.first_name} {user.last_name || ''}</h3>
                {user.nickname && <span className="user-nickname">"{user.nickname}"</span>}
              </div>
            </Link>
            <div className="card-actions">
              {(isAdmin || currentUser?.id === user.id) && (
                <button className="btn-icon" onClick={() => openEdit(user)} title="Izmeni">
                  <FiEdit2 />
                </button>
              )}
              {isAdmin && (
                <button className="btn-icon btn-danger" onClick={() => handleDelete(user)} title="Obriši">
                  <FiTrash2 />
                </button>
              )}
            </div>
          </Card>
        ))}
        {users.length === 0 && (
          <p className="empty-state">Nema učesnika. Dodajte prvog!</p>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Izmeni učesnika' : 'Dodaj učesnika'}>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Ime *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => setForm({ ...form, first_name: e.target.value })}
              required
              placeholder="Ime"
            />
          </div>
          <div className="form-group">
            <label>Prezime</label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => setForm({ ...form, last_name: e.target.value })}
              placeholder="Prezime"
            />
          </div>
          <div className="form-group">
            <label>Nadimak</label>
            <input
              type="text"
              value={form.nickname}
              onChange={e => setForm({ ...form, nickname: e.target.value })}
              placeholder="Nadimak"
            />
          </div>
          <div className="form-group">
            <label>Profilna slika</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setImageFile(e.target.files[0])}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            {editingUser ? 'Sačuvaj' : 'Dodaj'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default UsersPage;

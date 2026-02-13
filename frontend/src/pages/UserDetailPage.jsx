import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import * as api from '../services/api';
import { FiArrowLeft } from 'react-icons/fi';

function UserDetailPage() {
  const { id } = useParams();
  const { users } = useApp();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUserLeaderboard(id)
      .then(data => { setUserData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!userData) return <p>Korisnik nije pronađen.</p>;

  const { user, records, total_attempts } = userData;

  return (
    <div className="page">
      <Link to="/users" className="btn btn-back"><FiArrowLeft /> Nazad</Link>
      
      <div className="user-detail-header">
        <div className="user-avatar large">
          {user.profile_image
            ? <img src={user.profile_image} alt={user.first_name} />
            : <span className="avatar-placeholder large">{user.first_name[0]}</span>
          }
        </div>
        <div>
          <h1>{user.first_name} {user.last_name || ''}</h1>
          {user.nickname && <span className="user-nickname">"{user.nickname}"</span>}
          <div className="user-stats">
            <span>🏆 {records.length} rekord(a)</span>
            <span>🎯 {total_attempts} pokušaj(a)</span>
          </div>
        </div>
      </div>

      <h2>Rekordi</h2>
      {records.length === 0 ? (
        <p className="empty-state">Nema rekorda za ovog učesnika.</p>
      ) : (
        <div className="cards-grid">
          {records.map(rec => (
            <Card key={rec.id} className="record-card">
              <div className="record-exercise">
                <span className="exercise-icon">{rec.exercise_icon}</span>
                <span>{rec.exercise_name}</span>
              </div>
              <div className="record-category">{rec.category_name}</div>
              <div className="record-value">
                {parseFloat(rec.score)} {rec.has_weight ? 'vol' : rec.value_type === 'seconds' ? 's' : rec.value_type === 'reps' ? 'x' : rec.value_type}
              </div>
              {rec.record_date && <div className="record-date">📅 {rec.record_date}</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserDetailPage;

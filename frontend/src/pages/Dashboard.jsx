import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import { FiUsers, FiActivity, FiTarget, FiTrendingUp } from 'react-icons/fi';
import * as api from '../services/api';

function Dashboard() {
  const { users, exercises, loading } = useApp();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(() => {});
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="page dashboard">
      <h1 className="page-title">🏋️ Fitness Records Tracker</h1>
      <p className="page-subtitle">Prati rekorde, nadmašuj kolege!</p>

      {/* Stats cards */}
      <div className="stats-grid">
        <Card className="stat-card">
          <FiUsers className="stat-icon" />
          <div className="stat-info">
            <span className="stat-number">{summary?.stats?.total_users || users.length}</span>
            <span className="stat-label">Učesnika</span>
          </div>
        </Card>
        <Card className="stat-card">
          <FiActivity className="stat-icon" />
          <div className="stat-info">
            <span className="stat-number">{summary?.stats?.total_exercises || exercises.length}</span>
            <span className="stat-label">Vežbi</span>
          </div>
        </Card>
        <Card className="stat-card">
          <FiTarget className="stat-icon" />
          <div className="stat-info">
            <span className="stat-number">{summary?.stats?.total_attempts || 0}</span>
            <span className="stat-label">Pokušaja</span>
          </div>
        </Card>
        <Card className="stat-card">
          <FiTrendingUp className="stat-icon" />
          <div className="stat-info">
            <span className="stat-number">{summary?.stats?.total_records || 0}</span>
            <span className="stat-label">Rekorda</span>
          </div>
        </Card>
      </div>

      {/* Top users */}
      {summary?.top_users?.length > 0 && (
        <section className="dashboard-section">
          <h2>🏆 Top učesnici po broju rekorda</h2>
          <div className="cards-grid">
            {summary.top_users.map((user, index) => (
              <Link to={`/users/${user.id}`} key={user.id} className="card-link">
                <Card className="user-card">
                  <div className="user-rank">#{index + 1}</div>
                  <div>
                    <div className="user-avatar">
                      {user.profile_image
                        ? <img src={user.profile_image} alt={user.first_name} />
                        : <span className="avatar-placeholder">{user.first_name[0]}</span>
                      }
                    </div>
                    <div className="user-info">
                      <h3>{user.nickname || `${user.first_name} ${user.last_name || ''}`}</h3>
                      <span className="user-records-count">{user.total_records} rekord(a)</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent records */}
      {summary?.recent_records?.length > 0 && (
        <section className="dashboard-section">
          <h2>🔥 Poslednji rekordi</h2>
          <div className="cards-grid">
            {summary.recent_records.map(record => (
              <Card key={record.id} className="record-card">
                <div className="record-exercise">
                  <span className="exercise-icon">{record.exercise_icon}</span>
                  <span>{record.exercise_name}</span>
                </div>
                <div className="record-category">{record.category_name}</div>
                <div className="record-value">
                 {parseFloat(record.score)}
                </div>
                <div className="record-user">
                  {record.nickname || `${record.first_name} ${record.last_name || ''}`}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;

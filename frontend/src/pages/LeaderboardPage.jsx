import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import * as api from '../services/api';
import { FiFilter } from 'react-icons/fi';

function LeaderboardPage() {
  const { exercises, categories: allCategories, loading } = useApp();
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [exerciseLeaderboard, setExerciseLeaderboard] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const filteredCategories = selectedExercise
    ? allCategories.filter(c => c.exercise_id === parseInt(selectedExercise))
    : [];

  // Load leaderboard by category
  useEffect(() => {
    if (!selectedCategory) {
      setLeaderboard([]);
      return;
    }
    setLoadingData(true);
    api.getLeaderboard(selectedCategory)
      .then(data => { setLeaderboard(data); setLoadingData(false); })
      .catch(() => setLoadingData(false));
  }, [selectedCategory]);

  // Load exercise-level leaderboard
  useEffect(() => {
    if (!selectedExercise || selectedCategory) {
      setExerciseLeaderboard([]);
      return;
    }
    setLoadingData(true);
    api.getExerciseLeaderboard(selectedExercise)
      .then(data => { setExerciseLeaderboard(data); setLoadingData(false); })
      .catch(() => setLoadingData(false));
  }, [selectedExercise, selectedCategory]);

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <h1 className="page-title">📊 Rang lista</h1>

      {/* Filters */}
      <Card className="filter-card">
        <div className="filter-row">
          <div className="form-group">
            <label><FiFilter /> Vežba</label>
            <select
              value={selectedExercise}
              onChange={e => {
                setSelectedExercise(e.target.value);
                setSelectedCategory('');
              }}
            >
              <option value="">-- Sve vežbe --</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.icon} {ex.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Kategorija</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              disabled={!selectedExercise}
            >
              <option value="">-- Sve kategorije --</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {loadingData && <Loading />}

      {/* Category-specific leaderboard */}
      {selectedCategory && leaderboard.length > 0 && (
        <div className="leaderboard-section">
          <div className="leaderboard-list">
            {leaderboard.map(entry => (
              <Card key={entry.id} className={`leaderboard-card rank-${entry.rank}`}>
                <div className="rank-badge">{getRankEmoji(entry.rank)}</div>
                <div className="leaderboard-user">
                  <div className="user-avatar small">
                    {entry.profile_image
                      ? <img src={entry.profile_image} alt="" />
                      : <span className="avatar-placeholder small">{entry.first_name[0]}</span>
                    }
                  </div>
                  <span className="leaderboard-name">
                    {entry.nickname || `${entry.first_name} ${entry.last_name || ''}`}
                  </span>
                </div>
                <div className="leaderboard-value">
                  {parseFloat(entry.score)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedCategory && leaderboard.length === 0 && !loadingData && (
        <p className="empty-state">Nema rekorda za ovu kategoriju.</p>
      )}

      {/* Exercise-level leaderboard */}
      {!selectedCategory && exerciseLeaderboard.length > 0 && (
        <div className="exercise-leaderboard">
          {exerciseLeaderboard.map(group => (
            <div key={group.category.id} className="leaderboard-group">
              <h3>{group.category.name}
                <span className="cat-type-badge">
                  {group.category.value_type}
                </span>
              </h3>
              {group.records.length > 0 ? (
                <div className="leaderboard-list">
                  {group.records.map(entry => (
                    <Card key={entry.id} className={`leaderboard-card rank-${entry.rank}`}>
                      <div className="rank-badge">{getRankEmoji(entry.rank)}</div>
                      <div className="leaderboard-user">
                        <div className="user-avatar small">
                          {entry.profile_image
                            ? <img src={entry.profile_image} alt="" />
                            : <span className="avatar-placeholder small">{entry.first_name[0]}</span>
                          }
                        </div>
                        <span className="leaderboard-name">
                          {entry.nickname || `${entry.first_name} ${entry.last_name || ''}`}
                        </span>
                      </div>
                      <div className="leaderboard-value">
                        {parseFloat(entry.score)}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="empty-state-small">Nema rekorda</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!selectedExercise && !selectedCategory && (
        <div className="empty-state">
          <p>Izaberite vežbu ili kategoriju da vidite rang listu.</p>
        </div>
      )}
    </div>
  );
}

export default LeaderboardPage;

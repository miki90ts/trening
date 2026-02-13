import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';
import WorkoutDetailModal from './WorkoutDetailModal';
import WorkoutEditModal from './WorkoutEditModal';
import * as api from '../../services/api';
import { toast } from 'react-toastify';
import {
  FiEye, FiEdit2, FiTrash2,
  FiChevronLeft, FiChevronRight,
  FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';

function ResultsDataTable({ categories, onDataChanged, refreshKey }) {
  const { user: currentUser, isAdmin } = useAuth();
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);

  // Modali
  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await api.getResultsPaginated({ page, pageSize: pagination.pageSize });
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      toast.error('Greška pri učitavanju rezultata');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    fetchData(1);
  }, [refreshKey]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.totalPages) return;
    fetchData(p);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Obrisati ovaj rezultat?')) return;
    try {
      await api.deleteResult(id);
      toast.success('Rezultat obrisan.');
      fetchData(pagination.page);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      toast.error('Greška: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditSaved = () => {
    setEditId(null);
    fetchData(pagination.page);
    if (onDataChanged) onDataChanged();
  };

  const formatScore = (score, type, hasW) => {
    if (hasW) return `${score} vol`;
    if (type === 'seconds') return `${score}s`;
    if (type === 'minutes') return `${score}min`;
    if (type === 'meters') return `${score}m`;
    if (type === 'kg') return `${score}kg`;
    return `${score}x`;
  };

  // Generiši niz stranica za prikaz
  const getPageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="dt-container">
      {loading ? (
        <Loading />
      ) : data.length === 0 ? (
        <p className="empty-state">Nema rezultata.</p>
      ) : (
        <>
          <div className="results-table-wrapper">
            <table className="results-table dt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Učesnik</th>
                  <th>Vežba</th>
                  <th>Kategorija</th>
                  <th>Setovi</th>
                  <th>Score</th>
                  <th>Datum</th>
                  <th className="dt-actions-col">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, idx) => {
                  const rowNum = (pagination.page - 1) * pagination.pageSize + idx + 1;
                  const canEdit = r.user_id === currentUser?.id || isAdmin;

                  return (
                    <tr key={r.id}>
                      <td className="dt-row-num">{rowNum}</td>
                      <td>{r.nickname || `${r.first_name} ${r.last_name || ''}`}</td>
                      <td>{r.exercise_icon} {r.exercise_name}</td>
                      <td>{r.category_name}</td>
                      <td>{r.total_sets}</td>
                      <td className="value-cell">
                        {formatScore(parseFloat(r.score), r.value_type, r.has_weight)}
                      </td>
                      <td>{new Date(r.attempt_date).toLocaleDateString('sr-RS')}</td>
                      <td className="dt-actions">
                        <button
                          className="btn-icon dt-btn dt-btn-view"
                          onClick={() => setDetailId(r.id)}
                          title="Pregledaj"
                        >
                          <FiEye />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              className="btn-icon dt-btn dt-btn-edit"
                              onClick={() => setEditId(r.id)}
                              title="Izmeni"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="btn-icon dt-btn dt-btn-delete"
                              onClick={() => handleDelete(r.id)}
                              title="Obriši"
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginacija */}
          {pagination.totalPages > 1 && (
            <div className="dt-pagination">
              <span className="dt-pagination-info">
                Prikazano {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} od {pagination.total}
              </span>
              <div className="dt-pagination-controls">
                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1}
                  title="Prva"
                >
                  <FiChevronsLeft />
                </button>
                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  title="Prethodna"
                >
                  <FiChevronLeft />
                </button>

                {getPageNumbers().map(p => (
                  <button
                    key={p}
                    className={`dt-page-btn ${p === pagination.page ? 'active' : ''}`}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  title="Sledeća"
                >
                  <FiChevronRight />
                </button>
                <button
                  className="dt-page-btn"
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  title="Poslednja"
                >
                  <FiChevronsRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modali */}
      <WorkoutDetailModal
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        workoutId={detailId}
      />
      <WorkoutEditModal
        isOpen={!!editId}
        onClose={() => setEditId(null)}
        workoutId={editId}
        categories={categories}
        onSaved={handleEditSaved}
      />
    </div>
  );
}

export default ResultsDataTable;

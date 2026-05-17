import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LeadModal from '../components/LeadModal';
import './Leads.css';

const STATUS_COLORS = {
  'محتمل': { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  'مهتم': { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  'مؤكد': { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  'عميلنا': { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
};

export default function Leads() {
  const { leads, users, trips, addLead, updateLead, deleteLead, getFilteredLeads } = useData();
  const { currentUser } = useAuth();

  const [filters, setFilters] = useState({ status: '', agentId: '', month: '', day: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 15;

  const agents = users.filter(u => u.role === 'agent');
  const filtered = useMemo(() => getFilteredLeads(filters, currentUser), [leads, filters, currentUser]);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setCurrentPage(1);
  };

  const handleSave = async (lead) => {
    try {
      if (editLead) {
        await updateLead(editLead.id, lead);
      } else {
        await addLead(lead);
      }
      setModalOpen(false);
      setEditLead(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (lead) => {
    setEditLead(lead);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    deleteLead(id);
    setDeleteConfirm(null);
  };

  const canEdit = (lead) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'team_leader') return lead.teamLeaderId === currentUser.id;
    return lead.agentId === currentUser.id;
  };

  const canDelete = currentUser.role === 'admin';

  const resetFilters = () => {
    setFilters({ status: '', agentId: '', month: '', day: '', search: '' });
    setCurrentPage(1);
  };

  // توليد قائمة الشهور (6 شهور قبل و 6 شهور بعد من التاريخ الحالي)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      // استخدام التوقيت المحلي بدلاً من ISO لتجنب مشاكل المناطق الزمنية
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${month}`; // YYYY-MM
      const label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      options.push({ val, label });
    }
    return options;
  }, []);


  return (
    <div className="leads-page">
      {/* Filters bar */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="محتمل">محتمل (Lead)</option>
            <option value="مهتم">مهتم (Pending)</option>
            <option value="مؤكد">مؤكد (Confirmed)</option>
            <option value="عميلنا">عميلنا (Our Customer)</option>
          </select>

          {currentUser.role !== 'agent' && (
            <select value={filters.agentId} onChange={e => handleFilterChange('agentId', e.target.value)}>
              <option value="">كل الإيجنت</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          <select value={filters.month} onChange={e => handleFilterChange('month', e.target.value)}>
            <option value="">كل الشهور</option>
            {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>

          <input
            type="number"
            min="1"
            max="31"
            placeholder="يوم.."
            value={filters.day}
            onChange={e => handleFilterChange('day', e.target.value)}
            style={{ width: '70px' }}
            title="فلترة بيوم محدد في الشهر"
          />


          {Object.values(filters).some(Boolean) && (
            <button className="reset-btn" onClick={resetFilters}>✕ مسح</button>
          )}
        </div>

        {(currentUser.role === 'admin' || currentUser.role === 'team_leader' || currentUser.role === 'agent') && (
          <button className="add-btn" onClick={() => { setEditLead(null); setModalOpen(true); }}>
            + إضافة عميل
          </button>
        )}
      </div>

      {/* Stats mini bar */}
      <div className="leads-stats-bar">
        <span className="stats-total">إجمالي النتائج: <strong>{filtered.length}</strong></span>
        {['محتمل', 'مهتم', 'مؤكد', 'عميلنا'].map(s => (
          <span key={s} className="stats-badge" style={{ color: STATUS_COLORS[s]?.color, background: STATUS_COLORS[s]?.bg, border: `1px solid ${STATUS_COLORS[s]?.border}` }}>
            {s}: {filtered.filter(l => l.status === s).length}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="leads-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>رقم التليفون</th>
              <th>الحالة</th>
              <th>الرحلة / الموعد</th>
              <th>تفاصيل الحجز</th>
              <th>الإيجنت</th>
              <th>التيم ليدر</th>
              <th>تاريخ الإضافة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-row">
                  <div className="empty-state">
                    <span>📭</span>
                    <p>لا توجد نتائج مطابقة</p>
                  </div>
                </td>
              </tr>
            ) : paginated.map((lead, i) => {
              const sc = STATUS_COLORS[lead.status] || {};
              return (
                <tr key={lead.id} className="lead-row">
                  <td className="row-num">{(currentPage - 1) * PER_PAGE + i + 1}</td>
                  <td className="lead-name">{lead.name}</td>
                  <td className="lead-phone" dir="ltr">{lead.phone}</td>
                  <td>
                    <span className="status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="campaign-cell">
                    {(() => {
                      const trip = trips.find(t => t.id === lead.tripId);
                      return trip ? (
                        <div className="trip-cell-info">
                          <div className="trip-name">{trip.name}</div>
                          <div className="trip-date">{trip.date?.replace('T', ' ')}</div>
                        </div>
                      ) : '—';
                    })()}
                  </td>
                  <td className="booking-cell">
                    <div>{lead.bookingDetails || '—'}</div>
                    {lead.status === 'مؤكد' && lead.seats && lead.seats.length > 0 && (
                      <div className="seats-info" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        🚌 {lead.busType} | مقاعد: {lead.seats.join(', ')}
                      </div>
                    )}
                    {(currentUser.role === 'admin' || lead.agentId === currentUser.id) && lead.bookingValue && (
                      <div className="booking-value" style={{ fontSize: '12px', color: '#34d399', fontWeight: 'bold', marginTop: '4px' }}>
                        💰 {Number(lead.bookingValue).toLocaleString()} ريال
                      </div>
                    )}
                  </td>
                  <td>{lead.agentName}</td>
                  <td>{lead.teamLeaderName}</td>
                  <td className="date-cell">{lead.addedDate}</td>
                  <td className="actions-cell">
                    {canEdit(lead) && (
                      <button className="action-btn edit" onClick={() => handleEdit(lead)} title="تعديل">✏️</button>
                    )}
                    {canDelete && (
                      <button className="action-btn delete" onClick={() => setDeleteConfirm(lead)} title="حذف">🗑️</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹ السابق</button>
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="ellipsis">...</span>}
                  <button
                    className={p === currentPage ? 'active' : ''}
                    onClick={() => setCurrentPage(p)}
                  >{p}</button>
                </React.Fragment>
              ))}
          </div>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>التالي ›</button>
        </div>
      )}

      {/* Lead Modal */}
      {modalOpen && (
        <LeadModal
          lead={editLead}
          users={users}
          currentUser={currentUser}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditLead(null); }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-icon">🗑️</div>
            <h3>تأكيد الحذف</h3>
            <p>هل تريد حذف عميل <strong>{deleteConfirm.name}</strong>؟</p>
            <p className="delete-warning">هذا الإجراء لا يمكن التراجع عنه</p>
            <div className="delete-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
              <button className="btn-delete" onClick={() => handleDelete(deleteConfirm.id)}>حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

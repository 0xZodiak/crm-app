import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import BusSelector from '../components/BusSelector';
import './Trips.css';

export default function Trips() {
  const { trips, leads, addTrip, updateTrip, deleteTrip } = useData();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  
  const [filters, setFilters] = useState({ search: '', status: '', bus: '' });

  const canManage = currentUser.role === 'admin' || currentUser.role === 'team_leader';

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                            t.destination?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status ? t.status === filters.status : true;
      const matchesBus = filters.bus ? t.busType === filters.bus : true;
      
      const isTabMatch = (activeTab === 'archive' && currentUser.role === 'admin') ? (t.status === 'Completed' || t.status === 'Cancelled') : 
                         activeTab === 'upcoming' ? (t.status === 'Upcoming' || t.status === 'Active') : true;

      return matchesSearch && matchesStatus && matchesBus && isTabMatch;
    });
  }, [trips, filters, activeTab]);

  const selectedTrip = trips.find(t => t.id === selectedTripId);
  const tripLeads = leads.filter(l => l.campaignDate === selectedTrip?.date?.split('T')[0] && l.status === 'مؤكد');

  const handleOpenEdit = (trip = null) => {
    if (trip) {
      setEditTrip(trip);
    } else {
      setEditTrip({ 
        name: '', 
        date: new Date().toISOString().slice(0, 16), 
        destination: '', 
        busType: 'سياحي 49', 
        status: 'Upcoming', 
        duration: 5,
        autoComplete: true 
      });
    }
    setModalOpen(true);
  };

  const handleSaveTrip = (e) => {
    e.preventDefault();
    
    // VIP Rules Validation
    if (editTrip.busType === 'VIP 30') {
      if (editTrip.destination !== 'مكة') {
        alert('باص VIP متاح لمكة فقط');
        return;
      }
      if (editTrip.duration !== 3) {
        alert('مدة رحلة VIP يجب أن تكون 3 أيام فقط');
        return;
      }
      const day = new Date(editTrip.date).getDay();
      if (day !== 1 && day !== 4) {
        alert('باص VIP يخرج يومي الاثنين والخميس فقط');
        return;
      }
    }

    if (editTrip.id) {
      updateTrip(editTrip.id, editTrip);
    } else {
      addTrip(editTrip);
    }
    setModalOpen(false);
    setEditTrip(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Upcoming': return '#3b82f6';
      case 'Active': return '#22c55e';
      case 'Completed': return '#94a3b8';
      case 'Cancelled': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="trips-mgmt-page" dir="rtl">
      <div className="trips-header">
        <div className="header-titles">
          <h1>إدارة الرحلات</h1>
          <p>تحكم كامل في مواعيد الانطلاق، الحافلات، وتوزيع المقاعد</p>
        </div>
        {canManage && (
          <button className="add-trip-btn" onClick={() => handleOpenEdit()}>+ إنشاء رحلة جديدة</button>
        )}
      </div>

      <div className="trips-tabs">
        <button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>الرحلات الحالية والقادمة</button>
        {currentUser.role === 'admin' && (
          <button className={activeTab === 'archive' ? 'active' : ''} onClick={() => setActiveTab('archive')}>الأرشيف (المنتهية)</button>
        )}
      </div>

      <div className="trips-controls">
        <div className="search-bar">
          <span className="icon">🔍</span>
          <input 
            type="text" 
            placeholder="بحث باسم الرحلة أو الوجهة..." 
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
          />
        </div>
        <div className="filters">
          <select value={filters.bus} onChange={e => setFilters({...filters, bus: e.target.value})}>
            <option value="">كل الحافلات</option>
            <option value="سياحي 49">سياحي 49</option>
            <option value="سياحي 51">سياحي 51</option>
            <option value="VIP 30">VIP 30</option>
          </select>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
            <option value="">كل الحالات</option>
            <option value="Upcoming">قادمة</option>
            <option value="Active">نشطة الآن</option>
            <option value="Completed">مكتملة</option>
            <option value="Cancelled">ملغاة</option>
          </select>
        </div>
      </div>

      <div className="trips-table-wrapper">
        <table className="trips-table">
          <thead>
            <tr>
              <th>الرحلة</th>
              <th>الوجهة</th>
              <th>التاريخ والوقت</th>
              <th>المدة (أيام)</th>
              <th>الحافلة</th>
              <th>الحالة</th>
              <th>الحجوزات</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  <div className="empty-state">
                    <span>📭</span>
                    <p>لا توجد رحلات مطابقة للبحث</p>
                  </div>
                </td>
              </tr>
            ) : filteredTrips.map(trip => (
              <tr key={trip.id} className={selectedTripId === trip.id ? 'selected' : ''}>
                <td className="trip-name-cell">
                  <div className="trip-title">{trip.name}</div>
                  <div className="trip-id">#{trip.id.slice(-5)}</div>
                </td>
                <td>{trip.destination || '—'}</td>
                <td className="date-cell">
                  <div className="d">{trip.date?.split('T')[0]}</div>
                  <div className="t">{trip.date?.split('T')[1]}</div>
                </td>
                <td>{trip.duration || 1} يوم</td>
                <td>
                  <span className="bus-tag">{trip.busType}</span>
                </td>
                <td>
                  <span className="status-pill" style={{ '--color': getStatusColor(trip.status) }}>
                    {trip.status === 'Upcoming' ? 'قادمة' : trip.status === 'Active' ? 'نشطة' : trip.status === 'Completed' ? 'مكتملة' : 'ملغاة'}
                  </span>
                </td>
                <td>
                  <div className="booking-stat">
                    <strong>{leads.filter(l => l.campaignDate === trip.date?.split('T')[0] && l.status === 'مؤكد').length}</strong>
                    <span>حجز</span>
                  </div>
                </td>
                <td className="actions-cell">
                  <button className="view-btn" onClick={() => setSelectedTripId(trip.id)}>عرض التفاصيل</button>
                  {canManage && (
                    <div className="actions-cell">
                      <button className="edit-icon-btn" onClick={() => handleOpenEdit(trip)}>✏️</button>
                      {(trip.status === 'Completed' || trip.status === 'Cancelled') && currentUser.role === 'admin' && (
                        <button className="restore-btn" onClick={() => updateTrip(trip.id, { status: 'Upcoming' })}>🔄 استعادة</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trip Details Section (Side Panel or Bottom) */}
      {selectedTrip && (
        <div className="trip-details-panel">
          <div className="panel-header">
            <div className="header-info">
              <h2>{selectedTrip.name} - {selectedTrip.destination}</h2>
              <p>توزيع المقاعد وقائمة الركاب</p>
            </div>
            <button className="close-panel" onClick={() => setSelectedTripId(null)}>✕ إغلاق</button>
          </div>
          
          <div className="panel-content">
            <div className="bus-layout-section">
              <h3>خريطة الحافلة ({selectedTrip.busType})</h3>
              <div className="bus-map-container">
                 <BusSelector 
                    busType={selectedTrip.busType}
                    campaignDate={selectedTrip.date?.split('T')[0]}
                    selectedSeats={[]}
                    memberCount={1}
                    onSeatsChange={() => {}} // Read-only view for admin
                    currentLeadId="admin-view"
                 />
              </div>
            </div>
            
            <div className="passengers-section">
              <h3>قائمة الركاب ({tripLeads.length})</h3>
              <div className="passengers-list">
                {tripLeads.length === 0 ? (
                  <div className="empty-passengers">لا توجد حجوزات مؤكدة لهذه الرحلة بعد.</div>
                ) : (
                  tripLeads.map(lead => (
                    <div key={lead.id} className="passenger-card">
                      <div className="p-info">
                        <span className="p-name">{lead.name}</span>
                        <span className="p-seats">المقاعد: {lead.seats?.join(', ')}</span>
                      </div>
                      <div className="p-meta">
                        <span className="p-ref">{lead.bookingDetails}</span>
                        <span className="p-agent">بواسطة: {lead.agentName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {modalOpen && editTrip && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="trip-edit-modal" onClick={e => e.stopPropagation()}>
            <h3>{editTrip.id ? 'تعديل بيانات الرحلة' : 'إنشاء رحلة جديدة'}</h3>
            <form onSubmit={handleSaveTrip}>
              <div className="f-row">
                <div className="f-group">
                  <label>اسم الرحلة</label>
                  <input type="text" value={editTrip.name} onChange={e => setEditTrip({...editTrip, name: e.target.value})} required />
                </div>
                <div className="f-group">
                  <label>الوجهة</label>
                  <input 
                    type="text" 
                    value={editTrip.destination} 
                    onChange={e => setEditTrip({...editTrip, destination: e.target.value})} 
                    disabled={editTrip.busType === 'VIP 30'}
                    className={editTrip.busType === 'VIP 30' ? 'readonly' : ''}
                    required 
                  />
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>التاريخ والوقت</label>
                  <input type="datetime-local" value={editTrip.date} onChange={e => setEditTrip({...editTrip, date: e.target.value})} required />
                </div>
                <div className="f-group">
                  <label>نوع الحافلة</label>
                  <select value={editTrip.busType} onChange={e => {
                    const bus = e.target.value;
                    const updates = { busType: bus };
                    if (bus === 'VIP 30') {
                      updates.destination = 'مكة';
                      updates.duration = 3;
                    }
                    setEditTrip({...editTrip, ...updates});
                  }}>
                    <option value="سياحي 49">سياحي 49</option>
                    <option value="سياحي 51">سياحي 51</option>
                    <option value="VIP 30">VIP 30</option>
                  </select>
                </div>
              </div>
              <div className="f-row">
                <div className="f-group">
                  <label>مدة الرحلة (بالأيام)</label>
                  <input 
                    type="number" 
                    min="3" 
                    value={editTrip.duration} 
                    onChange={e => setEditTrip({...editTrip, duration: Math.max(3, parseInt(e.target.value) || 3)})} 
                    disabled={editTrip.busType === 'VIP 30'}
                    className={editTrip.busType === 'VIP 30' ? 'readonly' : ''}
                    required 
                  />
                  {editTrip.busType === 'VIP 30' && <span className="f-hint">رحلات VIP محددة بـ 3 أيام دائماً</span>}
                </div>
                <div className="f-group">
                  <label>حالة الرحلة</label>
                  <select value={editTrip.status} onChange={e => setEditTrip({...editTrip, status: e.target.value})}>
                    <option value="Upcoming">قادمة (Upcoming)</option>
                    <option value="Active">نشطة (Active)</option>
                    <option value="Completed">مكتملة (Completed)</option>
                    <option value="Cancelled">ملغاة (Cancelled)</option>
                  </select>
                </div>
                <div className="f-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={editTrip.autoComplete} onChange={e => setEditTrip({...editTrip, autoComplete: e.target.checked})} />
                    تحديث الحالة تلقائياً بناءً على الوقت
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setModalOpen(false)}>إلغاء</button>
                <button type="submit" className="save-btn">حفظ الرحلة</button>
                {editTrip.id && (
                  <button type="button" className="delete-btn" onClick={() => { deleteTrip(editTrip.id); setModalOpen(false); }}>حذف</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

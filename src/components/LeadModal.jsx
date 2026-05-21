import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import BusSelector from './BusSelector';
import './LeadModal.css';

const getArabicFormattedDate = (dateStr) => {
  if (!dateStr) return { dayName: 'اختر التاريخ', dateDetails: 'يرجى تحديد موعد الانطلاق' };
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
    const dateDetails = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    return { dayName, dateDetails };
  } catch {
    return { dayName: 'التاريخ', dateDetails: dateStr };
  }
};

export default function LeadModal({ lead, users, currentUser, onSave, onClose }) {
  const { trips } = useData();
  const agentsAndTLs = users.filter(u => u.role === 'agent' || u.role === 'team_leader');

  const getDefaultAgent = () => {
    if (currentUser?.role === 'agent' || currentUser?.role === 'team_leader') {
      return agentsAndTLs.find(a => a.id === currentUser.id) || agentsAndTLs[0];
    }
    return agentsAndTLs[0];
  };

  const defaultAgent = lead ? agentsAndTLs.find(a => a.id === lead.agentId) || agentsAndTLs[0] : getDefaultAgent();

  const [form, setForm] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    bookingDetails: lead?.bookingDetails || '',
    bookingValue: lead?.bookingValue || '',
    status: lead?.status || 'محتمل',
    agentId: defaultAgent?.id || '',
    agentName: defaultAgent?.name || '',
    teamId: defaultAgent?.teamId || '',
    notes: lead?.notes || '',
    date: lead?.date || new Date().toISOString().split('T')[0],
    destination: lead?.busType === 'VIP 30' ? 'مكة' : (lead?.destination || 'مكة'),
    busType: lead?.busType || 'سياحي 49',
    bookingType: lead?.bookingType || 'عازب',
    memberCount: lead?.memberCount || 1,
    seats: lead?.seats || [],
    stayType: lead?.busType === 'VIP 30' ? 'إقامة' : (lead?.stayType || 'إقامة'),
    makkahNights: lead?.busType === 'VIP 30' ? 2 : (lead?.makkahNights || 3),
    madinahNights: lead?.madinahNights || 0,
  });
  const [errors, setErrors] = useState({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(form.date ? new Date(form.date) : new Date());

  useEffect(() => {
    const handleOutsideClick = () => {
      setCalendarOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (form.date) {
      setViewDate(new Date(form.date));
    }
  }, [form.date]);

  const monthsArabic = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const daysOfWeek = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const getCalendarDays = () => {
    if (!viewDate) return [];
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days = [];
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        dateString: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
      });
    }
    
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      days.push({
        day: i,
        isCurrentMonth: false,
        dateString: `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }
    
    return days;
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const goToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    set('date', dateStr);
    setViewDate(today);
    setCalendarOpen(false);
  };

  const clearDate = (e) => {
    e.stopPropagation();
    set('date', '');
    setCalendarOpen(false);
  };

  const handleSelectDay = (dateStr) => {
    set('date', dateStr);
    setCalendarOpen(false);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAgentChange = (agentId) => {
    const agent = agentsAndTLs.find(a => a.id === agentId);
    if (!agent) return;
    setForm(prev => ({
      ...prev,
      agentId: agent.id,
      agentName: agent.name,
      teamId: agent.teamId || '',
    }));
  };

  const expectedTripId = form.date && form.busType ? `${form.date}_${form.busType.replace(/\s/g, '_')}` : '';
  const matchingTrip = trips.find(t => t.id === expectedTripId);
  const effectiveBusType = form.busType;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!form.phone.trim()) e.phone = 'رقم التليفون مطلوب';
    else if (!/^(05|5|\+9665|9665)[0-9]{8}$/.test(form.phone.trim())) e.phone = 'رقم غير صحيح (يجب أن يبدأ بـ 05 أو 5 أو +966 ويتكون من 9 إلى 10 أرقام)';
    if (!form.agentId) e.agentId = 'اختر الإيجنت';
    if (!form.date) e.date = 'الموعد مطلوب';
    if (form.status === 'مؤكد' && !form.bookingDetails.trim()) e.bookingDetails = 'أدخل تفاصيل الحجز';
    if (form.status === 'مؤكد' && form.seats.length === 0) e.seats = 'يجب اختيار مقاعد للعميل المؤكد';
    if (form.stayType === 'إقامة' && (!form.makkahNights || form.makkahNights < 1)) e.makkahNights = 'ليالي مكة مطلوبة (بحد أدنى 1)';

    // VIP Rules
    if (form.busType === 'VIP 30') {
      if (form.destination !== 'مكة') e.destination = 'الباص VIP متاح لمكة فقط';
      if (form.stayType !== 'إقامة') e.stayType = 'الباص VIP يتطلب إقامة فندقية فقط';
      if (form.makkahNights !== 2) e.makkahNights = 'الباص VIP يتطلب إقامة 2 ليلة (3 أيام) فقط';
      if (form.date) {
        const [y, m, d] = form.date.split('-').map(Number);
        const day = new Date(y, m - 1, d).getDay();
        if (day !== 1 && day !== 4) {
          e.date = 'رحلات VIP تخرج يوم الاثنين (عودة الأربعاء) أو الخميس (عودة السبت) فقط';
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, phone: form.phone.trim(), busType: effectiveBusType });
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lead-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lead ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            {/* Name */}
            <div className="modal-field">
              <label>الاسم *</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="اسم العميل" className={errors.name ? 'error' : ''} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            {/* Phone */}
            <div className="modal-field">
              <label>رقم التليفون *</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="05xxxxxxxx أو +9665xxxxxxxx" dir="ltr" className={errors.phone ? 'error' : ''} />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            {/* Status */}
            <div className="modal-field">
              <label>الحالة *</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="محتمل">🟡 عميل محتمل (Lead)</option>
                <option value="مهتم">🔵 عميل مهتم (Pending)</option>
                <option value="مؤكد">🟢 عميل مؤكد (Confirmed)</option>
                <option value="عميلنا">🟣 عميلنا (Our Customer)</option>
              </select>
            </div>

            {form.status === 'مؤكد' && (
              <>
                {/* Smart Trip Handling - Date & Destination Select */}
                <div className="modal-field" style={{ position: 'relative' }}>
                  <label>تاريخ الانطلاق *</label>
                  <div 
                    className={`custom-date-picker-wrapper ${errors.date ? 'error' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCalendarOpen(!calendarOpen);
                    }}
                  >
                    {(() => {
                      const { dayName, dateDetails } = getArabicFormattedDate(form.date);
                      return (
                        <div className="custom-date-card">
                          <div className="date-icon-glow">📅</div>
                          <div className="date-text-content">
                            <span className="day-name-highlight">{dayName}</span>
                            <span className="date-details-subtitle">{dateDetails}</span>
                          </div>
                          <div className="calendar-indicator">📅 تغيير</div>
                        </div>
                      );
                    })()}
                  </div>
                  {errors.date && <span className="field-error">{errors.date}</span>}

                  {calendarOpen && (
                    <div className="custom-calendar-dropdown" onClick={e => e.stopPropagation()}>
                      <div className="cal-header">
                        <button type="button" className="cal-nav-btn" onClick={prevMonth}>▶</button>
                        <span className="cal-month-year">
                          {monthsArabic[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button type="button" className="cal-nav-btn" onClick={nextMonth}>◀</button>
                      </div>

                      <div className="cal-weekdays">
                        {daysOfWeek.map(d => (
                          <div key={d} className="cal-weekday">{d}</div>
                        ))}
                      </div>

                      <div className="cal-days-grid">
                        {getCalendarDays().map((d, index) => {
                          const isSelected = form.date === d.dateString;
                          const isToday = new Date().toISOString().split('T')[0] === d.dateString;
                          return (
                            <button
                              key={index}
                              type="button"
                              className={`cal-day-cell ${d.isCurrentMonth ? 'current' : 'outside'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                              onClick={() => handleSelectDay(d.dateString)}
                            >
                              {d.day}
                            </button>
                          );
                        })}
                      </div>

                      <div className="cal-footer">
                        <button type="button" className="cal-footer-btn clear" onClick={clearDate}>مسح</button>
                        <button type="button" className="cal-footer-btn today-btn" onClick={goToday}>اليوم</button>
                      </div>
                    </div>
                  )}
                </div>

                {form.busType === 'VIP 30' && form.date && (() => {
                  const [y, m, d] = form.date.split('-').map(Number);
                  const day = new Date(y, m - 1, d).getDay();
                  if (day === 1) {
                    return (
                      <div className="trip-hint-banner full-width">
                        <span>ℹ️ رحلة الاثنين: العودة يوم الأربعاء (3 أيام)</span>
                      </div>
                    );
                  } else if (day === 4) {
                    return (
                      <div className="trip-hint-banner full-width">
                        <span>ℹ️ رحلة الخميس: العودة يوم السبت (3 أيام)</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="modal-field">
                  <label>الوجهة</label>
                  <select 
                    value={form.destination} 
                    onChange={e => set('destination', e.target.value)}
                    disabled={form.busType === 'VIP 30'}
                    className={form.busType === 'VIP 30' ? 'readonly' : ''}
                  >
                    <option value="مكة">مكة</option>
                    <option value="مكة مدينة">مكة مدينة</option>
                  </select>
                  {errors.destination && <span className="field-error">{errors.destination}</span>}
                </div>

                <div className="modal-field">
                  <label>نوع الحضور</label>
                  <select 
                    value={form.stayType} 
                    onChange={e => set('stayType', e.target.value)}
                    disabled={form.busType === 'VIP 30'}
                    className={form.busType === 'VIP 30' ? 'readonly' : ''}
                  >
                    <option value="إقامة">🏨 إقامة (فندق)</option>
                    <option value="زيارة">🚗 زيارة فقط</option>
                  </select>
                  {errors.stayType && <span className="field-error">{errors.stayType}</span>}
                </div>

                <div className="modal-field">
                  <label>عدد ليالي مكة *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.makkahNights}
                    onChange={e => set('makkahNights', parseInt(e.target.value) || 0)}
                    disabled={form.busType === 'VIP 30'}
                    className={form.busType === 'VIP 30' ? 'readonly' : (errors.makkahNights ? 'error' : '')}
                  />
                  {errors.makkahNights && <span className="field-error">{errors.makkahNights}</span>}
                </div>

                {form.destination === 'مكة مدينة' && (
                  <div className="modal-field">
                    <label>عدد ليالي المدينة</label>
                    <input
                      type="number"
                      min="0"
                      value={form.madinahNights}
                      onChange={e => set('madinahNights', parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}

                {matchingTrip ? (
                  <div className="trip-found-banner full-width">
                    <span>🔄 تم الربط برحلة موجودة لهذا اليوم ونوع الباص: <strong>{matchingTrip.name}</strong> ({matchingTrip.duration || 1} أيام)</span>
                  </div>
                ) : (
                  <div className="trip-new-banner full-width">
                    <span>🆕 سيتم إنشاء رحلة جديدة لهذا الموعد وهذا الباص.</span>
                  </div>
                )}
              </>
            )}

            {/* Agent - disabled for agent role */}
            {currentUser?.role !== 'agent' && (
              <div className="modal-field">
                <label>الإيجنت *</label>
                <select value={form.agentId} onChange={e => handleAgentChange(e.target.value)} className={errors.agentId ? 'error' : ''}>
                  <option value="">اختر الإيجنت / التيم ليدر</option>
                  {agentsAndTLs.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role === 'team_leader' ? 'TL' : 'Agent'})</option>)}
                </select>
                {errors.agentId && <span className="field-error">{errors.agentId}</span>}
              </div>
            )}



            {/* Booking details - shown for confirmed */}
            {form.status === 'مؤكد' && (
              <>
                <div className="modal-field">
                  <label>نوع الحجز</label>
                  <select value={form.bookingType} onChange={e => {
                    const val = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      bookingType: val,
                      memberCount: val === 'عازب' ? 1 : prev.memberCount,
                      seats: [] // Clear seats when type changes
                    }));
                  }}>
                    <option value="عازب">👤 عازب (فرد واحد)</option>
                    <option value="عائلة">👨‍👩‍👧‍👦 عائلة (مجموعة)</option>
                  </select>
                </div>

                {form.bookingType === 'عائلة' && (
                  <div className="modal-field">
                    <label>عدد الأفراد</label>
                    <input
                      type="number"
                      min="1"
                      value={form.memberCount}
                      onChange={e => set('memberCount', parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}

                <div className="modal-field">
                  <label>نوع الباص</label>
                  <select value={form.busType} onChange={e => {
                    const bus = e.target.value;
                    setForm(prev => {
                      const updates = { busType: bus, seats: [] };
                      if (bus === 'VIP 30') {
                        updates.destination = 'مكة';
                        updates.stayType = 'إقامة';
                        updates.makkahNights = 1; // 2 days is exactly 1 night
                      }
                      return { ...prev, ...updates };
                    });
                  }}>
                    <option value="سياحي 49">🚌 سياحي (49 كرسي)</option>
                    <option value="سياحي 51">🚌 سياحي (51 كرسي)</option>
                    <option value="VIP 30">🚐 VIP (30 كرسي)</option>
                  </select>
                </div>

                <div className="modal-field full-width">
                  <label>توزيع الكراسي (المقاعد المختارة: {form.seats.join(', ') || 'لم يتم الاختيار'})</label>
                  <div className="bus-selector-placeholder">
                    {/* We will insert the BusSelector component here */}
                    <BusSelector
                      busType={effectiveBusType}
                      selectedSeats={form.seats}
                      memberCount={form.memberCount}
                      tripId={expectedTripId}
                      currentLeadId={lead?.id}
                      onSeatsChange={seats => set('seats', seats)}
                    />
                  </div>
                  {errors.seats && <span className="field-error">{errors.seats}</span>}
                </div>

                <div className="modal-field">
                  <label>تفاصيل الحجز *</label>
                  <input type="text" value={form.bookingDetails} onChange={e => set('bookingDetails', e.target.value)} placeholder="رقم الحجز أو التفاصيل" className={errors.bookingDetails ? 'error' : ''} />
                  {errors.bookingDetails && <span className="field-error">{errors.bookingDetails}</span>}
                </div>

                {/* Booking Value - Only for Admin or Assigned Agent */}
                {(currentUser?.role === 'admin' || currentUser?.id === form.agentId) && (
                  <div className="modal-field">
                    <label>قيمة الحجز (ريال)</label>
                    <input
                      type="number"
                      value={form.bookingValue}
                      onChange={e => set('bookingValue', e.target.value)}
                      placeholder="أدخل القيمة بالريال"
                    />
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div className="modal-field full-width">
              <label>ملاحظات</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="أي ملاحظات إضافية..." rows={3} />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn-save">{lead ? '💾 حفظ التعديلات' : '+ إضافة العميل'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

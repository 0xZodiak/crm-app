import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import BusSelector from './BusSelector';
import './LeadModal.css';

const DEMO_USERS_IMPORT = [
  { id: 'tl1', name: 'محمد سالم', role: 'team_leader', teamId: 'team1' },
  { id: 'tl2', name: 'سارة أحمد', role: 'team_leader', teamId: 'team2' },
  { id: 'agent1', name: 'خالد عمر', role: 'agent', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent2', name: 'نور حسن', role: 'agent', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent3', name: 'ريم علي', role: 'agent', teamId: 'team2', teamLeaderId: 'tl2' },
  { id: 'agent4', name: 'يوسف كمال', role: 'agent', teamId: 'team2', teamLeaderId: 'tl2' },
];

export default function LeadModal({ lead, users, currentUser, onSave, onClose }) {
  const { trips } = useData();
  const agentsAndTLs = users ? users.filter(u => u.role === 'agent' || u.role === 'team_leader') : DEMO_USERS_IMPORT.filter(u => u.role === 'agent' || u.role === 'team_leader');
  const teamLeaders = users ? users.filter(u => u.role === 'team_leader') : DEMO_USERS_IMPORT.filter(u => u.role === 'team_leader');

  const getDefaultAgent = () => {
    if (currentUser?.role === 'agent' || currentUser?.role === 'team_leader') {
      return agentsAndTLs.find(a => a.id === currentUser.id) || agentsAndTLs[0];
    }
    return agentsAndTLs[0];
  };

  const defaultAgent = lead ? agentsAndTLs.find(a => a.id === lead.agentId) || agentsAndTLs[0] : getDefaultAgent();
  const defaultTL = lead
    ? teamLeaders.find(t => t.id === lead.teamLeaderId) || teamLeaders[0]
    : teamLeaders.find(t => t.id === defaultAgent?.teamLeaderId) || teamLeaders[0];

  const [form, setForm] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    campaignDate: lead?.campaignDate || new Date().toISOString().split('T')[0],
    campaign: lead?.campaign || '',
    bookingDetails: lead?.bookingDetails || '',
    bookingValue: lead?.bookingValue || '',
    status: lead?.status || 'محتمل',
    agentId: defaultAgent?.id || '',
    agentName: defaultAgent?.name || '',
    teamLeaderId: defaultTL?.id || '',
    teamLeaderName: defaultTL?.name || '',
    teamId: defaultAgent?.teamId || defaultTL?.teamId || '',
    notes: lead?.notes || '',
    date: lead?.date || new Date().toISOString().split('T')[0],
    destination: lead?.destination || 'مكة',
    busType: lead?.busType || 'سياحي 49',
    bookingType: lead?.bookingType || 'عازب',
    memberCount: lead?.memberCount || 1,
    seats: lead?.seats || [],
    stayType: lead?.stayType || 'إقامة',
    makkahNights: lead?.makkahNights || 3,
    madinahNights: lead?.madinahNights || 0,
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleAgentChange = (agentId) => {
    const agent = agentsAndTLs.find(a => a.id === agentId);
    if (!agent) return;
    const tl = agent.role === 'team_leader' ? agent : teamLeaders.find(t => t.id === agent.teamLeaderId);
    setForm(prev => ({
      ...prev,
      agentId: agent.id,
      agentName: agent.name,
      teamLeaderId: tl?.id || '',
      teamLeaderName: tl?.name || '',
      teamId: agent.teamId || '',
    }));
  };

  const matchingTrip = trips.find(t => t.date.startsWith(form.date) && t.busType === form.busType);
  const effectiveBusType = form.busType;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!form.phone.trim()) e.phone = 'رقم التليفون مطلوب';
    else if (!/^0[0-9]{10}$/.test(form.phone.trim())) e.phone = 'رقم غير صحيح (11 رقم يبدأ بـ 0)';
    if (!form.agentId) e.agentId = 'اختر الإيجنت';
    if (!form.date) e.date = 'الموعد مطلوب';
    if (form.status === 'مؤكد' && !form.bookingDetails.trim()) e.bookingDetails = 'أدخل تفاصيل الحجز';
    if (form.status === 'مؤكد' && form.seats.length === 0) e.seats = 'يجب اختيار مقاعد للعميل المؤكد';
    if (form.stayType === 'إقامة' && (!form.makkahNights || form.makkahNights < 1)) e.makkahNights = 'ليالي مكة مطلوبة (بحد أدنى 1)';

    // VIP Rules
    if (form.busType === 'VIP 30') {
      if (form.destination !== 'مكة') e.destination = 'الباص VIP متاح لمكة فقط';
      const day = new Date(form.date).getDay();
      if (day !== 1 && day !== 4) e.date = 'باص VIP يخرج يومي الاثنين والخميس فقط';
      if (form.days !== 3) e.days = 'رحلة الباص VIP 3 أيام فقط، لا أقل ولا أكثر';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, phone: form.phone.trim(), busType: effectiveBusType });
  };

  const campaigns = ['انطلاق رمضان', 'انطلاق الصيف', 'انطلاق نهاية العام', 'انطلاق الربيع', 'انطلاق آخر'];

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
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" className={errors.phone ? 'error' : ''} />
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

            {/* Smart Trip Handling - Date & Destination Select */}
            <div className="modal-field">
              <label>تاريخ الانطلاق *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </div>

            <div className="modal-field">
              <label>الوجهة</label>
              <select value={form.destination} onChange={e => set('destination', e.target.value)}>
                <option value="مكة">مكة</option>
                <option value="مكة مدينة">مكة مدينة</option>
              </select>
            </div>

            <div className="modal-field">
              <label>نوع الحضور</label>
              <select value={form.stayType} onChange={e => set('stayType', e.target.value)}>
                <option value="إقامة">🏨 إقامة (فندق)</option>
                <option value="زيارة">🚗 زيارة فقط</option>
              </select>
            </div>

            <div className="modal-field">
              <label>عدد ليالي مكة *</label>
              <input
                type="number"
                min="1"
                value={form.makkahNights}
                onChange={e => set('makkahNights', parseInt(e.target.value) || 0)}
                className={errors.makkahNights ? 'error' : ''}
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

            {/* TL - read only */}
            <div className="modal-field">
              <label>التيم ليدر</label>
              <input type="text" value={form.teamLeaderName} readOnly className="readonly" placeholder="يتحدد تلقائياً" />
            </div>

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
                    setForm(prev => ({ ...prev, busType: e.target.value, seats: [] }));
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
                      tripId={matchingTrip?.id || 'new-trip-placeholder'}
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

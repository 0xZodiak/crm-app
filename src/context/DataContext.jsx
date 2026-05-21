import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, updateDoc, deleteDoc,
  doc, serverTimestamp, runTransaction, query, where, getDocs, setDoc, deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [leads,         setLeads]         = useState([]);
  const [trips,         setTrips]         = useState([]);
  const [users,         setUsers]         = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [globalDateFrom, setGlobalDateFrom] = useState('');
  const [globalDateTo,   setGlobalDateTo]   = useState('');

  // الـ notifications تفضل في localStorage لأنها UX محلي فقط
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem('crm_notifications');
    if (stored) { try { return JSON.parse(stored); } catch { return []; } }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('crm_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // ─── Real-time Firestore Listeners ────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setLeads([]);
      setTrips([]);
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 3) setIsLoading(false); };

    const unsubLeads = onSnapshot(collection(db, 'leads'), 
      (snap) => { setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      (err) => { console.error('leads listener error:', err); done(); }
    );

    const unsubTrips = onSnapshot(collection(db, 'trips'), 
      (snap) => { setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      (err) => { console.error('trips listener error:', err); done(); }
    );

    const unsubUsers = onSnapshot(collection(db, 'users'), 
      (snap) => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      (err) => { console.error('users listener error:', err); done(); }
    );

    const fallback = setTimeout(() => setIsLoading(false), 10000);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => { unsubLeads(); unsubTrips(); unsubUsers(); clearTimeout(fallback); };
  }, [currentUser]);

  // ─── Automations: Trip Completion & Reminders ────────────────────────────
  const leadsRef = useRef(leads);
  const tripsRef = useRef(trips);
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  useEffect(() => { tripsRef.current = trips; }, [trips]);

  useEffect(() => {
    if (isLoading) return;

    const runAutomations = async () => {
      const now      = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentLeads = leadsRef.current;
      const currentTrips = tripsRef.current;

      // Automated daily backup
      if (localStorage.getItem('crm_last_backup') !== todayStr) {
        try {
          const data = JSON.stringify({ leads: currentLeads, trips: currentTrips, version: 'v1_firestore' }, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `crm_backup_${todayStr}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          localStorage.setItem('crm_last_backup', todayStr);
        } catch (error) {
          console.error("Backup failed", error);
        }
      }

      // Trip completion + 24h reminders
      for (const trip of currentTrips) {
        const tripDate      = new Date(trip.date);
        const completionDate = new Date(tripDate.getTime() + (trip.duration || 1) * 86400000);

        // 24-hour pre-trip notification
        if (trip.status === 'Upcoming') {
          const hoursLeft = (tripDate - now) / 3600000;
          if (hoursLeft > 0 && hoursLeft <= 24) {
            const notifId = `notif_24h_${trip.id}`;
            setNotifications(prev => {
              if (prev.find(n => n.id === notifId)) return prev;
              const confirmed    = currentLeads.filter(l => l.tripId === trip.id && l.status === 'مؤكد');
              const capacity     = trip.busType === 'VIP 30' ? 30 : trip.busType === 'سياحي 51' ? 51 : 49;
              const remaining    = capacity - confirmed.reduce((a, l) => a + (l.seats?.length || 0), 0);
              const message      = `تذكير: رحلة ${trip.name} (${trip.busType}) ستنطلق خلال 24 ساعة. الركاب: ${confirmed.length}. المقاعد المتبقية: ${remaining}.`;
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('تذكير انطلاق رحلة', { body: message });
              }
              return [{ id: notifId, tripId: trip.id, message, createdAt: now.toISOString(), read: false, type: 'reminder' }, ...prev];
            });
          }
        }

        // 24-hour pre-return notification (before the trip comes back)
        if (trip.status === 'Upcoming' || trip.status === 'Active') {
          const hoursUntilReturn = (completionDate - now) / 3600000;
          if (hoursUntilReturn > 0 && hoursUntilReturn <= 24) {
            const returnNotifId = `notif_return_24h_${trip.id}`;
            setNotifications(prev => {
              if (prev.find(n => n.id === returnNotifId)) return prev;
              const confirmed    = currentLeads.filter(l => l.tripId === trip.id && (l.status === 'مؤكد' || l.status === 'عميلنا'));
              const message      = `تذكير: رحلة ${trip.name} (${trip.busType}) ستعود خلال 24 ساعة. يرجى المتابعة وتأكيد سلامة وصول الركاب (${confirmed.length} ركاب).`;
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('تذكير عودة رحلة', { body: message });
              }
              return [{ id: returnNotifId, tripId: trip.id, message, createdAt: now.toISOString(), read: false, type: 'return' }, ...prev];
            });
          }
        }

        // Auto-archive trips whose departure date has passed by more than 3 days
        const threeDaysAfterDeparture = new Date(tripDate.getTime() + 3 * 86400000);
        if (now > threeDaysAfterDeparture && trip.status !== 'Completed' && trip.status !== 'Cancelled') {
          await updateTrip(trip.id, { status: 'Completed' });
          const confirmed = currentLeads.filter(l => l.tripId === trip.id && l.status === 'مؤكد');
          for (const lead of confirmed) {
            await updateDoc(doc(db, 'leads', lead.id), { status: 'عميلنا' });
          }
        }

        // Auto-complete trip after end date
        if (now > completionDate) {
          if (trip.status === 'Upcoming' && trip.autoComplete) {
            await updateTrip(trip.id, { status: 'Completed' });
          }
          // Automatically transition confirmed leads on past trips to "عميلنا"
          const confirmed = currentLeads.filter(l => l.tripId === trip.id && l.status === 'مؤكد');
          for (const lead of confirmed) {
            await updateDoc(doc(db, 'leads', lead.id), { status: 'عميلنا' });
          }
        } else if (now > tripDate && now < completionDate && trip.status === 'Upcoming' && trip.autoComplete) {
          await updateTrip(trip.id, { status: 'Active' });
        }
      }
    };

    // Call immediately
    runAutomations();

    // Then set interval
    const timer = setInterval(runAutomations, 60000);

    return () => clearInterval(timer);
  }, [isLoading]);

  // ─── Trip helpers ─────────────────────────────────────────────────────────

  const addTrip = async (trip) => {
    const { id: _, ...data } = trip;
    const dayDate = data.date.split('T')[0];
    const tripId = `${dayDate}_${data.busType.replace(/\s/g, '_')}`;
    await setDoc(doc(db, 'trips', tripId), { ...data, createdAt: serverTimestamp() }, { merge: true });
    return tripId;
  };

  const updateTrip = async (id, updates) => {
    const { id: _, ...data } = updates;
    await updateDoc(doc(db, 'trips', id), data);
  };

  const deleteTrip = async (id) => {
    const confirmed = leads.filter(l => l.tripId === id && l.status === 'مؤكد');
    if (confirmed.length > 0) {
      throw new Error(`لا يمكن حذف هذه الرحلة لوجود ${confirmed.length} حجوزات مؤكدة عليها. يجب إلغاء الحجوزات أولاً.`);
    }
    await deleteDoc(doc(db, 'trips', id));
    // إلغاء ربط الـ leads غير المؤكدة
    const others = leads.filter(l => l.tripId === id);
    for (const l of others) {
      await updateDoc(doc(db, 'leads', l.id), { tripId: null });
    }
  };

  // ابحث عن رحلة بنفس اليوم والباص أو أنشئ واحدة جديدة
  const findOrCreateTrip = async (fullDate, destination, busType = 'سياحي 49') => {
    const dayDate = fullDate.split('T')[0];
    const tripId = `${dayDate}_${busType.replace(/\s/g, '_')}`;

    const newTrip = {
      name:        `${destination} - ${dayDate}`,
      date:        `${dayDate}T00:00`,
      destination: busType === 'VIP 30' ? 'مكة' : (destination || 'مكة'),
      busType,
      status:      'Upcoming',
      duration:    3,
      autoComplete: true,
      createdAt:   serverTimestamp(),
    };
    await setDoc(doc(db, 'trips', tripId), newTrip, { merge: true });
    return tripId;
  };

  // ─── Lead helpers ─────────────────────────────────────────────────────────

  const addLead = async (leadData) => {
    let tripId = null;

    if (leadData.status === 'مؤكد' || leadData.status === 'عميلنا') {
      tripId = await findOrCreateTrip(leadData.date, leadData.destination, leadData.busType);
    } else {
      delete leadData.destination;
      delete leadData.stayType;
      delete leadData.makkahNights;
      delete leadData.madinahNights;
      delete leadData.bookingType;
      delete leadData.memberCount;
      delete leadData.busType;
      delete leadData.seats;
      delete leadData.bookingDetails;
      delete leadData.bookingValue;
    }

    const { id: _, ...data } = leadData;

    await runTransaction(db, async (transaction) => {
      if (leadData.status === 'مؤكد' && leadData.seats && leadData.seats.length > 0) {
        const q = query(collection(db, 'leads'), where('tripId', '==', tripId), where('status', '==', 'مؤكد'));
        const snapshot = await getDocs(q);
        const bookedSeats = snapshot.docs.reduce((a, d) => [...a, ...(d.data().seats || [])], []);
        if (leadData.seats.some(s => bookedSeats.includes(s))) {
          throw new Error('عذراً، بعض المقاعد المختارة تم حجزها بالفعل في هذه الرحلة.');
        }
      }

      const newLeadRef = doc(collection(db, 'leads'));
      transaction.set(newLeadRef, {
        ...data,
        tripId,
        addedDate:  new Date().toISOString().split('T')[0],
        createdAt:  serverTimestamp(),
      });
    });
  };

  const updateLead = async (id, updates) => {
    const oldLead    = leads.find(l => l.id === id);
    const newLead    = { ...oldLead, ...updates };
    let tripId       = newLead.tripId || oldLead.tripId || null;

    if (newLead.status === 'مؤكد' || newLead.status === 'عميلنا') {
      if (!tripId) {
        tripId = await findOrCreateTrip(
          newLead.date        || oldLead.date,
          newLead.destination || oldLead.destination,
          newLead.busType     || oldLead.busType,
        );
      }
    } else {
      newLead.destination = deleteField();
      newLead.stayType = deleteField();
      newLead.makkahNights = deleteField();
      newLead.madinahNights = deleteField();
      newLead.bookingType = deleteField();
      newLead.memberCount = deleteField();
      newLead.busType = deleteField();
      newLead.seats = deleteField();
      newLead.bookingDetails = deleteField();
      newLead.bookingValue = deleteField();
      tripId = null;
    }

    newLead.tripId = tripId;
    const { id: _, ...data } = newLead;

    await runTransaction(db, async (transaction) => {
      if (newLead.status === 'مؤكد' && newLead.seats && newLead.seats.length > 0) {
        const q = query(collection(db, 'leads'), where('tripId', '==', tripId), where('status', '==', 'مؤكد'));
        const snapshot = await getDocs(q);
        const others = snapshot.docs.filter(d => d.id !== id);
        const bookedSeats = others.reduce((a, d) => [...a, ...(d.data().seats || [])], []);
        if (newLead.seats.some(s => bookedSeats.includes(s))) {
          throw new Error('عذراً، بعض المقاعد المختارة تم حجزها بالفعل من قبل مستخدم آخر.');
        }
      }
      transaction.update(doc(db, 'leads', id), data);
    });
  };

  const deleteLead = async (id) => {
    await deleteDoc(doc(db, 'leads', id));
  };

  // ─── Filters & Stats (كلها تعمل على الـ local state من الـ Firestore) ───

  // وظيفة مساعدة لتوحيد تنسيق التاريخ إلى YYYY-MM-DD للمقارنة الصحيحة
  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return null;
    // إذا كان التنسيق YYYY-MM-DD (الافتراضي من input type="date")
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
    // إذا كان التنسيق MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
      const [m, d, y] = dateStr.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {
      // Ignore invalid date parsing
    }
    return dateStr;
  };

  const getFilteredLeads = (filters, currentUser) => {
    let filtered = [...leads];

    // Sort leads chronologically (oldest first / FIFO)
    const getLeadTime = (lead) => {
      if (lead.createdAt) {
        if (typeof lead.createdAt.toMillis === 'function') return lead.createdAt.toMillis();
        if (lead.createdAt.seconds) return lead.createdAt.seconds * 1000;
        const t = new Date(lead.createdAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (lead.addedDate) {
        const t = new Date(lead.addedDate).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };
    filtered.sort((a, b) => getLeadTime(b) - getLeadTime(a));

    if (currentUser.role === 'agent') {
      filtered = filtered.filter(l => l.agentId === currentUser.id);
    } else if (currentUser.role === 'team_leader') {
      filtered = filtered.filter(l => l.teamId === currentUser.teamId);
    }

    // الفلترة بنظام الشهر واليوم (تاريخ الرحلة/الموعد هو الأساس)
    const filterMonth = filters.month; // التنسيق المتوقع: YYYY-MM
    const filterDay   = filters.day;   // التنسيق المتوقع: رقم اليوم (مثلاً 5)

    if (filterMonth) {
      filtered = filtered.filter(l => {
        const tripDate = normalizeDate(l.date); // "YYYY-MM-DD"
        if (!tripDate) return false;
        
        const [y, m, d] = tripDate.split('-');
        const monthMatch = `${y}-${m}` === filterMonth;
        
        if (filterDay) {
          return monthMatch && parseInt(d) === parseInt(filterDay);
        }
        return monthMatch;
      });
    } else if (globalDateFrom || globalDateTo) {
      // الاحتفاظ بالفلتر العالمي كخيار احتياطي إذا لم يتم اختيار شهر محدد
      const dFrom = normalizeDate(globalDateFrom);
      const dTo   = normalizeDate(globalDateTo);
      filtered = filtered.filter(l => {
        const aDate = normalizeDate(l.addedDate);
        const tDate = normalizeDate(l.date);
        const matchFrom = (!dFrom) || (aDate && aDate >= dFrom) || (tDate && tDate >= dFrom);
        const matchTo   = (!dTo)   || (aDate && aDate <= dTo)   || (tDate && tDate <= dTo);
        return matchFrom && matchTo;
      });
    }

    if (filters.status)  filtered = filtered.filter(l => l.status === filters.status);
    if (filters.agentId) filtered = filtered.filter(l => l.agentId === filters.agentId);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(q) || l.phone.includes(q),
      );
    }
    return filtered;
  };


  const getAgentStats = (agentId) => {
    let agentLeads = leads.filter(l => l.agentId === agentId);
    const dFrom = normalizeDate(globalDateFrom);
    const dTo   = normalizeDate(globalDateTo);

    if (dFrom) agentLeads = agentLeads.filter(l => normalizeDate(l.addedDate) >= dFrom);
    if (dTo)   agentLeads = agentLeads.filter(l => normalizeDate(l.addedDate) <= dTo);

    const bookings = agentLeads.filter(l => l.status === 'مؤكد' || l.status === 'عميلنا').length;
    const TARGET   = 150;
    const progress = (bookings / TARGET) * 100;
    const commission = bookings > TARGET ? (bookings - TARGET) * 20 : 0;

    let progressColor = '#ef4444';
    if (progress >= 110) progressColor = '#8b5cf6';
    else if (progress >= 100) progressColor = '#22c55e';
    else if (progress >= 50)  progressColor = '#eab308';

    return { total: agentLeads.length, bookings, target: TARGET, progress: Math.round(progress * 10) / 10, commission, progressColor, leads: agentLeads };
  };

  const getTeamLeaderStats = (tlId) => {
    const tlAgents = users.filter(u => u.teamLeaderId === tlId || u.id === tlId).map(u => u.id);
    let tlLeads = leads.filter(l => tlAgents.includes(l.agentId));
    const dFrom = normalizeDate(globalDateFrom);
    const dTo   = normalizeDate(globalDateTo);

    if (dFrom) tlLeads = tlLeads.filter(l => normalizeDate(l.addedDate) >= dFrom);
    if (dTo)   tlLeads = tlLeads.filter(l => normalizeDate(l.addedDate) <= dTo);

    const bookings    = tlLeads.filter(l => l.status === 'مؤكد' || l.status === 'عميلنا').length;
    const TARGET      = 200;
    const directLeads = tlLeads.filter(l => l.agentId === tlId);

    return { total: tlLeads.length, bookings, target: TARGET, progress: Math.round((bookings / TARGET) * 1000) / 10, directLeads };
  };


  const getRanking = () => {
    const agents = users.filter(u => u.role === 'agent' || u.role === 'team_leader');
    return agents
      .map(agent => ({ ...agent, ...getAgentStats(agent.id) }))
      .sort((a, b) => b.bookings - a.bookings)
      .map((agent, i) => ({ ...agent, rank: i + 1, bonus: [500, 300, 200][i] || 0 }));
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <DataContext.Provider value={{
      leads, users, trips,
      addLead, updateLead, deleteLead,
      addTrip, updateTrip, deleteTrip,
      getFilteredLeads, getAgentStats, getTeamLeaderStats, getRanking,
      globalDateFrom, setGlobalDateFrom,
      globalDateTo,   setGlobalDateTo,
      isLoading, notifications, markNotificationRead,
      normalizeDate,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

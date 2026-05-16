import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
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
    if (stored) { try { return JSON.parse(stored); } catch (e) { return []; } }
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

    const unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    });

    const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      done();
    });

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => { unsubLeads(); unsubTrips(); unsubUsers(); };
  }, [currentUser]);

  // ─── Automations: Trip Completion & Reminders ────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    const runAutomations = async () => {
      const now      = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Automated daily backup
      if (localStorage.getItem('crm_last_backup') !== todayStr) {
        try {
          const data = JSON.stringify({ leads, trips, version: 'v1_firestore' }, null, 2);
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
      for (const trip of trips) {
        const tripDate      = new Date(trip.date);
        const completionDate = new Date(tripDate.getTime() + (trip.duration || 1) * 86400000);

        // 24-hour pre-trip notification
        if (trip.status === 'Upcoming') {
          const hoursLeft = (tripDate - now) / 3600000;
          if (hoursLeft > 0 && hoursLeft <= 24) {
            const notifId = `notif_24h_${trip.id}`;
            setNotifications(prev => {
              if (prev.find(n => n.id === notifId)) return prev;
              const confirmed    = leads.filter(l => l.tripId === trip.id && l.status === 'مؤكد');
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

        if (!trip.autoComplete) continue;

        // Auto-complete trip after end date
        if (now > completionDate && trip.status === 'Upcoming') {
          await updateDoc(doc(db, 'trips', trip.id), { status: 'Completed' });
          const confirmed = leads.filter(l => l.tripId === trip.id && l.status === 'مؤكد');
          for (const lead of confirmed) {
            await updateDoc(doc(db, 'leads', lead.id), { status: 'عميلنا' });
          }
        } else if (now > tripDate && now < completionDate && trip.status === 'Upcoming') {
          await updateDoc(doc(db, 'trips', trip.id), { status: 'Active' });
        }
      }
    };

    // Call immediately
    runAutomations();

    // Then set interval
    const timer = setInterval(runAutomations, 60000);

    return () => clearInterval(timer);
  }, [isLoading, leads, trips]);

  // ─── Trip helpers ─────────────────────────────────────────────────────────

  const addTrip = async (trip) => {
    const { id: _, ...data } = trip;
    const ref = await addDoc(collection(db, 'trips'), { ...data, createdAt: serverTimestamp() });
    return ref.id;
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
    const existing = trips.find(t => t.date.startsWith(dayDate) && t.busType === busType);
    if (existing) return existing.id;

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
    const ref = await addDoc(collection(db, 'trips'), newTrip);
    return ref.id;
  };

  // ─── Lead helpers ─────────────────────────────────────────────────────────

  const addLead = async (leadData) => {
    const tripId = await findOrCreateTrip(leadData.date, leadData.destination, leadData.busType);

    // فحص تعارض المقاعد
    const tripLeads   = leads.filter(l => l.tripId === tripId && l.status === 'مؤكد');
    const bookedSeats = tripLeads.reduce((a, l) => [...a, ...(l.seats || [])], []);
    if (leadData.status === 'مؤكد' && leadData.seats.some(s => bookedSeats.includes(s))) {
      throw new Error('عذراً، بعض المقاعد المختارة تم حجزها بالفعل في هذه الرحلة.');
    }

    const { id: _, ...data } = leadData;
    await addDoc(collection(db, 'leads'), {
      ...data,
      tripId,
      addedDate:  new Date().toISOString().split('T')[0],
      createdAt:  serverTimestamp(),
    });
  };

  const updateLead = async (id, updates) => {
    const oldLead    = leads.find(l => l.id === id);
    const newLead    = { ...oldLead, ...updates };
    const tripId     = await findOrCreateTrip(
      newLead.date        || oldLead.date,
      newLead.destination || oldLead.destination,
      newLead.busType     || oldLead.busType,
    );
    newLead.tripId = tripId;

    if (newLead.status === 'مؤكد') {
      const others      = leads.filter(l => l.id !== id && l.tripId === tripId && l.status === 'مؤكد');
      const bookedSeats = others.reduce((a, l) => [...a, ...(l.seats || [])], []);
      if (newLead.seats.some(s => bookedSeats.includes(s))) {
        throw new Error('عذراً، بعض المقاعد المختارة تم حجزها بالفعل من قبل مستخدم آخر.');
      }
    }

    const { id: _, ...data } = newLead;
    await updateDoc(doc(db, 'leads', id), data);
  };

  const deleteLead = async (id) => {
    await deleteDoc(doc(db, 'leads', id));
  };

  // ─── Filters & Stats (كلها تعمل على الـ local state من الـ Firestore) ───

  const getFilteredLeads = (filters, currentUser) => {
    let filtered = [...leads];

    if (currentUser.role === 'agent') {
      filtered = filtered.filter(l => l.agentId === currentUser.id);
    } else if (currentUser.role === 'team_leader') {
      filtered = filtered.filter(l => l.teamId === currentUser.teamId);
    }

    if (globalDateFrom) filtered = filtered.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   filtered = filtered.filter(l => l.addedDate <= globalDateTo);
    if (filters.status)  filtered = filtered.filter(l => l.status === filters.status);
    if (filters.agentId) filtered = filtered.filter(l => l.agentId === filters.agentId);
    if (filters.dateFrom) filtered = filtered.filter(l => l.addedDate >= filters.dateFrom);
    if (filters.dateTo)   filtered = filtered.filter(l => l.addedDate <= filters.dateTo);
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
    if (globalDateFrom) agentLeads = agentLeads.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   agentLeads = agentLeads.filter(l => l.addedDate <= globalDateTo);

    const bookings = agentLeads.filter(l => l.status === 'مؤكد').length;
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
    let tlLeads = leads.filter(l => l.teamLeaderId === tlId);
    if (globalDateFrom) tlLeads = tlLeads.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   tlLeads = tlLeads.filter(l => l.addedDate <= globalDateTo);

    const bookings    = tlLeads.filter(l => l.status === 'مؤكد').length;
    const TARGET      = 200;
    const directLeads = tlLeads.filter(l => l.agentId === tlId);

    return { total: tlLeads.length, bookings, target: TARGET, progress: Math.round((bookings / TARGET) * 1000) / 10, directLeads };
  };

  const getRanking = () => {
    const agents = users.filter(u => u.role === 'agent');
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
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

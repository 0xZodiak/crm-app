import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_USERS } from './AuthContext';

const DataContext = createContext(null);

// Generate demo leads data
const generateDemoLeads = () => {
  const agents = DEMO_USERS.filter(u => u.role === 'agent');
  const teamLeaders = DEMO_USERS.filter(u => u.role === 'team_leader');

  const leads = [];
  const names = [
    'أحمد محمد', 'فاطمة علي', 'محمود إبراهيم', 'سمر خالد', 'عمر يوسف',
    'هند سالم', 'كريم عبدالله', 'لمى ناصر', 'طارق حسن', 'رنا أحمد',
    'بلال عمر', 'دينا فتحي', 'وليد مصطفى', 'إيمان حسين', 'سعيد قاسم',
    'منى عادل', 'شريف محمود', 'أسماء نادر', 'مازن سمير', 'هالة رمزي',
    'تامر صالح', 'رانيا جمال', 'أيمن وليد', 'نادية كمال', 'حسام فاروق',
    'غادة ثابت', 'محمد رضا', 'سحر توفيق', 'عادل زكي', 'ميار عزت',
    'إسلام بكر', 'شيماء حمدي', 'يحيى شكري', 'ولاء مجدي', 'خيري لطفي',
    'منار عصام', 'حازم رشاد', 'إسراء نبيل', 'جمال سيد', 'مروة حسن',
    'عصام الدين', 'نرمين أنور', 'صلاح جابر', 'هيام ممدوح', 'معتز عاطف',
    'أميرة فريد', 'محسن عبدالعزيز', 'شروق طلعت', 'ياسر حافظ', 'إلهام بسيوني',
  ];

  const phones = ['010', '011', '012', '015'];
  let id = 1;

  const demoTrips = [
    { 
      id: 'trip_1', 
      name: 'مكة', 
      date: '2026-06-01T08:00', 
      destination: 'مكة',
      busType: 'سياحي 49', 
      status: 'Upcoming',
      duration: 5,
      autoComplete: true 
    },
    { 
      id: 'trip_2', 
      name: 'مكة مدينة', 
      date: '2026-07-15T06:00', 
      destination: 'مكة مدينة',
      busType: 'سياحي 51', 
      status: 'Upcoming',
      duration: 7,
      autoComplete: true 
    },
    { 
      id: 'trip_3', 
      name: 'مكة (VIP)', 
      date: '2026-12-20T22:00', 
      destination: 'مكة',
      busType: 'سياحي 49', 
      status: 'Upcoming',
      duration: 5,
      autoComplete: true 
    },
    { 
      id: 'trip_4', 
      name: 'مكة مدينة (VIP)', 
      date: '2026-04-10T10:00', 
      destination: 'مكة مدينة',
      busType: 'VIP 30', 
      status: 'Completed',
      duration: 7,
      autoComplete: true 
    },
  ];

  for (let i = 0; i < 50; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const tl = teamLeaders.find(t => t.id === agent.teamLeaderId) || teamLeaders[0];
    const daysAgo = Math.floor(Math.random() * 90);
    const addedDate = new Date();
    addedDate.setDate(addedDate.getDate() - daysAgo);
    
    const trip = demoTrips[Math.floor(Math.random() * demoTrips.length)];

    const statusWeights = [0.35, 0.35, 0.30];
    const rand = Math.random();
    let status;
    if (rand < statusWeights[0]) status = 'محتمل';
    else if (rand < statusWeights[0] + statusWeights[1]) status = 'مهتم';
    else status = 'مؤكد';

    leads.push({
      id: `lead_${id++}`,
      name: names[i] || `عميل ${i + 1}`,
      phone: `${phones[Math.floor(Math.random() * phones.length)]}${Math.floor(Math.random() * 900000000 + 100000000)}`,
      bookingDetails: status === 'مؤكد' ? `حجز رقم #${Math.floor(Math.random() * 9000 + 1000)}` : '',
      bookingValue: status === 'مؤكد' ? Math.floor(Math.random() * 5000 + 1000) : '',
      status,
      agentId: agent.id,
      agentName: agent.name,
      teamLeaderId: tl.id,
      teamLeaderName: tl.name,
      teamId: tl.teamId,
      addedDate: addedDate.toISOString().split('T')[0],
      tripId: trip.id, // Explicit linking
      campaignDate: trip.date.split('T')[0], // Kept for display/legacy
      notes: '',
      bookingType: 'عازب',
      memberCount: 1,
      seats: status === 'مؤكد' ? [Math.floor(Math.random() * 30) + 1] : [],
    });
  }
  return { leads, trips: demoTrips };
};

const DATA_VERSION = 'v8_realtime_ready';

const { leads: INITIAL_LEADS, trips: INITIAL_TRIPS } = generateDemoLeads();

export function DataProvider({ children }) {
  const [leads, setLeads] = useState(() => {
    const version = localStorage.getItem('crm_data_version');
    if (version !== DATA_VERSION) {
      // Wipe old data when users change
      localStorage.removeItem('crm_leads');
      localStorage.setItem('crm_data_version', DATA_VERSION);
      return INITIAL_LEADS;
    }
    const stored = localStorage.getItem('crm_leads');
    if (stored) {
      try { return JSON.parse(stored); }
      catch (e) { return INITIAL_LEADS; }
    }
    return INITIAL_LEADS;
  });

  const [trips, setTrips] = useState(() => {
    const stored = localStorage.getItem('crm_trips');
    if (stored) {
      try { return JSON.parse(stored); }
      catch (e) { return INITIAL_TRIPS; }
    }
    return INITIAL_TRIPS;
  });

  const [users] = useState(DEMO_USERS);
  const [globalDateFrom, setGlobalDateFrom] = useState('');
  const [globalDateTo, setGlobalDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem('crm_notifications');
    if (stored) {
      try { return JSON.parse(stored); } catch(e) { return []; }
    }
    return [];
  });

  useEffect(() => {
    // Simulate real-time backend initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Request browser notifications permission
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('crm_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('crm_trips', JSON.stringify(trips));
  }, [trips]);

  // Auto-status logic & Automations
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // 1. Automated Local Backup
      const lastBackup = localStorage.getItem('crm_last_backup');
      if (lastBackup !== todayStr) {
        const backupData = {
          leads: JSON.parse(localStorage.getItem('crm_leads') || '[]'),
          trips: JSON.parse(localStorage.getItem('crm_trips') || '[]'),
          version: DATA_VERSION
        };
        fetch('http://localhost:4000/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData)
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            localStorage.setItem('crm_last_backup', todayStr);
            console.log('Automated local backup completed:', data.file);
          }
        })
        .catch(err => console.log('Automated backup skipped (server not reachable).'));
      }

      // 2. Trips Automations (Completion & Reminders)
      setTrips(prevTrips => prevTrips.map(trip => {
        const tripDate = new Date(trip.date);
        const durationDays = trip.duration || 1;
        const completionDate = new Date(tripDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        
        // --- PRE-TRIP REMINDER NOTIFICATION (24 HOURS) ---
        if (trip.status === 'Upcoming') {
          const hoursDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursDiff > 0 && hoursDiff <= 24) {
            const notifId = `notif_24h_${trip.id}`;
            setNotifications(prevNotifs => {
              if (!prevNotifs.find(n => n.id === notifId)) {
                // We need the leads count, getting from localStorage directly to avoid stale state in interval
                const allLeads = JSON.parse(localStorage.getItem('crm_leads') || '[]');
                const tripLeads = allLeads.filter(l => l.tripId === trip.id && l.status === 'مؤكد');
                const busCapacity = trip.busType === 'VIP 30' ? 30 : trip.busType === 'سياحي 51' ? 51 : 49;
                const remainingSeats = busCapacity - tripLeads.reduce((acc, l) => acc + (l.seats?.length || 0), 0);
                
                const message = `تذكير: رحلة ${trip.name} (${trip.busType}) ستنطلق خلال 24 ساعة. الركاب: ${tripLeads.length}. المقاعد المتبقية: ${remainingSeats}. يرجى المتابعة.`;
                
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('تذكير انطلاق رحلة', { body: message });
                }
                
                return [{ id: notifId, tripId: trip.id, message, createdAt: now.toISOString(), read: false, type: 'reminder' }, ...prevNotifs];
              }
              return prevNotifs;
            });
          }
        }

        // --- AUTOMATIC COMPLETION ---
        if (!trip.autoComplete) return trip;
        
        if (now > completionDate && trip.status === 'Upcoming') {
          const updatedTrip = { ...trip, status: 'Completed' };
          setLeads(prevLeads => prevLeads.map(lead => {
            if (lead.tripId === trip.id && lead.status === 'مؤكد') {
              return { ...lead, status: 'عميلنا' };
            }
            return lead;
          }));
          return updatedTrip;
        }
        
        if (now > tripDate && now < completionDate && trip.status === 'Upcoming') {
          return { ...trip, status: 'Active' };
        }
        
        return trip;
      }));
    }, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);


  const addTrip = (trip) => {
    const newTrip = { ...trip, id: `trip_${Date.now()}` };
    setTrips(prev => [newTrip, ...prev]);
    return newTrip;
  };

  const updateTrip = (id, updates) => {
    setTrips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTrip = (id) => {
    // Prevent deletion if trip has confirmed leads (Data Integrity)
    const tripLeads = leads.filter(l => l.tripId === id && l.status === 'مؤكد');
    if (tripLeads.length > 0) {
      throw new Error(`لا يمكن حذف هذه الرحلة لوجود ${tripLeads.length} حجوزات مؤكدة عليها. يجب إلغاء الحجوزات أولاً.`);
    }
    setTrips(prev => prev.filter(t => t.id !== id));
    // Optional: unlink other non-confirmed leads
    setLeads(prev => prev.map(l => l.tripId === id ? { ...l, tripId: null } : l));
  };

  const findOrCreateTrip = (fullDate, destination, busType = 'سياحي 49') => {
    // Group by Date (Day only) and Bus Type
    const dayDate = fullDate.split('T')[0];
    const existing = trips.find(t => t.date.startsWith(dayDate) && t.busType === busType);
    
    if (existing) return existing.id;

    // Create new trip automatically
    const newTrip = {
      id: `trip_${Date.now()}`,
      name: `${destination} - ${dayDate}`,
      date: dayDate + 'T00:00', // Default to start of day if only day is provided
      destination: busType === 'VIP 30' ? 'مكة' : (destination || 'مكة'),
      busType,
      status: 'Upcoming',
      duration: busType === 'VIP 30' ? 3 : 3, // Now the default is 3 anyway, but explicit for VIP
      autoComplete: true
    };
    setTrips(prev => [newTrip, ...prev]);
    return newTrip.id;
  };

  const addLead = (leadData) => {
    // 1. Find or create trip first
    const tripId = findOrCreateTrip(leadData.date, leadData.destination, leadData.busType);
    
    // 2. Critical Seat Consistency Check
    const tripLeads = leads.filter(l => l.tripId === tripId && l.status === 'مؤكد');
    const bookedSeats = tripLeads.reduce((acc, l) => [...acc, ...l.seats], []);
    
    if (leadData.status === 'مؤكد' && leadData.seats.some(s => bookedSeats.includes(s))) {
      throw new Error('Seat already booked: عذراً، بعض المقاعد المختارة تم حجزها بالفعل في هذه الرحلة.');
    }

    // 3. Add lead linked to that trip
    const newLead = {
      ...leadData,
      tripId,
      id: `lead_${Date.now()}`,
      addedDate: new Date().toISOString().split('T')[0],
    };
    setLeads(prev => [newLead, ...prev]);
    return newLead;
  };

  const updateLead = (id, updates) => {
    let error = null;
    setLeads(prev => {
      const oldLead = prev.find(l => l.id === id);
      const newLeadData = { ...oldLead, ...updates };
      
      const tripId = findOrCreateTrip(
        newLeadData.date || oldLead.date, 
        newLeadData.destination || oldLead.destination,
        newLeadData.busType || oldLead.busType
      );
      newLeadData.tripId = tripId;

      // Critical Seat Consistency Check
      if (newLeadData.status === 'مؤكد') {
        const otherLeads = prev.filter(l => l.id !== id && l.tripId === tripId && l.status === 'مؤكد');
        const bookedSeats = otherLeads.reduce((acc, l) => [...acc, ...l.seats], []);
        
        if (newLeadData.seats.some(s => bookedSeats.includes(s))) {
          error = 'عذراً، بعض المقاعد المختارة تم حجزها بالفعل من قبل مستخدم آخر.';
          return prev; // Don't update
        }
      }
      
      return prev.map(l => l.id === id ? newLeadData : l);
    });

    if (error) throw new Error(error);
  };

  const deleteLead = (id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const getFilteredLeads = (filters, currentUser) => {
    let filtered = [...leads];

    // Role-based filtering
    if (currentUser.role === 'agent') {
      filtered = filtered.filter(l => l.agentId === currentUser.id);
    } else if (currentUser.role === 'team_leader') {
      filtered = filtered.filter(l => l.teamId === currentUser.teamId);
    }

    // Apply global date range filter
    if (globalDateFrom) filtered = filtered.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   filtered = filtered.filter(l => l.addedDate <= globalDateTo);

    // Apply specific leads filters
    if (filters.status) filtered = filtered.filter(l => l.status === filters.status);
    if (filters.agentId) filtered = filtered.filter(l => l.agentId === filters.agentId);
    if (filters.dateFrom) filtered = filtered.filter(l => l.addedDate >= filters.dateFrom);
    if (filters.dateTo) filtered = filtered.filter(l => l.addedDate <= filters.dateTo);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q)
      );
    }

    return filtered;
  };

  const getAgentStats = (agentId) => {
    let agentLeads = leads.filter(l => l.agentId === agentId);
    if (globalDateFrom) agentLeads = agentLeads.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   agentLeads = agentLeads.filter(l => l.addedDate <= globalDateTo);
    
    const bookings = agentLeads.filter(l => l.status === 'مؤكد').length;
    const TARGET = 150;
    const progress = (bookings / TARGET) * 100;
    const commission = bookings > TARGET ? (bookings - TARGET) * 20 : 0;

    let progressColor = '#ef4444';
    if (progress >= 110) progressColor = '#8b5cf6';
    else if (progress >= 100) progressColor = '#22c55e';
    else if (progress >= 50) progressColor = '#eab308';

    return {
      total: agentLeads.length,
      bookings,
      target: TARGET,
      progress: Math.round(progress * 10) / 10,
      commission,
      progressColor,
      leads: agentLeads // Exposing leads for the user's new request
    };
  };

  const getTeamLeaderStats = (tlId) => {
    let tlLeads = leads.filter(l => l.teamLeaderId === tlId);
    if (globalDateFrom) tlLeads = tlLeads.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   tlLeads = tlLeads.filter(l => l.addedDate <= globalDateTo);

    const bookings = tlLeads.filter(l => l.status === 'مؤكد').length;
    const TARGET = 200;
    const progress = (bookings / TARGET) * 100;
    
    // TL's own direct leads (if they act as agent)
    const directLeads = tlLeads.filter(l => l.agentId === tlId);

    return {
      total: tlLeads.length,
      bookings,
      target: TARGET,
      progress: Math.round(progress * 10) / 10,
      directLeads
    };
  };

  const getRanking = () => {
    const agents = users.filter(u => u.role === 'agent');
    const ranked = agents.map(agent => ({
      ...agent,
      ...getAgentStats(agent.id),
    })).sort((a, b) => b.bookings - a.bookings);

    const BONUSES = [500, 300, 200];
    return ranked.map((agent, i) => ({
      ...agent,
      rank: i + 1,
      bonus: BONUSES[i] || 0,
    }));
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <DataContext.Provider value={{
      leads, users, trips, addLead, updateLead, deleteLead,
      addTrip, updateTrip, deleteTrip,
      getFilteredLeads, getAgentStats, getTeamLeaderStats, getRanking,
      globalDateFrom, setGlobalDateFrom, globalDateTo, setGlobalDateTo,
      isLoading, notifications, markNotificationRead
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

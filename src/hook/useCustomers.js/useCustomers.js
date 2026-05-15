// src/hooks/useCustomers.js

import { useState, useEffect } from 'react';

const API = 'http://localhost:4000';

export function useCustomers(status = null) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // جيب الداتا الأولية
  useEffect(() => {
    const url = status
      ? `${API}/api/customers?status=${status}`
      : `${API}/api/customers`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data);
        setLoading(false);
      });
  }, [status]);

  // استنى أي تغيير real-time
  useEffect(() => {
    const es = new EventSource(`${API}/api/customers/stream`);

    es.onmessage = (e) => {
      const { type, customer } = JSON.parse(e.data);

      setCustomers((prev) => {
        if (type === 'added') {
          if (prev.find((c) => c.id === customer.id)) return prev;
          return [customer, ...prev];
        }
        if (type === 'modified') {
          return prev.map((c) => (c.id === customer.id ? customer : c));
        }
        if (type === 'removed') {
          return prev.filter((c) => c.id !== customer.id);
        }
        return prev;
      });
    };

    return () => es.close();
  }, []);

  return { customers, loading };
}

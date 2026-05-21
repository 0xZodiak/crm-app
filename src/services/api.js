// src/services/api.js — Centralized API Layer for CRM (Production Ready)
import { auth } from '../firebase';

const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:4000';
};

export const apiService = {
  /**
   * Helper function to build headers including secure Firebase ID Token
   */
  async getHeaders() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }
    const token = await user.getIdToken(true); // force refresh to get latest role/claims if needed
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },

  /**
   * Trigger a secure, role-restricted, backend-driven database backup
   */
  async triggerBackup() {
    try {
      const baseUrl = getBaseUrl();
      const headers = await this.getHeaders();
      
      const response = await fetch(`${baseUrl}/api/backup`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Backup failed with status code ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('API service triggerBackup exception:', err);
      throw err;
    }
  }
};

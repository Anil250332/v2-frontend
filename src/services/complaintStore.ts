import apiClient from '../api/client';

export interface ComplaintTicket {
  id: string;
  ticketNo: string;
  raisedByUserId?: number | string;
  raisedByName: string;
  raisedByRole: 'agent' | 'operator' | 'distributor' | 'manager' | 'super_admin' | 'sub_admin';
  subject: string;
  category: string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
  resolutionNote?: string;
  resolvedBy?: string;
  createdAt: string;
}

class ComplaintStoreService {
  private complaints: ComplaintTicket[] = [];
  private listeners: (() => void)[] = [];
  private currentUserId: string = '';

  constructor() {
    this.syncBackend();
  }

  public setUser(userId: string | number) {
    const newId = userId.toString();
    if (this.currentUserId !== newId) {
      this.currentUserId = newId;
      this.complaints = [];
    }
    this.syncBackend();
  }



  public clearUser() {
    this.currentUserId = '';
    this.complaints = [];
    this.notify();
  }


  
  public async syncBackend() {
    if (!localStorage.getItem('v2online_token')) return;
    try {
      const response = await apiClient.get('/complaints');
      if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        this.complaints = response.data.data;
        this.notify();
      }
    } catch {
      // API error handling
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  private sortComplaints(list: ComplaintTicket[]): ComplaintTicket[] {
    const priorityMap: Record<string, number> = {
      OPEN: 1,
      IN_REVIEW: 2,
      RESOLVED: 3,
      CLOSED: 4

    };

    return [...list].sort((a, b) => {
      const pA = priorityMap[a.status?.toUpperCase() || ''] || 5;
      const pB = priorityMap[b.status?.toUpperCase() || ''] || 5;
      if (pA !== pB) {
        return pA - pB;
      }
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  public getComplaints(): ComplaintTicket[] {
    return this.sortComplaints(this.complaints);
  }

  public getComplaintsForUser(userId?: string | number, mobile?: string, name?: string): ComplaintTicket[] {
    const uIdStr = userId?.toString();
    const mobStr = mobile?.toString();
    const filtered = this.complaints.filter(c => {
      const cUserId = c.raisedByUserId?.toString();
      if (uIdStr && cUserId === uIdStr) return true;
      if (mobStr && cUserId === mobStr) return true;
      if (name && c.raisedByName && c.raisedByName.toLowerCase() === name.toLowerCase()) return true;
      return false;
    });
    return this.sortComplaints(filtered);
  }

  // Raise new complaint — API-first
  public async addComplaint(data: {
    raisedByUserId?: number | string;
    raisedByName: string;
    raisedByRole: 'agent' | 'operator' | 'distributor' | 'manager' | 'super_admin' | 'sub_admin';
    subject: string;
    category: string;
    description: string;
  }): Promise<ComplaintTicket> {
    // Call API first
    try {
      const response = await apiClient.post('/complaints', {
        subject: data.subject,
        category: data.category,
        description: data.description,
        raisedByUserId: data.raisedByUserId,
        raisedByMobile: data.raisedByUserId
      });

      // Re-sync from backend to get real data
      await this.syncBackend();

      if (response.data.status === 'success') {
        return {
          id: response.data.data?.id || Date.now().toString(),
          ticketNo: response.data.data?.ticketNo || 'TKT-PENDING',
          raisedByUserId: data.raisedByUserId,
          raisedByName: data.raisedByName,
          raisedByRole: data.raisedByRole,
          subject: data.subject,
          category: data.category,
          description: data.description,
          status: 'OPEN',
          createdAt: 'Just Now'
        };
      }
    } catch {
      // Offline fallback
    }

    // Offline fallback: add locally
    const year = new Date().getFullYear();
    const newTicket: ComplaintTicket = {
      id: Date.now().toString(),
      ticketNo: `TKT-${year}-OFFLINE`,
      raisedByUserId: data.raisedByUserId,
      raisedByName: data.raisedByName,
      raisedByRole: data.raisedByRole,
      subject: data.subject,
      category: data.category,
      description: data.description,
      status: 'OPEN',
      createdAt: 'Just Now'
    };

    this.complaints.unshift(newTicket);
    this.notify();
    return newTicket;
  }

  // Admin / Manager Update Complaint Status & Resolution
  public async updateStatus(ticketId: string, status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED', resolutionNote?: string, resolvedBy?: string) {
    this.complaints = this.complaints.map(c => {
      if (c.id === ticketId) {
        return {
          ...c,
          status,
          resolutionNote: resolutionNote !== undefined ? resolutionNote : c.resolutionNote,
          resolvedBy: resolvedBy || c.resolvedBy || 'Admin'
        };
      }
      return c;
    });
    this.notify();

    // Async sync to backend
    try {
      await apiClient.patch(`/complaints/${ticketId}/status`, {
        status,
        resolutionNote
      });
      await this.syncBackend();
    } catch (e) {
      console.error('Failed to update complaint status in backend', e);
    }
  }
}

export const complaintStore = new ComplaintStoreService();

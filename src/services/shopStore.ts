import apiClient from '../api/client';

export interface Shop {
  id: string;
  shopCode: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string;
  aadhaar: string;
  address: string;
  password?: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'DELETE_REQUESTED';
  deleteReason?: string;
  registrationType: 'SELF_REGISTER' | 'DISTRIBUTOR_ADDED';
  createdAt: string;
  requestedAt?: string;
  approvedAt?: string;
}

class ShopStoreService {
  private shops: Shop[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.syncBackend();
  }

  public async syncBackend() {
    try {
      const response = await apiClient.get('/shops');
      if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        this.shops = response.data.data;
        this.notify();
      }
    } catch (e) {
      console.error('Failed to sync shops from backend API:', e);
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

  public getShops(): Shop[] {
    return [...this.shops];
  }

  // Self-Registration Form Submission -> PENDING
  public async addSelfRegisteredShop(data: {
    ownerName: string;
    shopName: string;
    mobile: string;
    email: string;
    aadhaar: string;
    address: string;
  }): Promise<Shop | null> {
    try {
      const response = await apiClient.post('/shops/self-register', data);
      await this.syncBackend();
      if (response.data.status === 'success' && response.data.data) {
        return response.data.data;
      }
    } catch (e) {
      console.error('Failed to self-register shop via API:', e);
    }
    return null;
  }

  // Distributor Add New Shop Modal -> ACTIVE (API-first)
  public async addActiveShopByDistributor(data: {
    ownerName: string;
    shopName: string;
    mobile: string;
    email: string;
    aadhaar: string;
    address: string;
    password: string;
  }): Promise<Shop | null> {
    try {
      const response = await apiClient.post('/shops', {
        ownerName: data.ownerName,
        shopName: data.shopName,
        mobile: data.mobile,
        email: data.email,
        aadhaar: data.aadhaar,
        address: data.address,
        password: data.password
      });

      await this.syncBackend();

      if (response.data.status === 'success' && response.data.data) {
        const shop = this.shops.find(s => s.shopCode === response.data.data.shopCode);
        if (shop) return shop;
        return response.data.data;
      }
    } catch (e) {
      console.error('Failed to add shop via API:', e);
    }
    return null;
  }

  // Approve Pending Shop
  public async approveShop(shopId: string) {
    try {
      await apiClient.patch(`/shops/${shopId}/approve`);
      await this.syncBackend();
    } catch (e) {
      console.error('Failed to approve shop:', e);
    }
  }

  // Reject Pending Shop
  public async rejectShop(shopId: string) {
    try {
      await apiClient.patch(`/shops/${shopId}/reject`);
      await this.syncBackend();
    } catch (e) {
      console.error('Failed to reject shop:', e);
    }
  }

  // Request Shop Deletion by Distributor
  public async requestDeletion(shopId: string, reason: string) {
    try {
      await apiClient.post(`/shops/${shopId}/request-delete`, { reason });
      await this.syncBackend();
    } catch (e) {
      console.error('Failed to request deletion:', e);
    }
  }

  // Admin Approves Deletion Request -> Sets Status to INACTIVE (Login Blocked)
  public async approveDeletion(shopId: string) {
    try {
      await apiClient.patch(`/shops/${shopId}/approve-deletion`);
      await this.syncBackend();
    } catch (e) {
      console.error('Failed to approve deletion:', e);
    }
  }
}

export const shopStore = new ShopStoreService();

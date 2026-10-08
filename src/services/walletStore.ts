import apiClient from '../api/client';

export interface WalletTransaction {
  id: string;
  txnNo: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'topup' | 'service_fee' | 'operator_earning' | 'distributor_commission' | 'refund' | 'withdrawal' | 'admin_adjustment';
  amount: number;
  openingBalance: number;
  closingBalance: number;
  remarks: string;
  appId?: string; // Application ID (e.g., APP-2026-1001)
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  userName?: string;
  shopName?: string;
  userMobile?: string;
  userRole?: string;
  createdAt: string;
}

class WalletStoreService {
  private balance: number = 0;
  private transactions: WalletTransaction[] = [];
  private listeners: (() => void)[] = [];
  private currentUserId: string = '';

  constructor() {
    this.syncBackend();
  }

  public setUser(userId: string | number) {
    const newId = userId.toString();
    if (this.currentUserId !== newId) {
      this.currentUserId = newId;
      this.balance = 0;
      this.transactions = [];
    }
    this.syncBackend();
  }

  public clearUser() {
    this.currentUserId = '';
    this.balance = 0;
    this.transactions = [];
    this.notify();
  }

  public async syncBackend() {
    try {
      const response = await apiClient.get('/wallet/transactions');
      if (response.data.status === 'success') {
        if (typeof response.data.balance === 'number') {
          this.balance = response.data.balance;
        }
        if (Array.isArray(response.data.data)) {
          this.transactions = response.data.data.map((t: any) => {
            let extractedAppId = t.appId || t.app_id || null;
            if (!extractedAppId && t.remarks) {
              const match = t.remarks.match(/\[(?:App|Application|Task)\s*ID:\s*([^\]]+)\]/i) || t.remarks.match(/(APP-\d{4}-\d{4})/i);
              if (match) extractedAppId = match[1];
            }
            return {
              ...t,
              appId: extractedAppId || undefined
            };
          });
        }
        this.notify();
      }
    } catch {
      // Backend not reached or unauthenticated
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

  public getBalance(): number {
    return this.balance;
  }

  public getTransactions(): WalletTransaction[] {
    return [...this.transactions];
  }

  // Recharge Wallet (Add Money)
  public async rechargeWallet(amount: number, remarks?: string): Promise<{ success: boolean; message: string }> {
    const rechargeAmt = parseFloat(amount.toString());
    if (isNaN(rechargeAmt) || rechargeAmt <= 0) {
      return { success: false, message: 'Kripya sahi recharge amount enter/select karein.' };
    }

    try {
      const response = await apiClient.post('/wallet/recharge', { amount: rechargeAmt, remarks });
      if (response.data.status === 'success') {
        await this.syncBackend();
        return {
          success: true,
          message: response.data.message || `₹${rechargeAmt.toFixed(2)} aapke wallet me add ho gaye hain!`
        };
      }
      return { success: false, message: response.data.message || 'Recharge request failed.' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Server error while recharging wallet.'
      };
    }
  }

  // Deduct Wallet Balance for Service Application
  public async deductWallet(amount: number, serviceName: string, appId?: string): Promise<{ success: boolean; message: string }> {
    const deductAmt = parseFloat(amount.toString());
    if (isNaN(deductAmt) || deductAmt <= 0) {
      return { success: false, message: 'Invalid deduction amount.' };
    }

    try {
      const response = await apiClient.post('/wallet/deduct', { amount: deductAmt, serviceName, appId });
      if (response.data.status === 'success') {
        await this.syncBackend();
        return {
          success: true,
          message: response.data.message || `₹${deductAmt.toFixed(2)} deducted for ${serviceName}.`
        };
      }
      return { success: false, message: response.data.message || 'Wallet deduction failed.' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || `Insufficient wallet balance! Available ₹${this.balance.toFixed(2)}, required ₹${deductAmt.toFixed(2)}.`
      };
    }
  }

  // Auto-Refund Wallet for Rejected Service Application
  public async addRefund(data: {
    amount: number;
    serviceName: string;
    appId?: string;
    remarks?: string;
  }): Promise<{ success: boolean; message: string }> {
    const refundAmt = parseFloat(data.amount.toString());
    if (isNaN(refundAmt) || refundAmt <= 0) {
      return { success: false, message: 'Invalid refund amount.' };
    }

    try {
      const response = await apiClient.post('/wallet/refund', {
        amount: refundAmt,
        serviceName: data.serviceName,
        appId: data.appId,
        remarks: data.remarks
      });
      if (response.data.status === 'success') {
        await this.syncBackend();
        return { success: true, message: response.data.message || 'Refund processed successfully.' };
      }
      return { success: false, message: response.data.message || 'Refund failed.' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to process refund on server.'
      };
    }
  }
}

export const walletStore = new WalletStoreService();


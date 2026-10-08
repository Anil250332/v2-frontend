import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../api/client';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building,
  User,
  Phone,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface WithdrawalItem {
  id: string;
  reqNo: string;
  userId: string;
  userName: string;
  userMobile: string;
  userRole: string;
  amount: number;
  paymentMode: string;
  accountHolderName: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  upiId?: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  rejectionReason?: string;
  utrNo?: string;
  createdAt: string;
}

export default function AdminWithdrawalRequests() {
  const [requests, setRequests] = useState<WithdrawalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PROCESSED' | 'REJECTED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchWithdrawals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/wallet/withdrawals');
      if (res.data.status === 'success') {
        setRequests(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch withdrawals:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const handleApprove = async (req: WithdrawalItem) => {
    if (processingId === req.id) return;
    setProcessingId(req.id);
    try {
      const res = await apiClient.patch(`/wallet/withdrawals/${req.id}/process`, {
        action: 'approve',
        utrNo: `UTR-${Date.now().toString().slice(-8)}`
      });

      if (res.data.status === 'success') {
        setSuccessMsg(`Payout of ₹ ${req.amount.toLocaleString()} for "${req.userName}" approved and marked as PROCESSED!`);
        await fetchWithdrawals();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve payout.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: WithdrawalItem) => {
    if (processingId === req.id) return;
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;

    setProcessingId(req.id);
    try {
      const res = await apiClient.patch(`/wallet/withdrawals/${req.id}/process`, {
        action: 'reject',
        rejectionReason: reason || 'Bank details mismatch'
      });

      if (res.data.status === 'success') {
        setSuccessMsg(`Withdrawal request "${req.reqNo}" rejected and funds refunded to user's wallet.`);
        await fetchWithdrawals();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject payout.');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter(r => {
    const s = (r.status || '').toUpperCase();
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PROCESSED'
        ? s === 'PROCESSED' || s === 'PAID'
        : s === activeTab;

    const matchesSearch =
      r.reqNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userMobile?.includes(searchTerm) ||
      r.bankName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="h-6 w-6 text-emerald-600" />
              <span>Operator & User Withdrawal Requests (Admin & Manager)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live payout queue from MySQL database. Verify settlement bank accounts, release payments, or reject with auto-refund.
            </p>
          </div>

          <button
            onClick={fetchWithdrawals}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center gap-2">
          {(['PENDING', 'PROCESSED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab} (
                {tab === 'ALL'
                  ? requests.length
                  : tab === 'PENDING'
                  ? requests.filter(r => r.status === 'PENDING').length
                  : tab === 'PROCESSED'
                  ? requests.filter(r => r.status === 'PROCESSED' || (r.status as any) === 'PAID').length
                  : requests.filter(r => r.status === 'REJECTED').length}
              )
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Request No, Name, Mobile, or Bank Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Bank Payout Queue ({filtered.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Request No & Amount</th>
                  <th className="py-3.5 px-4">User Details</th>
                  <th className="py-3.5 px-4">Bank Account Info</th>
                  <th className="py-3.5 px-4">Requested Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No withdrawal requests found in this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const s = (r.status || '').toUpperCase();
                    const isPending = s === 'PENDING';
                    const isProcessed = s === 'PROCESSED' || s === 'PAID';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold text-emerald-700 block">{r.reqNo}</span>
                          <span className="text-base font-black text-slate-900">₹ {Number(r.amount || 0).toLocaleString()}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{r.userName}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{r.userMobile}</span>
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold text-slate-600">{r.userRole}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <span>{r.bankName}</span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium mt-0.5">
                            A/C Holder: <strong className="text-slate-900">{r.accountHolderName || r.userName}</strong>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                            <span>A/C: <strong>{r.accountNo}</strong></span>
                            <span>•</span>
                            <span>IFSC: <strong>{r.ifscCode}</strong></span>
                            {r.upiId && r.upiId !== 'N/A' && (
                              <>
                                <span>•</span>
                                <span className="text-purple-700 font-semibold">UPI: {r.upiId}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[11px] text-slate-600 space-y-0.5">
                          <div>{r.createdAt}</div>
                          {r.utrNo && (
                            <div className="text-emerald-700 font-medium font-mono text-[10px]">UTR: {r.utrNo}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isProcessed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {isProcessed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {r.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReject(r)}
                                disabled={processingId === r.id}
                                className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => handleApprove(r)}
                                disabled={processingId === r.id}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {processingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                <span>{processingId === r.id ? 'Processing...' : 'Approve & Settle'}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

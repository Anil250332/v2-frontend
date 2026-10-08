import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building,
  User,
  Phone,
  Loader2
} from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  reqNo: string;
  operatorName: string;
  mobile: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  approvedAt?: string;
}

export default function ManagerWithdrawalRequests() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([
    {
      id: '1',
      reqNo: 'WDR-2026-101',
      operatorName: 'Ramesh Kumar Verma',
      mobile: '9876543210',
      bankName: 'State Bank of India',
      accountNo: 'XXXXXX3489',
      ifsc: 'SBIN0001234',
      amount: 4500,
      status: 'PENDING',
      requestedAt: '17 Sept 2026, 04:30 PM'
    },
    {
      id: '2',
      reqNo: 'WDR-2026-102',
      operatorName: 'Suresh Patel',
      mobile: '9823456789',
      bankName: 'HDFC Bank',
      accountNo: 'XXXXXX8912',
      ifsc: 'HDFC0005678',
      amount: 8200,
      status: 'APPROVED',
      requestedAt: '16 Sept 2026, 11:15 AM',
      approvedAt: '16 Sept 2026, 02:00 PM'
    },
    {
      id: '3',
      reqNo: 'WDR-2026-103',
      operatorName: 'Anil Sharma',
      mobile: '9711223344',
      bankName: 'Punjab National Bank',
      accountNo: 'XXXXXX1144',
      ifsc: 'PUNB0123400',
      amount: 3100,
      status: 'PENDING',
      requestedAt: '17 Sept 2026, 07:10 PM'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const handleApprove = async (id: string, name: string) => {
    if (processingId === id) return;
    setProcessingId(id);
    try {
      const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED', approvedAt: nowStr } : r));
      setSuccessMsg(`Withdrawal request for ${name} approved successfully!`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (processingId === id) return;
    setProcessingId(id);
    try {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
      setSuccessMsg(`Withdrawal request for ${name} rejected.`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter(r => {
    const matchesTab = activeTab === 'ALL' || r.status === activeTab;
    const matchesSearch =
      r.reqNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.mobile.includes(searchTerm) ||
      r.bankName.toLowerCase().includes(searchTerm.toLowerCase());
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
              <span>Operator Withdrawal Requests (Manager)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review and approve wallet payout / commission withdrawal requests submitted by operators.
            </p>
          </div>
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
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab} ({tab === 'ALL' ? requests.length : requests.filter(r => r.status === tab).length})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Request No, Operator Name, Mobile, or Bank Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Request No & Amount</th>
                  <th className="py-3.5 px-4">Operator Details</th>
                  <th className="py-3.5 px-4">Bank Account Info</th>
                  <th className="py-3.5 px-4">Timestamps</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No withdrawal requests found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-emerald-700 block">{r.reqNo}</span>
                        <span className="text-base font-black text-slate-900">₹ {r.amount.toLocaleString()}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{r.operatorName}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{r.mobile}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span>{r.bankName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          A/C: {r.accountNo} • IFSC: {r.ifsc}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600 space-y-0.5">
                        <div>Req: <strong className="text-slate-800">{r.requestedAt}</strong></div>
                        {r.approvedAt && (
                          <div className="text-emerald-700 font-medium">Appr: <strong>{r.approvedAt}</strong></div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : r.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {r.status === 'APPROVED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {r.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReject(r.id, r.operatorName)}
                              disabled={processingId === r.id}
                              className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => handleApprove(r.id, r.operatorName)}
                              disabled={processingId === r.id}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              {processingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              <span>{processingId === r.id ? 'Processing...' : 'Approve'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

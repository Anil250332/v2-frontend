import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { shopStore, type Shop } from '../../services/shopStore';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Phone,
  Mail,
  Calendar,
  Loader2
} from 'lucide-react';

export default function ManagerVerifyRequests() {
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const sync = () => {
      const all = shopStore.getShops();
      setPendingShops(all.filter(s => s.status === 'PENDING' || s.status === 'DELETE_REQUESTED'));
    };

    sync();
    const unsubscribe = shopStore.subscribe(sync);
    return unsubscribe;
  }, []);

  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const handleApprove = async (shop: Shop) => {
    if (processingId === shop.id) return;
    setProcessingId(shop.id);
    try {
      if (shop.status === 'DELETE_REQUESTED') {
        await shopStore.approveDeletion(shop.id);
        setSuccessMsg(`Approved shop deletion request for "${shop.shopName}".`);
      } else {
        await shopStore.approveShop(shop.id);
        setSuccessMsg(`Approved & activated shop "${shop.shopName}".`);
      }
      setTimeout(() => setSuccessMsg(''), 3500);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (shop: Shop) => {
    if (processingId === shop.id) return;
    setProcessingId(shop.id);
    try {
      await shopStore.rejectShop(shop.id);
      setSuccessMsg(`Rejected request for "${shop.shopName}".`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = pendingShops.filter(s =>
    s.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.mobile.includes(searchTerm) ||
    s.shopCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-amber-600" />
              <span>Verifying Requests Page (Manager)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verify pending shop registration requests and distributor deletion requests.
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

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Shop Code, Shop Name, Owner Name, or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">Pending Verification Queue ({filtered.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Shop Details</th>
                  <th className="py-3.5 px-4">Owner Contact</th>
                  <th className="py-3.5 px-4">Request Type</th>
                  <th className="py-3.5 px-4">Timestamps</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No pending verification requests found. All clear!
                    </td>
                  </tr>
                ) : (
                  filtered.map((shop) => (
                    <tr key={shop.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-blue-700 block">{shop.shopCode}</span>
                        <span className="font-bold text-slate-900">{shop.shopName}</span>
                        <div className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">{shop.address}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{shop.ownerName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{shop.mobile}</span>
                        </div>
                        {shop.email && shop.email !== 'N/A' && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{shop.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded border ${
                          shop.status === 'DELETE_REQUESTED'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {shop.status === 'DELETE_REQUESTED' ? 'Delete Request' : 'New Registration'}
                        </span>
                        {shop.deleteReason && (
                          <p className="text-[11px] text-red-600 mt-1 italic max-w-xs">Reason: {shop.deleteReason}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>Req Date: <strong>{shop.requestedAt || shop.createdAt || 'N/A'}</strong></span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          <span>{shop.status.replace('_', ' ')}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReject(shop)}
                            disabled={processingId === shop.id}
                            className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApprove(shop)}
                            disabled={processingId === shop.id}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {processingId === shop.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            <span>{processingId === shop.id ? 'Processing...' : 'Approve'}</span>
                          </button>
                        </div>
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

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { shopStore } from '../../services/shopStore';
import type { Shop } from '../../services/shopStore';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Store,
  User,
  Phone,
  Mail,
  CreditCard,
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';

export default function ShopVerify() {
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [selectedRejectShop, setSelectedRejectShop] = useState<Shop | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  useEffect(() => {
    const updateShops = () => {
      const all = shopStore.getShops();
      setPendingShops(all.filter(s => s.status === 'PENDING'));
    };

    updateShops();
    const unsubscribe = shopStore.subscribe(updateShops);
    return unsubscribe;
  }, []);

  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const handleApprove = async (shop: Shop) => {
    if (processingId === shop.id) return;
    setProcessingId(shop.id);
    try {
      await shopStore.approveShop(shop.id);
      setActionSuccessMsg(`Shop "${shop.shopName}" verified & forwarded to Admin successfully!`);
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectShop || processingId === selectedRejectShop.id) return;
    setProcessingId(selectedRejectShop.id);
    try {
      await shopStore.rejectShop(selectedRejectShop.id);
      setActionSuccessMsg(`Registration request for "${selectedRejectShop.shopName}" rejected.`);
      setSelectedRejectShop(null);
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-amber-600" />
              <span>Verify Shop Registrations</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verify self-registered partner shop applications before forwarding to Admin for approval.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center">
            <span className="text-xs font-semibold text-amber-700 block">Pending Verification</span>
            <span className="text-lg font-black text-amber-900">{pendingShops.length} Requests</span>
          </div>
        </div>

        {/* Global Action Message Banner */}
        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Pending Requests List */}
        {pendingShops.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
            <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">All Registration Requests Verified!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no pending self-registration shop applications in your district queue.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingShops.map((shop) => (
              <div key={shop.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-blue-300 transition-all">
                
                {/* Top Title & Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{shop.shopName}</h2>
                      <span className="text-xs text-slate-400 font-mono">Ref: {shop.shopCode} • Submitted {shop.createdAt}</span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" /> PENDING VERIFICATION
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs font-medium block">Owner Full Name</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{shop.ownerName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs font-medium block">WhatsApp Mobile</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5 font-mono">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{shop.mobile}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs font-medium block">Email Address</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{shop.email}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs font-medium block">Aadhaar Number</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5 font-mono">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      <span>{shop.aadhaar}</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 text-xs font-medium block">Full Address</span>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{shop.address}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRejectShop(shop)}
                    disabled={processingId === shop.id}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(shop)}
                    disabled={processingId === shop.id}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {processingId === shop.id ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>{processingId === shop.id ? 'Verifying...' : 'Verify & Forward to Admin'}</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Reject Confirmation Modal */}
        {selectedRejectShop && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Reject Registration Request</span>
                </div>
                <button
                  onClick={() => setSelectedRejectShop(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Are you sure you want to reject the self-registration request for <strong>"{selectedRejectShop.shopName}"</strong>?
              </p>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRejectShop(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Confirm Reject
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { walletStore, type WalletTransaction } from '../../services/walletStore';
import apiClient from '../../api/client';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  Building,
  CreditCard,
  Hash,
  User,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function OperatorWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdrawal Form State
  const [amount, setAmount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [accountNo, setAccountNo] = useState('');
  const [confirmAccountNo, setConfirmAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  interface FieldErrors {
    amount?: string;
    accountHolderName?: string;
    bankName?: string;
    accountNo?: string;
    confirmAccountNo?: string;
    ifsc?: string;
    upiId?: string;
  }

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const syncWallet = useCallback(async () => {
    setIsLoading(true);
    await walletStore.syncBackend();
    setBalance(walletStore.getBalance());
    setTxns(walletStore.getTransactions());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncWallet();
    const unsubscribe = walletStore.subscribe(() => {
      setBalance(walletStore.getBalance());
      setTxns(walletStore.getTransactions());
    });
    return unsubscribe;
  }, [syncWallet]);

  const handleOpenWithdrawalModal = () => {
    setErrorMsg('');
    setFieldErrors({});
    setAmount('');
    setAccountHolderName(user?.full_name || 'Operator');
    setAccountNo('');
    setConfirmAccountNo('');
    setIfsc('');
    setUpiId('');
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const val = parseFloat(amount);

    if (!amount || isNaN(val) || val <= 0) {
      errors.amount = 'Valid withdrawal amount enter karein.';
    } else if (val > balance) {
      errors.amount = `Insufficient wallet balance! Maximum available: ₹ ${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    } else if (val < 10) {
      errors.amount = 'Minimum withdrawal amount ₹ 10.00 hai.';
    }

    if (!accountHolderName.trim()) {
      errors.accountHolderName = 'Account holder name required hai.';
    } else if (accountHolderName.trim().length < 3) {
      errors.accountHolderName = 'Account holder name kam se kam 3 letters ka hona chahiye.';
    } else if (!/^[a-zA-Z\s.]+$/.test(accountHolderName.trim())) {
      errors.accountHolderName = 'Name me sirf alphabets aur spaces allowed hain.';
    }

    if (!bankName.trim()) {
      errors.bankName = 'Bank name required hai.';
    }

    const cleanAccNo = accountNo.trim();
    if (!cleanAccNo) {
      errors.accountNo = 'Account number required hai.';
    } else if (!/^\d{9,18}$/.test(cleanAccNo)) {
      errors.accountNo = 'Sahi Bank Account number (9-18 digits) enter karein.';
    }

    const cleanConfirmAccNo = confirmAccountNo.trim();
    if (!cleanConfirmAccNo) {
      errors.confirmAccountNo = 'Confirm account number required hai.';
    } else if (cleanAccNo && cleanConfirmAccNo !== cleanAccNo) {
      errors.confirmAccountNo = 'Account number aur Confirm account number match nahi kar rahe hain!';
    }

    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!cleanIfsc) {
      errors.ifsc = 'IFSC code required hai.';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      errors.ifsc = 'Invalid IFSC code! Example: SBIN0001234 (11 chars, 5th char 0).';
    }

    const cleanUpi = upiId.trim();
    if (cleanUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
      errors.upiId = 'Invalid UPI ID format! Example: 9876543210@paytm';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateForm()) {
      setErrorMsg('Kripya form ki sabhi validation errors ko fix karein.');
      return;
    }

    const val = parseFloat(amount);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/wallet/withdraw', {
        amount: val,
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        ifscCode: ifsc.trim().toUpperCase(),
        upiId: upiId.trim() || undefined,
        paymentMode: upiId.trim() ? 'upi' : 'bank_transfer'
      });

      if (res.data.status === 'success') {
        const reqNo = res.data.data?.reqNo || 'WDR-REQ';
        setSuccessMsg(`Withdrawal Request "${reqNo}" for ₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })} submitted successfully!`);
        setIsModalOpen(false);
        await syncWallet();
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(res.data.message || 'Failed to submit withdrawal request.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Server error while submitting withdrawal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="h-6 w-6 text-emerald-600" />
              <span>Operator Wallet & Earnings Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track earnings accumulated from service executions and request payouts to your bank account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={syncWallet}
              disabled={isLoading}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleOpenWithdrawalModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Submit Withdrawal Request</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Balance Card Widget */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 relative z-10">
            <span className="text-xs text-emerald-200 uppercase font-bold tracking-widest block">
              Available Operator Wallet Balance
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              ₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-emerald-300">
              Earnings credited instantly upon task verification by Admin/Manager.
            </p>
          </div>

          <button
            onClick={handleOpenWithdrawalModal}
            className="relative z-10 bg-white text-emerald-900 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:bg-emerald-50 transition-all cursor-pointer"
          >
            Request Payout
          </button>

          <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
        </div>

        {/* Transaction History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Wallet Transaction History ({txns.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {txns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                      No wallet transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  txns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          t.type === 'CREDIT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {t.type === 'CREDIT' ? <ArrowDownLeft className="h-3 w-3 text-emerald-600" /> : <ArrowUpRight className="h-3 w-3 text-amber-600" />}
                          {t.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {t.remarks || t.category}
                        {t.txnNo && <span className="text-[11px] text-blue-700 font-mono block mt-0.5">{t.txnNo}</span>}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {t.createdAt}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                        t.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {t.type === 'CREDIT' ? '+' : '-'} ₹ {Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Withdrawal Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95 my-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <span>Request Bank Payout</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleWithdrawalSubmit} className="space-y-3.5">
                
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Withdrawal Amount (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder={`Available: ₹ ${balance.toFixed(2)}`}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (fieldErrors.amount) setFieldErrors(prev => ({ ...prev, amount: undefined }));
                    }}
                    className={`w-full border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold ${
                      fieldErrors.amount ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                  {fieldErrors.amount && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span>{fieldErrors.amount}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Account Holder Name (As per Bank) *
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar Verma"
                      value={accountHolderName}
                      onChange={(e) => {
                        setAccountHolderName(e.target.value);
                        if (fieldErrors.accountHolderName) setFieldErrors(prev => ({ ...prev, accountHolderName: undefined }));
                      }}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                        fieldErrors.accountHolderName ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
                      }`}
                    />
                  </div>
                  {fieldErrors.accountHolderName && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span>{fieldErrors.accountHolderName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bank Name *
                  </label>
                  <div className="relative">
                    <Building className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India / HDFC Bank / ICICI Bank"
                      value={bankName}
                      onChange={(e) => {
                        setBankName(e.target.value);
                        if (fieldErrors.bankName) setFieldErrors(prev => ({ ...prev, bankName: undefined }));
                      }}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                        fieldErrors.bankName ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
                      }`}
                    />
                  </div>
                  {fieldErrors.bankName && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span>{fieldErrors.bankName}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Account Number *
                    </label>
                    <div className="relative">
                      <CreditCard className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. 38192019489"
                        value={accountNo}
                        onChange={(e) => {
                          setAccountNo(e.target.value);
                          if (fieldErrors.accountNo) setFieldErrors(prev => ({ ...prev, accountNo: undefined }));
                        }}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono ${
                          fieldErrors.accountNo ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
                        }`}
                      />
                    </div>
                    {fieldErrors.accountNo && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                        <span>{fieldErrors.accountNo}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm Account Number *
                    </label>
                    <div className="relative">
                      <CreditCard className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Re-enter Account No"
                        value={confirmAccountNo}
                        onChange={(e) => {
                          setConfirmAccountNo(e.target.value);
                          if (fieldErrors.confirmAccountNo) setFieldErrors(prev => ({ ...prev, confirmAccountNo: undefined }));
                        }}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono ${
                          fieldErrors.confirmAccountNo ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
                        }`}
                      />
                    </div>
                    {fieldErrors.confirmAccountNo && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                        <span>{fieldErrors.confirmAccountNo}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      IFSC Code *
                    </label>
                    <div className="relative">
                      <Hash className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={ifsc}
                        onChange={(e) => {
                          setIfsc(e.target.value.toUpperCase());
                          if (fieldErrors.ifsc) setFieldErrors(prev => ({ ...prev, ifsc: undefined }));
                        }}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono uppercase ${
                          fieldErrors.ifsc ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
                        }`}
                      />
                    </div>
                    {fieldErrors.ifsc && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                        <span>{fieldErrors.ifsc}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210@paytm"
                      value={upiId}
                      onChange={(e) => {
                        setUpiId(e.target.value);
                        if (fieldErrors.upiId) setFieldErrors(prev => ({ ...prev, upiId: undefined }));
                      }}
                      className={`w-full border rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono ${
                        fieldErrors.upiId ? 'border-rose-500 bg-rose-50/50' : 'border-slate-300 bg-slate-50'
                      }`}
                    />
                    {fieldErrors.upiId && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                        <span>{fieldErrors.upiId}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Withdrawal Request</span>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { walletStore, type WalletTransaction } from '../../services/walletStore';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  User,
  Store
} from 'lucide-react';

export default function AdminWallet() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const updateState = () => {
      setTransactions(walletStore.getTransactions());
    };
    updateState();
    const unsubscribe = walletStore.subscribe(updateState);
    return unsubscribe;
  }, []);

  const totalInflow = transactions
    .filter(t => t.type === 'CREDIT' && t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.type === 'DEBIT' && t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTxns = transactions.filter(t => {
    const matchesSearch =
      t.txnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.userName && t.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.shopName && t.shopName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.userMobile && t.userMobile.includes(searchTerm)) ||
      t.remarks.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeFilter === 'ALL') return matchesSearch;
    return matchesSearch && t.type === activeFilter;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
              <span>Master Platform Wallet & Transaction Audit</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Global audit of all shop wallet recharges, service fee debits, and monetary inflows across the network.
            </p>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Platform Inflow</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{totalInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Cashfree & Auto UPI Recharges</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ArrowDownRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recharges Count</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {transactions.filter(t => t.type === 'CREDIT').length}
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Shop Retailer Topup Requests</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Service Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Deducted for Service Applications</p>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Filter Transactions:</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['ALL', 'CREDIT', 'DEBIT'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === tab
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All Transactions' : tab === 'CREDIT' ? 'Shop Recharges (Credits)' : 'Service Fees (Debits)'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Txn No, Shop Name, Owner, Mobile, or Remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Master Transactions Ledger Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Txn No & Description</th>
                  <th className="py-3.5 px-4">Shop / User Details</th>
                  <th className="py-3.5 px-4 text-center">Type</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-right">Opening / Closing</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No wallet transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 text-xs block">{txn.txnNo}</span>
                        <span className="font-bold text-slate-900">{txn.remarks}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-slate-400" />
                          <span>{txn.shopName || txn.userName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{txn.userName} ({txn.userMobile})</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          txn.type === 'CREDIT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {txn.type}
                        </span>
                      </td>

                      <td className={`py-3.5 px-4 text-right font-bold text-sm ${
                        txn.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {txn.type === 'CREDIT' ? '+' : '-'} ₹{txn.amount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs">
                        <div className="text-slate-500">Op: ₹{txn.openingBalance.toFixed(2)}</div>
                        <div className="font-bold text-slate-800">Cl: ₹{txn.closingBalance.toFixed(2)}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {txn.createdAt}
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

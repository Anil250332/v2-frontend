import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Percent,
  Search,
  CheckCircle2,
  Clock,
  Store,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Download
} from 'lucide-react';

interface CommissionRecord {
  id: string;
  txNo: string;
  shopName: string;
  shopCode: string;
  ownerName: string;
  serviceName: string;
  serviceCode: string;
  category: string;
  amount: number;
  commissionRate: string;
  commissionEarned: number;
  platformShare: number;
  status: 'CREDITED' | 'PROCESSING';
  dateTime: string;
}

export default function AdminCommissions() {
  const [records] = useState<CommissionRecord[]>([
    {
      id: '1',
      txNo: 'TXN-2026-9001',
      shopName: 'Sharma MP Online & CSC Center',
      shopCode: 'SHOP-2026-1003',
      ownerName: 'Rajesh Sharma',
      serviceName: 'Ayushman Card PVC Print',
      serviceCode: 'SRV-001',
      category: 'Health Services',
      amount: 150,
      commissionRate: '10%',
      commissionEarned: 15,
      platformShare: 135,
      status: 'CREDITED',
      dateTime: '18 Sept 2026, 11:45 am'
    },
    {
      id: '2',
      txNo: 'TXN-2026-9002',
      shopName: 'Digital Seva Kendra',
      shopCode: 'SHOP-2026-1004',
      ownerName: 'Aman Gupta',
      serviceName: 'MP E-District Revenue Certificate',
      serviceCode: 'SRV-002',
      category: 'Citizen Services',
      amount: 300,
      commissionRate: '15%',
      commissionEarned: 45,
      platformShare: 255,
      status: 'CREDITED',
      dateTime: '18 Sept 2026, 10:20 am'
    },
    {
      id: '3',
      txNo: 'TXN-2026-9003',
      shopName: 'Shri Ram Online Services',
      shopCode: 'SHOP-2026-1005',
      ownerName: 'Sunil Verma',
      serviceName: 'Khasra Khatoni B1 Copy',
      serviceCode: 'SRV-003',
      category: 'Revenue & Land',
      amount: 200,
      commissionRate: '12%',
      commissionEarned: 24,
      platformShare: 176,
      status: 'CREDITED',
      dateTime: '17 Sept 2026, 04:15 pm'
    },
    {
      id: '4',
      txNo: 'TXN-2026-9004',
      shopName: 'sdsdf Kiosk',
      shopCode: 'SHOP-2026-1012',
      ownerName: 'Anilk sahu',
      serviceName: 'Samagra Portal KYC & Update',
      serviceCode: 'SRV-004',
      category: 'Social Welfare',
      amount: 250,
      commissionRate: '8%',
      commissionEarned: 20,
      platformShare: 230,
      status: 'CREDITED',
      dateTime: '17 Sept 2026, 02:10 pm'
    },
    {
      id: '5',
      txNo: 'TXN-2026-9005',
      shopName: 'ma kali Services',
      shopCode: 'SHOP-2026-1008',
      ownerName: 'test owner',
      serviceName: 'Income & Domicile Certificate',
      serviceCode: 'SRV-005',
      category: 'Citizen Services',
      amount: 400,
      commissionRate: '14%',
      commissionEarned: 56,
      platformShare: 344,
      status: 'PROCESSING',
      dateTime: '18 Sept 2026, 12:05 am'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory] = useState<string>('ALL');

  const filteredRecords = records.filter(r => {
    const matchesCategory = activeCategory === 'ALL' || r.category === activeCategory;
    const matchesSearch =
      r.txNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.shopCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCommissionDistributed = records.reduce((acc, r) => acc + r.commissionEarned, 0);
  const totalVolumeProcessed = records.reduce((acc, r) => acc + r.amount, 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Percent className="h-6 w-6 text-emerald-600" />
              <span>Service Commission Ledger (Admin & Manager)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track real-time commission earnings per shop for every executed service transaction.
            </p>
          </div>

          <button
            onClick={() => alert('Exporting Commission Report CSV...')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Stats Summary Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Shop Commission</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹ {totalCommissionDistributed.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Credited to Shop Wallets</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Service Volume</span>
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹ {totalVolumeProcessed.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Gross Value Executed
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Transactions</span>
              <div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {records.length}
            </div>
            <p className="text-[11px] text-violet-600 font-semibold">
              Successful Executions
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Top Earning Outlet</span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Store className="h-4 w-4" />
              </div>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              Digital Seva Kendra
            </div>
            <p className="text-[11px] text-amber-600 font-mono font-bold">
              SHOP-2026-1004
            </p>
          </div>
        </div>



        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Txn ID, Shop Name, Owner, or Service Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Commission Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Service Commission Logs ({filteredRecords.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Txn ID & Date</th>
                  <th className="py-3.5 px-4">Shop Details</th>
                  <th className="py-3.5 px-4">Service Used</th>
                  <th className="py-3.5 px-4">Txn Amount</th>
                  <th className="py-3.5 px-4">Shop Commission Earned</th>
                  <th className="py-3.5 px-4">Platform Share</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No commission records found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-blue-700 block">{r.txNo}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{r.dateTime}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.shopName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{r.ownerName}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-blue-700">{r.shopCode}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{r.serviceName}</div>
                        <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.2 rounded mt-0.5">
                          Code: {r.serviceCode}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹ {r.amount}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-emerald-700 text-sm">
                          + ₹ {r.commissionEarned}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold">
                          ({r.commissionRate} rate)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        ₹ {r.platformShare}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          r.status === 'CREDITED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {r.status === 'CREDITED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {r.status}
                        </span>
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

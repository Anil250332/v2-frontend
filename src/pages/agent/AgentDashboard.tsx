import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { serviceStore, type ServiceItem } from '../../services/serviceStore';
import { walletStore } from '../../services/walletStore';
import {
  Layers,
  ArrowRight,
  Wallet,
  FileCheck,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeServices, setActiveServices] = useState<ServiceItem[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      setActiveServices(serviceStore.getActiveServices());
      setWalletBalance(walletStore.getBalance());
    };
    update();
    serviceStore.syncBackend();
    const unsub1 = serviceStore.subscribe(update);
    const unsub2 = walletStore.subscribe(update);
    return () => { unsub1(); unsub2(); };
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Welcome back, <span className="text-blue-700">{user?.full_name || 'Shop Retailer'}</span> 👋
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.shop_name || 'MP Online & CSC Center'} • Government Services Portal
            </p>
          </div>

          <button
            onClick={() => navigate('/agent/services')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Browse All Services</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* 2. Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-white/10 rounded-full" />
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Wallet Balance</span>
              </div>
              <p className="text-3xl font-black">₹{walletBalance.toFixed(0)}</p>
              <p className="text-[10px] text-emerald-200 mt-1">Available for service payments</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-white/10 rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Active Services</span>
              </div>
              <p className="text-3xl font-black">{activeServices.length}</p>
              <p className="text-[10px] text-blue-200 mt-1">Services available to apply</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/agent/my-requests')}
            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-white/10 rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-amber-100 uppercase tracking-wider">My Applications</span>
              </div>
              <p className="text-sm font-bold mt-2">Track your submitted applications →</p>
              <p className="text-[10px] text-amber-200 mt-1">View status & download outputs</p>
            </div>
          </div>
        </div>



        {/* 4. Active Services Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Active Services ({activeServices.length})</span>
            </h3>
            <button
              onClick={() => navigate('/agent/services')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {activeServices.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
                <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                No active services configured yet.
              </div>
            ) : (
              activeServices.map((service) => {
                const hasSubs = service.hasSubServices && (service.subServices?.length || 0) > 0;
                const subCount = service.subServices?.length || 0;
                return (
                  <div
                    key={service.id}
                    onClick={() => navigate('/agent/services')}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 p-5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col items-center justify-between text-center group min-h-[220px]"
                  >
                    {/* Top: Centered Logo Container */}
                    <div className="h-20 w-20 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-center p-2 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-200 shadow-xs overflow-hidden shrink-0">
                      {service.iconUrl ? (
                        <img
                          src={service.iconUrl.startsWith('http') || service.iconUrl.startsWith('data:') ? service.iconUrl : `http://localhost:5000${service.iconUrl}`}
                          alt={service.name}
                          className="h-full w-full object-contain p-0.5"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Layers className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                      )}
                    </div>

                    {/* Middle: Service Name & Code */}
                    <div className="my-2.5 space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                        {service.name}
                      </h4>
                      <p className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
                        {service.code}
                      </p>
                    </div>

                    {/* Bottom: Centered Badge */}
                    {hasSubs ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Sparkles className="h-3 w-3 text-indigo-500 group-hover:text-white" />
                        {subCount} Options
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full shadow-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors font-mono">
                        Fee ₹{service.fee}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AgentDashboard;

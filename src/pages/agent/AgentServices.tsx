import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  serviceStore,
  type ServiceItem,
  type SubServiceItem,
  type FormField,
  DROPDOWN_PRESETS
} from '../../services/serviceStore';
import { walletStore } from '../../services/walletStore';
import apiClient from '../../api/client';
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck,
  Wallet,
  Sparkles,
  Upload,
  ArrowRight,
  ArrowLeft,
  Store,
  ChevronRight,
  Grid3X3,
  IndianRupee,
  PlusCircle,
  MapPin,
  FileText,
  Loader2
} from 'lucide-react';

export default function AgentServices() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(500);

  // Sub-service drill-down state
  const [drillDownService, setDrillDownService] = useState<ServiceItem | null>(null);

  // Application Modal State
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedSubService, setSelectedSubService] = useState<SubServiceItem | null>(null);

  // Low Balance Modal State
  const [lowBalanceAlert, setLowBalanceAlert] = useState<{
    show: boolean;
    requiredFee: number;
    serviceName: string;
  }>({ show: false, requiredFee: 0, serviceName: '' });

  // Dynamic Form Values
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [rawFiles, setRawFiles] = useState<Record<string, File>>({});

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  interface AreaDetail {
    label: string;
    price: number;
  }
  interface WardDetail {
    wardNo: string;
    label: string;
    price: number;
  }

  // Routing / Location state for Operator assignment
  const [availableAreas, setAvailableAreas] = useState<{
    mode: 'single' | 'area_wise' | 'ward_wise';
    areas: string[];
    wards: string[];
    areaDetails?: AreaDetail[];
    wardDetails?: WardDetail[];
    basePrice?: number;
    hasOperators: boolean;
  }>({
    mode: 'single',
    areas: [],
    wards: [],
    areaDetails: [],
    wardDetails: [],
    basePrice: 0,
    hasOperators: true
  });
  const [selectedAreaLabel, setSelectedAreaLabel] = useState('');
  const [selectedWardNo, setSelectedWardNo] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        await serviceStore.syncBackend();
        await walletStore.syncBackend();
        if (isMounted) {
          setServices(serviceStore.getActiveServices());
          setWalletBalance(walletStore.getBalance());
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    const update = () => {
      setServices(serviceStore.getActiveServices());
      setWalletBalance(walletStore.getBalance());
    };

    const unsub1 = serviceStore.subscribe(update);
    const unsub2 = walletStore.subscribe(update);
    return () => {
      isMounted = false;
      unsub1();
      unsub2();
    };
  }, []);

  // Check Wallet Balance before opening application modal
  const handleInitiateApply = async (parentService: ServiceItem, subService?: SubServiceItem) => {
    const fee = subService ? subService.fee : parentService.fee;
    const sName = subService && subService.name !== parentService.name
      ? `${parentService.name} (${subService.name})`
      : (subService ? subService.name : parentService.name);

    if (walletBalance < fee) {
      setLowBalanceAlert({
        show: true,
        requiredFee: fee,
        serviceName: sName
      });
      return;
    }

    setSelectedService(parentService);
    setSelectedSubService(subService || null);
    setErrorMsg('');
    setFormInputs({});
    setUploadedFiles({});
    setRawFiles({});
    setSelectedAreaLabel('');
    setSelectedWardNo('');

    // Fetch routing areas for selected service
    try {
      const query = subService ? `sub_service_id=${subService.id}` : `service_id=${parentService.id}`;
      const res = await apiClient.get(`/operator-assignments/areas?${query}`);
      if (res.data.status === 'success') {
        const data = res.data.data;
        setAvailableAreas(data);
        if (data.areas && data.areas.length > 0) setSelectedAreaLabel(data.areas[0]);
        if (data.wards && data.wards.length > 0) setSelectedWardNo(data.wards[0]);
      }
    } catch (e) {
      console.error('Failed to fetch available areas:', e);
      setAvailableAreas({ mode: 'single', areas: [], wards: [], hasOperators: true });
    }
  };

  // Compute Active Applicable Fee & Dynamic Form Fields
  let baseFee = selectedService?.hasSubServices
    ? selectedSubService?.fee || 0
    : selectedService?.fee || 0;

  if (availableAreas.mode === 'area_wise' && selectedAreaLabel) {
    const match = availableAreas.areaDetails?.find(a => a.label === selectedAreaLabel);
    if (match) baseFee = match.price;
  } else if (availableAreas.mode === 'ward_wise' && selectedWardNo) {
    const match = availableAreas.wardDetails?.find(w => w.wardNo === selectedWardNo);
    if (match) baseFee = match.price;
  }

  const activeFee = baseFee;

  const activeFormFields: FormField[] = selectedService?.hasSubServices
    ? selectedSubService?.formFields || []
    : selectedService?.formFields || [];

  // Handle Form Field Change
  const handleInputChange = (fieldId: string, value: any) => {
    setFormInputs(prev => ({ ...prev, [fieldId]: value }));
  };

  // Handle Real File Input Change
  const handleFileChange = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [fieldId]: file.name }));
      setRawFiles(prev => ({ ...prev, [fieldId]: file }));
      setFormInputs(prev => ({ ...prev, [fieldId]: file.name }));
    }
  };

  // Submit Application to Real Backend API
  const handleApplyServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setErrorMsg('');

    if (activeFee > walletBalance) {
      setLowBalanceAlert({
        show: true,
        requiredFee: activeFee,
        serviceName: selectedSubService ? `${selectedService.name} (${selectedSubService.name})` : selectedService.name
      });
      setSelectedService(null);
      return;
    }

    // Validate Required Dynamic Form Fields
    for (const field of activeFormFields) {
      if (field.required && field.docUploader !== 'operator') {
        if (field.type === 'file') {
          if (!rawFiles[field.id]) {
            setErrorMsg(`Please upload required document: "${field.label}"`);
            return;
          }
        } else {
          const val = formInputs[field.id];
          if (!val || (typeof val === 'string' && !val.trim())) {
            setErrorMsg(`Please fill required field: "${field.label}"`);
            return;
          }
        }
      }
    }

    // Validate Location selection based on routing mode
    if (availableAreas.mode === 'area_wise' && !selectedAreaLabel) {
      setErrorMsg('Please select an Office / Area Location.');
      return;
    }
    if (availableAreas.mode === 'ward_wise' && !selectedWardNo) {
      setErrorMsg('Please select a Gwalior Ward Number.');
      return;
    }
    if (!availableAreas.hasOperators) {
      setErrorMsg('Is service ke liye Gwalior mein filhal koi official operator available nahi hai.');
      return;
    }

    setIsProcessing(true);

    const serviceTitle = selectedService.hasSubServices && selectedSubService
      ? (selectedService.name === selectedSubService.name
          ? selectedService.name
          : `${selectedService.name} (${selectedSubService.name})`)
      : selectedService.name;

    // Compile submitted form data labels & values
    const submittedFormData: Record<string, string> = {};
    activeFormFields.forEach(field => {
      if (field.docUploader === 'operator') {
        submittedFormData[`[Operator Deliverable Required]: ${field.label}`] = 'Pending Operator File Upload';
      } else if (field.type === 'file' && uploadedFiles[field.id]) {
        submittedFormData[field.label] = `${uploadedFiles[field.id]} (Uploaded Document)`;
      } else if (formInputs[field.id]) {
        submittedFormData[field.label] = formInputs[field.id];
      }
    });

    if (selectedAreaLabel) submittedFormData['Office / Area Location'] = selectedAreaLabel;
    if (selectedWardNo) submittedFormData['Gwalior Ward Number'] = `Ward #${selectedWardNo}`;

    // Construct FormData for multipart API call
    const formDataPayload = new FormData();
    if (selectedSubService?.id) {
      formDataPayload.append('subServiceId', selectedSubService.id.toString());
    } else {
      formDataPayload.append('serviceId', selectedService.id.toString());
    }

    if (selectedAreaLabel) formDataPayload.append('areaLabel', selectedAreaLabel);
    if (selectedWardNo) formDataPayload.append('wardNo', selectedWardNo);
    formDataPayload.append('formData', JSON.stringify(submittedFormData));

    // Append actual file objects
    activeFormFields.forEach(field => {
      if (field.type === 'file' && rawFiles[field.id]) {
        formDataPayload.append(`doc_${field.label}`, rawFiles[field.id]);
      }
    });

    try {
      const response = await apiClient.post('/applications/apply', formDataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.status === 'success') {
        const appNo = response.data.data?.applicationNo || 'APP-SUCCESS';
        await walletStore.syncBackend();
        setSuccessMsg(`Service application "${appNo}" for "${serviceTitle}" submitted successfully! Fee ₹${activeFee.toFixed(2)} deducted.`);
        setSelectedService(null);
        setDrillDownService(null);
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        setErrorMsg(response.data.message || 'Failed to apply.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Server error while submitting application.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subServices?.some(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Helper to render icon/logo
  const renderLogo = (iconUrl?: string) => {
    if (iconUrl) {
      const src = iconUrl.startsWith('http') || iconUrl.startsWith('data:') ? iconUrl : `http://localhost:5000${iconUrl}`;
      return <img src={src} alt="" className="h-full w-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />;
    }
    return <Layers className="h-8 w-8 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[500px] flex flex-col items-center justify-center py-20 px-4">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1">Services Catalog Loading...</h3>
          <p className="text-xs text-slate-500 max-w-sm text-center">
            Portal se saari active Government Services aur application forms load ho rahe hain. Kripya prateeksha karein.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-blue-800">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.3) 0%, transparent 50%)' }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Layers className="h-5 w-5 text-blue-300" />
                </div>
                <span>Government Services Portal</span>
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 mt-1 ml-11">
                Apply for certificates, documents & government services instantly
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/agent/my-requests"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all flex items-center gap-2 border border-white/20"
              >
                <FileCheck className="h-4 w-4" />
                <span>Track Applications</span>
              </Link>

              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-400/30 px-4 py-2 rounded-xl text-center shrink-0 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-emerald-300 uppercase block">Wallet</span>
                <span className="text-lg font-black text-emerald-300">₹{walletBalance.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Success Notification */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <Link to="/agent/my-requests" className="text-xs font-bold text-emerald-700 underline flex items-center gap-1">
              <span>View Status</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="relative w-full max-w-lg">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search services by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium"
            />
          </div>
        </div>

        {/* ===== DRILL-DOWN VIEW: Sub-Services of a Parent Service ===== */}
        {drillDownService ? (
          <div className="space-y-4">
            {/* Back Button & Parent Service Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <button
                onClick={() => setDrillDownService(null)}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer mb-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to All Services</span>
              </button>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {renderLogo(drillDownService.iconUrl)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{drillDownService.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Select a sub-service below to apply • Code: <span className="font-mono text-slate-700 font-bold">{drillDownService.code}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Services Grid — Larger Cards matching Screenshot 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(drillDownService.subServices || []).filter(s => s.isActive !== false).map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all flex flex-col justify-between space-y-5 group"
                >
                  {/* Top Row: Logo Box & Price Badge */}
                  <div className="flex items-start justify-between">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-blue-100 bg-blue-50/50 flex items-center justify-center overflow-hidden shrink-0 p-1.5 shadow-xs">
                      {renderLogo(sub.iconUrl || drillDownService.iconUrl)}
                    </div>

                    <span className="inline-flex items-center gap-1 font-mono text-sm sm:text-base font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full shadow-xs">
                      <IndianRupee className="h-4 w-4" />
                      {sub.fee}
                    </span>
                  </div>

                  {/* Middle Row: Name & Code */}
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                      {sub.code}
                    </p>
                  </div>

                  {/* Bottom Row: Full width Action Button */}
                  <button
                    onClick={() => handleInitiateApply(drillDownService, sub)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Apply Service</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ===== MAIN SERVICES GRID ===== */
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-blue-600" />
                Available Services ({filteredServices.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
                  <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  No active services found matching your search.
                </div>
              ) : (
                filteredServices.map((service) => {
                  const hasSubs = service.hasSubServices && (service.subServices?.length || 0) > 0;
                  const subCount = service.subServices?.length || 0;

                  return (
                    <div
                      key={service.id}
                      className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all flex flex-col justify-between space-y-5 group"
                    >
                      {/* Top Row: Big Logo Box on Left, Badge on Right */}
                      <div className="flex items-start justify-between">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-blue-100 bg-blue-50/50 flex items-center justify-center overflow-hidden shrink-0 p-1.5 shadow-xs">
                          {renderLogo(service.iconUrl)}
                        </div>

                        {hasSubs ? (
                          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-1.5 rounded-full shadow-xs">
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                            {subCount} Options
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-sm sm:text-base font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full shadow-xs">
                            <IndianRupee className="h-4 w-4" />
                            {service.fee}
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Service Name, then ID under it */}
                      <div className="space-y-1">
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                          {service.code}
                        </p>
                      </div>

                      {/* Bottom Row: Full width Action Button */}
                      <button
                        onClick={() => {
                          if (hasSubs) {
                            setDrillDownService(service);
                          } else {
                            handleInitiateApply(service);
                          }
                        }}
                        className={`w-full font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-white ${hasSubs
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          }`}
                      >
                        <span>{hasSubs ? 'View Options' : 'Apply Service'}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ===== LOW WALLET BALANCE ALERT MODAL ===== */}
        {lowBalanceAlert.show && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 text-center relative animate-in fade-in zoom-in duration-150">
              <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shrink-0 border-4 border-amber-50">
                <AlertTriangle className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Insufficient Wallet Balance!
                </h3>
                <p className="text-sm font-semibold text-amber-700 mt-1">
                  आपके वॉलेट में बैलेंस कम है। कृपया पहले पैसा ऐड करें।
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-left">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Service Name:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">{lowBalanceAlert.serviceName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Service Fee Required:</span>
                  <span className="font-mono font-bold text-rose-600">₹{lowBalanceAlert.requiredFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-200">
                  <span>Current Wallet Balance:</span>
                  <span className="font-mono font-bold text-emerald-600">₹{walletBalance.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setLowBalanceAlert({ show: false, requiredFee: 0, serviceName: '' })}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setLowBalanceAlert({ show: false, requiredFee: 0, serviceName: '' });
                    navigate('/agent/wallet');
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Money to Wallet</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== APPLICATION FORM MODAL ===== */}
        {selectedService && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 relative my-auto max-h-[90vh] flex flex-col overflow-hidden">

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {renderLogo(selectedSubService?.iconUrl || selectedService.iconUrl)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedSubService ? `${selectedService.name} (${selectedSubService.name})` : selectedService.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Fill required service details & upload documents to apply
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">

                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Smart Area / Ward Location Dropdown based on Service Routing Mode */}
                {availableAreas.mode !== 'single' && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span>{availableAreas.mode === 'area_wise' ? 'Select Office / Area Branch' : 'Select Gwalior Ward Location'}</span>
                    </div>

                    {availableAreas.mode === 'area_wise' && (
                      <select
                        value={selectedAreaLabel}
                        onChange={e => setSelectedAreaLabel(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      >
                        {availableAreas.areas.map((area, idx) => {
                          const detail = availableAreas.areaDetails?.find(a => a.label === area);
                          const priceStr = detail ? ` — ₹${detail.price.toFixed(2)}` : '';
                          return (
                            <option key={idx} value={area}>
                              📍 {area}{priceStr}
                            </option>
                          );
                        })}
                      </select>
                    )}

                    {availableAreas.mode === 'ward_wise' && (
                      <select
                        value={selectedWardNo}
                        onChange={e => setSelectedWardNo(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      >
                        {availableAreas.wards.map((ward, idx) => {
                          const detail = availableAreas.wardDetails?.find(w => w.wardNo === ward);
                          const priceStr = detail ? ` — ₹${detail.price.toFixed(2)}` : '';
                          return (
                            <option key={idx} value={ward}>
                              🏢 Gwalior Ward #{ward}{priceStr}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                )}

                {!availableAreas.hasOperators && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Is service ke liye abhi koi operator available nahi hai.</span>
                  </div>
                )}

                {/* Dynamic Form Fields (Configured by Admin/Manager) */}
                {activeFormFields.length > 0 ? (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Store className="h-4 w-4 text-blue-600" />
                      Required Service Form Fields & Documents
                    </h4>

                    <div className="space-y-4">
                      {activeFormFields.map((field) => {
                        if (field.docUploader === 'operator') return null;

                        return (
                          <div key={field.id} className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                            </label>

                            {field.type === 'file' ? (
                              <div className="border border-dashed border-emerald-300 bg-emerald-50/50 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                                    {uploadedFiles[field.id] || 'Choose document file (JPG/PDF)'}
                                  </span>
                                </div>
                                <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors shrink-0">
                                  <span>Browse File</span>
                                  <input
                                    type="file"
                                    onChange={e => handleFileChange(field.id, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            ) : field.type === 'select' ? (
                              <select
                                value={formInputs[field.id] || ''}
                                onChange={e => handleInputChange(field.id, e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="">{field.placeholder || '-- Select Option --'}</option>
                                {(field.presetType && field.presetType !== 'custom' && DROPDOWN_PRESETS[field.presetType as keyof typeof DROPDOWN_PRESETS]
                                  ? DROPDOWN_PRESETS[field.presetType as keyof typeof DROPDOWN_PRESETS].options
                                  : field.options || []
                                ).map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={formInputs[field.id] || ''}
                                onChange={e => handleInputChange(field.id, e.target.value)}
                                placeholder={field.placeholder || 'Enter address / details...'}
                                rows={3}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                value={formInputs[field.id] || ''}
                                onChange={e => handleInputChange(field.id, e.target.value)}
                                placeholder={field.placeholder || 'Enter details...'}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {activeFormFields.some(f => f.docUploader === 'operator') && (
                      <div className="mt-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-blue-900">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span>Operator Deliverable Response Slots ({activeFormFields.filter(f => f.docUploader === 'operator').length})</span>
                        </div>
                        <div className="text-[11px] text-blue-800 space-y-1">
                          {activeFormFields.filter(f => f.docUploader === 'operator').map(f => (
                            <div key={f.id} className="flex items-center gap-2 font-semibold">
                              <span>📄 {f.label}</span>
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase">Operator Output Slot</span>
                            </div>
                          ))}
                          <p className="text-[10px] text-blue-600 italic pt-0.5">
                            (These document files will be generated and uploaded by the operator upon task completion).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No additional form fields required for this service.</p>
                    <p className="text-[11px] text-slate-500">Click below to submit application & pay service fee.</p>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <form onSubmit={handleApplyServiceSubmit} className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs">
                  <span className="text-slate-500 block">Service Fee:</span>
                  <span className="font-mono font-black text-sm text-slate-900">₹{activeFee.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>{isProcessing ? 'Processing...' : `Pay ₹${activeFee.toFixed(2)} & Apply`}</span>
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

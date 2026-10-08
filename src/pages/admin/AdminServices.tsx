import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { apiClient } from '../../api/client';
import {
  serviceStore,
  type ServiceItem,
  type SubServiceItem,
  type FormField,
  type FormFieldType,
  DROPDOWN_PRESETS
} from '../../services/serviceStore';
import {
  Layers,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
  Trash2,
  Eye,
  Upload,
  FileText,
  Percent,
  IndianRupee,
  Plus,
  Sparkles,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Smartphone,
  Building2,
  MapPin,
  Loader2,
  Link2
} from 'lucide-react';

export default function AdminServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'sub' | 'active' | 'disabled'>('all');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [iconUploading, setIconUploading] = useState(false);
  const [hasSubServices, setHasSubServices] = useState(false);
  const [operatorAssignmentMode, setOperatorAssignmentMode] = useState<'single' | 'area_wise' | 'ward_wise'>('single');

  // Direct Service Pricing & Form
  const [fee, setFee] = useState<number | string>('');
  const [adminCommissionPercent, setAdminCommissionPercent] = useState<number | string>('');
  const [directFormFields, setDirectFormFields] = useState<FormField[]>([]);

  // Sub-Services List & Active Sub-Service Tab
  const [subServices, setSubServices] = useState<SubServiceItem[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(0);

  // Preview Drawer Modal
  const [previewService, setPreviewService] = useState<ServiceItem | null>(null);

  // File input ref
  const serviceIconInputRef = useRef<HTMLInputElement>(null);

  // ── Operator Assignment Modal State ──
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allOperators, setAllOperators] = useState<{ id: string; fullName: string; userCode: string; mobile: string }[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [assignSelectedServiceId, setAssignSelectedServiceId] = useState('');
  const [assignSelectedOperatorId, setAssignSelectedOperatorId] = useState('');
  const [assignAreaLabel, setAssignAreaLabel] = useState('');
  const [assignWardNo, setAssignWardNo] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // ── Admin Price Approval Desk State ──
  const [activeMainTab, setActiveMainTab] = useState<'services' | 'price_requests'>('services');
  const [allPriceRequests, setAllPriceRequests] = useState<any[]>([]);
  const [reviewModalRequest, setReviewModalRequest] = useState<any | null>(null);
  const [reviewApprovedPrice, setReviewApprovedPrice] = useState<string>('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchOperators = useCallback(async () => {
    try {
      const res = await apiClient.get('/users?role=operator');
      if (res.data.status === 'success') {
        setAllOperators(res.data.data.filter((o: any) => o.approvalStatus === 'approved'));
      }
    } catch (e) { console.error('Failed to fetch operators:', e); }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await apiClient.get('/operator-assignments');
      if (res.data.status === 'success') {
        setAllAssignments(res.data.data);
      }
    } catch (e) { console.error('Failed to fetch assignments:', e); }
  }, []);

  const fetchPriceRequests = useCallback(async () => {
    try {
      const res = await apiClient.get('/services/price-requests');
      if (res.data.status === 'success') {
        setAllPriceRequests(res.data.data);
      }
    } catch (e) { console.error('Failed to fetch price requests:', e); }
  }, []);

  const handleReviewPriceRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setReviewSubmitting(true);
    try {
      const res = await apiClient.patch(`/services/price-requests/${requestId}/review`, {
        status,
        approvedPrice: parseFloat(reviewApprovedPrice),
        adminRemarks: reviewRemarks
      });

      if (res.data.status === 'success') {
        setSuccessMsg(res.data.message || `Price request ${status} successfully!`);
        setReviewModalRequest(null);
        setReviewRemarks('');
        await fetchPriceRequests();
        await serviceStore.syncBackend();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to review price request.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => {
    const update = () => {
      setServices(serviceStore.getServices());
    };
    update();
    serviceStore.syncBackend();
    const unsubscribe = serviceStore.subscribe(update);
    fetchOperators();
    fetchAssignments();
    fetchPriceRequests();
    return unsubscribe;
  }, [fetchOperators, fetchAssignments, fetchPriceRequests]);

  // Get the routing mode for the currently selected service in assign modal
  const getSelectedServiceMode = (): 'single' | 'area_wise' | 'ward_wise' => {
    if (!assignSelectedServiceId) return 'single';
    const svc = services.find(s => s.id === assignSelectedServiceId);
    return svc?.operatorAssignmentMode || 'single';
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');
    setAssignSuccess('');

    if (!assignSelectedServiceId) {
      setAssignError('Kripya ek Service select karein.');
      return;
    }

    if (!assignSelectedOperatorId) {
      setAssignError('Kripya ek Operator select karein.');
      return;
    }

    const mode = getSelectedServiceMode();
    if (mode === 'area_wise' && (!assignAreaLabel || !assignAreaLabel.trim())) {
      setAssignError('Office / Area Name enter karna mandatory hai (Area Wise mode ke liye).');
      return;
    }

    if (mode === 'ward_wise') {
      if (!assignWardNo || isNaN(Number(assignWardNo))) {
        setAssignError('Valid Gwalior Ward Number (1-100) enter karna mandatory hai (Ward Wise mode ke liye).');
        return;
      }
      const wardNum = parseInt(assignWardNo, 10);
      if (wardNum < 1 || wardNum > 100) {
        setAssignError('Ward Number 1 se 100 ke beech hona chahiye.');
        return;
      }
    }

    setAssignSubmitting(true);
    try {
      const res = await apiClient.post('/operator-assignments', {
        operator_id: assignSelectedOperatorId,
        service_id: assignSelectedServiceId,
        area_label: mode === 'area_wise' ? assignAreaLabel.trim() : null,
        ward_no: mode === 'ward_wise' ? String(assignWardNo).trim() : null
      });
      if (res.data.status === 'success') {
        setAssignSuccess(res.data.message || 'Operator successfully assigned to service!');
        setAssignSelectedServiceId('');
        setAssignSelectedOperatorId('');
        setAssignAreaLabel('');
        setAssignWardNo('');
        await fetchAssignments();
        setTimeout(() => setAssignSuccess(''), 4000);
      }
    } catch (err: any) {
      setAssignError(err.response?.data?.message || 'Failed to assign operator.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setIconUrl('');
    setHasSubServices(false);
    setOperatorAssignmentMode('single');
    setFee('');
    setAdminCommissionPercent('');
    setDirectFormFields([]);
    setSubServices([]);
    setSelectedSubIndex(0);
    setWizardStep(1);
    setIsEditMode(false);
    setEditingServiceId(null);
    setErrorMsg('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setIsEditMode(true);
    setEditingServiceId(service.id);
    setName(service.name);
    setCode(service.code);
    setIconUrl(service.iconUrl || '');
    setHasSubServices(service.hasSubServices);
    setOperatorAssignmentMode(service.operatorAssignmentMode || 'single');
    setFee(service.fee || '');
    setAdminCommissionPercent(service.adminCommissionPercent || '');
    setDirectFormFields(service.formFields || []);
    setSubServices(service.subServices || []);
    setSelectedSubIndex(0);
    setIsModalOpen(true);
  };

  // Helper for rendering image URLs safely
  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) return url;
    return `http://localhost:5000${url}`;
  };

  // Icon Upload Handler
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setIconUrl(localPreview);
    setIconUploading(true);

    try {
      const serverUrl = await serviceStore.uploadIcon(file);
      if (serverUrl) {
        setIconUrl(serverUrl);
      }
    } catch {
      // Keep local preview
    } finally {
      setIconUploading(false);
    }
  };

  // Add Field to Form Builder
  const handleAddField = (target: 'direct' | number, fieldType: FormFieldType) => {
    const newField: FormField = {
      id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: fieldType,
      label: '',
      placeholder: '',
      required: true,
      options: fieldType === 'select' ? [] : undefined,
      presetType: fieldType === 'select' ? 'custom' : undefined,
      docUploader: fieldType === 'file' ? 'shop' : undefined,
      helpText: ''
    };

    if (target === 'direct') {
      setDirectFormFields([...directFormFields, newField]);
    } else {
      const updated = [...subServices];
      if (updated[target]) {
        updated[target].formFields = [...(updated[target].formFields || []), newField];
        setSubServices(updated);
      }
    }
  };

  // Move Field Up or Down
  const handleMoveField = (target: 'direct' | number, index: number, direction: 'up' | 'down') => {
    const swap = (arr: FormField[], i: number, j: number) => {
      const copy = [...arr];
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
      return copy;
    };

    if (target === 'direct') {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= directFormFields.length) return;
      setDirectFormFields(swap(directFormFields, index, targetIndex));
    } else {
      const updated = [...subServices];
      const fields = updated[target]?.formFields || [];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= fields.length) return;
      updated[target].formFields = swap(fields, index, targetIndex);
      setSubServices(updated);
    }
  };

  // Remove Field
  const handleRemoveField = (target: 'direct' | number, fieldId: string) => {
    if (target === 'direct') {
      setDirectFormFields(directFormFields.filter(f => f.id !== fieldId));
    } else {
      const updated = [...subServices];
      if (updated[target]) {
        updated[target].formFields = updated[target].formFields.filter(f => f.id !== fieldId);
        setSubServices(updated);
      }
    }
  };

  // Update Field Property
  const handleUpdateField = (
    target: 'direct' | number,
    fieldId: string,
    key: keyof FormField,
    value: any
  ) => {
    const updateFn = (f: FormField): FormField => {
      if (f.id !== fieldId) return f;
      if (key === 'presetType') {
        const preset = DROPDOWN_PRESETS[value as keyof typeof DROPDOWN_PRESETS];
        return {
          ...f,
          presetType: value,
          options: preset && preset.options.length > 0 ? [...preset.options] : f.options || []
        };
      }
      return { ...f, [key]: value };
    };

    if (target === 'direct') {
      setDirectFormFields(directFormFields.map(updateFn));
    } else {
      const updated = [...subServices];
      if (updated[target]) {
        updated[target].formFields = updated[target].formFields.map(updateFn);
        setSubServices(updated);
      }
    }
  };

  // Add Sub-Service
  const handleAddSubService = () => {
    const subNum = subServices.length + 1;
    const newSub: SubServiceItem = {
      id: `sub-${Date.now()}`,
      name: '',
      code: `${code || 'SRV'}-SUB${subNum}-${Math.floor(100 + Math.random() * 900)}`,
      iconUrl: '',
      fee: '' as unknown as number,
      adminCommissionPercent: '' as unknown as number,
      description: '',
      formFields: [],
      isActive: true,
      operatorAssignmentMode: 'single'
    };
    const nextList = [...subServices, newSub];
    setSubServices(nextList);
    setSelectedSubIndex(nextList.length - 1);
  };

  // Remove Sub-Service
  const handleRemoveSubService = (index: number) => {
    const filtered = subServices.filter((_, i) => i !== index);
    setSubServices(filtered);
    if (selectedSubIndex >= filtered.length) {
      setSelectedSubIndex(Math.max(0, filtered.length - 1));
    }
  };

  // Step Validation for Wizard
  const validateStep = (step: number) => {
    setErrorMsg('');
    if (step === 1) {
      if (!name.trim()) {
        setErrorMsg('Please enter a valid Service Name.');
        return false;
      }
    } else if (step === 2) {
      if (hasSubServices) {
        if (subServices.length === 0) {
          setErrorMsg('Please add at least one Sub-Service or switch off "Having Sub-Services".');
          return false;
        }
        for (const sub of subServices) {
          if (!sub.name.trim()) {
            setErrorMsg('All Sub-Services must have a valid Name.');
            return false;
          }
          if (!sub.fee || Number(sub.fee) <= 0) {
            setErrorMsg(`Please enter a valid Price (₹) for "${sub.name}".`);
            return false;
          }
        }
      } else {
        const parsedFee = parseFloat(fee as string) || 0;
        if (!fee || parsedFee <= 0) {
          setErrorMsg('Please enter a valid Service Price (₹).');
          return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(wizardStep)) {
      setWizardStep((prev) => Math.min(3, prev + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setWizardStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3);
  };

  // Save Service Submit
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Service Name is mandatory.');
      return;
    }

    const parsedFee = parseFloat(fee as string) || 0;
    const parsedComm = parseFloat(adminCommissionPercent as string) || 0;

    if (hasSubServices) {
      if (subServices.length === 0) {
        setErrorMsg('Please add at least one Sub-Service or switch off "Having Sub-Services".');
        return;
      }
      for (const sub of subServices) {
        if (!sub.name.trim()) {
          setErrorMsg('All Sub-Services must have a valid Name.');
          return;
        }
        if (!sub.fee || Number(sub.fee) <= 0) {
          setErrorMsg(`Please enter a valid Price (₹) for "${sub.name}".`);
          return;
        }
      }
    } else {
      if (!fee || parsedFee <= 0) {
        setErrorMsg('Please enter a valid Service Price (₹).');
        return;
      }
    }

    const serviceData = {
      name: name.trim(),
      code: code.trim(),
      category: 'Citizen Services',
      description: '',
      iconUrl,
      hasSubServices,
      fee: hasSubServices ? 0 : parsedFee,
      adminCommissionPercent: hasSubServices ? 0 : parsedComm,
      formFields: hasSubServices ? [] : directFormFields,
      subServices: hasSubServices ? subServices : [],
      isActive: true,
      operatorAssignmentMode: operatorAssignmentMode || 'single'
    };

    if (isEditMode && editingServiceId) {
      await serviceStore.updateService(editingServiceId, serviceData);
      setSuccessMsg(`Service "${name}" updated successfully!`);
    } else {
      await serviceStore.addService(serviceData);
      setSuccessMsg(`New Master Service "${name}" created & published successfully!`);
    }

    setIsModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };


  // Toggle Service
  const handleToggle = async (service: ServiceItem) => {
    await serviceStore.toggleService(service.id);
    setSuccessMsg(`Service "${service.name}" is now ${!service.isActive ? 'ACTIVE' : 'DISABLED'}.`);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // Delete Service
  const handleDelete = async (service: ServiceItem) => {
    if (window.confirm(`Are you sure you want to permanently delete service "${service.name}"?`)) {
      await serviceStore.deleteService(service.id);
      setSuccessMsg(`Service "${service.name}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  // Filter Catalog
  const filteredServices = services.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subServices?.some(sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'direct') return !s.hasSubServices;
    if (filterType === 'sub') return s.hasSubServices;
    if (filterType === 'active') return s.isActive;
    if (filterType === 'disabled') return !s.isActive;
    return true;
  });

  // Current active sub-service (if sub-services enabled)
  const currentSub = hasSubServices && subServices.length > 0
    ? subServices[selectedSubIndex] || subServices[0]
    : null;

  // Active fields for dynamic preview
  const currentActiveFields = hasSubServices
    ? currentSub?.formFields || []
    : directFormFields;

  const currentPreviewTitle = hasSubServices
    ? `${name || 'Service'} - ${currentSub?.name || `Sub-Service ${selectedSubIndex + 1}`}`
    : name || 'Service Application Form';

  const currentPreviewFee = hasSubServices
    ? currentSub?.fee || 0
    : fee || 0;

  // Reusable Form Builder Component for a target ('direct' | number)
  const renderFormBuilder = (target: 'direct' | number, fields: FormField[]) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-indigo-600" />
          Form Fields & Document Slots ({fields.length})
        </h4>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleAddField(target, 'text')}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
          >
            + Input
          </button>
          <button
            type="button"
            onClick={() => handleAddField(target, 'select')}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
          >
            + Dropdown
          </button>
          <button
            type="button"
            onClick={() => handleAddField(target, 'file')}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
          >
            + Doc Upload
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
          No form fields added yet. Click "+ Input", "+ Dropdown", or "+ Doc Upload" buttons above.
        </div>
      ) : (
        <div className="space-y-2.5">
          {fields.map((field, fIdx) => (
            <div
              key={field.id}
              className={`p-3 rounded-xl border transition-all ${field.type === 'file'
                  ? field.docUploader === 'shop'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-blue-50/40 border-blue-200'
                  : field.type === 'select'
                    ? 'bg-indigo-50/40 border-indigo-200'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {fIdx + 1}
                  </span>
                  {field.type === 'file' ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      📄 DOC UPLOAD
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500">Type:</span>
                      <select
                        value={field.type}
                        onChange={e => handleUpdateField(target, field.id, 'type', e.target.value as FormFieldType)}
                        className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="text">🔤 Text Input</option>
                        <option value="number">🔢 Number</option>
                        <option value="date">📅 Date Picker</option>
                        <option value="textarea">📝 Long Text / Address</option>
                        <option value="select">📋 Dropdown / Select</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveField(target, fIdx, 'up')}
                    disabled={fIdx === 0}
                    className={`p-1 text-slate-400 hover:text-blue-600 cursor-pointer ${fIdx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveField(target, fIdx, 'down')}
                    disabled={fIdx === fields.length - 1}
                    className={`p-1 text-slate-400 hover:text-blue-600 cursor-pointer ${fIdx === fields.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(target, field.id)}
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer ml-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => handleUpdateField(target, field.id, 'label', e.target.value)}
                    placeholder="Enter field label name..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {field.type === 'file' ? (
                  <div className="sm:col-span-5 flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-emerald-800 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name={`uploader-${target}-${field.id}`}
                        checked={field.docUploader === 'shop'}
                        onChange={() => handleUpdateField(target, field.id, 'docUploader', 'shop')}
                        className="text-emerald-600"
                      />
                      <span>🛍️ MP Online Shop</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-blue-800 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name={`uploader-${target}-${field.id}`}
                        checked={field.docUploader === 'operator'}
                        onChange={() => handleUpdateField(target, field.id, 'docUploader', 'operator')}
                        className="text-blue-600"
                      />
                      <span>👨‍💻 Operator Resp</span>
                    </label>
                  </div>
                ) : field.type === 'select' ? (
                  <div className="sm:col-span-5 space-y-1">
                    <select
                      value={field.presetType || 'custom'}
                      onChange={e => handleUpdateField(target, field.id, 'presetType', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-indigo-900"
                    >
                      {Object.entries(DROPDOWN_PRESETS).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                    {(!field.presetType || field.presetType === 'custom') && (
                      <input
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={e =>
                          handleUpdateField(
                            target,
                            field.id,
                            'options',
                            e.target.value.split(',').map(s => s.trim())
                          )
                        }
                        placeholder="Option 1, Option 2, Option 3 (comma separated)"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    )}
                  </div>
                ) : (
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={field.placeholder || ''}
                      onChange={e => handleUpdateField(target, field.id, 'placeholder', e.target.value)}
                      placeholder="Placeholder text (Optional)..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                )}

                <div className="sm:col-span-2 flex items-center">
                  <label className="flex items-center gap-1 text-xs text-slate-700 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => handleUpdateField(target, field.id, 'required', e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Req</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Live Retailer Mock Preview Component
  const renderLivePreview = () => (
    <div className="bg-slate-900 rounded-3xl p-4 text-white shadow-xl flex flex-col justify-between border border-slate-800 self-start sticky top-2">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Retailer View
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
            ₹{currentPreviewFee} Fee
          </span>
        </div>

        <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2.5 border-b border-slate-700 pb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden text-white font-bold">
              {iconUrl ? (
                <img src={getImageUrl(iconUrl)} alt="icon" className="h-full w-full object-cover" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
            </div>
            <div>
              <h5 className="font-bold text-xs text-white line-clamp-1">
                {currentPreviewTitle}
              </h5>
              <p className="text-[10px] text-slate-400">Citizen Application Form</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {currentActiveFields.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Form is currently empty. Fields added on the left will render here live.
              </div>
            ) : (
              currentActiveFields.map((f, i) => (
                <div key={f.id || i} className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    {f.label || `Field #${i + 1}`} {f.required && <span className="text-rose-400">*</span>}
                  </label>

                  {f.type === 'file' ? (
                    <div className={`p-2 rounded-xl border border-dashed flex items-center justify-between text-xs ${f.docUploader === 'shop'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        <Upload className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium">
                          {f.docUploader === 'shop' ? 'MP Online Shop Uploads File' : 'Operator Result'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-black/40 px-1.5 py-0.5 rounded">
                        {f.docUploader?.toUpperCase()}
                      </span>
                    </div>
                  ) : f.type === 'select' ? (
                    <select
                      disabled
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 opacity-90"
                    >
                      <option>{f.placeholder || '-- Select Option --'}</option>
                      {f.options?.slice(0, 5).map((opt, oIdx) => (
                        <option key={oIdx}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      disabled
                      placeholder={f.placeholder || 'Enter value...'}
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 opacity-90"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Success / Error Notification */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800">
                  Master Services & Dynamic Form Engine
                </h1>
                <p className="text-xs text-slate-500">
                  Configure services, sub-services, dynamic forms, file requirements, prices, and admin commission %.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => {
                setShowAssignModal(true);
                setAssignSelectedServiceId('');
                setAssignSelectedOperatorId('');
                setAssignAreaLabel('');
                setAssignWardNo('');
                setAssignError('');
                setAssignSuccess('');
              }}
              className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Link2 className="h-4 w-4" />
              <span>Assign Service to Operator</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="w-full md:w-auto bg-[#1565c0] hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add New Master Service</span>
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveMainTab('services')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeMainTab === 'services'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Master Services & Configurations ({services.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('price_requests');
              fetchPriceRequests();
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeMainTab === 'price_requests'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <IndianRupee className="h-4 w-4" />
            <span>Operator Price Approval Desk</span>
            {allPriceRequests.filter((p: any) => p.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {allPriceRequests.filter((p: any) => p.status === 'pending').length} New
              </span>
            )}
          </button>
        </div>

        {activeMainTab === 'price_requests' ? (
          /* Operator Price Approval Desk Section */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-teal-600" />
                  <span>Operator Price Change Approval Desk</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review & approve operator custom rate requests for Single Services, Area Branches, or Ward Locations. Approving immediately updates the live rate.
                </p>
              </div>

              <button
                onClick={fetchPriceRequests}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Refresh Requests</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Request No</th>
                    <th className="py-3 px-4">Operator Name</th>
                    <th className="py-3 px-4">Service & Scope</th>
                    <th className="py-3 px-4 text-center">Current Rate</th>
                    <th className="py-3 px-4 text-center">Requested Rate</th>
                    <th className="py-3 px-4">Operator Reason</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPriceRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs italic">
                        No operator price change requests found.
                      </td>
                    </tr>
                  ) : (
                    allPriceRequests.map((pr: any) => (
                      <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{pr.requestNo}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {pr.operatorName}
                          <span className="text-[11px] text-slate-400 block font-normal">{pr.operatorMobile}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{pr.subServiceName}</span>
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold inline-block mt-0.5">
                            {pr.areaOrWardLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 line-through">
                          ₹{pr.currentPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-emerald-600 text-sm">
                          ₹{pr.requestedPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-xs">
                          {pr.reason || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            pr.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            pr.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          }`}>
                            {pr.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {pr.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setReviewModalRequest(pr);
                                  setReviewApprovedPrice(String(pr.requestedPrice || ''));
                                  setReviewRemarks('');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                              >
                                Review Request
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              {pr.adminRemarks ? `Remarks: ${pr.adminRemarks}` : 'Reviewed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Review Request Modal */}
            {reviewModalRequest && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 relative animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 text-sm">Review Operator Price Change Request</h3>
                    <button onClick={() => setReviewModalRequest(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <p><span className="font-bold">Operator:</span> {reviewModalRequest.operatorName} ({reviewModalRequest.operatorMobile})</p>
                    <p><span className="font-bold">Service/Scope:</span> {reviewModalRequest.subServiceName} ({reviewModalRequest.areaOrWardLabel})</p>
                    <p><span className="font-bold">Requested Rate:</span> <span className="font-bold text-emerald-600 text-sm">₹{reviewModalRequest.requestedPrice.toFixed(2)}</span> (Current: ₹{reviewModalRequest.currentPrice.toFixed(2)})</p>
                    {reviewModalRequest.reason && <p><span className="font-bold">Reason:</span> {reviewModalRequest.reason}</p>}
                  </div>

                  {/* Admin Editable Approved Amount Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Approved Amount (₹) <span className="text-rose-500">*</span>
                      <span className="text-[10px] font-normal text-slate-500 block">Modify this value if you want to set a custom approved rate</span>
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      placeholder="Enter amount to set..."
                      value={reviewApprovedPrice}
                      onChange={(e) => setReviewApprovedPrice(e.target.value)}
                      className="w-full bg-white border border-teal-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      required
                    />
                  </div>

                  {/* Live Profit & Share Breakdown Card for Admin */}
                  {(() => {
                    const appFee = parseFloat(reviewApprovedPrice || '0');
                    if (isNaN(appFee) || appFee <= 0) return null;
                    const commPercent = Number(reviewModalRequest.adminCommissionPercent || 0);
                    const adminShare = (appFee * commPercent) / 100;
                    const opShare = appFee - adminShare;

                    return (
                      <div className="bg-indigo-50/90 border border-indigo-200 p-3.5 rounded-xl space-y-1.5 text-xs text-indigo-950">
                        <div className="font-bold text-[10px] text-indigo-800 uppercase tracking-wider mb-0.5">💰 Financial Distribution Breakdown</div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Agent Pays (Wallet Deduction):</span>
                          <strong className="font-mono text-slate-900">₹{appFee.toFixed(2)}</strong>
                        </div>
                        {commPercent > 0 && (
                          <div className="flex justify-between items-center text-indigo-800 font-semibold">
                            <span>Admin Commission Profit ({commPercent}%):</span>
                            <strong className="font-mono text-indigo-900">+ ₹{adminShare.toFixed(2)}</strong>
                          </div>
                        )}
                        <div className="flex justify-between items-center font-bold text-emerald-900 pt-1.5 border-t border-indigo-200/80">
                          <span>Operator Payout Earning:</span>
                          <strong className="font-mono text-sm text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            ₹{opShare.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Admin Remarks (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Add note for operator..."
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleReviewPriceRequest(reviewModalRequest.id, 'rejected')}
                      disabled={reviewSubmitting}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => handleReviewPriceRequest(reviewModalRequest.id, 'approved')}
                      disabled={reviewSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      Approve & Apply New Rate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Master Services Catalog View */
          <>
        {/* Search & Filter Chips Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search services by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${filterType === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All ({services.length})
              </button>
              <button
                onClick={() => setFilterType('direct')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${filterType === 'direct'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Direct Forms ({services.filter(s => !s.hasSubServices).length})
              </button>
              <button
                onClick={() => setFilterType('sub')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${filterType === 'sub'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Sub-Services ({services.filter(s => s.hasSubServices).length})
              </button>
              <button
                onClick={() => setFilterType('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${filterType === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
              >
                Active ({services.filter(s => s.isActive).length})
              </button>
              <button
                onClick={() => setFilterType('disabled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${filterType === 'disabled'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
              >
                Disabled ({services.filter(s => !s.isActive).length})
              </button>
            </div>
          </div>
        </div>

        {/* Services Master Catalog Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              Catalog Directory ({filteredServices.length} Services)
            </h2>
            <span className="text-xs text-slate-400">Master Services</span>
          </div>

          {filteredServices.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">No services match your filters.</p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-3 text-xs text-blue-600 hover:underline font-bold cursor-pointer"
              >
                + Create new service
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Service & Icon</th>
                    <th className="py-3 px-4">Hierarchy Type</th>
                    <th className="py-3 px-4">Operator Mode</th>
                    <th className="py-3 px-4">Pricing & Admin Share</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredServices.map(service => {
                    return (
                      <tr key={service.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Service Icon & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                              {service.iconUrl ? (
                                <img
                                  src={getImageUrl(service.iconUrl)}
                                  alt={service.name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Layers className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                                <span>{service.name}</span>
                              </div>
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600 font-semibold">
                                {service.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Hierarchy Type */}
                        <td className="py-3.5 px-4">
                          {service.hasSubServices ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-200">
                              <Layers className="h-3 w-3" />
                              {service.subServices?.length || 0} Sub-Services
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                              <FileText className="h-3 w-3 text-slate-500" />
                              Direct Single Form
                            </span>
                          )}
                        </td>

                        {/* Operator Assignment Mode + Assigned Details */}
                        <td className="py-3.5 px-4">
                          {(() => {
                            const mode = service.operatorAssignmentMode || 'single';
                            const rawAssignments = allAssignments.filter(
                              (a: any) => String(a.serviceId) === String(service.id)
                            );

                            // Deduplicate assignments for display
                            const uniqueMap = new Map<string, any>();
                            rawAssignments.forEach((a: any) => {
                              const key = mode === 'single'
                                ? `${a.operatorId}`
                                : mode === 'area_wise'
                                  ? `${a.operatorId}_${a.areaLabel || ''}`
                                  : `${a.operatorId}_${a.wardNo || ''}`;
                              if (!uniqueMap.has(key)) {
                                uniqueMap.set(key, a);
                              }
                            });
                            const serviceAssignments = Array.from(uniqueMap.values());

                            const modeBadge = mode === 'ward_wise' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                                <Building2 className="h-3 w-3" />
                                Ward Wise
                              </span>
                            ) : mode === 'area_wise' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                                <MapPin className="h-3 w-3" />
                                Area Wise
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                <UserCheck className="h-3 w-3" />
                                Single Operator
                              </span>
                            );

                            return (
                              <div className="space-y-1">
                                {modeBadge}
                                {serviceAssignments.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {serviceAssignments.slice(0, 4).map((a: any, idx: number) => {
                                      let detailLabel = a.operatorName || 'Operator';
                                      if (mode === 'area_wise' && a.areaLabel) {
                                        detailLabel += ` • ${a.areaLabel}`;
                                      } else if (mode === 'ward_wise' && a.wardNo) {
                                        detailLabel += ` • Ward #${a.wardNo}`;
                                      }

                                      return (
                                        <span key={a.id || idx} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                          {detailLabel}
                                        </span>
                                      );
                                    })}
                                    {serviceAssignments.length > 4 && (
                                      <span className="text-[9px] font-bold text-slate-400">+{serviceAssignments.length - 4} more</span>
                                    )}
                                  </div>
                                )}
                                {serviceAssignments.length === 0 && (
                                  <p className="text-[9px] text-slate-400 italic">No operator assigned</p>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Pricing & Admin Share */}
                        <td className="py-3.5 px-4">
                          {service.hasSubServices ? (
                            (() => {
                              const fees = service.subServices?.map(s => s.fee).filter(f => f > 0) || [];
                              const minFee = fees.length > 0 ? Math.min(...fees) : 0;
                              const maxFee = fees.length > 0 ? Math.max(...fees) : 0;
                              const comm = service.subServices?.[0]?.adminCommissionPercent || 0;

                              return (
                                <div>
                                  <div className="font-bold text-slate-800">
                                    {minFee === maxFee ? `₹${minFee}` : `₹${minFee} - ₹${maxFee}`}
                                  </div>
                                  <div className="text-[10px] text-indigo-600 font-medium flex items-center gap-0.5">
                                    <Percent className="h-2.5 w-2.5" />
                                    Admin: {comm}%
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div>
                              <div className="font-bold text-slate-800">
                                ₹{Number(service.fee || 0).toFixed(2)}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-medium flex items-center gap-0.5">
                                <Percent className="h-2.5 w-2.5" />
                                Admin: {service.adminCommissionPercent}% (₹{((Number(service.fee || 0) * Number(service.adminCommissionPercent || 0)) / 100).toFixed(2)})
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggle(service)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${service.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                          >
                            {service.isActive ? 'ACTIVE' : 'DISABLED'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewService(service)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="View Form Structure"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(service)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Service & Forms"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(service)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Service"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CREATE (STEP WIZARD) VS EDIT (ALL-IN-ONE DIRECT TABS)              */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className={`bg-white rounded-3xl shadow-2xl border border-slate-100 w-full ${showLivePreview ? 'max-w-6xl' : 'max-w-4xl'} max-h-[94vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200 transition-all`}>

              {/* Modal Header */}
              <div className="px-6 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      {isEditMode ? `Edit Service: ${name || 'Service'}` : 'Create New Master Service'}
                    </h3>
                    <p className="text-[11px] text-white/80">
                      {isEditMode
                        ? 'Direct Edit: modify core details, sub-services, and form builder instantly'
                        : `Step ${wizardStep} of 3 • ${wizardStep === 1 ? 'Service Core Details' : wizardStep === 2 ? 'Pricing & Hierarchy' : 'Dynamic Form Builder'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${showLivePreview ? 'bg-white text-blue-800 shadow-xs' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    title="Toggle Live Retailer Preview"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{showLivePreview ? 'Hide Preview' : 'Show Preview'}</span>
                  </button>


                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Step Navigation Progress Bar (Only for CREATE NEW MODE) */}
              {!isEditMode && (
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 shrink-0">
                  <div className="flex items-center justify-between max-w-2xl mx-auto">
                    {/* Step 1 Pill */}
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${wizardStep === 1 ? 'text-blue-700' : wizardStep > 1 ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                    >
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${wizardStep === 1 ? 'bg-blue-600 text-white shadow-xs' : wizardStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {wizardStep > 1 ? <Check className="h-3.5 w-3.5" /> : '1'}
                      </span>
                      <span>1. Basic Details</span>
                    </button>

                    <div className={`flex-1 h-0.5 mx-3 ${wizardStep > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                    {/* Step 2 Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep(1)) setWizardStep(2);
                      }}
                      className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${wizardStep === 2 ? 'text-blue-700' : wizardStep > 2 ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                    >
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${wizardStep === 2 ? 'bg-blue-600 text-white shadow-xs' : wizardStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {wizardStep > 2 ? <Check className="h-3.5 w-3.5" /> : '2'}
                      </span>
                      <span>2. Pricing & Sub-Services</span>
                    </button>

                    <div className={`flex-1 h-0.5 mx-3 ${wizardStep > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                    {/* Step 3 Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep(1) && validateStep(2)) setWizardStep(3);
                      }}
                      className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${wizardStep === 3 ? 'text-blue-700' : 'text-slate-400'
                        }`}
                    >
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${wizardStep === 3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                        }`}>
                        3
                      </span>
                      <span>3. Form Builder & Docs</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* 1. EDIT MODE: UNIFIED ALL-IN-ONE DIRECT VIEW                              */}
                {/* ========================================================================= */}
                {isEditMode ? (
                  <div className="space-y-6">
                    {/* Top Core Details Card */}
                    <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                        <div className="sm:col-span-3 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-dashed border-slate-300">
                          <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden mb-1.5 relative shadow-xs">
                            {iconUrl ? (
                              <img
                                src={getImageUrl(iconUrl)}
                                alt="Icon Preview"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Layers className="h-6 w-6 text-blue-600" />
                            )}
                          </div>
                          <input
                            type="file"
                            ref={serviceIconInputRef}
                            accept="image/*"
                            onChange={handleIconUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => serviceIconInputRef.current?.click()}
                            disabled={iconUploading}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="h-3 w-3" />
                            {iconUploading ? 'Uploading...' : iconUrl ? 'Change Icon' : 'Upload Icon'}
                          </button>
                        </div>

                        <div className="sm:col-span-9 space-y-2.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Service Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={name}
                              onChange={e => setName(e.target.value)}
                              required
                              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Service Code:
                            </span>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                              <span>{code || 'SRV-AUTO'}</span>
                              <span className="text-[10px] text-emerald-600 font-sans font-medium">✓ Auto Unique</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                            <Layers className="h-3.5 w-3.5 text-blue-700" />
                            <span>Does this Service have Sub-Services? (Having Sub-Services)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {hasSubServices
                              ? '✅ Enabled: Each sub-service has its own custom dynamic form and price.'
                              : '❌ Disabled: Direct single form, fee, and admin commission %.'}
                          </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={hasSubServices}
                            onChange={e => {
                              const checked = e.target.checked;
                              setHasSubServices(checked);
                              if (checked && subServices.length === 0) {
                                handleAddSubService();
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                            <UserCheck className="h-4 w-4 text-indigo-600" />
                            <span>Operator Assignment Mode</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Single (1 operator pure Gwalior), Area/Office Wise, or Ward Wise mapping.
                            {isEditMode && (
                              <span className="text-amber-600 font-medium block mt-0.5">
                                🔒 Assignment mode cannot be changed after service creation.
                              </span>
                            )}
                          </p>
                        </div>
                        <select
                          value={operatorAssignmentMode}
                          onChange={e => setOperatorAssignmentMode(e.target.value as 'single' | 'area_wise' | 'ward_wise')}
                          disabled={isEditMode}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          <option value="single">Single (1 Operator - Pure Gwalior)</option>
                          <option value="area_wise">Area / Office Wise (Multiple Offices)</option>
                          <option value="ward_wise">Ward Wise (Gwalior Ward Level)</option>
                        </select>
                      </div>
                    </div>

                    {/* Direct vs Sub-Services View in Edit Mode */}
                    {!hasSubServices ? (
                      <div className={`grid grid-cols-1 ${showLivePreview ? 'lg:grid-cols-12 gap-6' : 'max-w-3xl mx-auto'}`}>
                        <div className={showLivePreview ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <IndianRupee className="h-4 w-4 text-emerald-600" />
                              Price & Admin Commission Split
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Application Fee (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">₹</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={fee}
                                    placeholder="e.g. 50"
                                    onChange={e => setFee(e.target.value)}
                                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Admin Commission (%)
                                </label>
                                <div className="relative">
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">%</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={adminCommissionPercent}
                                    placeholder="e.g. 15"
                                    onChange={e => setAdminCommissionPercent(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderFormBuilder('direct', directFormFields)}
                        </div>

                        {showLivePreview && <div className="lg:col-span-5">{renderLivePreview()}</div>}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Sub-Services Tabs Bar */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
                              <Layers className="h-4 w-4 text-indigo-600" />
                              Sub-Services ({subServices.length}):
                            </span>

                            {subServices.map((sub, sIdx) => (
                              <div
                                key={sub.id}
                                onClick={() => setSelectedSubIndex(sIdx)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${selectedSubIndex === sIdx
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                                  }`}
                              >
                                <span>{sub.name || `Sub-Service ${sIdx + 1}`}</span>
                                {sub.fee ? (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${selectedSubIndex === sIdx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    ₹{sub.fee}
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSubService(sIdx);
                                  }}
                                  className={`p-0.5 rounded hover:text-red-500 ${selectedSubIndex === sIdx ? 'text-white/70 hover:text-white' : 'text-slate-400'
                                    }`}
                                  title="Delete sub-service"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleAddSubService}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs shadow-xs flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span> Add Sub-Service</span>
                          </button>
                        </div>

                        {currentSub && (
                          <div className={`grid grid-cols-1 ${showLivePreview ? 'lg:grid-cols-12 gap-6' : 'max-w-3xl mx-auto'}`}>
                            <div className={showLivePreview ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
                              {/* Sub-Service Name & Pricing */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                                    Sub-Service #{selectedSubIndex + 1} Configuration
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                    {currentSub.code}
                                  </span>
                                </div>

                                {/* Sub-Service Icon Upload */}
                                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                                  <div
                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors shrink-0"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.onchange = async (ev: any) => {
                                        const file = ev.target?.files?.[0];
                                        if (!file) return;
                                        const url = await serviceStore.uploadIcon(file);
                                        const updated = [...subServices];
                                        updated[selectedSubIndex].iconUrl = url;
                                        setSubServices(updated);
                                      };
                                      input.click();
                                    }}
                                    title="Upload Sub-Service Icon"
                                  >
                                    {currentSub.iconUrl ? (
                                      <img src={currentSub.iconUrl} alt="icon" className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                      <Upload className="h-4 w-4 text-indigo-400" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-600 block">Sub-Service Icon</span>
                                    <span className="text-[9px] text-slate-400">Click to upload (optional)</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                  <div className="sm:col-span-6">
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                      Sub-Service Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={currentSub.name}
                                      onChange={e => {
                                        const updated = [...subServices];
                                        updated[selectedSubIndex].name = e.target.value;
                                        setSubServices(updated);
                                      }}
                                      placeholder="e.g. Form 49A New PAN Application"
                                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                      Price / Fee (₹) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={currentSub.fee}
                                      placeholder="e.g. 100"
                                      onChange={e => {
                                        const updated = [...subServices];
                                        updated[selectedSubIndex].fee = e.target.value as unknown as number;
                                        setSubServices(updated);
                                      }}
                                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                      Admin Comm (%)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={currentSub.adminCommissionPercent}
                                      placeholder="e.g. 15"
                                      onChange={e => {
                                        const updated = [...subServices];
                                        updated[selectedSubIndex].adminCommissionPercent = e.target.value as unknown as number;
                                        setSubServices(updated);
                                      }}
                                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                  </div>

                                  {/*  */}
                                </div>
                              </div>

                              {renderFormBuilder(selectedSubIndex, currentSub.formFields || [])}
                            </div>

                            {showLivePreview && <div className="lg:col-span-5">{renderLivePreview()}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* 2. CREATE NEW SERVICE MODE: 3-STEP STEP-BY-STEP WIZARD                     */
                  /* ========================================================================= */
                  <div>
                    {wizardStep === 1 && (
                      <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            Service Core Details & Custom Icon
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                            <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-dashed border-slate-300">
                              <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden mb-2 relative shadow-xs">
                                {iconUrl ? (
                                  <img
                                    src={getImageUrl(iconUrl)}
                                    alt="Icon Preview"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Layers className="h-7 w-7 text-blue-600" />
                                )}
                              </div>
                              <input
                                type="file"
                                ref={serviceIconInputRef}
                                accept="image/*"
                                onChange={handleIconUpload}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => serviceIconInputRef.current?.click()}
                                disabled={iconUploading}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                {iconUploading ? 'Uploading...' : iconUrl ? 'Change Icon' : 'Upload Icon'}
                              </button>
                            </div>

                            <div className="sm:col-span-8 space-y-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Service Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Pan Card Services, Niwas Praman Patra..."
                                  value={name}
                                  onChange={e => setName(e.target.value)}
                                  required
                                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Service Code:
                                </span>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                                  <span>{code || 'SRV-AUTO'}</span>
                                  <span className="text-[10px] text-emerald-600 font-sans font-medium">✓ Auto Unique</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-5 rounded-2xl border border-blue-200/70 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-blue-900">
                              <Layers className="h-4 w-4 text-blue-700" />
                              <span>Does this Service have Sub-Services? (Having Sub-Services)</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              {hasSubServices
                                ? '✅ Enabled: Service will display multiple sub-options (each with its own form & fee).'
                                : '❌ Disabled: Single direct service with 1 dynamic application form and fee.'}
                            </p>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                            <input
                              type="checkbox"
                              checked={hasSubServices}
                              onChange={e => {
                                const checked = e.target.checked;
                                setHasSubServices(checked);
                                if (checked && subServices.length === 0) {
                                  handleAddSubService();
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                              <UserCheck className="h-4 w-4 text-indigo-600" />
                              <span>Operator Assignment Routing</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Single Operator (Pure Gwalior), Area/Office Wise, or Ward Wise assignment.
                              {isEditMode && (
                                <span className="text-amber-600 font-medium block mt-1">
                                  🔒 Assignment mode cannot be changed after service creation.
                                </span>
                              )}
                            </p>
                          </div>
                          <select
                            value={operatorAssignmentMode}
                            onChange={e => setOperatorAssignmentMode(e.target.value as 'single' | 'area_wise' | 'ward_wise')}
                            disabled={isEditMode}
                            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="single">Single (1 Operator - Pure Gwalior)</option>
                            <option value="area_wise">Area / Office Wise (Multiple Offices)</option>
                            <option value="ward_wise">Ward Wise (Gwalior Ward Level)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-6 max-w-3xl mx-auto">
                        {!hasSubServices ? (
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <IndianRupee className="h-4 w-4 text-emerald-600" />
                              Service Fee & Admin Commission Split
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Retailer Application Fee (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">₹</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={fee}
                                    placeholder="e.g. 50"
                                    onChange={e => setFee(e.target.value)}
                                    className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Admin Commission Percentage (%)
                                </label>
                                <div className="relative">
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">%</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={adminCommissionPercent}
                                    placeholder="e.g. 15"
                                    onChange={e => setAdminCommissionPercent(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Layers className="h-4 w-4 text-indigo-600" />
                                Sub-Services List & Pricing
                              </h4>
                              <button
                                type="button"
                                onClick={handleAddSubService}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Sub-Service</span>
                              </button>
                            </div>

                            <div className="space-y-3">
                              {subServices.map((sub, sIdx) => (
                                <div key={sub.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-bold">
                                        {sIdx + 1}
                                      </span>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                        {sub.code}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSubService(sIdx)}
                                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                    <div className="sm:col-span-6">
                                      <input
                                        type="text"
                                        value={sub.name}
                                        onChange={e => {
                                          const updated = [...subServices];
                                          updated[sIdx].name = e.target.value;
                                          setSubServices(updated);
                                        }}
                                        placeholder="e.g. Form 49A New PAN Application"
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                                      />
                                    </div>
                                    <div className="sm:col-span-3">
                                      <input
                                        type="number"
                                        min="1"
                                        value={sub.fee}
                                        placeholder="Fee (₹)"
                                        onChange={e => {
                                          const updated = [...subServices];
                                          updated[sIdx].fee = e.target.value as unknown as number;
                                          setSubServices(updated);
                                        }}
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                                      />
                                    </div>
                                    <div className="sm:col-span-3">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={sub.adminCommissionPercent}
                                        placeholder="Comm (%)"
                                        onChange={e => {
                                          const updated = [...subServices];
                                          updated[sIdx].adminCommissionPercent = e.target.value as unknown as number;
                                          setSubServices(updated);
                                        }}
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className={`grid grid-cols-1 ${showLivePreview ? 'lg:grid-cols-12 gap-6' : 'max-w-3xl mx-auto'}`}>
                        <div className={showLivePreview ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
                          {hasSubServices && (
                            <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 flex items-center gap-2 overflow-x-auto">
                              <span className="text-xs font-bold text-indigo-900 shrink-0">Building Form For:</span>
                              {subServices.map((sub, sIdx) => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => setSelectedSubIndex(sIdx)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${selectedSubIndex === sIdx
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-white text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                                    }`}
                                >
                                  {sub.name || `Sub-Service ${sIdx + 1}`} ({sub.formFields?.length || 0})
                                </button>
                              ))}
                            </div>
                          )}

                          {renderFormBuilder(
                            hasSubServices ? selectedSubIndex : 'direct',
                            hasSubServices ? (subServices[selectedSubIndex]?.formFields || []) : directFormFields
                          )}
                        </div>

                        {showLivePreview && <div className="lg:col-span-5">{renderLivePreview()}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                {!isEditMode && wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {!isEditMode && wizardStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>Continue to {wizardStep === 1 ? 'Step 2 (Pricing)' : 'Step 3 (Form Builder)'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveService}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{isEditMode ? 'Save Changes' : 'Create & Publish Service'}</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW FORM STRUCTURE / PREVIEW DRAWER                                      */}
        {/* ========================================================================= */}
        {previewService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                  <div>
                    <h3 className="font-bold text-sm">{previewService.name}</h3>
                    <p className="text-[10px] text-slate-400">Dynamic Form Configuration & Architecture ({previewService.code})</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewService(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {previewService.hasSubServices ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Sub-Services ({previewService.subServices?.length || 0}):
                    </h4>
                    {previewService.subServices?.map((sub, i) => (
                      <div key={sub.id || i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-900">{sub.name}</span>
                          <span className="text-xs font-bold text-slate-700">₹{sub.fee} | Comm: {sub.adminCommissionPercent}%</span>
                        </div>
                        <div className="space-y-1 mt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Form Fields:</p>
                          {sub.formFields?.map(f => (
                            <div key={f.id} className="text-xs text-slate-700 flex items-center justify-between bg-white px-2.5 py-1 rounded border border-slate-100">
                              <span className="font-medium">
                                {f.label || 'Unnamed Field'} {f.required && <span className="text-rose-500">*</span>}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-slate-500">
                                {f.type === 'file' ? `DOC (${f.docUploader?.toUpperCase()})` : f.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>Service Fee: ₹{previewService.fee}</span>
                      <span>Admin Commission: {previewService.adminCommissionPercent}%</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 uppercase">Application Form Fields:</p>
                      {previewService.formFields?.map(f => (
                        <div key={f.id} className="text-xs text-slate-700 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div>
                            <span className="font-bold">{f.label || 'Unnamed Field'}</span>
                            {f.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                            {f.placeholder && <p className="text-[10px] text-slate-400">{f.placeholder}</p>}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.type === 'file'
                              ? f.docUploader === 'shop'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-700'
                            }`}>
                            {f.type === 'file' ? `DOC: ${f.docUploader?.toUpperCase()}` : f.type.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: ASSIGN SERVICE TO OPERATOR                                        */}
        {/* ========================================================================= */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">Assign Service to Operator</h3>
                    <p className="text-[11px] text-white/80">
                      Map operators to services based on routing mode
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">

                {assignError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                    {assignError}
                  </div>
                )}

                {assignSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                    {assignSuccess}
                  </div>
                )}

                {/* Assignment Form */}
                <form onSubmit={handleCreateAssignment} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-indigo-600" />
                    <span>New Assignment</span>
                  </h4>

                  {/* 1. Service Dropdown (Parent Services Only) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Service <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignSelectedServiceId}
                      onChange={e => {
                        setAssignSelectedServiceId(e.target.value);
                        setAssignAreaLabel('');
                        setAssignWardNo('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    >
                      <option value="">-- Choose Service --</option>
                      {services.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} [{s.operatorAssignmentMode || 'single'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic fields based on service routing mode */}
                  {assignSelectedServiceId && (() => {
                    const mode = getSelectedServiceMode();
                    return (
                      <div className="space-y-3 pt-1">
                        {/* Mode Info Banner */}
                        <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                          ⚡ Routing Mode: <span className="uppercase font-bold">{mode.replace('_', ' ')}</span> — {
                            mode === 'single' ? 'This operator will handle ALL requests across Gwalior.' :
                              mode === 'area_wise' ? 'Operator will handle requests for a specific office/area.' :
                                'Operator will handle requests for a specific Gwalior ward.'
                          }
                        </div>

                        {/* Area Input (for area_wise) */}
                        {mode === 'area_wise' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Office / Area Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Morar Office, Lashkar Branch, Thatipur Center..."
                              value={assignAreaLabel}
                              onChange={e => setAssignAreaLabel(e.target.value)}
                              required
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* Ward Input (for ward_wise) */}
                        {mode === 'ward_wise' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Gwalior Ward Number (1-100) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              placeholder="e.g. 14"
                              value={assignWardNo}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '' || (Number(val) >= 1 && Number(val) <= 100 && Number.isInteger(Number(val)))) {
                                  setAssignWardNo(val);
                                }
                              }}
                              required
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* 2. Operator Dropdown */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Select Operator <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={assignSelectedOperatorId}
                            onChange={e => setAssignSelectedOperatorId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                          >
                            <option value="">-- Choose Operator --</option>
                            {allOperators.map((op: any) => (
                              <option key={op.id} value={op.id}>
                                {op.fullName} ({op.userCode}) — {op.mobile}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="submit"
                    disabled={assignSubmitting || !assignSelectedServiceId || !assignSelectedOperatorId}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {assignSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span>Assign Operator to Service</span>
                  </button>
                </form>


              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

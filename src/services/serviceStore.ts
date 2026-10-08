import apiClient from '../api/client';

export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';
export type DocUploaderRole = 'shop' | 'operator';

export const DROPDOWN_PRESETS = {
  custom: { name: '✏️ Custom Defined Options', options: [] as string[] },
  mp_districts: {
    name: '🏙️ MP All 55 Districts',
    options: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur',
      'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
      'Hoshangabad (Narmadapuram)', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur',
      'Mauganj', 'Maihar', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Pandhurna', 'Panna', 'Raisen', 'Rajgarh',
      'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri',
      'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
    ]
  },
  gender: {
    name: '🚻 Gender (Male / Female / Other)',
    options: ['Male', 'Female', 'Transgender']
  },
  caste: {
    name: '📋 Caste Category (General, OBC, SC, ST, EWS)',
    options: ['General (UR)', 'OBC', 'SC', 'ST', 'EWS']
  },
  indian_states: {
    name: '🗺️ Indian States (MP, UP, Rajasthan, etc.)',
    options: ['Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Maharashtra', 'Gujarat', 'Chhattisgarh', 'Bihar', 'Delhi', 'Other']
  }
};

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For 'select' dropdown
  presetType?: string; // 'custom' | 'mp_districts' | 'gender' | 'caste' | 'indian_states'
  docUploader?: DocUploaderRole; // For 'file' doc upload: 'shop' (applicant) or 'operator' (response)
  helpText?: string;
}

export interface SubServiceItem {
  id: string;
  name: string;
  code: string;
  iconUrl?: string;
  fee: number; // Price in ₹
  adminCommissionPercent: number; // Admin commission in %
  description?: string;
  formFields: FormField[];
  operatorAssignmentMode?: 'single' | 'area_wise' | 'ward_wise';
  isActive?: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  code: string;
  category: string;
  iconUrl?: string;
  iconName?: string;
  description: string;
  hasSubServices: boolean;
  fee: number; // Price in ₹ (if hasSubServices is false)
  adminCommissionPercent: number; // Admin commission in % (if hasSubServices is false)
  formFields: FormField[]; // Direct form if hasSubServices is false
  subServices: SubServiceItem[]; // Sub-services if hasSubServices is true
  operatorAssignmentMode?: 'single' | 'area_wise' | 'ward_wise';
  isActive: boolean;
  createdAt?: string;
}

class ServiceStoreService {
  private services: ServiceItem[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.syncBackend();
  }

  public async syncBackend() {
    try {
      const response = await apiClient.get('/services');
      if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        this.services = response.data.data;
        this.notify();
      }
    } catch {
      // Backend offline or loading
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  public getServices(): ServiceItem[] {
    return [...this.services];
  }

  public getActiveServices(): ServiceItem[] {
    return this.services.filter(s => s.isActive);
  }

  public getServiceById(id: string): ServiceItem | undefined {
    return this.services.find(s => s.id === id);
  }

  // Upload Icon Image to Server
  public async uploadIcon(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('icon', file);
      const response = await apiClient.post('/services/upload-icon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.status === 'success' && response.data.url) {
        return response.data.url;
      }
    } catch (err) {
      console.warn('Icon upload failed, generating local data URL preview fallback:', err);
    }

    // Fallback: create base64 / Object URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  // Add New Service
  public async addService(data: Omit<ServiceItem, 'id' | 'createdAt'>): Promise<ServiceItem> {
    const newService: ServiceItem = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await apiClient.post('/services', data);
      if (response.data.status === 'success' && response.data.data?.id) {
        newService.id = response.data.data.id;
      }
    } catch (err) {
      console.warn('Backend sync failed, saved locally:', err);
    }

    await this.syncBackend();
    return newService;
  }

  // Update Service
  public async updateService(id: string, data: Partial<ServiceItem>): Promise<boolean> {
    try {
      await apiClient.put(`/services/${id}`, data);
    } catch (err) {
      console.warn('Backend sync failed, updated locally:', err);
    }

    await this.syncBackend();
    return true;
  }

  // Toggle Active Status
  public async toggleService(id: string): Promise<boolean> {
    const s = this.services.find(item => item.id === id);
    if (!s) return false;

    try {
      await apiClient.patch(`/services/${id}/toggle`);
    } catch (err) {
      console.warn('Backend toggle failed, toggled locally:', err);
    }

    await this.syncBackend();
    return true;
  }

  // Delete Service
  public async deleteService(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/services/${id}`);
    } catch (err) {
      console.warn('Backend delete failed, deleted locally:', err);
    }

    await this.syncBackend();
    return true;
  }
}

export const serviceStore = new ServiceStoreService();
export default serviceStore;

import { API_CONFIG } from '../utils/constants';
import StorageService from './storage';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  async getAuthHeaders() {
    const token = await StorageService.getSecureData('@user_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const defaultOptions = {
      method: 'GET',
      headers: {
        ...headers,
        ...options.headers,
      },
      timeout: this.timeout,
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.message || parsedError.error || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      console.error('API Request failed:', {
        endpoint,
        error: error.message,
        options: requestOptions,
      });
      throw error;
    }
  }

  // Authentication endpoints
  async register(userData) {
    return this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(refreshToken) {
    return this.makeRequest('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async logout() {
    return this.makeRequest('/api/auth/logout', {
      method: 'POST',
    });
  }

  // Profile endpoints
  async getProfile() {
    return this.makeRequest('/api/auth/profile');
  }

  async updateProfile(profileData) {
    return this.makeRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Contact management endpoints
  async generateContactId(userId) {
    return this.makeRequest('/api/contacts/register', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async lookupContact(contactId) {
    return this.makeRequest(`/api/contacts/lookup/${encodeURIComponent(contactId)}`);
  }

  async validateContact(contactId) {
    return this.makeRequest('/api/contacts/validate', {
      method: 'POST',
      body: JSON.stringify({ contact_id: contactId }),
    });
  }

  async getMyContacts() {
    return this.makeRequest('/api/contacts/list');
  }

  async addContact(contactId, displayName) {
    return this.makeRequest('/api/contacts/add', {
      method: 'POST',
      body: JSON.stringify({ 
        contact_id: contactId,
        display_name: displayName,
      }),
    });
  }

  async removeContact(contactId) {
    return this.makeRequest(`/api/contacts/remove/${encodeURIComponent(contactId)}`, {
      method: 'DELETE',
    });
  }

  // Key management endpoints
  async registerKeys(keyData) {
    return this.makeRequest('/api/keys/register', {
      method: 'POST',
      body: JSON.stringify(keyData),
    });
  }

  async getPublicKey(contactId) {
    return this.makeRequest(`/api/keys/${encodeURIComponent(contactId)}`);
  }

  async exchangeKeys(exchangeData) {
    return this.makeRequest('/api/keys/exchange', {
      method: 'POST',
      body: JSON.stringify(exchangeData),
    });
  }

  async updateKeys(keyData) {
    return this.makeRequest('/api/keys/update', {
      method: 'PUT',
      body: JSON.stringify(keyData),
    });
  }

  async revokeKeys(deviceId) {
    return this.makeRequest('/api/keys/revoke', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    });
  }

  // Chat endpoints
  async getUserChats() {
    return this.makeRequest('/api/chat/list');
  }

  async createChat(recipientContactId) {
    return this.makeRequest('/api/chat/create', {
      method: 'POST',
      body: JSON.stringify({ recipient_contact_id: recipientContactId }),
    });
  }

  async getChatHistory(chatId, page = 1, limit = 50) {
    return this.makeRequest(`/api/chat/history/${encodeURIComponent(chatId)}?page=${page}&limit=${limit}`);
  }

  async sendMessage(messageData) {
    return this.makeRequest('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async markMessageAsRead(messageId) {
    return this.makeRequest(`/api/chat/message/${encodeURIComponent(messageId)}/read`, {
      method: 'POST',
    });
  }

  async deleteMessage(messageId) {
    return this.makeRequest(`/api/chat/message/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
  }

  async deleteChat(chatId) {
    return this.makeRequest(`/api/chat/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
    });
  }

  // File upload endpoints
  async uploadFile(file, messageId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message_id', messageId);

    return this.makeRequest('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  }

  async downloadFile(fileId) {
    return this.makeRequest(`/api/files/download/${encodeURIComponent(fileId)}`);
  }

  // Health check
  async healthCheck() {
    return this.makeRequest('/api/health');
  }
}

export default new ApiService();

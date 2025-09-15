// src/services/api.js
import { Platform } from 'react-native';
import StorageService from './storage';

// Your IP address for React Native CLI
const LOCAL_IP = '192.168.1.105';
const LOCAL_PORT = '8080';

const getBaseURL = () => {
  if (__DEV__) {
    // For React Native CLI, both Android and iOS use the same IP
    return `http://${LOCAL_IP}:${LOCAL_PORT}`;
  } else {
    // Production API URL
    return 'https://your-production-api.herokuapp.com';
  }
};

class ApiService {
  constructor() {
    this.baseURL = getBaseURL();
    this.timeout = 30000;
    
    // Enhanced logging for React Native CLI
    console.log('🌐 React Native CLI API Configuration:');
    console.log(`📍 Base URL: ${this.baseURL}`);
    console.log(`📱 Platform: ${Platform.OS}`);
    console.log(`🔧 Development: ${__DEV__}`);
    console.log(`🏠 Local IP: ${LOCAL_IP}:${LOCAL_PORT}`);
  }

  async getAuthHeaders() {
    const { token } = await StorageService.getUserCredentials();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Added for React Native CLI
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const headers = await this.getAuthHeaders();

    const requestOptions = {
      method: 'GET',
      headers: { ...headers, ...options.headers },
      timeout: this.timeout,
      ...options,
    };

    try {
      console.log(`📤 [RN CLI] ${requestOptions.method} ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📥 [RN CLI] Response: ${response.status} for ${endpoint}`);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔐 Session expired, clearing credentials');
          await StorageService.clearUserCredentials();
        }
        
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.error || parsedError.message || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`✅ [RN CLI] Success:`, { endpoint, dataKeys: Object.keys(data) });
        return data;
      }
      
      const text = await response.text();
      console.log(`✅ [RN CLI] Success (text):`, { endpoint, length: text.length });
      return text;

    } catch (error) {
      console.error(`❌ [RN CLI] Request failed:`, {
        url,
        method: requestOptions.method,
        error: error.message
      });

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - check your network connection');
      }
      
      if (error.message.includes('Network request failed')) {
        throw new Error(`Cannot connect to ${this.baseURL}. Is the server running on ${LOCAL_IP}:${LOCAL_PORT}?`);
      }
      
      throw error;
    }
  }

  // Authentication methods
  async loginWithFirebase(idToken, contactId, deviceId) {
    console.log('🔐 [RN CLI] Firebase login attempt:', { contactId, deviceId });
    
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        idToken, 
        contactId, 
        deviceId 
      }),
    });
    
    // Store credentials
    await StorageService.storeUserCredentials(contactId, idToken, contactId);
    
    console.log('✅ [RN CLI] Login successful');
    return response;
  }

  async logout() {
    console.log('🚪 [RN CLI] Logout attempt');
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
      console.log('✅ [RN CLI] Logout successful');
    } catch (error) {
      console.error('❌ [RN CLI] Logout failed:', error);
    } finally {
      await StorageService.clearUserCredentials();
      console.log('🧹 [RN CLI] Credentials cleared');
    }
  }
  async getUserChats() {
    return this.makeRequest('/chats');
}
  async getCurrentUser() {
    return this.makeRequest('/auth/me');
  }

  // Chat endpoints
  async sendMessage(recipientContactId, content, messageType = 'text', localId = null) {
    console.log('📨 [RN CLI] Sending message:', { 
      recipientContactId, 
      contentLength: content?.length || 0,
      messageType
    });
    
    return this.makeRequest('/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        recipientContactId,
        content,
        messageType,
        localId,
      }),
    });
  }

  async getMessages(limit = 50) {
    console.log('📬 [RN CLI] Fetching messages, limit:', limit);
    return this.makeRequest(`/chat/messages?limit=${limit}`);
  }

  async markMessageDelivered(messageId) {
    return this.makeRequest(`/chat/delivered/${encodeURIComponent(messageId)}`, {
      method: 'POST',
    });
  }

  async markMessageRead(messageId) {
    return this.makeRequest(`/chat/read/${encodeURIComponent(messageId)}`, {
      method: 'POST',
    });
  }

  // Contact endpoints
  async addContact(contactId, displayName) {
    console.log('👥 [RN CLI] Adding contact:', { contactId, displayName });
    return this.makeRequest('/contacts/add', {
      method: 'POST',
      body: JSON.stringify({ contactId, displayName }),
    });
  }

  async lookupContact(contactId) {
    return this.makeRequest(`/contacts/lookup/${encodeURIComponent(contactId)}`);
  }

  // Health check
  async healthCheck() {
    return this.makeRequest('/health');
  }

  // Connection test for React Native CLI
  async testConnection() {
    try {
      console.log('🔌 [RN CLI] Testing connection...');
      const result = await this.healthCheck();
      console.log('✅ [RN CLI] Connection successful:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ [RN CLI] Connection failed:', error.message);
      return { 
        success: false, 
        error: error.message,
        suggestion: `Make sure server is running on ${LOCAL_IP}:${LOCAL_PORT}`
      };
    }
  }
}

export default new ApiService();

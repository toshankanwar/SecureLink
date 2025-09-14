import ApiService from './api';
import StorageService from './storage';
import EncryptionService from './encryption';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authToken = null;
    this.refreshToken = null;
    this.tokenExpiryTime = null;
  }

  async initialize() {
    try {
      const { token, userId, contactId } = await StorageService.getUserCredentials();
      const refreshToken = await StorageService.getSecureData('@refresh_token');
      
      if (token && userId) {
        this.authToken = token;
        this.refreshToken = refreshToken;
        this.currentUser = { id: userId, contactId };
        
        // Check if token needs refresh
        await this.checkAndRefreshToken();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return false;
    }
  }

  async register(userData) {
    try {
      // Hash password before sending
      const salt = EncryptionService.generateSalt();
      const hashedPassword = EncryptionService.hashPassword(userData.password, salt);
      
      const response = await ApiService.register({
        ...userData,
        password: hashedPassword,
        salt,
        device_info: await this.getDeviceInfo(),
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async login(credentials) {
    try {
      const response = await ApiService.login({
        ...credentials,
        device_info: await this.getDeviceInfo(),
      });

      await this.handleAuthSuccess(response);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async handleAuthSuccess(response) {
    try {
      const { user, token, refresh_token, contact_id, expires_in } = response;
      
      this.currentUser = user;
      this.authToken = token;
      this.refreshToken = refresh_token;
      this.tokenExpiryTime = Date.now() + (expires_in * 1000);
      
      // Store credentials
      await StorageService.storeUserCredentials(user.id, token, contact_id);
      
      if (refresh_token) {
        await StorageService.storeSecureData('@refresh_token', refresh_token);
      }
      
      if (expires_in) {
        await StorageService.storeData('@token_expiry', this.tokenExpiryTime);
      }

    } catch (error) {
      console.error('Error handling auth success:', error);
      throw error;
    }
  }

  async logout() {
    try {
      // Notify server about logout
      if (this.authToken) {
        try {
          await ApiService.logout();
        } catch (error) {
          console.warn('Server logout failed:', error);
          // Continue with local logout even if server logout fails
        }
      }

      // Clear local state
      this.currentUser = null;
      this.authToken = null;
      this.refreshToken = null;
      this.tokenExpiryTime = null;
      
      // Clear stored data
      await StorageService.clearAll();
      
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async checkAndRefreshToken() {
    try {
      if (!this.tokenExpiryTime || !this.refreshToken) {
        return false;
      }

      // Check if token expires within 5 minutes
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() + fiveMinutes >= this.tokenExpiryTime) {
        await this.refreshAuthToken();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh check failed:', error);
      return false;
    }
  }

  async refreshAuthToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await ApiService.refreshToken(this.refreshToken);
      const { token, refresh_token, expires_in } = response;

      this.authToken = token;
      if (refresh_token) {
        this.refreshToken = refresh_token;
      }
      this.tokenExpiryTime = Date.now() + (expires_in * 1000);

      // Update stored tokens
      await StorageService.storeSecureData('@user_token', token);
      if (refresh_token) {
        await StorageService.storeSecureData('@refresh_token', refresh_token);
      }
      if (expires_in) {
        await StorageService.storeData('@token_expiry', this.tokenExpiryTime);
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout user
      await this.logout();
      throw error;
    }
  }

  async getDeviceInfo() {
    try {
      // You can use react-native-device-info here
      return {
        device_id: 'device_001', // Should be unique device identifier
        device_type: 'mobile',
        app_version: '1.0.0',
        platform: 'react-native',
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        device_id: 'unknown',
        device_type: 'mobile',
        app_version: '1.0.0',
        platform: 'react-native',
      };
    }
  }

  handleAuthError(error) {
    let message = 'Authentication failed';
    
    if (error.message.includes('Invalid credentials')) {
      message = 'Invalid email or password';
    } else if (error.message.includes('User not found')) {
      message = 'Account not found';
    } else if (error.message.includes('Email already exists')) {
      message = 'Email already registered';
    } else if (error.message.includes('Network')) {
      message = 'Network connection error';
    } else if (error.message.includes('timeout')) {
      message = 'Request timed out';
    } else if (error.message) {
      message = error.message;
    }

    return new Error(message);
  }

  // Utility methods
  isAuthenticated() {
    return !!this.authToken && !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getAuthToken() {
    return this.authToken;
  }

  getTokenExpiryTime() {
    return this.tokenExpiryTime;
  }

  isTokenExpired() {
    if (!this.tokenExpiryTime) return false;
    return Date.now() >= this.tokenExpiryTime;
  }

  getTimeUntilExpiry() {
    if (!this.tokenExpiryTime) return null;
    return Math.max(0, this.tokenExpiryTime - Date.now());
  }
}

export default new AuthService();

import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { STORAGE_KEYS } from '../utils/constants';

class StorageService {
  constructor() {
    this.encryptedKeys = [
      STORAGE_KEYS.USER_TOKEN,
      STORAGE_KEYS.PRIVATE_KEY,
      STORAGE_KEYS.PUBLIC_KEY,
    ];
  }

  // Encrypted storage for sensitive data
  async storeSecureData(key, value) {
    try {
      await EncryptedStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error storing secure data for key ${key}:`, error);
      throw new Error(`Failed to store secure data: ${error.message}`);
    }
  }

  async getSecureData(key) {
    try {
      const value = await EncryptedStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error retrieving secure data for key ${key}:`, error);
      return null;
    }
  }

  async removeSecureData(key) {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing secure data for key ${key}:`, error);
    }
  }

  // Regular storage for non-sensitive data
  async storeData(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error storing data for key ${key}:`, error);
      throw new Error(`Failed to store data: ${error.message}`);
    }
  }

  async getData(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error retrieving data for key ${key}:`, error);
      return null;
    }
  }

  async removeData(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
    }
  }

  async clearAll() {
    try {
      await AsyncStorage.clear();
      await EncryptedStorage.clear();
      console.log('All storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error(`Failed to clear storage: ${error.message}`);
    }
  }

  // User-specific methods
  async storeUserCredentials(userId, token, contactId) {
    try {
      await Promise.all([
        this.storeSecureData(STORAGE_KEYS.USER_TOKEN, token),
        this.storeData(STORAGE_KEYS.USER_ID, userId),
        this.storeData(STORAGE_KEYS.CONTACT_ID, contactId),
      ]);
    } catch (error) {
      console.error('Error storing user credentials:', error);
      throw error;
    }
  }

  async getUserCredentials() {
    try {
      const [token, userId, contactId] = await Promise.all([
        this.getSecureData(STORAGE_KEYS.USER_TOKEN),
        this.getData(STORAGE_KEYS.USER_ID),
        this.getData(STORAGE_KEYS.CONTACT_ID),
      ]);
      
      return { token, userId, contactId };
    } catch (error) {
      console.error('Error retrieving user credentials:', error);
      return { token: null, userId: null, contactId: null };
    }
  }

  async clearUserCredentials() {
    try {
      await Promise.all([
        this.removeSecureData(STORAGE_KEYS.USER_TOKEN),
        this.removeData(STORAGE_KEYS.USER_ID),
        this.removeData(STORAGE_KEYS.CONTACT_ID),
      ]);
    } catch (error) {
      console.error('Error clearing user credentials:', error);
    }
  }

  async storeKeyPair(privateKey, publicKey) {
    try {
      await Promise.all([
        this.storeSecureData(STORAGE_KEYS.PRIVATE_KEY, privateKey),
        this.storeSecureData(STORAGE_KEYS.PUBLIC_KEY, publicKey),
      ]);
    } catch (error) {
      console.error('Error storing key pair:', error);
      throw error;
    }
  }

  async getKeyPair() {
    try {
      const [privateKey, publicKey] = await Promise.all([
        this.getSecureData(STORAGE_KEYS.PRIVATE_KEY),
        this.getSecureData(STORAGE_KEYS.PUBLIC_KEY),
      ]);
      
      return { privateKey, publicKey };
    } catch (error) {
      console.error('Error retrieving key pair:', error);
      return { privateKey: null, publicKey: null };
    }
  }

  async clearKeyPair() {
    try {
      await Promise.all([
        this.removeSecureData(STORAGE_KEYS.PRIVATE_KEY),
        this.removeSecureData(STORAGE_KEYS.PUBLIC_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing key pair:', error);
    }
  }

  // Theme storage
  async storeTheme(theme) {
    try {
      await this.storeData(STORAGE_KEYS.THEME, theme);
    } catch (error) {
      console.error('Error storing theme:', error);
    }
  }

  async getTheme() {
    try {
      return await this.getData(STORAGE_KEYS.THEME);
    } catch (error) {
      console.error('Error retrieving theme:', error);
      return null;
    }
  }

  // Cache management
  async storeCache(key, data, expiry) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiry: expiry || (24 * 60 * 60 * 1000), // 24 hours default
      };
      await this.storeData(`cache_${key}`, cacheData);
    } catch (error) {
      console.error(`Error storing cache for ${key}:`, error);
    }
  }

  async getCache(key) {
    try {
      const cacheData = await this.getData(`cache_${key}`);
      if (!cacheData) return null;

      const now = Date.now();
      if (now - cacheData.timestamp > cacheData.expiry) {
        await this.removeData(`cache_${key}`);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error(`Error retrieving cache for ${key}:`, error);
      return null;
    }
  }

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Storage info
  async getStorageInfo() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);
      
      let totalSize = 0;
      values.forEach(([key, value]) => {
        totalSize += (key.length + (value ? value.length : 0));
      });

      return {
        totalKeys: keys.length,
        estimatedSize: totalSize,
        keys: keys.sort(),
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
}

export default new StorageService();

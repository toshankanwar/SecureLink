import * as Keychain from 'react-native-keychain';
import EncryptionService from './encryption';

class KeychainService {
  constructor() {
    this.serviceName = 'SecureLinkKeys';
  }

  // Store device key pair securely
  async storeDeviceKeys(userId, keyPair) {
    try {
      const keyData = {
        ...keyPair,
        userId,
        storedAt: Date.now(),
      };

      await Keychain.setInternetCredentials(
        `${this.serviceName}_${userId}`,
        keyPair.keyId,
        JSON.stringify(keyData),
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          authenticatePrompt: 'Authenticate to access your encryption keys',
          service: this.serviceName,
        }
      );

      return true;
    } catch (error) {
      console.error('Error storing device keys:', error);
      throw new Error('Failed to store encryption keys securely');
    }
  }

  // Retrieve device keys
  async getDeviceKeys(userId) {
    try {
      const credentials = await Keychain.getInternetCredentials(
        `${this.serviceName}_${userId}`
      );

      if (credentials && credentials.password) {
        const keyData = JSON.parse(credentials.password);
        return keyData;
      }

      return null;
    } catch (error) {
      console.error('Error retrieving device keys:', error);
      return null;
    }
  }

  // Remove device keys
  async removeDeviceKeys(userId) {
    try {
      await Keychain.resetInternetCredentials(`${this.serviceName}_${userId}`);
      return true;
    } catch (error) {
      console.error('Error removing device keys:', error);
      return false;
    }
  }

  // Store contact public keys
  async storeContactPublicKey(contactId, publicKey) {
    try {
      const keyData = {
        publicKey,
        contactId,
        storedAt: Date.now(),
      };

      await Keychain.setInternetCredentials(
        `${this.serviceName}_contact_${contactId}`,
        contactId,
        JSON.stringify(keyData)
      );

      return true;
    } catch (error) {
      console.error('Error storing contact public key:', error);
      return false;
    }
  }

  // Get contact public key
  async getContactPublicKey(contactId) {
    try {
      const credentials = await Keychain.getInternetCredentials(
        `${this.serviceName}_contact_${contactId}`
      );

      if (credentials && credentials.password) {
        const keyData = JSON.parse(credentials.password);
        return keyData.publicKey;
      }

      return null;
    } catch (error) {
      console.error('Error retrieving contact public key:', error);
      return null;
    }
  }

  // List all stored keys
  async getAllStoredKeys() {
    try {
      const services = await Keychain.getAllInternetCredentials();
      return services.filter(service => 
        service.service.startsWith(this.serviceName)
      );
    } catch (error) {
      console.error('Error listing stored keys:', error);
      return [];
    }
  }

  // Clear all keys
  async clearAllKeys() {
    try {
      const services = await this.getAllStoredKeys();
      const promises = services.map(service =>
        Keychain.resetInternetCredentials(service.service)
      );
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error clearing all keys:', error);
      return false;
    }
  }
}

export default new KeychainService();

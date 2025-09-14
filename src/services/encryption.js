import { RSA } from 'react-native-rsa-native';
import CryptoJS from 'crypto-js';

class EncryptionService {
  constructor() {
    this.keySize = 2048; // Strong RSA key size
    this.aesKeySize = 256;
    this.ivSize = 128;
  }

  // Generate strong RSA key pair for device
  async generateDeviceKeyPair() {
    try {
      const keys = await RSA.generateKeys(this.keySize);
      return {
        publicKey: keys.public,
        privateKey: keys.private,
        keyId: this.generateKeyId(),
        deviceId: await this.getDeviceId(),
        createdAt: Date.now(),
      };
    } catch (error) {
      console.error('Error generating RSA key pair:', error);
      throw new Error('Failed to generate device keys');
    }
  }

  // Generate unique key ID
  generateKeyId() {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }

  // Get unique device identifier
  async getDeviceId() {
    try {
      // In production, use react-native-device-info
      return CryptoJS.SHA256(
        Date.now().toString() + Math.random().toString()
      ).toString().substring(0, 16);
    } catch (error) {
      return 'default_device';
    }
  }

  // Encrypt message with recipient's public key
  async encryptMessage(message, recipientPublicKey) {
    try {
      // Generate AES key for message
      const aesKey = CryptoJS.lib.WordArray.random(this.aesKeySize / 8).toString();
      
      // Encrypt message with AES
      const iv = CryptoJS.lib.WordArray.random(this.ivSize / 8);
      const encryptedMessage = CryptoJS.AES.encrypt(message, aesKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Encrypt AES key with recipient's RSA public key
      const encryptedAESKey = await RSA.encrypt(aesKey, recipientPublicKey);

      return {
        encryptedMessage: encryptedMessage.toString(),
        encryptedKey: encryptedAESKey,
        iv: iv.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Message encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt message with own private key
  async decryptMessage(encryptedData, privateKey) {
    try {
      const { encryptedMessage, encryptedKey, iv } = encryptedData;

      // Decrypt AES key with RSA private key
      const aesKey = await RSA.decrypt(encryptedKey, privateKey);

      // Decrypt message with AES key
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, aesKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('Failed to decrypt - invalid key or corrupted data');
      }

      return decryptedText;
    } catch (error) {
      console.error('Message decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Local storage encryption with device key
  encryptLocalData(data, deviceKey) {
    try {
      const iv = CryptoJS.lib.WordArray.random(this.ivSize / 8);
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), deviceKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return {
        data: encrypted.toString(),
        iv: iv.toString(),
      };
    } catch (error) {
      console.error('Local data encryption error:', error);
      throw new Error('Failed to encrypt local data');
    }
  }

  // Local storage decryption
  decryptLocalData(encryptedData, deviceKey) {
    try {
      const { data, iv } = encryptedData;
      const decrypted = CryptoJS.AES.decrypt(data, deviceKey, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('Local data decryption error:', error);
      throw new Error('Failed to decrypt local data');
    }
  }

  // Generate device-specific storage key
  generateDeviceStorageKey(userId, deviceId) {
    return CryptoJS.PBKDF2(userId + deviceId, 'SecureLink_v1', {
      keySize: 256 / 32,
      iterations: 10000,
    }).toString();
  }
}

export default new EncryptionService();

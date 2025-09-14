import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import EncryptionService from '../services/encryption';
import StorageService from '../services/storage';

export function useEncryption() {
  const { user } = useAuth();
  const [keyPair, setKeyPair] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrGenerateKeys();
  }, [user]);

  const loadOrGenerateKeys = async () => {
    try {
      setLoading(true);
      
      let keys = await StorageService.getKeyPair();
      
      if (!keys.privateKey || !keys.publicKey) {
        keys = EncryptionService.generateKeyPair();
        await StorageService.storeKeyPair(keys.privateKey, keys.publicKey);
      }
      
      setKeyPair(keys);
    } catch (error) {
      console.error('Error loading/generating keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const encryptMessage = (message, recipientPublicKey) => {
    if (!keyPair) return null;
    
    try {
      const sharedSecret = EncryptionService.generateSharedSecret(
        keyPair.privateKey, 
        recipientPublicKey
      );
      return EncryptionService.encrypt(message, sharedSecret);
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  };

  const decryptMessage = (encryptedData, senderPublicKey) => {
    if (!keyPair) return null;
    
    try {
      const sharedSecret = EncryptionService.generateSharedSecret(
        keyPair.privateKey, 
        senderPublicKey
      );
      return EncryptionService.decrypt(encryptedData, sharedSecret);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };

  return {
    keyPair,
    loading,
    encryptMessage,
    decryptMessage,
  };
}

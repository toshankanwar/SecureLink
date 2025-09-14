import AsyncStorage from '@react-native-async-storage/async-storage';

class DeviceStorageService {
  constructor() {
    this.storagePrefix = 'SecureLink_Device_';
    this.currentUserId = null;
  }

  // Initialize device storage for user (no encryption)
  async initializeForUser(userId) {
    this.currentUserId = userId;
    return { isDemo: true };
  }

  // Store chat messages (no encryption)
  async storeMessages(chatId, messages) {
    try {
      const key = `${this.storagePrefix}messages_${this.currentUserId}_${chatId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        messages,
        lastUpdated: Date.now(),
        messageCount: messages.length,
      }));
    } catch (error) {
      console.error('Error storing messages:', error);
      throw error;
    }
  }

  // Retrieve chat messages
  async getMessages(chatId) {
    try {
      const key = `${this.storagePrefix}messages_${this.currentUserId}_${chatId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (!storedData) {
        return [];
      }

      const data = JSON.parse(storedData);
      return data.messages || [];
    } catch (error) {
      console.error('Error retrieving messages:', error);
      return [];
    }
  }

  // Store chat metadata
  async storeChatMetadata(chatId, metadata) {
    try {
      const key = `${this.storagePrefix}chat_meta_${this.currentUserId}_${chatId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        metadata,
        lastUpdated: Date.now(),
      }));
    } catch (error) {
      console.error('Error storing chat metadata:', error);
      throw error;
    }
  }

  // Get chat metadata
  async getChatMetadata(chatId) {
    try {
      const key = `${this.storagePrefix}chat_meta_${this.currentUserId}_${chatId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (!storedData) {
        return null;
      }

      const data = JSON.parse(storedData);
      return data.metadata || null;
    } catch (error) {
      console.error('Error retrieving chat metadata:', error);
      return null;
    }
  }

  // Store contact list
  async storeContacts(contacts) {
    try {
      const key = `${this.storagePrefix}contacts_${this.currentUserId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        contacts,
        lastUpdated: Date.now(),
        contactCount: contacts.length,
      }));
    } catch (error) {
      console.error('Error storing contacts:', error);
      throw error;
    }
  }

  // Get contact list
  async getContacts() {
    try {
      const key = `${this.storagePrefix}contacts_${this.currentUserId}`;
      const storedData = await AsyncStorage.getItem(key);
      
      if (!storedData) {
        return [];
      }

      const data = JSON.parse(storedData);
      return data.contacts || [];
    } catch (error) {
      console.error('Error retrieving contacts:', error);
      return [];
    }
  }

  // Get all chat IDs for current user
  async getAllChatIds() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const messageKeys = keys.filter(key => 
        key.startsWith(`${this.storagePrefix}messages_${this.currentUserId}_`)
      );
      
      return messageKeys.map(key => 
        key.replace(`${this.storagePrefix}messages_${this.currentUserId}_`, '')
      );
    } catch (error) {
      console.error('Error getting chat IDs:', error);
      return [];
    }
  }

  // Clear all data for current user (device logout)
  async clearUserData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => 
        key.startsWith(`${this.storagePrefix}`) && 
        key.includes(`_${this.currentUserId}_`)
      );
      
      await AsyncStorage.multiRemove(userKeys);
      this.currentUserId = null;
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => 
        key.startsWith(`${this.storagePrefix}`) && 
        key.includes(`_${this.currentUserId}_`)
      );

      let totalSize = 0;
      const stats = {};

      for (const key of userKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const size = data.length;
          totalSize += size;
          
          if (key.includes('_messages_')) {
            stats.messages = (stats.messages || 0) + size;
          } else if (key.includes('_contacts_')) {
            stats.contacts = size;
          } else if (key.includes('_chat_meta_')) {
            stats.metadata = (stats.metadata || 0) + size;
          }
        }
      }

      return {
        totalSize,
        breakdown: stats,
        chatCount: await this.getAllChatIds().then(ids => ids.length),
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }
}

export default new DeviceStorageService();

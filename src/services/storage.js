import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  constructor() {
    // Storage keys
    this.CONTACTS_KEY = 'user_contacts';
    this.CHATS_KEY = 'user_chats';
    this.MESSAGES_KEY_PREFIX = 'messages_';
    this.CHAT_METADATA_KEY = 'chat_metadata';
    this.USER_PROFILE_KEY = 'user_profile';
    this.THEME_KEY = 'app_theme';
    this.STORAGE_VERSION_KEY = 'storage_version';
    
    // Configuration
    this.MAX_MESSAGES_PER_CHAT = 1000;
    this.CURRENT_STORAGE_VERSION = '1.0.0';
    this.MESSAGE_CLEANUP_THRESHOLD = 500;
    
    // Initialize storage version check
    this.initializeStorage();
  }

  // ====================
  // STORAGE INITIALIZATION & MIGRATION
  // ====================

  async initializeStorage() {
    try {
      const currentVersion = await AsyncStorage.getItem(this.STORAGE_VERSION_KEY);
      
      if (!currentVersion) {
        // First time setup
        await AsyncStorage.setItem(this.STORAGE_VERSION_KEY, this.CURRENT_STORAGE_VERSION);
        console.log('Storage initialized with version:', this.CURRENT_STORAGE_VERSION);
      } else if (currentVersion !== this.CURRENT_STORAGE_VERSION) {
        // Handle migration if needed
        await this.migrateStorage(currentVersion, this.CURRENT_STORAGE_VERSION);
      }
    } catch (error) {
      console.error('Storage initialization error:', error);
    }
  }

  async migrateStorage(fromVersion, toVersion) {
    try {
      console.log(`Migrating storage from ${fromVersion} to ${toVersion}`);
      // Add migration logic here if needed in future
      await AsyncStorage.setItem(this.STORAGE_VERSION_KEY, toVersion);
    } catch (error) {
      console.error('Storage migration error:', error);
    }
  }

  // ====================
  // VALIDATION HELPERS
  // ====================

  validateContact(contact) {
    if (!contact || typeof contact !== 'object') {
      throw new Error('Contact must be an object');
    }
    if (!contact.contactId || typeof contact.contactId !== 'string') {
      throw new Error('Contact must have a valid contactId');
    }
    return true;
  }

  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new Error('Message must be an object');
    }
    if (!message.content || typeof message.content !== 'string') {
      throw new Error('Message must have content');
    }
    return true;
  }

  // ====================
  // CONTACTS MANAGEMENT
  // ====================

  async getContacts() {
    try {
      const contactsData = await AsyncStorage.getItem(this.CONTACTS_KEY);
      const contacts = contactsData ? JSON.parse(contactsData) : [];
      
      // Validate and clean contacts
      return contacts.filter(contact => {
        try {
          this.validateContact(contact);
          return true;
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error('Error getting contacts from storage:', error);
      return [];
    }
  }

  async addContact(contact) {
    try {
      this.validateContact(contact);

      const contacts = await this.getContacts();
      const existingIndex = contacts.findIndex(c => c.contactId === contact.contactId);

      const contactData = {
        contactId: contact.contactId,
        displayName: contact.displayName || contact.contactId,
        photoURL: contact.photoURL || null,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOnline: contact.isOnline || false,
        lastSeen: contact.lastSeen || null,
        ...contact
      };

      if (existingIndex >= 0) {
        // Update existing contact
        contacts[existingIndex] = { ...contacts[existingIndex], ...contactData };
      } else {
        // Add new contact
        contacts.push(contactData);
      }

      // Sort contacts by display name
      contacts.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

      await AsyncStorage.setItem(this.CONTACTS_KEY, JSON.stringify(contacts));
      console.log('Contact saved locally:', contactData.contactId);
      return contactData;
    } catch (error) {
      console.error('Error adding contact to storage:', error);
      throw error;
    }
  }

  async removeContact(contactId) {
    try {
      const contacts = await this.getContacts();
      const filteredContacts = contacts.filter(c => c.contactId !== contactId);
      await AsyncStorage.setItem(this.CONTACTS_KEY, JSON.stringify(filteredContacts));
      
      // Also remove associated chat data
      await this.removeChatMessages(contactId);
      
      console.log('Contact removed from storage:', contactId);
      return true;
    } catch (error) {
      console.error('Error removing contact from storage:', error);
      throw error;
    }
  }

  async getContact(contactId) {
    try {
      const contacts = await this.getContacts();
      return contacts.find(c => c.contactId === contactId) || null;
    } catch (error) {
      console.error('Error getting contact from storage:', error);
      return null;
    }
  }

  async searchContacts(query) {
    try {
      if (!query || typeof query !== 'string') return [];
      
      const contacts = await this.getContacts();
      const lowerQuery = query.toLowerCase();
      
      return contacts.filter(contact => {
        const displayName = (contact.displayName || '').toLowerCase();
        const contactId = (contact.contactId || '').toLowerCase();
        return displayName.includes(lowerQuery) || contactId.includes(lowerQuery);
      });
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  // ====================
  // CHAT MANAGEMENT
  // ====================

  async getChats() {
    try {
      const chatData = await AsyncStorage.getItem(this.CHAT_METADATA_KEY);
      const chats = chatData ? JSON.parse(chatData) : {};
      
      // Return as array sorted by last message time
      return Object.values(chats)
        .filter(chat => chat && chat.contactId) // Filter out invalid chats
        .sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || 0).getTime();
          const timeB = new Date(b.lastMessageTime || 0).getTime();
          return timeB - timeA;
        });
    } catch (error) {
      console.error('Error getting chats from storage:', error);
      return [];
    }
  }

  async updateChatMetadata(contactId, metadata) {
    try {
      if (!contactId || typeof contactId !== 'string') {
        throw new Error('Invalid contactId');
      }

      const chatData = await AsyncStorage.getItem(this.CHAT_METADATA_KEY);
      const chats = chatData ? JSON.parse(chatData) : {};

      const existingChat = chats[contactId] || {};
      
      chats[contactId] = {
        contactId,
        displayName: metadata.displayName || existingChat.displayName || contactId,
        photoURL: metadata.photoURL || existingChat.photoURL || null,
        lastMessage: metadata.lastMessage || existingChat.lastMessage || '',
        lastMessageTime: metadata.lastMessageTime || existingChat.lastMessageTime || new Date().toISOString(),
        unreadCount: metadata.unreadCount !== undefined ? metadata.unreadCount : existingChat.unreadCount || 0,
        isOnline: metadata.isOnline !== undefined ? metadata.isOnline : existingChat.isOnline || false,
        lastSeen: metadata.lastSeen || existingChat.lastSeen || null,
        updatedAt: new Date().toISOString(),
        ...existingChat,
        ...metadata
      };

      await AsyncStorage.setItem(this.CHAT_METADATA_KEY, JSON.stringify(chats));
      return true;
    } catch (error) {
      console.error('Error updating chat metadata:', error);
      return false;
    }
  }

  async getChatMetadata(contactId) {
    try {
      const chatData = await AsyncStorage.getItem(this.CHAT_METADATA_KEY);
      const chats = chatData ? JSON.parse(chatData) : {};
      return chats[contactId] || null;
    } catch (error) {
      console.error('Error getting chat metadata:', error);
      return null;
    }
  }

  async markChatAsRead(contactId) {
    try {
      await this.updateChatMetadata(contactId, { unreadCount: 0 });
      return true;
    } catch (error) {
      console.error('Error marking chat as read:', error);
      return false;
    }
  }

  async incrementUnreadCount(contactId) {
    try {
      const metadata = await this.getChatMetadata(contactId);
      const currentCount = (metadata && metadata.unreadCount) || 0;
      await this.updateChatMetadata(contactId, { unreadCount: currentCount + 1 });
      return true;
    } catch (error) {
      console.error('Error incrementing unread count:', error);
      return false;
    }
  }

  // ====================
  // MESSAGE MANAGEMENT
  // ====================

  async getChatMessages(contactId) {
    try {
      if (!contactId) return [];
      
      const messagesData = await AsyncStorage.getItem(this.MESSAGES_KEY_PREFIX + contactId);
      const messages = messagesData ? JSON.parse(messagesData) : [];
      
      // Validate and filter messages
      const validMessages = messages.filter(message => {
        try {
          this.validateMessage(message);
          return true;
        } catch {
          return false;
        }
      });
      
      // Sort by timestamp (oldest first)
      return validMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.error('Error getting chat messages from storage:', error);
      return [];
    }
  }

  async addChatMessage(contactId, message) {
    try {
      if (!contactId || typeof contactId !== 'string') {
        throw new Error('Invalid contactId');
      }
      
      this.validateMessage(message);

      const messages = await this.getChatMessages(contactId);
      
      const messageData = {
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderContactId: message.senderContactId || '',
        recipientContactId: message.recipientContactId || contactId,
        content: message.content.trim(),
        timestamp: message.timestamp || new Date().toISOString(),
        messageType: message.messageType || 'text',
        status: message.status || 'sent',
        localId: message.localId || null,
        ...message
      };

      // Check for duplicate messages
      const existingMessageIndex = messages.findIndex(m => 
        m.id === messageData.id || 
        (m.content === messageData.content && 
         Math.abs(new Date(m.timestamp) - new Date(messageData.timestamp)) < 5000) // 5 second threshold
      );

      if (existingMessageIndex >= 0) {
        // Update existing message
        messages[existingMessageIndex] = { ...messages[existingMessageIndex], ...messageData };
      } else {
        // Add new message
        messages.push(messageData);
      }

      // Auto-cleanup old messages if needed
      await this.cleanupOldMessages(messages, contactId);

      await AsyncStorage.setItem(this.MESSAGES_KEY_PREFIX + contactId, JSON.stringify(messages));

      // Update chat metadata with last message
      await this.updateChatMetadata(contactId, {
        lastMessage: messageData.content,
        lastMessageTime: messageData.timestamp,
        displayName: message.senderDisplayName || message.displayName || contactId
      });

      console.log('Message saved locally for:', contactId);
      return messageData;
    } catch (error) {
      console.error('Error adding chat message to storage:', error);
      throw error;
    }
  }

  async cleanupOldMessages(messages, contactId) {
    try {
      if (messages.length > this.MAX_MESSAGES_PER_CHAT) {
        // Keep only the most recent messages
        const trimmedMessages = messages
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, this.MESSAGE_CLEANUP_THRESHOLD);
        
        await AsyncStorage.setItem(
          this.MESSAGES_KEY_PREFIX + contactId, 
          JSON.stringify(trimmedMessages.reverse())
        );
        
        console.log(`Cleaned up old messages for ${contactId}: ${messages.length} -> ${trimmedMessages.length}`);
      }
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
    }
  }

  async removeChatMessages(contactId) {
    try {
      await AsyncStorage.removeItem(this.MESSAGES_KEY_PREFIX + contactId);
      
      // Remove from chat metadata
      const chatData = await AsyncStorage.getItem(this.CHAT_METADATA_KEY);
      const chats = chatData ? JSON.parse(chatData) : {};
      delete chats[contactId];
      await AsyncStorage.setItem(this.CHAT_METADATA_KEY, JSON.stringify(chats));
      
      return true;
    } catch (error) {
      console.error('Error removing chat messages:', error);
      return false;
    }
  }

  async updateMessageStatus(contactId, messageId, status) {
    try {
      const messages = await this.getChatMessages(contactId);
      const messageIndex = messages.findIndex(m => m.id === messageId);
      
      if (messageIndex >= 0) {
        messages[messageIndex].status = status;
        messages[messageIndex].updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(this.MESSAGES_KEY_PREFIX + contactId, JSON.stringify(messages));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating message status:', error);
      return false;
    }
  }

  async searchMessages(contactId, query) {
    try {
      if (!query || typeof query !== 'string') return [];
      
      const messages = await this.getChatMessages(contactId);
      const lowerQuery = query.toLowerCase();
      
      return messages.filter(message => 
        message.content && message.content.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  async searchAllMessages(query) {
    try {
      if (!query || typeof query !== 'string') return [];
      
      const keys = await AsyncStorage.getAllKeys();
      const messageKeys = keys.filter(key => key.startsWith(this.MESSAGES_KEY_PREFIX));
      const results = [];
      
      for (const key of messageKeys) {
        const contactId = key.replace(this.MESSAGES_KEY_PREFIX, '');
        const messages = await this.searchMessages(contactId, query);
        
        if (messages.length > 0) {
          results.push({
            contactId,
            messages
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error searching all messages:', error);
      return [];
    }
  }

  // ====================
  // BATCH OPERATIONS
  // ====================

  async addMultipleMessages(contactId, messages) {
    try {
      if (!Array.isArray(messages) || messages.length === 0) return false;
      
      const existingMessages = await this.getChatMessages(contactId);
      const messageMap = new Map(existingMessages.map(m => [m.id, m]));
      
      // Add or update messages
      messages.forEach(message => {
        this.validateMessage(message);
        const messageData = {
          id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderContactId: message.senderContactId || '',
          recipientContactId: message.recipientContactId || contactId,
          content: message.content.trim(),
          timestamp: message.timestamp || new Date().toISOString(),
          messageType: message.messageType || 'text',
          status: message.status || 'sent',
          ...message
        };
        
        messageMap.set(messageData.id, messageData);
      });
      
      const allMessages = Array.from(messageMap.values())
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Auto-cleanup if needed
      await this.cleanupOldMessages(allMessages, contactId);
      
      await AsyncStorage.setItem(this.MESSAGES_KEY_PREFIX + contactId, JSON.stringify(allMessages));
      
      // Update chat metadata with latest message
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        await this.updateChatMetadata(contactId, {
          lastMessage: latestMessage.content,
          lastMessageTime: latestMessage.timestamp,
        });
      }
      
      console.log(`Added ${messages.length} messages for ${contactId}`);
      return true;
    } catch (error) {
      console.error('Error adding multiple messages:', error);
      return false;
    }
  }

  // ====================
  // USER PROFILE MANAGEMENT
  // ====================

  async storeUserProfile(profile) {
    try {
      if (!profile || typeof profile !== 'object') {
        throw new Error('Invalid profile data');
      }

      const profileData = {
        uid: profile.uid,
        contactId: profile.contactId,
        displayName: profile.displayName || '',
        email: profile.email || '',
        photoURL: profile.photoURL || null,
        isOnline: profile.isOnline !== undefined ? profile.isOnline : true,
        lastSeen: new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...profile
      };

      await AsyncStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(profileData));
      console.log('User profile saved locally');
      return profileData;
    } catch (error) {
      console.error('Error storing user profile:', error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      const profileData = await AsyncStorage.getItem(this.USER_PROFILE_KEY);
      return profileData ? JSON.parse(profileData) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async updateUserProfile(updates) {
    try {
      if (!updates || typeof updates !== 'object') {
        throw new Error('Invalid update data');
      }

      const currentProfile = await this.getUserProfile();
      if (!currentProfile) {
        throw new Error('No existing profile found');
      }

      const updatedProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(updatedProfile));
      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // ====================
  // THEME & CACHE MANAGEMENT
  // ====================

  async storeTheme(theme) {
    try {
      if (typeof theme !== 'string') {
        throw new Error('Theme must be a string');
      }
      await AsyncStorage.setItem(this.THEME_KEY, theme);
      return true;
    } catch (error) {
      console.error('Error storing theme:', error);
      return false;
    }
  }

  async getTheme() {
    try {
      return await AsyncStorage.getItem(this.THEME_KEY);
    } catch (error) {
      console.error('Error getting theme:', error);
      return null;
    }
  }

  async storeCache(key, data, expiryHours = 24) {
    try {
      if (!key || typeof key !== 'string') {
        throw new Error('Cache key must be a string');
      }

      const cacheData = {
        data,
        timestamp: Date.now(),
        expiry: expiryHours * 60 * 60 * 1000,
        version: this.CURRENT_STORAGE_VERSION
      };
      
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error(`Error storing cache for ${key}:`, error);
      return false;
    }
  }

  async getCache(key) {
    try {
      if (!key || typeof key !== 'string') return null;

      const cacheData = await AsyncStorage.getItem(`cache_${key}`);
      if (!cacheData) return null;

      const { data, timestamp, expiry } = JSON.parse(cacheData);
      const now = Date.now();

      if (now - timestamp > expiry) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error getting cache for ${key}:`, error);
      return null;
    }
  }

  async clearExpiredCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      let clearedCount = 0;
      
      for (const key of cacheKeys) {
        try {
          const cacheData = await AsyncStorage.getItem(key);
          if (cacheData) {
            const { timestamp, expiry } = JSON.parse(cacheData);
            if (Date.now() - timestamp > expiry) {
              await AsyncStorage.removeItem(key);
              clearedCount++;
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          await AsyncStorage.removeItem(key);
          clearedCount++;
        }
      }
      
      console.log(`Cleared ${clearedCount} expired cache entries`);
      return clearedCount;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  // ====================
  // UTILITY & CLEANUP METHODS
  // ====================

  async clearAllChatData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => 
        key.startsWith(this.MESSAGES_KEY_PREFIX) || 
        key === this.CHAT_METADATA_KEY
      );
      
      await AsyncStorage.multiRemove(chatKeys);
      console.log(`Cleared ${chatKeys.length} chat-related storage keys`);
      return true;
    } catch (error) {
      console.error('Error clearing chat data:', error);
      return false;
    }
  }

  async clearAllContactData() {
    try {
      await AsyncStorage.removeItem(this.CONTACTS_KEY);
      console.log('All contact data cleared from storage');
      return true;
    } catch (error) {
      console.error('Error clearing contact data:', error);
      return false;
    }
  }

  async clearAllAppData() {
    try {
      await AsyncStorage.clear();
      console.log('All app data cleared from storage');
      return true;
    } catch (error) {
      console.error('Error clearing all app data:', error);
      return false;
    }
  }

  async getStorageInfo() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);
      
      let totalSize = 0;
      const keyInfo = values.map(([key, value]) => {
        const size = (key.length + (value ? value.length : 0));
        totalSize += size;
        return { key, size: size, type: this.getKeyType(key) };
      });

      const contacts = await this.getContacts();
      const chats = await this.getChats();

      return {
        version: this.CURRENT_STORAGE_VERSION,
        totalKeys: keys.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        keyInfo: keyInfo.sort((a, b) => b.size - a.size),
        counts: {
          contacts: contacts.length,
          chats: chats.length,
          cache: keys.filter(k => k.startsWith('cache_')).length
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }

  getKeyType(key) {
    if (key.startsWith('cache_')) return 'cache';
    if (key.startsWith(this.MESSAGES_KEY_PREFIX)) return 'messages';
    if (key === this.CONTACTS_KEY) return 'contacts';
    if (key === this.CHAT_METADATA_KEY) return 'chat_metadata';
    if (key === this.USER_PROFILE_KEY) return 'user_profile';
    if (key === this.THEME_KEY) return 'theme';
    return 'other';
  }

  // ====================
  // BACKUP & RESTORE
  // ====================

  async createBackup() {
    try {
      const data = {
        version: this.CURRENT_STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        contacts: await this.getContacts(),
        chats: await this.getChats(),
        userProfile: await this.getUserProfile(),
        theme: await this.getTheme(),
      };

      // Include messages for each chat
      const chats = await this.getChats();
      const messagesBackup = {};
      
      for (const chat of chats) {
        messagesBackup[chat.contactId] = await this.getChatMessages(chat.contactId);
      }
      
      data.messages = messagesBackup;
      
      console.log('Backup created successfully');
      return data;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupData) {
    try {
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Invalid backup data');
      }

      // Restore contacts
      if (backupData.contacts && Array.isArray(backupData.contacts)) {
        await AsyncStorage.setItem(this.CONTACTS_KEY, JSON.stringify(backupData.contacts));
      }

      // Restore chats metadata
      if (backupData.chats && Array.isArray(backupData.chats)) {
        const chatsObj = {};
        backupData.chats.forEach(chat => {
          if (chat.contactId) {
            chatsObj[chat.contactId] = chat;
          }
        });
        await AsyncStorage.setItem(this.CHAT_METADATA_KEY, JSON.stringify(chatsObj));
      }

      // Restore messages
      if (backupData.messages && typeof backupData.messages === 'object') {
        for (const [contactId, messages] of Object.entries(backupData.messages)) {
          if (Array.isArray(messages)) {
            await AsyncStorage.setItem(this.MESSAGES_KEY_PREFIX + contactId, JSON.stringify(messages));
          }
        }
      }

      // Restore user profile
      if (backupData.userProfile) {
        await AsyncStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(backupData.userProfile));
      }

      // Restore theme
      if (backupData.theme) {
        await AsyncStorage.setItem(this.THEME_KEY, backupData.theme);
      }

      console.log('Data restored from backup successfully');
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  // ====================
  // SYNC HELPERS
  // ====================

  async syncContactsFromServer(serverContacts) {
    try {
      if (!Array.isArray(serverContacts)) return [];

      const localContacts = await this.getContacts();
      const contactMap = new Map(localContacts.map(c => [c.contactId, c]));

      // Merge server contacts with local ones
      serverContacts.forEach(serverContact => {
        if (serverContact && serverContact.contactId) {
          const localContact = contactMap.get(serverContact.contactId);
          if (localContact) {
            // Update existing contact with server data
            contactMap.set(serverContact.contactId, { 
              ...localContact, 
              ...serverContact,
              updatedAt: new Date().toISOString()
            });
          } else {
            // Add new contact from server
            contactMap.set(serverContact.contactId, {
              ...serverContact,
              addedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
      });

      const mergedContacts = Array.from(contactMap.values())
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      
      await AsyncStorage.setItem(this.CONTACTS_KEY, JSON.stringify(mergedContacts));
      
      console.log(`Synced ${mergedContacts.length} contacts from server`);
      return mergedContacts;
    } catch (error) {
      console.error('Error syncing contacts from server:', error);
      return await this.getContacts(); // Return local contacts on error
    }
  }

  async syncChatsFromServer(serverChats) {
    try {
      if (!Array.isArray(serverChats)) return false;

      for (const serverChat of serverChats) {
        if (serverChat && serverChat.contactId) {
          await this.updateChatMetadata(serverChat.contactId, serverChat);
          
          if (serverChat.messages && Array.isArray(serverChat.messages)) {
            await this.addMultipleMessages(serverChat.contactId, serverChat.messages);
          }
        }
      }
      
      console.log(`Synced ${serverChats.length} chats from server`);
      return true;
    } catch (error) {
      console.error('Error syncing chats from server:', error);
      return false;
    }
  }
}

export default new StorageService();

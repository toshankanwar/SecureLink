// src/hooks/useChat.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/api';
import StorageService from '../services/storage';
import { generateUniqueId } from '../utils/helpers';

export function useChat(contactId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && contactId) {
      loadMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(pollMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [user, contactId]);

  const loadMessages = async () => {
    try {
      // Load local messages first
      const localMessages = await getLocalMessages(contactId);
      setMessages(localMessages);
      setLoading(false);

      // Then fetch from server
      await pollMessages();
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const pollMessages = async () => {
    try {
      const response = await ApiService.getMessages(50);
      const serverMessages = response.messages || [];

      if (serverMessages.length > 0) {
        // Save server messages locally
        for (const message of serverMessages) {
          await saveLocalMessage(message);
          
          // Mark as delivered if it's for us
          if (message.recipientContactId === user.contactId && message.status === 'sent') {
            await ApiService.markMessageDelivered(message.id);
          }
        }

        // Reload local messages to update UI
        const updatedMessages = await getLocalMessages(contactId);
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  };

  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;

    try {
      const localId = generateUniqueId();
      const tempMessage = {
        id: null,
        localId,
        senderContactId: user.contactId,
        recipientContactId: contactId,
        content: messageText.trim(),
        messageType: 'text',
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      // Add to local storage and UI immediately
      await saveLocalMessage(tempMessage);
      setMessages(prev => [...prev, tempMessage]);

      // Send to server
      const response = await ApiService.sendMessage(
        contactId, 
        messageText.trim(), 
        'text', 
        localId
      );

      // Update message with server response
      const updatedMessage = {
        ...tempMessage,
        id: response.messageId,
        status: 'sent',
        timestamp: response.timestamp,
      };

      await saveLocalMessage(updatedMessage);
      setMessages(prev => 
        prev.map(msg => 
          msg.localId === localId ? updatedMessage : msg
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.localId === localId ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  }, [user, contactId]);

  const markAsRead = useCallback(async (messageId) => {
    try {
      await ApiService.markMessageRead(messageId);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // Helper functions for local storage
  const getLocalMessages = async (contactId) => {
    try {
      const key = `chat_${contactId}`;
      const messages = await StorageService.getData(key);
      return messages || [];
    } catch (error) {
      console.error('Error getting local messages:', error);
      return [];
    }
  };

  const saveLocalMessage = async (message) => {
    try {
      const chatPartnerId = message.senderContactId === user.contactId 
        ? message.recipientContactId 
        : message.senderContactId;
      
      const key = `chat_${chatPartnerId}`;
      const existingMessages = await StorageService.getData(key) || [];
      
      // Check if message already exists
      const messageExists = existingMessages.find(m => 
        m.id === message.id || (m.localId && m.localId === message.localId)
      );
      
      if (!messageExists) {
        existingMessages.push(message);
        // Sort by timestamp
        existingMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        await StorageService.storeData(key, existingMessages);
      } else if (message.id) {
        // Update existing message with server ID
        const updatedMessages = existingMessages.map(m => 
          (m.localId === message.localId) ? message : m
        );
        await StorageService.storeData(key, updatedMessages);
      }
    } catch (error) {
      console.error('Error saving local message:', error);
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
    refreshMessages: loadMessages,
  };
}

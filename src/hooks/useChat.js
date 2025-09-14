import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useWebSocket } from './useWebSocket';
import ApiService from '../services/api';
import EncryptionService from '../services/encryption';

export function useChat(contactId) {
  const { user } = useAuth();
  const { sendMessage: wsSendMessage, messages: wsMessages } = useWebSocket();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    if (contactId) {
      initializeChat();
    }
  }, [contactId]);

  useEffect(() => {
    // Handle incoming WebSocket messages
    wsMessages.forEach(message => {
      if (message.type === 'new_message' && message.sender_id !== user.id) {
        addMessage(message);
      }
    });
  }, [wsMessages, user.id]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Get or create chat
      const chatResponse = await ApiService.createChat(contactId);
      setChatId(chatResponse.chat_id);
      
      // Load chat history
      const historyResponse = await ApiService.getChatHistory(chatResponse.chat_id);
      setMessages(historyResponse.messages || []);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async (messageText) => {
    try {
      const messageId = EncryptionService.generateMessageId();
      const timestamp = Date.now();
      
      // Create message object
      const message = {
        id: messageId,
        content: messageText,
        sender_id: user.id,
        recipient_id: contactId,
        timestamp,
        status: 'sending',
      };

      // Add to local messages immediately
      addMessage(message);

      // Send via WebSocket
      wsSendMessage(contactId, messageText);

      // Send via API for persistence
      await ApiService.sendMessage({
        message_id: messageId,
        recipient_contact_id: contactId,
        content: messageText,
        message_type: 'text',
        timestamp,
      });

      // Update message status
      updateMessageStatus(messageId, 'sent');
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  }, [user.id, contactId, wsSendMessage]);

  const addMessage = (message) => {
    setMessages(prev => {
      const exists = prev.find(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
    });
  };

  const updateMessageStatus = (messageId, status) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    chatId,
  };
}

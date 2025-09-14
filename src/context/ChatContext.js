import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import EncryptionService from '../services/encryption';
import DeviceStorageService from '../services/deviceStorage';
import KeychainService from '../services/keychain';

const ChatContext = createContext();

const initialState = {
  chats: [],
  messages: {},
  loading: false,
  error: null,
  activeChat: null,
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload, loading: false };
    case 'ADD_CHAT':
      return {
        ...state,
        chats: [...state.chats, action.payload],
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages,
        },
      };
    case 'ADD_MESSAGE':
      const { chatId, message } = action.payload;
      const existingMessages = state.messages[chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: [...existingMessages, message].sort((a, b) => a.timestamp - b.timestamp),
        },
      };
    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChat: action.payload };
    case 'CLEAR_ALL':
      return initialState;
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { isAuthenticated, user, deviceKeys, isNewDevice } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && deviceKeys) {
      loadLocalData();
      
      if (isNewDevice) {
        showNewDeviceMessage();
      }
    } else {
      dispatch({ type: 'CLEAR_ALL' });
    }
  }, [isAuthenticated, user, deviceKeys]);

  const showNewDeviceMessage = () => {
    console.log('This is a new device. Previous messages are not available due to end-to-end encryption.');
    // You can show a modal or notification here
  };

  const loadLocalData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Load contacts (chats)
      const contacts = await DeviceStorageService.getContacts();
      dispatch({ type: 'SET_CHATS', payload: contacts || [] });
      
      // Load messages for each chat
      const chatIds = await DeviceStorageService.getAllChatIds();
      for (const chatId of chatIds) {
        const messages = await DeviceStorageService.getMessages(chatId);
        dispatch({
          type: 'SET_MESSAGES',
          payload: { chatId, messages },
        });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Error loading local data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load local data' });
    }
  };

  const createChat = async (contactId, contactDisplayName, contactPublicKey) => {
    try {
      const chatId = `${user.uid}_${contactId}`;
      const newChat = {
        id: chatId,
        contactId,
        displayName: contactDisplayName,
        lastMessage: null,
        lastMessageTime: Date.now(),
        createdAt: Date.now(),
      };

      // Store contact's public key
      await KeychainService.storeContactPublicKey(contactId, contactPublicKey);
      
      // Add to local chats
      dispatch({ type: 'ADD_CHAT', payload: newChat });
      
      // Update local storage
      const updatedChats = [...state.chats, newChat];
      await DeviceStorageService.storeContacts(updatedChats);
      
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  const sendMessage = async (chatId, content, contactId) => {
    try {
      // Get contact's public key
      const contactPublicKey = await KeychainService.getContactPublicKey(contactId);
      if (!contactPublicKey) {
        throw new Error('Contact public key not found');
      }

      // Encrypt message
      const encryptedMessage = await EncryptionService.encryptMessage(content, contactPublicKey);
      
      // Create message object
      const message = {
        id: Date.now().toString() + Math.random().toString(36),
        content,
        encryptedContent: encryptedMessage,
        senderId: user.uid,
        recipientId: contactId,
        timestamp: Date.now(),
        status: 'sent',
        type: 'text',
      };

      // Add to local messages
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { chatId, message },
      });

      // Update local storage
      const messages = [...(state.messages[chatId] || []), message];
      await DeviceStorageService.storeMessages(chatId, messages);
      
      // Update chat metadata
      const chatMetadata = {
        lastMessage: content,
        lastMessageTime: message.timestamp,
      };
      await DeviceStorageService.storeChatMetadata(chatId, chatMetadata);

      // Here you would also send to your backend/WebSocket for delivery
      // await sendToBackend(message);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const receiveMessage = async (encryptedMessage, senderId, chatId) => {
    try {
      // Decrypt message with our private key
      const decryptedContent = await EncryptionService.decryptMessage(
        encryptedMessage,
        deviceKeys.privateKey
      );

      const message = {
        id: Date.now().toString() + Math.random().toString(36),
        content: decryptedContent,
        senderId,
        recipientId: user.uid,
        timestamp: Date.now(),
        status: 'received',
        type: 'text',
      };

      // Add to local messages
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { chatId, message },
      });

      // Update local storage
      const messages = [...(state.messages[chatId] || []), message];
      await DeviceStorageService.storeMessages(chatId, messages);

      return message;
    } catch (error) {
      console.error('Error receiving message:', error);
      throw error;
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const messages = await DeviceStorageService.getMessages(chatId);
      dispatch({
        type: 'SET_MESSAGES',
        payload: { chatId, messages },
      });
      return messages;
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  };

  const setActiveChat = (chat) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat });
  };

  const getStorageStats = async () => {
    return await DeviceStorageService.getStorageStats();
  };

  const clearAllData = async () => {
    try {
      await DeviceStorageService.clearUserData();
      dispatch({ type: 'CLEAR_ALL' });
    } catch (error) {
      console.error('Error clearing chat data:', error);
      throw error;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        ...state,
        createChat,
        sendMessage,
        receiveMessage,
        loadMessages,
        setActiveChat,
        getStorageStats,
        clearAllData,
        isNewDevice,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

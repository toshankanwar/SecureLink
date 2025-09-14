import { useEffect, useRef, useState } from 'react';
import WebSocketService from '../services/websocket';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const wsService = useRef(WebSocketService);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleError = (error) => {
      setConnectionError(error);
      setIsConnected(false);
    };

    // Set up event listeners
    wsService.current.on('connected', handleConnected);
    wsService.current.on('disconnected', handleDisconnected);
    wsService.current.on('message', handleMessage);
    wsService.current.on('error', handleError);

    // Connect
    wsService.current.connect();

    // Cleanup
    return () => {
      wsService.current.off('connected', handleConnected);
      wsService.current.off('disconnected', handleDisconnected);
      wsService.current.off('message', handleMessage);
      wsService.current.off('error', handleError);
      wsService.current.disconnect();
    };
  }, []);

  const sendMessage = (recipientId, message, messageType = 'text') => {
    if (isConnected) {
      wsService.current.sendMessage(recipientId, message, messageType);
    }
  };

  const joinChat = (chatId) => {
    if (isConnected) {
      wsService.current.joinChat(chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (isConnected) {
      wsService.current.leaveChat(chatId);
    }
  };

  return {
    isConnected,
    messages,
    connectionError,
    sendMessage,
    joinChat,
    leaveChat,
  };
}

import { API_CONFIG } from '../utils/constants';
import StorageService from './storage';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.isConnected = false;
    this.isConnecting = false;
    this.messageQueue = [];
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
  }

  async connect() {
    if (this.isConnecting || this.isConnected) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      this.isConnecting = true;
      const token = await StorageService.getSecureData('@user_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const wsUrl = `${API_CONFIG.WS_URL}?token=${encodeURIComponent(token)}`;
      console.log('Connecting to WebSocket:', wsUrl.replace(token, '[REDACTED]'));

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        this.startHeartbeat();
        this.flushMessageQueue();
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            this.handlePong();
            return;
          }
          
          console.log('WebSocket message received:', data.type);
          this.emit('message', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.emit('error', new Error('Failed to parse message'));
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.isConnecting = false;
      this.emit('error', error);
      throw error;
    }
  }

  disconnect() {
    console.log('Disconnecting WebSocket');
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.log('WebSocket not connected, queueing message');
      this.messageQueue.push(data);
      return false;
    }
  }

  sendMessage(recipientId, message, messageType = 'text', metadata = {}) {
    const messageData = {
      type: 'send_message',
      recipient_id: recipientId,
      message: message,
      message_type: messageType,
      timestamp: Date.now(),
      ...metadata,
    };
    
    return this.send(messageData);
  }

  joinChat(chatId) {
    return this.send({
      type: 'join_chat',
      chat_id: chatId,
    });
  }

  leaveChat(chatId) {
    return this.send({
      type: 'leave_chat',
      chat_id: chatId,
    });
  }

  sendTyping(recipientId, isTyping = true) {
    return this.send({
      type: 'typing',
      recipient_id: recipientId,
      is_typing: isTyping,
    });
  }

  sendReadReceipt(messageId) {
    return this.send({
      type: 'read_receipt',
      message_id: messageId,
    });
  }

  requestPresence(contactIds) {
    return this.send({
      type: 'presence_request',
      contact_ids: contactIds,
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  flushMessageQueue() {
    if (this.messageQueue.length > 0) {
      console.log(`Flushing ${this.messageQueue.length} queued messages`);
      const queuedMessages = [...this.messageQueue];
      this.messageQueue = [];
      
      queuedMessages.forEach(message => {
        this.send(message);
      });
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
        
        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout, disconnecting');
          this.disconnect();
        }, 30000); // 30 second timeout
      }
    }, 60000); // Send ping every 60 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  handlePong() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  getConnectionState() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      state: this.getConnectionState(),
    };
  }
}

export default new WebSocketService();

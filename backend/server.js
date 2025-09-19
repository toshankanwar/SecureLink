// server.js
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { admin, db } from './firebaseAdmin.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Configuration
const HOST = '192.168.1.105';
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Socket.io setup with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: "*",
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Enhanced rate limiting
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: message });
  }
});

// Different rate limits for different endpoints
app.use('/api/auth', createRateLimiter(15 * 60 * 1000, 10, 'Too many auth requests'));
app.use('/api/chat/send', createRateLimiter(1 * 60 * 1000, 60, 'Too many messages'));
app.use('/api', createRateLimiter(1 * 60 * 1000, 200, 'Too many requests'));

// Session management
const activeConnections = new Map(); // userId => { socketId, contactId, lastActive, deviceId }
const socketToUser = new Map(); // socketId => userId
const contactToUser = new Map(); // contactId => userId

// Enhanced authentication middleware
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authorization header required',
      code: 'AUTH_HEADER_MISSING'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Token missing',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    req.userId = decodedToken.uid;

    // Fetch user profile from Firestore
    const userDoc = await db.collection('users').doc(req.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'User profile not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    req.profile = userDoc.data();
    req.contactId = req.profile.contactId;

    // Update last active timestamp
    await updateUserActivity(req.userId);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    let errorMessage = 'Invalid or expired token';
    let errorCode = 'TOKEN_INVALID';
    
    if (error.code === 'auth/id-token-expired') {
      errorMessage = 'Token expired';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.code === 'auth/argument-error') {
      errorMessage = 'Invalid token format';
      errorCode = 'TOKEN_FORMAT_INVALID';
    }
    
    return res.status(401).json({ 
      error: errorMessage,
      code: errorCode
    });
  }
}

// Helper function to update user activity
async function updateUserActivity(userId) {
  try {
    await db.collection('users').doc(userId).update({
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

// Helper function to find user by contactId
async function findUserByContactId(contactId) {
  try {
    const userQuery = await db.collection('users')
      .where('contactId', '==', contactId)
      .limit(1)
      .get();
    
    return userQuery.empty ? null : {
      id: userQuery.docs[0].id,
      data: userQuery.docs[0].data()
    };
  } catch (error) {
    console.error('Error finding user by contactId:', error);
    return null;
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeConnections: activeConnections.size,
    environment: NODE_ENV,
    host: HOST,
    port: PORT,
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  const { idToken, contactId, deviceId } = req.body;

  if (!idToken || !contactId || !deviceId) {
    return res.status(400).json({ 
      error: 'Missing required fields: idToken, contactId, deviceId' 
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    console.log(`🔐 Login: ${userId}, contactId: ${contactId}, device: ${deviceId}`);

    // Update user status and activity
    await db.collection('users').doc(userId).update({
      isOnline: true,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      lastDevice: deviceId,
      contactId: contactId // Ensure contactId is always updated
    });

    // Store contact to user mapping
    contactToUser.set(contactId, userId);

    res.json({ 
      success: true,
      userId,
      contactId,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ 
      error: 'Invalid Firebase token',
      code: 'INVALID_TOKEN'
    });
  }
});

app.post('/api/auth/logout', authenticate, async (req, res) => {
  const userId = req.userId;
  const contactId = req.contactId;
  
  console.log(`🚪 Logout: ${userId} (${contactId})`);
  
  try {
    // Update user status in Firestore
    await db.collection('users').doc(userId).update({
      isOnline: false,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    });

    // Clean up active connections
    if (activeConnections.has(userId)) {
      const connection = activeConnections.get(userId);
      if (connection.socketId) {
        const socket = io.sockets.sockets.get(connection.socketId);
        if (socket) {
          socket.emit('logged_out', { message: 'Logged out successfully' });
          socket.disconnect(true);
        }
        socketToUser.delete(connection.socketId);
      }
      activeConnections.delete(userId);
    }

    // Clean up contact mapping
    contactToUser.delete(contactId);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    userId: req.userId,
    contactId: req.contactId,
    email: req.user.email,
    displayName: req.profile.displayName,
    photoURL: req.profile.photoURL,
    isOnline: req.profile.isOnline,
    lastActive: req.profile.lastActive
  });
});

// Chat messaging endpoints
app.post('/api/chat/send', authenticate, async (req, res) => {
  const { recipientContactId, content, messageType = 'text' } = req.body;

  if (!recipientContactId || !content?.trim()) {
    return res.status(400).json({ 
      error: 'recipientContactId and content are required' 
    });
  }

  if (content.trim().length > 1000) {
    return res.status(400).json({ 
      error: 'Message content too long (max 1000 characters)' 
    });
  }

  try {
    const messageId = uuidv4();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const messageData = {
      id: messageId,
      senderContactId: req.contactId,
      recipientContactId,
      content: content.trim(),
      messageType,
      timestamp,
      status: 'sent'
    };

    console.log(`📨 Message: ${req.contactId} → ${recipientContactId}`);

    // Find recipient user
    const recipientUser = await findUserByContactId(recipientContactId);
    
    if (!recipientUser) {
      return res.status(404).json({ 
        error: 'Recipient not found',
        code: 'RECIPIENT_NOT_FOUND'
      });
    }

    const recipientUserId = recipientUser.id;
    const recipientData = recipientUser.data;

    // Use Firestore batch for atomic operations
    const batch = db.batch();
    
    // Store message in sender's chat
    const senderChatRef = db.collection('users')
      .doc(req.userId)
      .collection('chats')
      .doc(recipientContactId)
      .collection('messages')
      .doc(messageId);
    batch.set(senderChatRef, messageData);

    // Store message in recipient's chat
    const recipientChatRef = db.collection('users')
      .doc(recipientUserId)
      .collection('chats')
      .doc(req.contactId)
      .collection('messages')
      .doc(messageId);
    batch.set(recipientChatRef, messageData);

    // Update chat metadata for sender
    const senderMetaRef = db.collection('users')
      .doc(req.userId)
      .collection('chats')
      .doc(recipientContactId);
    batch.set(senderMetaRef, {
      contactId: recipientContactId,
      displayName: recipientData.displayName || recipientContactId,
      photoURL: recipientData.photoURL || null,
      lastMessage: content.trim(),
      lastMessageTime: timestamp,
      unreadCount: 0,
      isOnline: recipientData.isOnline || false
    }, { merge: true });

    // Update chat metadata for recipient
    const recipientMetaRef = db.collection('users')
      .doc(recipientUserId)
      .collection('chats')
      .doc(req.contactId);
    batch.set(recipientMetaRef, {
      contactId: req.contactId,
      displayName: req.profile.displayName || req.contactId,
      photoURL: req.profile.photoURL || null,
      lastMessage: content.trim(),
      lastMessageTime: timestamp,
      unreadCount: admin.firestore.FieldValue.increment(1),
      isOnline: true
    }, { merge: true });

    await batch.commit();

    // Send real-time notification if recipient is connected
    const recipientConnection = [...activeConnections.values()]
      .find(conn => conn.contactId === recipientContactId);

    let recipientOnline = false;
    if (recipientConnection && recipientConnection.socketId) {
      const recipientSocket = io.sockets.sockets.get(recipientConnection.socketId);
      if (recipientSocket) {
        recipientSocket.emit('new_message', messageData);
        recipientOnline = true;
        console.log(`⚡ Real-time delivery: ${recipientContactId}`);
      }
    }

    res.json({ 
      success: true,
      messageId,
      timestamp: new Date().toISOString(),
      status: 'sent',
      recipientOnline
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      code: 'MESSAGE_SEND_FAILED'
    });
  }
});

// Get user chats
app.get('/api/chats', authenticate, async (req, res) => {
  try {
    const chatsSnapshot = await db.collection('users')
      .doc(req.userId)
      .collection('chats')
      .orderBy('lastMessageTime', 'desc')
      .get();

    const chats = [];
    chatsSnapshot.forEach(doc => {
      const chatData = doc.data();
      chats.push({
        contactId: chatData.contactId,
        displayName: chatData.displayName || chatData.contactId,
        photoURL: chatData.photoURL,
        lastMessage: chatData.lastMessage || '',
        lastMessageTime: chatData.lastMessageTime,
        unreadCount: chatData.unreadCount || 0,
        isOnline: chatData.isOnline || false
      });
    });

    console.log(`📬 Retrieved ${chats.length} chats for ${req.contactId}`);
    res.json({ chats, count: chats.length });

  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chats',
      code: 'CHATS_FETCH_FAILED'
    });
  }
});

// Get messages for a specific chat
app.get('/api/chat/:contactId/messages', authenticate, async (req, res) => {
  const { contactId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  try {
    const messagesSnapshot = await db.collection('users')
      .doc(req.userId)
      .collection('chats')
      .doc(contactId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const messages = [];
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate()?.toISOString() || new Date().toISOString()
      });
    });

    // Reverse to get chronological order (oldest first)
    messages.reverse();

    console.log(`📬 Retrieved ${messages.length} messages for ${req.contactId} ↔ ${contactId}`);
    res.json({ 
      messages, 
      count: messages.length,
      hasMore: messages.length === limit
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      code: 'MESSAGES_FETCH_FAILED'
    });
  }
});

// Mark messages as delivered
app.post('/api/chat/delivered/:messageId', authenticate, async (req, res) => {
  const { messageId } = req.params;

  try {
    // Update message status in Firestore
    await db.collection('messageStatus').doc(messageId).set({
      status: 'delivered',
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      deliveredBy: req.contactId
    }, { merge: true });

    console.log(`✅ Message ${messageId} marked as delivered by ${req.contactId}`);
    res.json({ status: 'delivered' });
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({ error: 'Failed to mark as delivered' });
  }
});

// Mark messages as read
app.post('/api/chat/read/:messageId', authenticate, async (req, res) => {
  const { messageId } = req.params;

  try {
    // Update message status in Firestore
    await db.collection('messageStatus').doc(messageId).set({
      status: 'read',
      readAt: admin.firestore.FieldValue.serverTimestamp(),
      readBy: req.contactId
    }, { merge: true });

    console.log(`👁️ Message ${messageId} marked as read by ${req.contactId}`);
    res.json({ status: 'read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Contact lookup
app.get('/api/contacts/lookup/:contactId', authenticate, async (req, res) => {
  const { contactId } = req.params;

  try {
    const user = await findUserByContactId(contactId);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = user.data;
    const isOnline = [...activeConnections.values()]
      .some(conn => conn.contactId === contactId);

    res.json({
      contactId: userData.contactId,
      displayName: userData.displayName || contactId,
      photoURL: userData.photoURL,
      isOnline,
      lastSeen: userData.lastSeen
    });
  } catch (error) {
    console.error('Lookup contact error:', error);
    res.status(500).json({ 
      error: 'Failed to lookup contact',
      code: 'CONTACT_LOOKUP_FAILED'
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('authenticate', async (data) => {
    try {
      const { token, contactId } = data;
      
      if (!token || !contactId) {
        socket.emit('auth_error', { error: 'Token and contactId required' });
        return;
      }

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Disconnect any existing socket for this user
      if (activeConnections.has(userId)) {
        const existingConnection = activeConnections.get(userId);
        if (existingConnection.socketId && existingConnection.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existingConnection.socketId);
          if (oldSocket) {
            oldSocket.emit('connection_replaced', { reason: 'New connection established' });
            oldSocket.disconnect(true);
          }
          socketToUser.delete(existingConnection.socketId);
        }
      }

      // Store new connection
      activeConnections.set(userId, { 
        socketId: socket.id, 
        contactId,
        lastActive: Date.now(),
        connectedAt: new Date().toISOString()
      });
      socketToUser.set(socket.id, userId);
      contactToUser.set(contactId, userId);

      // Update user online status
      await db.collection('users').doc(userId).update({
        isOnline: true,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      });
      
      socket.emit('authenticated', { success: true, contactId });
      
      // Notify contacts that user is online
      socket.broadcast.emit('user_online', { contactId });
      
      console.log(`⚡ Socket authenticated: ${contactId} (${socket.id})`);

    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', { error: 'Authentication failed' });
      socket.disconnect(true);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const userId = socketToUser.get(socket.id);
    if (userId && data.contactId) {
      const connection = activeConnections.get(userId);
      if (connection) {
        socket.broadcast.emit('typing_start', { 
          contactId: connection.contactId,
          targetContactId: data.contactId
        });
      }
    }
  });

  socket.on('typing_stop', (data) => {
    const userId = socketToUser.get(socket.id);
    if (userId && data.contactId) {
      const connection = activeConnections.get(userId);
      if (connection) {
        socket.broadcast.emit('typing_stop', { 
          contactId: connection.contactId,
          targetContactId: data.contactId
        });
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', async (reason) => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      const connection = activeConnections.get(userId);
      if (connection) {
        try {
          // Update user offline status
          await db.collection('users').doc(userId).update({
            isOnline: false,
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
          });

          // Notify contacts that user is offline
          socket.broadcast.emit('user_offline', { contactId: connection.contactId });
          
          contactToUser.delete(connection.contactId);
        } catch (error) {
          console.error('Error updating offline status:', error);
        }
      }
      
      activeConnections.delete(userId);
      socketToUser.delete(socket.id);
      
      console.log(`🔌 Socket disconnected: ${userId} (${socket.id}), reason: ${reason}`);
    }
  });

  // Handle ping-pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl
  });
});

// Cleanup inactive connections every 5 minutes
setInterval(() => {
  const now = Date.now();
  const inactiveThreshold = 10 * 60 * 1000; // 10 minutes

  for (const [userId, connection] of activeConnections.entries()) {
    if (now - connection.lastActive > inactiveThreshold) {
      const socket = io.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.disconnect(true);
      }
      activeConnections.delete(userId);
      socketToUser.delete(connection.socketId);
      contactToUser.delete(connection.contactId);
      console.log(`🧹 Cleaned up inactive connection: ${connection.contactId}`);
    }
  }
}, 5 * 60 * 1000);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 SecureLink Server running on http://${HOST}:${PORT}`);
  console.log(`📱 React Native CLI ready`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`🔥 Firebase project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`⚡ WebSocket enabled for real-time messaging`);
  console.log(`🛡️ Security middleware active`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Close all socket connections
  io.close(() => {
    console.log('📡 WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('🌐 HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { io, activeConnections };

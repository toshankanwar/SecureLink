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

// Configuration for React Native CLI
const HOST = '192.168.1.105'; // Your IP address
const PORT = process.env.PORT || 8080;

// Socket.io setup for React Native CLI
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for React Native CLI
        methods: ["GET", "POST"],
        credentials: false
    }
});

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS for React Native CLI
app.use(cors({
    origin: "*", // Allow all origins for React Native CLI
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // Increased limit for development
    message: { error: 'Too many requests from this IP' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// In-memory store for active sessions (single session per user)
const activeSessions = new Map(); // { userId: { token, contactId, socketId, deviceId, lastActivity } }
const socketToUser = new Map(); // { socketId: userId }

// Clean up expired sessions every 30 minutes
setInterval(() => {
    const now = Date.now();
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) * 1000 || 24 * 60 * 60 * 1000;
    
    for (const [userId, session] of activeSessions.entries()) {
        if (now - session.lastActivity > sessionTimeout) {
            activeSessions.delete(userId);
            console.log(`Session expired for user: ${userId}`);
        }
    }
}, 30 * 60 * 1000);

// Authentication middleware
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        // Check if this is the active session
        const activeSession = activeSessions.get(userId);
        if (!activeSession || activeSession.token !== token) {
            return res.status(401).json({ error: 'Session expired or invalidated by another login' });
        }

        // Update last activity
        activeSession.lastActivity = Date.now();
        
        req.user = decodedToken;
        req.contactId = activeSession.contactId;
        req.userId = userId;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        activeSessions: activeSessions.size,
        environment: process.env.NODE_ENV,
        host: HOST,
        port: PORT,
        platform: 'React Native CLI'
    });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    const { idToken, contactId, deviceId } = req.body;

    if (!idToken || !contactId || !deviceId) {
        return res.status(400).json({ 
            error: 'idToken, contactId, and deviceId are required' 
        });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        console.log(`📱 RN CLI Login: ${userId}, contactId: ${contactId}`);

        // Invalidate any existing session (single session enforcement)
        if (activeSessions.has(userId)) {
            const oldSession = activeSessions.get(userId);
            console.log(`🔄 Invalidating existing session for user: ${userId}`);
            
            if (oldSession.socketId) {
                // Disconnect old socket
                const oldSocket = io.sockets.sockets.get(oldSession.socketId);
                if (oldSocket) {
                    oldSocket.emit('session_invalidated', { 
                        reason: 'New login detected from another device' 
                    });
                    oldSocket.disconnect(true);
                }
                socketToUser.delete(oldSession.socketId);
            }
        }

        // Create new session
        const sessionData = {
            token: idToken,
            contactId,
            deviceId,
            lastActivity: Date.now(),
            socketId: null,
            loginTime: new Date().toISOString()
        };

        activeSessions.set(userId, sessionData);

        res.json({ 
            success: true,
            token: idToken, 
            contactId,
            userId,
            expiresIn: parseInt(process.env.SESSION_TIMEOUT) || 86400
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(401).json({ error: 'Invalid Firebase token' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', authenticate, (req, res) => {
    const userId = req.userId;
    
    console.log(`🚪 Logout request for user: ${userId}`);
    
    // Clean up session and socket
    if (activeSessions.has(userId)) {
        const session = activeSessions.get(userId);
        if (session.socketId) {
            const socket = io.sockets.sockets.get(session.socketId);
            if (socket) {
                socket.emit('logged_out', { message: 'You have been logged out' });
                socket.disconnect(true);
            }
            socketToUser.delete(session.socketId);
        }
        activeSessions.delete(userId);
    }

    res.json({ message: 'Logged out successfully' });
});

// Get current user info
app.get('/api/auth/me', authenticate, (req, res) => {
    const session = activeSessions.get(req.userId);
    res.json({
        userId: req.userId,
        contactId: req.contactId,
        email: req.user.email,
        name: req.user.name,
        deviceId: session?.deviceId,
        loginTime: session?.loginTime
    });
});

// Send message
app.post('/api/chat/send', authenticate, async (req, res) => {
    const { recipientContactId, content, messageType = 'text', localId } = req.body;

    if (!recipientContactId || !content?.trim()) {
        return res.status(400).json({ 
            error: 'recipientContactId and content are required' 
        });
    }

    try {
        const messageId = uuidv4();
        const timestamp = new Date();

        const message = {
            id: messageId,
            senderContactId: req.contactId,
            recipientContactId,
            content: content.trim(),
            messageType,
            timestamp: timestamp.toISOString(),
            status: 'sent',
            localId: localId || null
        };

        // Store message in Firestore under recipient's inbox
        await db.collection('messageInbox')
            .doc(recipientContactId)
            .collection('messages')
            .doc(messageId)
            .set(message);

        console.log(`📨 Message sent from ${req.contactId} to ${recipientContactId}: ${messageId}`);

        // Send real-time notification if recipient is online
        const recipientSession = [...activeSessions.entries()]
            .find(([_, session]) => session.contactId === recipientContactId);

        if (recipientSession && recipientSession[1].socketId) {
            const recipientSocket = io.sockets.sockets.get(recipientSession[1].socketId);
            if (recipientSocket) {
                recipientSocket.emit('new_message', message);
                console.log(`⚡ Real-time message delivered to ${recipientContactId}`);
            }
        }

        res.json({ 
            messageId, 
            timestamp: timestamp.toISOString(), 
            status: 'sent',
            recipientOnline: !!recipientSession
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get messages (and delete after retrieval for temporary storage)
app.get('/api/chat/messages', authenticate, async (req, res) => {
    try {
        const contactId = req.contactId;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const messagesRef = db.collection('messageInbox')
            .doc(contactId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(limit);

        const snapshot = await messagesRef.get();
        const messages = [];

        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });

        console.log(`📬 Retrieved ${messages.length} messages for ${contactId}`);

        // Delete fetched messages (temporary storage concept)
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`🗑️ Deleted ${snapshot.docs.length} messages from ${contactId}'s inbox`);
        }

        res.json({ 
            messages,
            count: messages.length,
            hasMore: messages.length === limit
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Mark message as delivered
app.post('/api/chat/delivered/:messageId', authenticate, async (req, res) => {
    const { messageId } = req.params;

    try {
        await db.collection('messageStatus').doc(messageId).set({
            status: 'delivered',
            deliveredAt: new Date().toISOString(),
            deliveredBy: req.contactId
        }, { merge: true });

        console.log(`✅ Message ${messageId} marked as delivered by ${req.contactId}`);
        res.json({ status: 'delivered' });
    } catch (error) {
        console.error('Mark delivered error:', error);
        res.status(500).json({ error: 'Failed to mark as delivered' });
    }
});

// Mark message as read
app.post('/api/chat/read/:messageId', authenticate, async (req, res) => {
    const { messageId } = req.params;

    try {
        await db.collection('messageStatus').doc(messageId).set({
            status: 'read',
            readAt: new Date().toISOString(),
            readBy: req.contactId
        }, { merge: true });

        console.log(`👁️ Message ${messageId} marked as read by ${req.contactId}`);
        res.json({ status: 'read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Contact management endpoints
app.post('/api/contacts/add', authenticate, async (req, res) => {
    const { contactId, displayName } = req.body;

    if (!contactId || !displayName) {
        return res.status(400).json({ error: 'contactId and displayName required' });
    }

    try {
        await db.collection('contacts')
            .doc(req.userId)
            .collection('userContacts')
            .doc(contactId)
            .set({
                contactId,
                displayName,
                addedAt: new Date().toISOString(),
                addedBy: req.contactId
            });

        console.log(`👥 Contact ${contactId} added by ${req.contactId}`);
        res.json({ success: true, contactId, displayName });
    } catch (error) {
        console.error('Add contact error:', error);
        res.status(500).json({ error: 'Failed to add contact' });
    }
});
app.get('/api/chats', authenticate, async (req, res) => {
    try {
      const contactId = req.contactId; // comes from your auth/session middleware
  
      // Fetch unique chat partners (all distinct users user has received messages from)
      const inboxSnap = await db.collection('messageInbox')
        .doc(contactId)
        .collection('messages')
        .get();
  
      // Build a list of unique chat contactIds and metadata
      const chatMap = {};
      inboxSnap.forEach(doc => {
        const msg = doc.data();
        const partnerId = msg.senderContactId === contactId
          ? msg.recipientContactId
          : msg.senderContactId;
        if (!chatMap[partnerId]) {
          chatMap[partnerId] = {
            lastMessage: msg.content,
            lastTimestamp: msg.timestamp,
            contactId: partnerId,
          };
        } else {
          // If newer message, update last
          if (msg.timestamp > chatMap[partnerId].lastTimestamp) {
            chatMap[partnerId].lastMessage = msg.content;
            chatMap[partnerId].lastTimestamp = msg.timestamp;
          }
        }
      });
  
      // Convert chatMap to array, sorted by last message time descending
      const chats = Object.values(chatMap).sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
  
      res.json({ chats });
    } catch (error) {
      console.error('Error getting user chats:', error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });

app.get('/api/contacts/lookup/:contactId', authenticate, async (req, res) => {
    const { contactId } = req.params;

    try {
        // Check if contact is online
        const isOnline = [...activeSessions.values()]
            .some(session => session.contactId === contactId);

        res.json({
            contactId,
            displayName: `User ${contactId}`,
            photoURL: null,
            isOnline
        });
    } catch (error) {
        console.error('Lookup contact error:', error);
        res.status(500).json({ error: 'Failed to lookup contact' });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('authenticate', async (data) => {
        try {
            const { token, contactId } = data;
            
            if (!token || !contactId) {
                socket.emit('authentication_failed', { error: 'Token and contactId required' });
                return;
            }

            const decodedToken = await admin.auth().verifyIdToken(token);
            const userId = decodedToken.uid;

            // Verify this is the active session
            const activeSession = activeSessions.get(userId);
            if (activeSession && activeSession.token === token && activeSession.contactId === contactId) {
                // Disconnect any existing socket for this user
                if (activeSession.socketId) {
                    const oldSocket = io.sockets.sockets.get(activeSession.socketId);
                    if (oldSocket && oldSocket.id !== socket.id) {
                        oldSocket.emit('connection_replaced', { reason: 'New connection established' });
                        oldSocket.disconnect(true);
                    }
                    socketToUser.delete(activeSession.socketId);
                }

                // Associate socket with user
                activeSession.socketId = socket.id;
                socketToUser.set(socket.id, userId);
                
                socket.emit('authenticated', { success: true, contactId });
                console.log(`⚡ Socket authenticated for user: ${contactId} (${socket.id})`);
            } else {
                socket.emit('authentication_failed', { error: 'Invalid session or token' });
                socket.disconnect(true);
            }
        } catch (error) {
            console.error('Socket authentication error:', error);
            socket.emit('authentication_failed', { error: 'Invalid token' });
            socket.disconnect(true);
        }
    });

    socket.on('disconnect', (reason) => {
        const userId = socketToUser.get(socket.id);
        if (userId) {
            const session = activeSessions.get(userId);
            if (session && session.socketId === socket.id) {
                session.socketId = null;
            }
            socketToUser.delete(socket.id);
            console.log(`🔌 Socket disconnected: ${userId} (${socket.id}), reason: ${reason}`);
        }
    });

    socket.on('ping', () => {
        socket.emit('pong');
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server - Listen on your IP address for React Native CLI access
server.listen(PORT, HOST, () => {
    console.log(`🚀 React Native CLI Server running on http://${HOST}:${PORT}`);
    console.log(`📱 Connect your React Native app to: http://${HOST}:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔥 Firebase project: ${process.env.FIREBASE_PROJECT_ID}`);
    console.log(`📊 Active sessions: ${activeSessions.size}`);
    console.log(`⚡ WebSocket enabled for real-time messaging`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

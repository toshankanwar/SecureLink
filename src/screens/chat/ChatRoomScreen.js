import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Text,
  Image,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import StorageService from '../../services/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import io from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.105:8080';

export default function ChatRoomScreen({ navigation }) {
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  // Route params
  const { contactId, contactName, contactPhoto } = route.params || {};
  
  // State management
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contactProfile, setContactProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  
  // Refs
  const flatListRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize component
  useEffect(() => {
    if (!user?.uid || !contactId) {
      navigation.goBack();
      return;
    }

    loadContactProfile();
    loadMessages();
    setupWebSocket();
    setupFirebaseListener();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [contactId, user]);

  // Load contact profile
  const loadContactProfile = async () => {
    try {
      // Try to get from local storage first
      const localContact = await StorageService.getContact(contactId);
      if (localContact) {
        setContactProfile(localContact);
      }

      // Fetch from Firebase for updated info
      const userQuery = await firestore()
        .collection('users')
        .where('contactId', '==', contactId)
        .limit(1)
        .get();

      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data();
        const profile = {
          contactId: userData.contactId,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          isOnline: userData.isOnline || false,
          lastSeen: userData.lastSeen,
        };
        
        setContactProfile(profile);
        setIsOnline(profile.isOnline);
        setLastSeen(profile.lastSeen);
        
        // Save to local storage
        await StorageService.addContact(profile);
      }
    } catch (error) {
      console.error('Error loading contact profile:', error);
    }
  };

  // Load messages from local storage
  const loadMessages = async () => {
    try {
      setLoading(true);
      const localMessages = await StorageService.getChatMessages(contactId);
      setMessages(localMessages.reverse()); // Reverse for FlatList inverted
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket connection
  const setupWebSocket = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      
      socketRef.current = io(SERVER_URL, {
        transports: ['websocket'],
        timeout: 20000,
      });

      socketRef.current.on('connect', () => {
        console.log('🔌 Connected to WebSocket server');
        
        // Authenticate with server
        socketRef.current.emit('authenticate', {
          token: idToken,
          contactId: user.contactId || user.uid,
        });
      });

      socketRef.current.on('authenticated', () => {
        console.log('✅ WebSocket authenticated');
      });

      socketRef.current.on('new_message', (messageData) => {
        if (messageData.senderContactId === contactId) {
          handleNewMessage(messageData);
        }
      });

      socketRef.current.on('user_online', (data) => {
        if (data.contactId === contactId) {
          setIsOnline(true);
        }
      });

      socketRef.current.on('user_offline', (data) => {
        if (data.contactId === contactId) {
          setIsOnline(false);
          setLastSeen(new Date().toISOString());
        }
      });

      socketRef.current.on('typing_start', (data) => {
        if (data.contactId === contactId) {
          setIsTyping(true);
        }
      });

      socketRef.current.on('typing_stop', (data) => {
        if (data.contactId === contactId) {
          setIsTyping(false);
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket server');
      });

    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  };

  // Setup Firebase listener for contact status
  const setupFirebaseListener = () => {
    const unsubscribe = firestore()
      .collection('users')
      .where('contactId', '==', contactId)
      .limit(1)
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setIsOnline(userData.isOnline || false);
          setLastSeen(userData.lastSeen);
        }
      });

    return unsubscribe;
  };

  // Handle new incoming message
  const handleNewMessage = async (messageData) => {
    try {
      // Add to local storage
      await StorageService.addChatMessage(contactId, messageData);
      
      // Update messages state
      setMessages(prev => [messageData, ...prev]);
      
      // Update chat metadata
      await StorageService.updateChatMetadata(contactId, {
        lastMessage: messageData.content,
        lastMessageTime: messageData.timestamp,
        displayName: contactProfile?.displayName || contactId,
        unreadCount: 1, // Increment unread count
      });

      // Mark as delivered
      markMessageDelivered(messageData.id);
      
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'Please login again to send messages');
        return;
      }

      const idToken = await currentUser.getIdToken();
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create message object
      const messageData = {
        id: messageId,
        senderContactId: user.contactId || user.uid,
        recipientContactId: contactId,
        content: messageText,
        timestamp: new Date().toISOString(),
        messageType: 'text',
        status: 'sending',
      };

      // Add to UI immediately (optimistic update)
      setMessages(prev => [messageData, ...prev]);
      
      // Save to local storage
      await StorageService.addChatMessage(contactId, messageData);

      // Send to server
      const response = await fetch(`${SERVER_URL}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          recipientContactId: contactId,
          content: messageText,
          messageType: 'text',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update message status to sent
        const updatedMessage = { ...messageData, status: 'sent', id: result.messageId };
        setMessages(prev => prev.map(msg => msg.id === messageId ? updatedMessage : msg));
        
        // Update local storage
        await StorageService.updateMessageStatus(contactId, messageId, 'sent');
        
        // Update chat metadata
        await StorageService.updateChatMetadata(contactId, {
          lastMessage: messageText,
          lastMessageTime: updatedMessage.timestamp,
          displayName: contactProfile?.displayName || contactId,
        });

      } else {
        throw new Error('Failed to send message');
      }
      
    } catch (error) {
      console.error('Send message error:', error);
      
      // Update message status to failed
      setMessages(prev => prev.map(msg => 
        msg.content === messageText && msg.status === 'sending' 
          ? { ...msg, status: 'failed' } 
          : msg
      ));
      
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Mark message as delivered
  const markMessageDelivered = async (messageId) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();
      
      await fetch(`${SERVER_URL}/api/chat/delivered/${messageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });
    } catch (error) {
      console.error('Mark delivered error:', error);
    }
  };

  // Handle typing indicators
  const handleTextChange = (text) => {
    setInputText(text);
    
    // Send typing indicator
    if (socketRef.current && text.length > 0) {
      socketRef.current.emit('typing_start', { contactId });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('typing_stop', { contactId });
      }, 2000);
    } else if (socketRef.current) {
      socketRef.current.emit('typing_stop', { contactId });
    }
  };

  // Get time ago string
  const getTimeAgo = (timestamp) => {
    try {
      const now = new Date();
      const messageTime = new Date(timestamp);
      const diffMs = now - messageTime;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return messageTime.toLocaleDateString();
    } catch {
      return '';
    }
  };

  // Render message bubble
  const renderMessage = ({ item, index }) => {
    const isOwn = item.senderContactId === (user.contactId || user.uid);
    const showTimestamp = index === 0 || 
      (messages[index - 1] && new Date(item.timestamp) - new Date(messages[index - 1].timestamp) > 300000); // 5 minutes

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwn ? [styles.ownMessage, { backgroundColor: theme.primary }] 
                : [styles.otherMessage, { backgroundColor: theme.surface }]
        ]}>
          <Text style={[
            styles.messageText,
            { color: isOwn ? theme.textOnPrimary : theme.text }
          ]}>
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              { color: isOwn ? theme.textOnPrimary + '80' : theme.textSecondary }
            ]}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            
            {isOwn && (
              <View style={styles.messageStatus}>
                {item.status === 'sending' && (
                  <ActivityIndicator size="small" color={theme.textOnPrimary + '80'} />
                )}
                {item.status === 'sent' && (
                  <Icon name="done" size={16} color={theme.textOnPrimary + '80'} />
                )}
                {item.status === 'delivered' && (
                  <Icon name="done-all" size={16} color={theme.textOnPrimary + '80'} />
                )}
                {item.status === 'read' && (
                  <Icon name="done-all" size={16} color="#4FC3F7" />
                )}
                {item.status === 'failed' && (
                  <Icon name="error" size={16} color="#FF5252" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="chat" size={80} color={theme.iconSecondary} />
      <Text style={[styles.emptyText, { color: theme.text }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        Start the conversation with {contactProfile?.displayName || contactId}
      </Text>
    </View>
  );

  // Custom header
  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <SafeAreaView style={[styles.headerContainer, { backgroundColor: theme.primary }]}>
          <StatusBar backgroundColor={theme.primary} barStyle="light-content" />
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color={theme.textOnPrimary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.profileSection}
              onPress={() => {
                // Navigate to contact profile or show profile modal
                console.log('Show contact profile');
              }}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ 
                    uri: contactProfile?.photoURL || contactPhoto || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(contactProfile?.displayName || contactId)}&background=random`
                  }}
                  style={styles.avatar}
                />
                {isOnline && <View style={[styles.onlineIndicator, { backgroundColor: theme.success }]} />}
              </View>
              
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: theme.textOnPrimary }]}>
                  {contactProfile?.displayName || contactName || contactId}
                </Text>
                <Text style={[styles.contactStatus, { color: theme.textOnPrimary + '80' }]}>
                  {isTyping ? 'typing...' : 
                   isOnline ? 'online' : 
                   lastSeen ? `last seen ${getTimeAgo(lastSeen)}` : 'offline'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton}>
                <Icon name="videocam" size={24} color={theme.textOnPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Icon name="call" size={24} color={theme.textOnPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Icon name="more-vert" size={24} color={theme.textOnPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      ),
    });
  }, [contactProfile, isOnline, isTyping, lastSeen, theme]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            Please login to access chat
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={messages.length === 0 ? { flex: 1 } : { paddingVertical: 16 }}
          inverted={messages.length > 0}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
          }}
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={[styles.typingContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
            </View>
            <Text style={[styles.typingText, { color: theme.textSecondary }]}>
              {contactProfile?.displayName || contactId} is typing...
            </Text>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
          <View style={[styles.inputRow, { backgroundColor: theme.background }]}>
            <TouchableOpacity style={styles.attachButton}>
              <Icon name="attach-file" size={24} color={theme.iconSecondary} />
            </TouchableOpacity>
            
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={inputText}
              onChangeText={handleTextChange}
              placeholder={`Message ${contactProfile?.displayName || contactId}...`}
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={1000}
              textAlignVertical="center"
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: inputText.trim() ? theme.primary : theme.border }
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={theme.textOnPrimary} />
              ) : (
                <Icon 
                  name="send" 
                  size={20} 
                  color={inputText.trim() ? theme.textOnPrimary : theme.textSecondary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    elevation: 4,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  contactStatus: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 16,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 2,
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 2,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
  },
  messageStatus: {
    marginLeft: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  attachButton: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
  },
});

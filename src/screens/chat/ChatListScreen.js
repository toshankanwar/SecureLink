import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import StorageService from '../../services/storage';
import firestore from '@react-native-firebase/firestore';
import { typography } from '../../styles/typography';
import { ROUTES } from '../../utils/constants';

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setChats([]);
      setLoading(false);
      return;
    }

    loadChatsFromLocal();
    const unsubscribe = setupFirebaseListener();
    
    return unsubscribe;
  }, [user]);

  // Filter chats based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredChats(chats);
    } else {
      const lowerSearch = search.toLowerCase();
      const filtered = chats.filter(chat => {
        return (
          (chat.displayName && chat.displayName.toLowerCase().includes(lowerSearch)) ||
          (chat.contactId && chat.contactId.toLowerCase().includes(lowerSearch)) ||
          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(lowerSearch))
        );
      });
      setFilteredChats(filtered);
    }
  }, [search, chats]);

  // Load chats from local storage first
  const loadChatsFromLocal = async () => {
    try {
      setLoading(true);
      const localChats = await StorageService.getChats();
      setChats(localChats);
      console.log(`Loaded ${localChats.length} chats from local storage`);
    } catch (err) {
      console.error('Error loading local chats:', err);
      setError('Failed to load chats from local storage');
    } finally {
      setLoading(false);
    }
  };

  // Setup Firebase real-time listener
  const setupFirebaseListener = () => {
    if (!user?.uid) return () => {};

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('chats')
      .orderBy('lastMessageTime', 'desc')
      .onSnapshot(
        async (snapshot) => {
          try {
            if (snapshot) {
              const firebaseChats = [];
              
              for (const doc of snapshot.docs) {
                const chatData = {
                  contactId: doc.id,
                  ...doc.data(),
                };
                firebaseChats.push(chatData);
                
                // Update local storage for each chat
                await StorageService.updateChatMetadata(doc.id, chatData);
              }
              
              // Update state with merged data
              const updatedChats = await StorageService.getChats();
              setChats(updatedChats);
              
              console.log(`Synced ${firebaseChats.length} chats from Firebase`);
            }
          } catch (err) {
            console.error('Firebase chat sync error:', err);
            setError('Failed to sync chats from Firebase');
          }
        },
        (err) => {
          console.error('Firebase listener error:', err);
          setError('Firebase connection failed');
        }
      );

    return unsubscribe;
  };

  // Refresh chats manually
  const handleRefresh = async () => {
    if (!user?.uid) return;

    setRefreshing(true);
    setError(null);
    
    try {
      // Fetch fresh data from Firebase
      const chatsSnapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('chats')
        .orderBy('lastMessageTime', 'desc')
        .get();

      const freshChats = [];
      
      for (const doc of chatsSnapshot.docs) {
        const chatData = {
          contactId: doc.id,
          ...doc.data(),
        };
        freshChats.push(chatData);
        
        // Update local storage
        await StorageService.updateChatMetadata(doc.id, chatData);
      }
      
      // Update state
      const updatedChats = await StorageService.getChats();
      setChats(updatedChats);
      
      console.log(`Refreshed ${freshChats.length} chats from Firebase`);
    } catch (err) {
      console.error('Refresh chats error:', err);
      setError('Failed to refresh chats');
      
      // Fallback to local data
      await loadChatsFromLocal();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle chat press
  const handleChatPress = (chat) => {
    // Mark chat as read
    StorageService.markChatAsRead(chat.contactId);
    
    navigation.navigate(ROUTES.CHAT_ROOM, {
      contactId: chat.contactId,
      contactName: chat.displayName || chat.contactId,
      contactPhoto: chat.photoURL,
    });
  };

  // Handle long press on chat
  const handleChatLongPress = (chat) => {
    // Add options like delete chat, mark as unread, etc.
    console.log('Long pressed chat:', chat.contactId);
  };

  // Handle add contact
  const handleAddContact = () => {
    navigation.navigate(ROUTES.CONTACT_ID_ENTRY);
  };

  // Clear search
  const clearSearch = () => {
    setSearch('');
  };

  // Render individual chat item
  const renderChatItem = ({ item }) => {
    const timeAgo = getTimeAgo(item.lastMessageTime);
    const isUnread = (item.unreadCount || 0) > 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: theme.surface }]}
        onPress={() => handleChatPress(item)}
        onLongPress={() => handleChatLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={[styles.avatarText, { color: theme.textOnPrimary }]}>
              {(item.displayName || item.contactId)?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          {item.isOnline && (
            <View style={[styles.onlineIndicator, { backgroundColor: theme.success }]} />
          )}
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text 
              style={[
                styles.chatName, 
                { color: theme.text },
                isUnread && { fontWeight: 'bold' }
              ]}
              numberOfLines={1}
            >
              {item.displayName || item.contactId}
            </Text>
            <Text style={[styles.chatTime, { color: theme.textSecondary }]}>
              {timeAgo}
            </Text>
          </View>
          
          <View style={styles.chatFooter}>
            <Text 
              style={[
                styles.lastMessage, 
                { color: theme.textSecondary },
                isUnread && { color: theme.text, fontWeight: '500' }
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || 'No messages yet'}
            </Text>
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                <Text style={[styles.unreadCount, { color: theme.textOnPrimary }]}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chat" size={80} color={theme.iconSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No chats yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Start a conversation by adding a contact
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: theme.primary }]}
        onPress={handleAddContact}
      >
        <Text style={[styles.emptyButtonText, { color: theme.textOnPrimary }]}>
          Add Contact
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Get time ago string
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const now = new Date();
      const messageTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const diffMs = now - messageTime;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      return messageTime.toLocaleDateString();
    } catch (err) {
      return '';
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.noUserState}>
          <Text style={[styles.noUserText, { color: theme.text }]}>
            Please log in to view chats
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.primary,
            paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 32 : 32,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.textOnPrimary }, typography.h1]}>
          SecureLink
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={toggleTheme}>
            <Icon
              name={isDark ? 'light-mode' : 'dark-mode'}
              size={28}
              color={theme.textOnPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate(ROUTES.SETTINGS)}
          >
            <Icon name="settings" size={28} color={theme.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Icon name="search" size={24} color={theme.iconSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search chats..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Icon name="clear" size={24} color={theme.iconSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.error + '20' }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Icon name="close" size={20} color={theme.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Chat List */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading chats...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.contactId}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              filteredChats.length === 0 ? { flex: 1 } : { paddingBottom: 100 }
            }
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#25d366' }]}
        onPress={handleAddContact}
        activeOpacity={0.8}
      >
        <Icon name="person-add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    marginRight: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  noUserState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUserText: {
    fontSize: 18,
  },
});

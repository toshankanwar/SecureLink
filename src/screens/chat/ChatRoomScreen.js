import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext'; // For getUserProfileByContactId
import { useChat } from '../../hooks/useChat';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AVATAR_SIZE = 40;
const DEFAULT_AVATAR =
  'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

export default function ChatRoomScreen({ navigation }) {
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { getUserProfileByContactId } = useUser();

  // Extract params from navigation
  const {
    contactId: navContactId,
    displayName: navDisplayName,
    photoURL: navPhotoURL
  } = route.params ?? {};

  // Defensive: Ensure we have a contactId
  const contactId = navContactId;
  const contactProfile = getUserProfileByContactId
    ? getUserProfileByContactId(contactId)
    : undefined;

  // Use actual displayName from context/profile first, then navigation prop, then ""
  const displayName =
    contactProfile?.displayName ||
    navDisplayName ||
    "";

  // Avatar URL selection order: context/profile, nav param, fallback
  const avatarUrl =
    contactProfile?.photoURL ||
    navPhotoURL ||
    DEFAULT_AVATAR;

  const isAuthenticated = !!user && !!user.token;

  const { messages = [], loading, sendMessage } = useChat(
    isAuthenticated ? contactId : null
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.primary,
              paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 24,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
          >
            <Icon name="arrow-back" size={28} color={theme.textOnPrimary} />
          </TouchableOpacity>
          <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerName, { color: theme.textOnPrimary }]}>
              {displayName && displayName.trim().length > 0
                ? displayName
                : 'No Name'}
            </Text>
            {contactId ? (
              <Text
                style={[
                  styles.headerId,
                  { color: theme.textOnPrimary, opacity: 0.7 },
                ]}
              >
                ID: {contactId}
              </Text>
            ) : null}
          </View>
        </View>
      ),
      headerStyle: {
        backgroundColor: theme.primary,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
    });
  }, [navigation, displayName, contactId, avatarUrl, theme]);

  const handleSendMessage = async (messageText) => {
    if (!isAuthenticated) {
      alert('You need to log in again to send a message.');
      return;
    }
    try {
      await sendMessage(messageText);
    } catch (error) {
      if (
        error.message?.toLowerCase().includes('authorization') ||
        error.message?.toLowerCase().includes('token') ||
        error.message?.toLowerCase().includes('unauthorized')
      ) {
        alert('Session expired. Please re-login.');
        navigation.navigate('Login');
      } else {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderMessage = ({ item, index }) => {
    const isOwn =
      user &&
      (item.sender_id === user.uid || item.senderContactId === user.contactId);
    const showAvatar =
      index === 0 ||
      (messages[index - 1]?.sender_id !== item.sender_id &&
        messages[index - 1]?.senderContactId !== item.senderContactId);

    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showAvatar={showAvatar}
      />
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={{
          uri: 'https://cdn.pixabay.com/photo/2021/12/19/19/08/send-6881170_960_720.png',
        }}
        style={{ width: 110, height: 110, marginBottom: 12, opacity: 0.8 }}
        resizeMode="contain"
      />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        No messages yet
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        Start chatting to make a new connection!
      </Text>
    </View>
  );

  if (loading && (!messages || messages.length === 0)) {
    return <LoadingSpinner message="Loading chat..." />;
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme?.chatBackground ?? theme.background }]}>
        <View style={styles.notAuthContainer}>
          <Text style={{ color: theme.text, fontSize: 18, margin: 25 }}>
            Please login to access chats.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme?.chatBackground ?? theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' },
          ]}
          inverted={messages.length > 0}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyComponent}
        />
        <ChatInput onSendMessage={handleSendMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 13,
    borderBottomWidth: 0,
    elevation: 0,
  },
  headerBackButton: {
    marginRight: 2,
    paddingRight: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#eee',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 1,
    letterSpacing: 0.07,
  },
  headerId: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.03,
    marginTop: 0,
  },
  keyboardView: { flex: 1 },
  messagesList: { flex: 1 },
  messagesContent: { paddingVertical: 16 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.85,
  },
  notAuthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});
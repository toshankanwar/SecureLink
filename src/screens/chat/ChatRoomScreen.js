import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useChat } from '../../hooks/useChat';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import ChatHeader from '../../components/chat/ChatHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ChatRoomScreen({ navigation }) {
  const route = useRoute();
  const { theme } = useTheme();
  const { contactId, displayName } = route.params; 
  
  const { messages, loading, sendMessage } = useChat(contactId);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: displayName || contactId,
      header: () => (
        <ChatHeader
          displayName={displayName}
          contactId={contactId}
          onBack={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation, displayName, contactId]);

  const handleSendMessage = async (messageText) => {
    try {
      await sendMessage(messageText);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh logic here if needed
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderMessage = ({ item, index }) => {
    const isOwn = item.sender_id === 'current_user'; // Replace with actual user ID
    const showAvatar = index === 0 || messages[index - 1]?.sender_id !== item.sender_id;

    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showAvatar={showAvatar}
      />
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading chat..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.chatBackground }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          inverted
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
        
        <ChatInput onSendMessage={handleSendMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
});

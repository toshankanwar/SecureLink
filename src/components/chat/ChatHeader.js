import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../styles/typography';

export default function ChatHeader({
  displayName,
  contactId,
  isOnline = false,
  lastSeen,
  onBack,
  onVideoCall,
  onVoiceCall,
  onMoreOptions,
}) {
  const { theme } = useTheme();

  const getStatusText = () => {
    if (isOnline) return 'Online';
    if (lastSeen) {
      const now = new Date();
      const lastSeenDate = new Date(lastSeen);
      const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Last seen just now';
      if (diffInMinutes < 60) return `Last seen ${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `Last seen ${Math.floor(diffInMinutes / 60)}h ago`;
      return `Last seen ${lastSeenDate.toLocaleDateString()}`;
    }
    return 'Last seen recently';
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Icon name="arrow-back" size={24} color={theme.textOnPrimary} />
          </TouchableOpacity>
          
          <View style={[styles.avatar, { backgroundColor: theme.primaryDark }]}>
            <Text style={[styles.avatarText, { color: theme.textOnPrimary }]}>
              {displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={[
              styles.displayName,
              { color: theme.textOnPrimary },
              typography.h3,
            ]}>
              {displayName || contactId}
            </Text>
            <Text style={[
              styles.status,
              { color: theme.textOnPrimary },
              typography.caption,
            ]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.actionButton} onPress={onVideoCall}>
            <Icon name="videocam" size={24} color={theme.textOnPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onVoiceCall}>
            <Icon name="call" size={24} color={theme.textOnPrimary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onMoreOptions}>
            <Icon name="more-vert" size={24} color={theme.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 56,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontWeight: '600',
  },
  status: {
    opacity: 0.8,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});

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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ContactList from '../../components/chat/ContactList';
import { typography } from '../../styles/typography';
import { ROUTES } from '../../utils/constants';
import ApiService from '../../services/api';
import StorageService from '../../services/storage';

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Correct template literal for storage key
  const CHAT_LIST_KEY = user && user.contactId ? `chat_list_${user.contactId}` : 'chat_list_default';

  useEffect(() => {
    loadContactsFromLocal();
    const unsubscribe = navigation.addListener('focus', () => {
      updateContactsFromAPI();
    });
    updateContactsFromAPI();
    return unsubscribe;
    // eslint-disable-next-line
  }, [user?.contactId]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredContacts(contacts);
    } else {
      const lower = search.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (c) =>
            (c.displayName && c.displayName.toLowerCase().includes(lower)) ||
            (c.contactId && c.contactId.toLowerCase().includes(lower))
        )
      );
    }
  }, [contacts, search]);

  // Load contacts from local storage
  const loadContactsFromLocal = async () => {
    try {
      setLoading(true);
      const localList = await StorageService.getData(CHAT_LIST_KEY);
      setContacts(localList || []);
    } catch (error) {
      console.error('Error loading contacts from local:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update local storage from API
  const updateContactsFromAPI = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getUserChats();
      const apiChats = response.chats || [];
      await StorageService.storeData(CHAT_LIST_KEY, apiChats);
      setContacts(apiChats);
    } catch (error) {
      console.error('Error loading contacts from API:', error);
      if (!contacts.length) {
        loadContactsFromLocal();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContactPress = (contact) => {
    navigation.navigate(ROUTES.CHAT_ROOM, {
      contactId: contact.contactId,
      displayName: contact.displayName,
    });
  };

  const handleAddContact = () => {
    navigation.navigate(ROUTES.CONTACT_ID_ENTRY);
  };

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
      <View
        style={[
          styles.searchBarContainer,
          isDark
            ? { backgroundColor: theme.surface, borderColor: theme.border }
            : { backgroundColor: '#f1f1f1', borderColor: '#e2e2e2' },
        ]}
      >
        <Icon
          name="search"
          size={26}
          color={theme.iconSecondary}
          style={{ marginLeft: 10, marginRight: 1 }}
        />
        <TextInput
          style={[
            styles.searchBar,
            isDark
              ? { backgroundColor: theme.surface, color: theme.text }
              : { backgroundColor: 'transparent', color: theme.text },
          ]}
          placeholder="Search chats"
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Contacts List */}
      <View style={{ flex: 1 }}>
        <ContactList contacts={filteredContacts} onContactPress={handleContactPress} loading={loading} />
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#25d366' }]}
        onPress={handleAddContact}
        activeOpacity={0.8}
      >
        <Icon name="person-add" size={34} color="white" />
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
    elevation: 5,
    borderBottomWidth: 0.4,
    borderBottomColor: '#dbdbdb',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
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
    paddingHorizontal: 6,
    marginLeft: 12,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 13,
    marginBottom: 6,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  searchBar: {
    flex: 1,
    fontSize: 18,
    paddingLeft: 10,
    borderRadius: 24,
    paddingVertical: 4,
  },
  fab: {
    position: 'absolute',
    right: 26,
    bottom: 34,
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.23,
    shadowRadius: 5,
  },
});
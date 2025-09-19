import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { useContacts } from '../../context/ContactContext';
import { useAuth } from '../../context/AuthContext';
import { typography } from '../../styles/typography';

const AddContactScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    contacts,
    loading,
    error,
    addContact,
    removeContact,
    searchContacts,
    refreshContacts,
    clearError,
  } = useContacts();

  // Add Contact Form State
  const [contactId, setContactId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adding, setAdding] = useState(false);

  // Contact List State
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, []);

  const filteredContacts = searchContacts(searchText);

  // Validate Contact ID
  const validateContactId = (id) => {
    if (!id.trim()) {
      throw new Error('Please enter a Contact ID');
    }
    if (id.length !== 10) {
      throw new Error('Contact ID must be exactly 10 digits');
    }
    if (!/^\d+$/.test(id)) {
      throw new Error('Contact ID must contain only numbers');
    }
    return true;
  };

  // Validate Display Name
  const validateDisplayName = (name) => {
    if (!name.trim()) {
      throw new Error('Please enter a display name');
    }
    if (name.trim().length < 2) {
      throw new Error('Display name must be at least 2 characters');
    }
    if (name.trim().length > 50) {
      throw new Error('Display name must be less than 50 characters');
    }
    return true;
  };

  // Add Contact Handler
  const handleAddContact = async () => {
    try {
      // Clear any previous errors
      clearError();
      
      // Validate inputs
      validateContactId(contactId);
      validateDisplayName(displayName);

      // Check if contact already exists
      const existingContact = contacts.find(c => c.contactId === contactId.trim());
      if (existingContact) {
        Alert.alert('Contact Exists', 'This contact is already in your contact list.');
        return;
      }

      setAdding(true);

      // Add contact via ContactContext (handles Firebase + local storage)
      const newContact = await addContact(contactId.trim(), displayName.trim());

      // Success feedback
      Alert.alert(
        'Contact Added!',
        `${newContact.displayName} has been added to your contacts successfully.`,
        [
          {
            text: 'Start Chat',
            onPress: () => {
              navigation.navigate('ChatRoom', {
                contactId: newContact.contactId,
                contactName: newContact.displayName,
                contactPhoto: newContact.photoURL,
              });
            }
          },
          { text: 'OK' }
        ]
      );

      // Clear form
      setContactId('');
      setDisplayName('');

    } catch (err) {
      console.error('Add contact error:', err);
      Alert.alert('Add Contact Failed', err.message || 'Failed to add contact. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  // Contact List Handlers
  const handleContactPress = (contact) => {
    navigation.navigate('ChatRoom', {
      contactId: contact.contactId,
      contactName: contact.displayName,
      contactPhoto: contact.photoURL,
    });
  };

  const handleContactLongPress = (contact) => {
    Alert.alert(
      contact.displayName,
      `Contact ID: ${contact.contactId}`,
      [
        {
          text: 'Start Chat',
          onPress: () => handleContactPress(contact)
        },
        {
          text: 'Remove Contact',
          onPress: () => confirmRemoveContact(contact),
          style: 'destructive',
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const confirmRemoveContact = (contact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.displayName} from your contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await removeContact(contact.contactId);
              Alert.alert('Contact Removed', `${contact.displayName} has been removed from your contacts.`);
            } catch (err) {
              Alert.alert('Error', 'Failed to remove contact. Please try again.');
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshContacts();
    } catch (err) {
      console.error('Refresh contacts error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
  };

  const clearSearch = () => {
    setSearchText('');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    title: {
      ...typography.h2,
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    formContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      ...typography.body1,
      color: theme.text,
      marginBottom: 8,
      fontWeight: '600',
    },
    input: {
      ...typography.body1,
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      fontSize: 16,
    },
    contactIdInput: {
      textAlign: 'center',
      letterSpacing: 1,
      fontSize: 18,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      backgroundColor: theme.border,
    },
    buttonText: {
      ...typography.button,
      color: theme.textOnPrimary,
      fontWeight: 'bold',
    },
    hint: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 18,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      ...typography.body1,
      color: theme.text,
      paddingVertical: 8,
    },
    clearSearchButton: {
      padding: 4,
    },
    listContainer: {
      flex: 1,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      ...typography.h3,
      color: theme.textOnPrimary,
      fontWeight: 'bold',
    },
    contactInfo: {
      flex: 1,
      marginLeft: 12,
    },
    contactName: {
      ...typography.body1,
      color: theme.text,
      fontWeight: '600',
      marginBottom: 2,
    },
    contactId: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    contactActions: {
      alignItems: 'center',
    },
    onlineIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.success,
      marginBottom: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      ...typography.h3,
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtext: {
      ...typography.body2,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    errorContainer: {
      backgroundColor: theme.error + '10',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.error,
    },
    errorText: {
      ...typography.body2,
      color: theme.error,
    },
    contactCount: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
  });

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}
      onLongPress={() => handleContactLongPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>
          {item.displayName || 'Unknown'}
        </Text>
        <Text style={styles.contactId}>ID: {item.contactId}</Text>
      </View>
      <View style={styles.contactActions}>
        <View style={styles.onlineIndicator} />
        <Icon name="chat" size={20} color={theme.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon 
        name="contacts" 
        size={80} 
        color={theme.iconSecondary} 
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>No contacts yet</Text>
      <Text style={styles.emptySubtext}>
        Add friends using their Contact ID to start chatting.{'\n'}
        Your contacts will appear here.
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body1, { color: theme.text }]}>
          Please log in to manage contacts
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Add Contact Section */}
        <View style={styles.section}>
          <Text style={styles.title}>Add New Contact</Text>
          <View style={styles.iconContainer}>
            <Icon name="person-add" size={60} color={theme.primary} />
          </View>
          
          <View style={styles.formContainer}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contact ID</Text>
              <TextInput
                style={[styles.input, styles.contactIdInput]}
                value={contactId}
                onChangeText={setContactId}
                placeholder="0000000000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={10}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!adding}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter contact's name"
                placeholderTextColor={theme.textSecondary}
                maxLength={50}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!adding}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.button, (adding || loading) && styles.buttonDisabled]}
              onPress={handleAddContact}
              disabled={adding || loading}
            >
              {adding ? (
                <ActivityIndicator color={theme.textOnPrimary} />
              ) : (
                <Text style={styles.buttonText}>Add Contact</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.hint}>
              Ask your friend for their Contact ID to add them.{'\n'}
              Contact IDs are exactly 10 digits long.
            </Text>
          </View>
        </View>

        {/* Contact List Section */}
        <View style={styles.section}>
          <Text style={[styles.contactCount]}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Text>
          
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={theme.iconSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={handleSearchChange}
              placeholder="Search contacts..."
              placeholderTextColor={theme.textSecondary}
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={clearSearch}
              >
                <Icon name="clear" size={20} color={theme.iconSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.listContainer}>
            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.contactId}
              ListEmptyComponent={renderEmptyState}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={[theme.primary]}
                  tintColor={theme.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={filteredContacts.length === 0 ? { flex: 1 } : {}}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddContactScreen;

import React, { useState } from 'react';
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
import { useUser } from '../../context/UserContext';
import { typography } from '../../styles/typography';

const AddContactScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { userProfile } = useUser();
  const {
    contacts = [],
    loading = false,
    addContact = () => {},
    removeContact = () => {},
    searchContacts = () => [],
    refreshContacts = async () => {},
  } = useContacts();

  // Add Contact Form State
  const [contactId, setContactId] = useState('');
  const [adding, setAdding] = useState(false);

  // Contact List State
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredContacts = searchContacts(searchText);

  // Add Contact Handler
  const handleAddContact = async () => {
    if (!contactId.trim()) {
      Alert.alert('Error', 'Please enter a Contact ID');
      return;
    }
    if (contactId.length !== 10) {
      Alert.alert('Error', 'Contact ID must be exactly 10 digits');
      return;
    }
    if (!/^\d+$/.test(contactId)) {
      Alert.alert('Error', 'Contact ID must contain only numbers');
      return;
    }
    setAdding(true);
    try {
      const newContact = await addContact(contactId);
      Alert.alert(
        'Success!',`
        ${newContact.displayName} has been added to your contacts`
      );
      setContactId('');
      refreshContacts();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setAdding(false);
    }
  };

  // Contact List Handlers
  const handleContactPress = contact => {
    navigation.navigate('ChatRoom', {
      contactId: contact.contactId,
      contactName: contact.displayName,
      contactPhoto: contact.photoURL,
    });
  };

  const handleContactLongPress = contact => {
    Alert.alert(contact.displayName, 'What would you like to do?', [
      { text: 'View Profile', onPress: () => console.log('View profile') },
      {
        text: 'Remove Contact',
        onPress: () => confirmRemoveContact(contact),
        style: 'destructive',
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmRemoveContact = contact => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.displayName} from your contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: () => removeContact(contact.uid),
          style: 'destructive',
        },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshContacts();
    setRefreshing(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 20,
    },
    section: {
      marginBottom: 10,
    },
    title: {
      ...typography.h2,
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    inputContainer: {
      marginBottom: 12,
    },
    label: {
      ...typography.body1,
      color: theme.text,
      marginBottom: 6,
    },
    input: {
      ...typography.body1,
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      textAlign: 'center',
      fontSize: 18,
      letterSpacing: 1,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 13,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonDisabled: {
      backgroundColor: theme.border,
    },
    buttonText: {
      ...typography.button,
      color: theme.textOnPrimary,
    },
    hint: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 18,
    },
    searchBar: {
      ...typography.body1,
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
      borderColor: theme.border,
      borderWidth: 1,
      color: theme.text,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 13,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      ...typography.h3,
      color: theme.text,
      fontWeight: '700',
    },
    contactInfo: {
      flex: 1,
      marginLeft: 12,
    },
    contactName: {
      ...typography.body1,
      color: theme.text,
      fontWeight: '600',
    },
    contactId: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
    contactStatus: {
      alignItems: 'center',
    },
    onlineIndicator: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: theme.success,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      ...typography.h3,
      color: theme.text,
      marginTop: 20,
      marginBottom: 10,
    },
    emptySubtext: {
      ...typography.body2,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
    primaryButtonText: {
      ...typography.button,
      color: theme.textOnPrimary,
    },
  });

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}
      onLongPress={() => handleContactLongPress(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.displayName}</Text>
        <Text style={styles.contactId}>ID: {item.contactId}</Text>
      </View>
      <View style={styles.contactStatus}>
        <View style={styles.onlineIndicator} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="contacts" size={80} color={theme.iconSecondary} />
      <Text style={styles.emptyText}>No contacts yet</Text>
      <Text style={styles.emptySubtext}>
        Add friends using their Contact ID
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Add Contact Section */}
      <View style={styles.section}>
        <Text style={styles.title}>Add New Contact</Text>
        <View style={styles.iconContainer}>
          <Icon name="person-add" size={60} color={theme.primary} />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contact ID</Text>
          <TextInput
            style={styles.input}
            value={contactId}
            onChangeText={setContactId}
            placeholder="0000000000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={10}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity
          style={[styles.button, adding && styles.buttonDisabled]}
          onPress={handleAddContact}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Add Contact</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>
          Ask your friend for their Contact ID to start chatting.{'\n'}
          Contact IDs are exactly 10 digits long.
        </Text>
      </View>

      {/* Search and Contact List Section */}
      <View style={styles.section}>
        <TextInput
          style={styles.searchBar}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search contacts..."
          placeholderTextColor={theme.textSecondary}
        />
        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={item => item.uid}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddContactScreen;
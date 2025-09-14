import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useContacts } from '../../context/ContactContext';
import { useUser } from '../../context/UserContext';
import { typography } from '../../styles/typography';
import ProfilePicture from '../common/ProfilePicture';

const ContactsListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { userProfile } = useUser();
  const { contacts, loading, removeContact, searchContacts, refreshContacts } = useContacts();
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredContacts = searchContacts(searchText);

  const handleContactPress = (contact) => {
    // Navigate to chat screen with this contact
    navigation.navigate('Chat', { 
      contactId: contact.contactId,
      contactName: contact.displayName,
      contactPhoto: contact.photoURL 
    });
  };

  const handleContactLongPress = (contact) => {
    Alert.alert(
      contact.displayName,
      'What would you like to do?',
      [
        { text: 'View Profile', onPress: () => console.log('View profile') },
        { text: 'Remove Contact', onPress: () => confirmRemoveContact(contact), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const confirmRemoveContact = (contact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.displayName} from your contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: () => removeContact(contact.uid), style: 'destructive' }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshContacts();
    setRefreshing(false);
  };

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}
      onLongPress={() => handleContactLongPress(item)}
    >
      <ProfilePicture
        contactId={item.contactId}
        photoURL={item.photoURL}
        size={50}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.displayName}</Text>
        <Text style={styles.contactId}>ID: {item.contactId}</Text>
      </View>
      <View style={styles.contactStatus}>
        <View style={[styles.onlineIndicator, { backgroundColor: theme.success }]} />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <ProfilePicture
          contactId={userProfile?.contactId}
          photoURL={userProfile?.photoURL}
          size={60}
          editable={true}
        />
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{userProfile?.displayName}</Text>
          <Text style={styles.userContactId}>Your ID: {userProfile?.contactId}</Text>
        </View>
      </View>
      
      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search contacts..."
        placeholderTextColor={theme.textSecondary}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No contacts yet</Text>
      <Text style={styles.emptySubtext}>Add friends using their Contact ID</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddContact')}
      >
        <Text style={styles.addButtonText}>Add First Contact</Text>
      </TouchableOpacity>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    userDetails: {
      marginLeft: 15,
    },
    userName: {
      ...typography.h3,
      color: theme.text,
    },
    userContactId: {
      ...typography.body2,
      color: theme.textSecondary,
    },
    searchInput: {
      ...typography.body1,
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    contactInfo: {
      flex: 1,
      marginLeft: 15,
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
      width: 10,
      height: 10,
      borderRadius: 5,
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
      marginBottom: 10,
    },
    emptySubtext: {
      ...typography.body2,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
    },
    addButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 30,
      paddingVertical: 12,
    },
    addButtonText: {
      ...typography.button,
      color: 'white',
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.uid}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

export default ContactsListScreen;

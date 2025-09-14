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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { useContacts } from '../../context/ContactContext';
import { typography } from '../../styles/typography';

const AddContactScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { addContact } = useContacts();
  const [contactId, setContactId] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const newContact = await addContact(contactId);
      Alert.alert(
        'Success!',
        `${newContact.displayName} has been added to your contacts`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
      setContactId('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 20,
    },
    title: {
      ...typography.h2,
      color: theme.text,
      marginBottom: 30,
      textAlign: 'center',
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      ...typography.body1,
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      ...typography.body1,
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 15,
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
      padding: 15,
      alignItems: 'center',
      marginTop: 20,
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
      marginTop: 15,
      lineHeight: 18,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>Add New Contact</Text>

      <View style={styles.iconContainer}>
        <Icon name="person-add" size={80} color={theme.primary} />
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
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAddContact}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>Add Contact</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Ask your friend for their Contact ID to start chatting.{'\n'}
        Contact IDs are exactly 10 digits long.
      </Text>
    </KeyboardAvoidingView>
  );
};

export default AddContactScreen;

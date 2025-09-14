import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { typography } from '../../styles/typography';
import ApiService from '../../services/api';

export default function ContactIdScreen({ navigation }) {
  const { theme } = useTheme();
  const [contactId, setContactId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateContactId = (id) => {
    // Basic validation for contact ID format
    const contactIdRegex = /^[A-Z0-9]{8,12}$/;
    return contactIdRegex.test(id);
  };
  
  const handleAddContact = async () => {
    if (!contactId.trim()) {
      setError('Contact ID is required');
      return;
    }

    if (!validateContactId(contactId.trim().toUpperCase())) {
      setError('Invalid Contact ID format');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Validate contact exists
      const response = await ApiService.validateContact(contactId.trim().toUpperCase());
      
      if (response.valid) {
        // Navigate to chat with this contact
        navigation.navigate('ChatRoom', {
          contactId: contactId.trim().toUpperCase(),
          displayName: response.display_name || 'Unknown User',
        });
      } else {
        setError('Contact ID not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to validate contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[
            styles.title,
            { color: theme.text },
            typography.h1,
          ]}>
            Add Contact
          </Text>
          <Text style={[
            styles.subtitle,
            { color: theme.textSecondary },
            typography.body1,
          ]}>
            Enter the Contact ID to start a secure chat
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Contact ID"
            placeholder="Enter Contact ID (e.g., ABC12345)"
            value={contactId}
            onChangeText={(value) => {
              setContactId(value);
              setError('');
            }}
            error={error}
            leftIcon="person-add"
            autoCapitalize="characters"
            maxLength={12}
          />

          <View style={styles.infoBox}>
            <Text style={[
              styles.infoText,
              { color: theme.textSecondary },
              typography.caption,
            ]}>
              Contact IDs are unique identifiers that allow secure, private messaging.
              Ask your contact to share their ID with you.
            </Text>
          </View>

          <Button
            title="Add Contact"
            onPress={handleAddContact}
            loading={loading}
            disabled={!contactId.trim()}
            style={styles.addButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[
            styles.footerText,
            { color: theme.textSecondary },
            typography.body2,
          ]}>
            Your Contact ID can be found in Settings
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: 'rgba(0, 168, 132, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  infoText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});

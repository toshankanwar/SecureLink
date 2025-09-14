import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Input from '../common/Input';
import Button from '../common/Button';
import { validateContactId } from '../../utils/validators';
import { typography } from '../../styles/typography';

export default function ContactIdForm({ onSubmit, loading }) {
  const { theme } = useTheme();
  const [contactId, setContactId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!contactId.trim()) {
      setError('Contact ID is required');
      return;
    }
    
    if (!validateContactId(contactId.trim())) {
      setError('Invalid Contact ID format');
      return;
    }
    
    onSubmit(contactId.trim().toUpperCase());
  };

  return (
    <View style={styles.container}>
      <Input
        label="Contact ID"
        placeholder="Enter Contact ID (e.g., ABC12345)"
        value={contactId}
        onChangeText={(value) => {
          setContactId(value);
          setError('');
        }}
        error={error}
        autoCapitalize="characters"
        maxLength={12}
      />
      
      <Text style={[
        styles.infoText,
        { color: theme.textSecondary },
        typography.caption,
      ]}>
        Contact IDs are 8-12 character unique identifiers for secure messaging
      </Text>
      
      <Button
        title="Add Contact"
        onPress={handleSubmit}
        loading={loading}
        disabled={!contactId.trim()}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  infoText: {
    textAlign: 'center',
    marginVertical: 12,
  },
  submitButton: {
    marginTop: 16,
  },
});

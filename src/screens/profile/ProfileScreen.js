import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { typography } from '../../styles/typography';

export default function ProfileScreen() {
  const { user, contactId } = useAuth();
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });

  const handleSave = () => {
    // Implement profile update logic
    Alert.alert('Success', 'Profile updated successfully');
    setEditing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.avatarSection, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={[styles.avatarText, { color: theme.textOnPrimary }]}>
              {formData.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.contactIdText, { color: theme.textSecondary }, typography.body2]}>
            Contact ID: {contactId}
          </Text>
        </View>

        <View style={[styles.formSection, { backgroundColor: theme.surface }]}>
          <Input
            label="Display Name"
            value={formData.displayName}
            onChangeText={(value) => setFormData({ ...formData, displayName: value })}
            editable={editing}
          />
          
          <Input
            label="Email"
            value={formData.email}
            onChangeText={(value) => setFormData({ ...formData, email: value })}
            editable={editing}
            keyboardType="email-address"
          />

          <View style={styles.buttonContainer}>
            {editing ? (
              <>
                <Button
                  title="Save"
                  onPress={handleSave}
                  style={styles.button}
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditing(false)}
                  style={styles.button}
                />
              </>
            ) : (
              <Button
                title="Edit Profile"
                onPress={() => setEditing(true)}
                style={styles.button}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
  },
  contactIdText: {
    fontFamily: 'monospace',
  },
  formSection: {
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    marginVertical: 4,
  },
});

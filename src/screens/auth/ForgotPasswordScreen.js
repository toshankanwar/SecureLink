import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { typography } from '../../styles/typography';

export default function ForgotPasswordScreen({ navigation }) {
  const { sendPasswordReset, loading, error, clearError } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);

  const handleReset = async () => {
    if (!email.trim()) {
      setFieldError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setFieldError('Please enter a valid email');
      return;
    }
    setFieldError(null);
    try {
      clearError();
      await sendPasswordReset(email.trim());
      Alert.alert(
        'Password Reset Sent',
        'Check your email for password reset instructions',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[
              styles.title,
              { color: theme.text },
              typography.h1,
            ]}>
              Forgot Password
            </Text>
            <Text style={[
              styles.subtitle,
              { color: theme.textSecondary },
              typography.body1,
            ]}>
              Enter your registered email to receive a reset link
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              error={fieldError}
              leftIcon={<Icon name="email" size={22} color={theme.iconSecondary} />}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Button
              title="Send Reset Link"
              loading={loading}
              onPress={handleReset}
              style={styles.resetButton}
            />
            {error && (
              <Text style={[
                styles.errorText,
                { color: theme.error },
                typography.body2,
              ]}>
                {error}
              </Text>
            )}
          </View>
          <View style={styles.footer}>
            <Button
              title="Back to Login"
              variant="ghost"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  title: { textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center' },
  form: { marginBottom: 32 },
  resetButton: { marginTop: 24 },
  errorText: { textAlign: 'center', marginTop: 16 },
  footer: { alignItems: 'center' },
  backButton: { paddingVertical: 8, marginTop: 10 },
});
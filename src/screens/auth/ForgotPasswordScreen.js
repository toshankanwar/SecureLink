import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import FirebaseService from '../../services/firebase';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { typography } from '../../styles/typography';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState(null);

  const validateEmail = (email) => {
    if (!email.trim()) {
      setFieldError('Email is required');
      return false;
    }
    // Fixed email regex pattern
    if (!/^[\w\.-]+@[\w\.-]+\.\w{2,4}$/.test(email.trim())) {
      setFieldError('Please enter a valid email address');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleReset = async () => {
    if (!validateEmail(email)) return;

    setLoading(true);
    setError(null);

    try {
      // Direct Firebase password reset call
      await FirebaseService.sendPasswordReset(email.trim().toLowerCase());
      
      Alert.alert(
        'Password Reset Email Sent',
        `A password reset link has been sent to ${email.trim()}. Please check your email inbox and follow the instructions to reset your password.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Clear form and go back to login
              setEmail('');
              navigation.goBack();
            }
          }
        ]
      );
    } catch (err) {
      console.error('Password reset error:', err);
      
      // Handle specific Firebase errors
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (err.message) {
        if (err.message.includes('user-not-found')) {
          errorMessage = 'No account found with this email address.';
        } else if (err.message.includes('invalid-email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (err.message.includes('too-many-requests')) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else if (err.message.includes('network-request-failed')) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    
    // Clear errors when user starts typing
    if (fieldError) {
      setFieldError(null);
    }
    if (error) {
      setError(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }, typography.h1]}>
              Forgot Password
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }, typography.body1]}>
              Enter your registered email address and we'll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="Enter your registered email"
              value={email}
              onChangeText={handleEmailChange}
              error={fieldError}
              leftIcon={<Icon name="email" size={22} color={theme.iconSecondary} />}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />

            <Button
              title="Send Reset Link"
              onPress={handleReset}
              loading={loading}
              disabled={loading || !email.trim()}
              style={styles.resetButton}
            />

            {error ? (
              <Text style={[styles.errorText, { color: theme.error }, typography.body2]}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }, typography.body2]}>
              Remember your password?
            </Text>
            <Button
              title="Back to Sign In"
              variant="ghost"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
          </View>

          <View style={styles.helpInfo}>
            <Text style={[styles.helpText, { color: theme.textSecondary }, typography.caption]}>
              💡 Check your spam folder if you don't receive the email within a few minutes.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 32,
  },
  resetButton: {
    marginTop: 24,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
  },
  helpInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  helpText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});

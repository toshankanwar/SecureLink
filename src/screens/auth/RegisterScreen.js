import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { typography } from '../../styles/typography';

export default function RegisterScreen({ navigation }) {
  const { signUpWithEmail, signInWithGoogle, loading, error, clearError } = useAuth();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      const result = await signUpWithEmail(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.displayName.trim()
      );
      
      // Success feedback
      if (result?.needsEmailVerification) {
        Alert.alert(
          'Registration Successful!',
          'Your account has been created. Please check your email for verification instructions.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Registration Successful!',
          'Your account has been created successfully.',
          [{ text: 'OK' }]
        );
      }
      
      // Clear form after successful registration
      setFormData({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      
    } catch (err) {
      // Error is handled by the auth context
      console.error('Registration failed:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      clearError();
      const result = await signInWithGoogle();
      
      if (result?.isNewUser) {
        Alert.alert(
          'Welcome to SecureLink!',
          'Your Google account has been successfully linked and your profile created.',
          [{ text: 'Get Started' }]
        );
      }
    } catch (err) {
      // Error is handled by the auth context
      console.error('Google sign-in failed:', err);
      
      // Provide user-friendly feedback for common Google Sign-In errors
      const errorMessage = err?.message || 'Google sign-in failed';
      if (errorMessage.includes('DEVELOPER_ERROR')) {
        Alert.alert(
          'Configuration Error',
          'Google Sign-In is not properly configured. Please contact support.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('SIGN_IN_CANCELLED')) {
        // User cancelled - no need to show error
        console.log('User cancelled Google sign-in');
      } else {
        Alert.alert('Sign-Up Error', 'Failed to create account with Google. Please try again.');
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
    if (error) {
      clearError();
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
            <Text style={[
              styles.title,
              { color: theme.text },
              typography.h1,
            ]}>
              Create Account
            </Text>
            <Text style={[
              styles.subtitle,
              { color: theme.textSecondary },
              typography.body1,
            ]}>
              Join SecureLink for private messaging
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Display Name"
              placeholder="Enter your display name"
              value={formData.displayName}
              onChangeText={(value) => handleInputChange('displayName', value)}
              error={formErrors.displayName}
              leftIcon={<Icon name="person" size={22} color={theme.iconSecondary} />}
              autoCapitalize="words"
              maxLength={50}
              autoCorrect={false}
            />
            
            <Input
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              error={formErrors.email}
              leftIcon={<Icon name="email" size={22} color={theme.iconSecondary} />}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            
            <Input
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              error={formErrors.password}
              leftIcon={<Icon name="lock" size={22} color={theme.iconSecondary} />}
              secureTextEntry
              autoCorrect={false}
            />
            
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              error={formErrors.confirmPassword}
              leftIcon={<Icon name="lock" size={22} color={theme.iconSecondary} />}
              secureTextEntry
              autoCorrect={false}
            />
            
            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }, typography.body2]}>
                OR
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <Button
              title="Create Account with Google"
              variant="secondary"
              onPress={handleGoogleSignIn}
              loading={loading}
              icon={<Icon name="google" size={20} color={theme.primary} />}
              style={styles.googleButtonCustom}
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
            <Text style={[
              styles.footerText,
              { color: theme.textSecondary },
              typography.body2,
            ]}>
              Already have an account?
            </Text>
            <Button
              title="Sign In"
              variant="ghost"
              onPress={() => navigation.goBack()}
              style={styles.loginButton}
            />
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
  registerButton: {
    marginTop: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
  },
  googleButtonCustom: {
    marginTop: 0,
    width: '100%',
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    marginBottom: 8,
  },
  loginButton: {
    paddingVertical: 8,
  },
});

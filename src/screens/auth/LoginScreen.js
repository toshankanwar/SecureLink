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
import { ROUTES } from '../../utils/constants';

export default function LoginScreen({ navigation }) {
  const { signInWithEmail, signInWithGoogle, loading, error, clearError } = useAuth();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      clearError();
      const result = await signInWithEmail(formData.email.trim(), formData.password);
      
      // Handle email verification if needed
      if (result?.needsEmailVerification) {
        Alert.alert(
          'Email Verification Required',
          'Please verify your email address before signing in. Check your email for verification link.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      // Error is handled by AuthContext
      console.error('Login failed:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      clearError();
      const result = await signInWithGoogle();
      
      // Success feedback for new users
      if (result?.isNewUser) {
        Alert.alert(
          'Welcome to SecureLink!',
          'Your Google account has been successfully linked.',
          [{ text: 'Get Started' }]
        );
      }
    } catch (err) {
      // Error is handled by AuthContext, but provide user feedback
      console.error('Google sign-in failed:', err);
      
      // Show specific error for common Google Sign-In issues
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
        Alert.alert('Sign-In Error', 'Failed to sign in with Google. Please try again.');
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

  const gotoForgot = () => navigation.navigate(ROUTES.FORGOT_PASSWORD);

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
              Sign In
            </Text>
            <Text style={[
              styles.subtitle,
              { color: theme.textSecondary },
              typography.body1,
            ]}>
              Welcome back to SecureLink
            </Text>
          </View>

          <View style={styles.form}>
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
              autoComplete="password"
              autoCorrect={false}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }, typography.body2]}>
                OR
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <Button
              title="Sign In with Google"
              variant="secondary"
              onPress={handleGoogleSignIn}
              loading={loading}
              icon={<Icon name="google" size={20} color={theme.primary} />}
              style={styles.googleButton}
            />

            <Button
              title="Forgot Password?"
              variant="ghost"
              onPress={gotoForgot}
              style={styles.forgotButton}
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
              Don&apos;t have an account?
            </Text>
            <Button
              title="Create Account"
              variant="ghost"
              onPress={() => navigation.navigate(ROUTES.REGISTER)}
              style={styles.registerButton}
            />
          </View>

          <View style={styles.securityInfo}>
            <Text style={[
              styles.securityText,
              { color: theme.textSecondary },
              typography.caption,
            ]}>
              🔒 End-to-end encrypted by SecureLink
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  keyboardView: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 36 
  },
  title: { 
    textAlign: 'center', 
    marginBottom: 8 
  },
  subtitle: { 
    textAlign: 'center' 
  },
  form: { 
    marginBottom: 32 
  },
  loginButton: { 
    marginTop: 24 
  },
  divider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 24 
  },
  dividerLine: { 
    flex: 1, 
    height: 1 
  },
  dividerText: { 
    marginHorizontal: 16 
  },
  googleButton: { 
    marginTop: 0, 
    width: '100%', 
    borderRadius: 8 
  },
  forgotButton: { 
    marginTop: 14, 
    paddingVertical: 8, 
    alignSelf: 'flex-end' 
  },
  errorText: { 
    textAlign: 'center', 
    marginTop: 16 
  },
  footer: { 
    alignItems: 'center' 
  },
  footerText: { 
    marginBottom: 8 
  },
  registerButton: { 
    paddingVertical: 8 
  },
  securityInfo: { 
    alignItems: 'center', 
    marginTop: 32, 
    paddingTop: 16 
  },
  securityText: { 
    textAlign: 'center', 
    marginVertical: 2 
  },
});

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
import { useTheme } from '../../context/ThemeContext';
import FirebaseService from '../../services/firebase';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { typography } from '../../styles/typography';
import { ROUTES } from '../../utils/constants';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(true);
    setError('');

    try {
      // Direct Firebase login - no token storage
      const result = await FirebaseService.signInWithEmail(
        formData.email.trim().toLowerCase(),
        formData.password
      );

      if (result && result.user) {
        // Check if email verification is needed
        if (result.needsEmailVerification && !result.user.emailVerified) {
          Alert.alert(
            'Email Verification Required',
            'Please verify your email address before signing in. Check your email for the verification link.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        console.log('Login successful:', result.user.uid);
        
        // Navigate to main app - Firebase handles the session automatically
        navigation.replace(ROUTES.HOME || 'Home');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In removed - show alert instead
  const handleGoogleSignIn = () => {
    Alert.alert(
      'Google Sign-In Unavailable',
      'Google Sign-In is currently disabled. Please use email and password to sign in.',
      [{ text: 'OK' }]
    );
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user types
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Clear general error
    if (error) {
      setError('');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate(ROUTES.FORGOT_PASSWORD || 'ForgotPassword');
  };

  const handleCreateAccount = () => {
    navigation.navigate(ROUTES.REGISTER || 'Register');
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
              Sign In
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }, typography.body1]}>
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
              disabled={loading}
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
              loading={false}
              disabled={false}
              icon={<Icon name="google" size={20} color={theme.primary} />}
              style={styles.googleButton}
            />

            <Button
              title="Forgot Password?"
              variant="ghost"
              onPress={handleForgotPassword}
              style={styles.forgotButton}
            />

            {error ? (
              <Text style={[styles.errorText, { color: theme.error }, typography.body2]}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }, typography.body2]}>
              Don't have an account?
            </Text>
            <Button
              title="Create Account"
              variant="ghost"
              onPress={handleCreateAccount}
              style={styles.registerButton}
            />
          </View>

          <View style={styles.securityInfo}>
            <Text style={[styles.securityText, { color: theme.textSecondary }, typography.caption]}>
              🔒 Secured by Firebase Authentication
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
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  loginButton: {
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
  googleButton: {
    marginTop: 0,
    width: '100%',
    borderRadius: 8,
  },
  forgotButton: {
    marginTop: 14,
    paddingVertical: 8,
    alignSelf: 'flex-end',
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
  registerButton: {
    paddingVertical: 8,
  },
  securityInfo: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 16,
  },
  securityText: {
    textAlign: 'center',
    marginVertical: 2,
  },
});

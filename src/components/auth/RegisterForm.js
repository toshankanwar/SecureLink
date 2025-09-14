import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Input from '../common/Input';
import Button from '../common/Button';
import { validateEmail, validatePassword, validateDisplayName } from '../../utils/validators';

export default function RegisterForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const newErrors = {};
    
    if (!validateDisplayName(formData.displayName)) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }
    
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  return (
    <View style={styles.container}>
      <Input
        label="Display Name"
        placeholder="Enter your display name"
        value={formData.displayName}
        onChangeText={(displayName) => setFormData({ ...formData, displayName })}
        error={errors.displayName}
      />
      
      <Input
        label="Email"
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(email) => setFormData({ ...formData, email })}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Input
        label="Password"
        placeholder="Enter your password"
        value={formData.password}
        onChangeText={(password) => setFormData({ ...formData, password })}
        error={errors.password}
        secureTextEntry
      />
      
      <Input
        label="Confirm Password"
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChangeText={(confirmPassword) => setFormData({ ...formData, confirmPassword })}
        error={errors.confirmPassword}
        secureTextEntry
      />
      
      <Button
        title="Create Account"
        onPress={handleSubmit}
        loading={loading}
        style={styles.submitButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  submitButton: {
    marginTop: 16,
  },
});

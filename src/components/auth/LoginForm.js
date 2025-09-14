import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Input from '../common/Input';
import Button from '../common/Button';
import { validateEmail, validatePassword } from '../../utils/validators';

export default function LoginForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const newErrors = {};
    
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  return (
    <View style={styles.container}>
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
      
      <Button
        title="Sign In"
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

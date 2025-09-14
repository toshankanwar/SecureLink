import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../styles/typography';

const Input = forwardRef(({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  style,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  ...props
}, ref) => {
  const { theme } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.text }, typography.body2]}>
          {label}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        {
          borderColor: error ? theme.error : (isFocused ? theme.primary : theme.border),
          backgroundColor: theme.surface,
        }
      ]}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            <Icon name={leftIcon} size={20} color={theme.iconSecondary} />
          </View>
        )}
        
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              color: theme.text,
              flex: 1,
            },
            typography.body1,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={togglePasswordVisibility}
          >
            <Icon
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={20}
              color={theme.iconSecondary}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIcon}>
            <Icon name={rightIcon} size={20} color={theme.iconSecondary} />
          </View>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, { color: theme.error }, typography.caption]}>
          {error}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  input: {
    paddingVertical: 16,
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
  },
  error: {
    marginTop: 4,
    marginLeft: 4,
  },
});

export default Input;

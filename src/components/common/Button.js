import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../styles/typography';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  ...props
}) {
  const { theme } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = [styles.button, { backgroundColor: theme.primary }];
    
    switch (variant) {
      case 'secondary':
        baseStyle.push({ 
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.primary,
        });
        break;
      case 'ghost':
        baseStyle.push({ backgroundColor: 'transparent' });
        break;
      case 'danger':
        baseStyle.push({ backgroundColor: theme.error });
        break;
    }

    switch (size) {
      case 'small':
        baseStyle.push(styles.small);
        break;
      case 'large':
        baseStyle.push(styles.large);
        break;
    }

    if (disabled || loading) {
      baseStyle.push({ opacity: 0.6 });
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [
      typography.button,
      { color: theme.textOnPrimary },
    ];

    if (variant === 'secondary' || variant === 'ghost') {
      baseStyle.push({ color: theme.primary });
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'secondary' || variant === 'ghost' ? theme.primary : theme.textOnPrimary}
          />
        ) : (
          <>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  small: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 18,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
    borderRadius: 28,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
});

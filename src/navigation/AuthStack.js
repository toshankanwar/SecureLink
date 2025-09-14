import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ContactIdScreen from '../screens/auth/ContactIdScreen';

import { useTheme } from '../context/ThemeContext';
import { ROUTES } from '../utils/constants';

const Stack = createStackNavigator();

export default function AuthStack() {
  const { theme, toggleTheme, isDark } = useTheme();

  const getHeaderOptions = (showThemeToggle = false) => ({
    headerStyle: { 
      backgroundColor: theme.primary,
      elevation: 4,
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    headerTintColor: theme.textOnPrimary,
    headerTitleStyle: { 
      fontWeight: '600',
      fontSize: 18,
    },
    headerBackTitleVisible: false,
    headerRight: showThemeToggle ? () => (
      <TouchableOpacity
        style={{ marginRight: 16, padding: 8 }}
        onPress={toggleTheme}
      >
        <Icon
          name={isDark ? 'light-mode' : 'dark-mode'}
          size={24}
          color={theme.textOnPrimary}
        />
      </TouchableOpacity>
    ) : undefined,
  });

  return (
    <Stack.Navigator
      initialRouteName={ROUTES.LOGIN}
      screenOptions={{
        cardStyle: { backgroundColor: theme.background },
        ...getHeaderOptions(),
      }}
    >
      <Stack.Screen 
        name={ROUTES.LOGIN} 
        component={LoginScreen}
        options={{
          title: 'Welcome',
          headerLeft: () => null,
          ...getHeaderOptions(true),
        }}
      />
      
      <Stack.Screen 
        name={ROUTES.REGISTER} 
        component={RegisterScreen}
        options={{
          title: 'Create Account',
          ...getHeaderOptions(true),
        }}
      />

      <Stack.Screen 
        name={ROUTES.FORGOT_PASSWORD}
        component={ForgotPasswordScreen}
        options={{
          title: 'Forgot Password',
          ...getHeaderOptions(true),
        }}
      />
      
      <Stack.Screen 
        name={ROUTES.CONTACT_ID_ENTRY} 
        component={ContactIdScreen}
        options={{
          title: 'Add Contact',
          presentation: 'modal',
          ...getHeaderOptions(true),
        }}
      />
    </Stack.Navigator>
  );
}
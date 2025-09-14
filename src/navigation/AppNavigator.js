import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthStack from './AuthStack';
import ChatStack from './ChatStack';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, loading, user } = useAuth();
  const { theme, isDark } = useTheme();

  useEffect(() => {
    // Update status bar based on theme
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    StatusBar.setBackgroundColor(theme.statusBar);
  }, [isDark, theme]);

  if (loading) {
    return (
      <>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.statusBar}
        />
        <LoadingSpinner message="Initializing SecureLink..." />
      </>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: theme.primary,
          background: theme.background,
          card: theme.surface,
          text: theme.text,
          border: theme.border,
          notification: theme.accent,
        },
        // Add this fonts property to fix the error!
        fonts: {
          bold: { fontFamily: 'System', fontWeight: '700' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          regular: { fontFamily: 'System', fontWeight: '400' },
        },
      }}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.statusBar}
        translucent={false}
      />
      
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: theme.background },
          animationTypeForReplace: isAuthenticated ? 'push' : 'pop',
        }}
      >
        {isAuthenticated && user ? (
          <Stack.Screen 
            name="ChatStack" 
            component={ChatStack}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        ) : (
          <Stack.Screen 
            name="AuthStack" 
            component={AuthStack}
            options={{
              animationTypeForReplace: 'pop',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
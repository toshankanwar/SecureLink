import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context Providers
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { UserProvider } from './src/context/UserContext';        // <-- NEW: User profile context
import { ChatProvider } from './src/context/ChatContext';
import { ContactProvider } from './src/context/ContactContext';  // <-- Contacts context

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'Warning: componentWillReceiveProps',
]);

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent', true);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
  <SafeAreaProvider>
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <ContactProvider>
            <ChatProvider>
              <StatusBar
                barStyle="light-content"
                backgroundColor="#00A884"
                translucent={Platform.OS === 'android'}
              />
              <AppNavigator />
            </ChatProvider>
          </ContactProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
  );
}
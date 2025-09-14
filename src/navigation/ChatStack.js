import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Existing screens
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import SettingsScreen from '../screens/chat/SettingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SecurityScreen from '../screens/profile/SecurityScreen';
import ContactIdScreen from '../screens/auth/ContactIdScreen';

// New contact-related screens
import ContactsListScreen from '../screens/contacts/ContactsListScreen';
import AddContactScreen from '../screens/contacts/AddContactScreen';

import { useTheme } from '../context/ThemeContext';
import { ROUTES } from '../utils/constants';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.iconSecondary,
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatListScreen}
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chat" size={size} color={color} />
          ),
        }}
      />
      
      {/* Add Contacts Tab */}
      <Tab.Screen
        name="ContactsTab"
        component={ContactsListScreen}
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <Icon name="contacts" size={size} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function ChatStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: theme.primary,
        },
        headerTintColor: theme.textOnPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name={ROUTES.CHAT_ROOM}
        component={ChatRoomScreen}
        options={({ route }) => ({
          title: route.params?.contactName || 'Chat',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => console.log('Chat options')}
              style={{ marginRight: 15 }}
            >
              <Icon name="more-vert" size={24} color={theme.textOnPrimary} />
            </TouchableOpacity>
          ),
        })}
      />
      
      <Stack.Screen
        name={ROUTES.PROFILE}
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      
      <Stack.Screen
        name="SecurityScreen"
        component={SecurityScreen}
        options={{ title: 'Security' }}
      />
      
      {/* Updated ContactIdScreen as AddContact */}
      <Stack.Screen
        name={ROUTES.CONTACT_ID_ENTRY}
        component={AddContactScreen}
        options={{ title: 'Add Contact' }}
      />
      
      {/* New AddContact screen (alternative route) */}
      <Stack.Screen
        name="AddContact"
        component={AddContactScreen}
        options={{ title: 'Add New Contact' }}
      />
    </Stack.Navigator>
  );
}

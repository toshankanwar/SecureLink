import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../styles/typography';

export default function SettingsScreen({ navigation }) {
  const { user, contactId, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement, showArrow = true }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: theme.primary }]}>
          <Icon name={icon} size={24} color={theme.textOnPrimary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.text }, typography.body1]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }, typography.caption]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && onPress && (
          <Icon name="chevron-right" size={24} color={theme.iconSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
              <Text style={[styles.profileAvatarText, { color: theme.textOnPrimary }]}>
                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }, typography.h2]}>
                {user?.displayName || 'User'}
              </Text>
              <Text style={[styles.profileContactId, { color: theme.textSecondary }, typography.body2]}>
                ID: {contactId}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, typography.overline]}>
            Account
          </Text>
          <SettingItem
            icon="person"
            title="Profile"
            subtitle="Update your profile information"
            onPress={() => navigation.navigate('Profile')}
          />
          <SettingItem
            icon="security"
            title="Security"
            subtitle="Manage your security settings"
            onPress={() => navigation.navigate('SecurityScreen')}
          />
          <SettingItem
            icon="notifications"
            title="Notifications"
            subtitle="Customize your notifications"
            onPress={() => {/* Navigate to notifications */}}
          />
        </View>

        {/* Appearance Settings */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, typography.overline]}>
            Appearance
          </Text>
          <SettingItem
            icon={isDark ? 'light-mode' : 'dark-mode'}
            title="Dark Mode"
            subtitle={`Currently using ${isDark ? 'dark' : 'light'} theme`}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={theme.surface}
              />
            }
            showArrow={false}
          />
        </View>

        {/* Privacy Settings */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, typography.overline]}>
            Privacy
          </Text>
          <SettingItem
            icon="lock"
            title="Chat Backup"
            subtitle="Manage your chat backups"
            onPress={() => {/* Navigate to backup settings */}}
          />
          <SettingItem
            icon="block"
            title="Blocked Contacts"
            subtitle="Manage blocked contacts"
            onPress={() => {/* Navigate to blocked contacts */}}
          />
        </View>

        {/* Support */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }, typography.overline]}>
            Support
          </Text>
          <SettingItem
            icon="help"
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => {/* Navigate to help */}}
          />
          <SettingItem
            icon="info"
            title="About"
            subtitle="App version and information"
            onPress={() => {/* Navigate to about */}}
          />
        </View>

        {/* Logout */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <SettingItem
            icon="logout"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginVertical: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  profileContactId: {
    fontFamily: 'monospace',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '500',
  },
  settingSubtitle: {
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

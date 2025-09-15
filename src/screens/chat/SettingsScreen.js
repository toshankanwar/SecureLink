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
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext'; // <-- Ensure imported
import { typography } from '../../styles/typography';

export default function SettingsScreen({ navigation }) {
  const { user, contactId: authContactId, logout } = useAuth();
  const { userProfile } = useUser(); // <-- Pull userProfile from UserContext
  const { theme, isDark, toggleTheme } = useTheme();

  // Always get contactId from UserContext if available, else fallback to AuthContext
  const displayName = userProfile?.displayName || user?.displayName || 'User';
  const contactId = userProfile?.contactId || authContactId || 'Loading...';

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
      style={[styles.settingItem, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: theme.primary }]}>
          <Icon name={icon} size={28} color={theme.textOnPrimary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.text }, typography.h4]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }, typography.body2]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && onPress && (
          <Icon name="chevron-right" size={26} color={theme.iconSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Professional App Header */}
      <View style={[
        styles.header,
        { backgroundColor: theme.primary, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 24 }
      ]}>
        <Text style={[styles.headerTitle, { color: theme.textOnPrimary }]}>
          Settings
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section */}
        <View style={[styles.section, styles.profileSection, { backgroundColor: theme.surface }]}>
  <View style={styles.profileHeader}>
    <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
      <Text style={[styles.profileAvatarText, { color: theme.textOnPrimary }]}>
        {displayName?.charAt(0)?.toUpperCase() || 'U'}
      </Text>
    </View>
    <View>
      <Text style={[styles.profileName, { color: theme.text }, typography.h2]}>
        {displayName}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
        <Text style={[styles.profileLabel, { color: theme.textSecondary }, typography.body2]}>
          Contact ID:&nbsp;
        </Text>
        <Text style={[styles.profileContactId, { color: theme.primary, marginLeft: 2 }]}>
          {contactId}
        </Text>
      </View>
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
        </View>
        {/* Appearance */}
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
        {/* Privacy */}
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
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    width: '100%',
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e2e2',
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContainer: {
    paddingBottom: 32,
  },
  section: {
    borderRadius: 15,
    marginTop: 22,
    marginHorizontal: 10,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#2222',
    shadowOffset: { height: 2 },
    shadowOpacity: 0.05,
  },
  sectionTitle: {
    paddingHorizontal: 18,
    paddingBottom: 4,
    fontWeight: '700',
    opacity: 0.8,
  },
  profileSection: {
    marginTop: 14,
    marginBottom: 0,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: 4,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    elevation: 2,
  },
  profileAvatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  profileLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  
  profileIdContainer: {
    backgroundColor: '#f1f3f6',
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 2,
    marginBottom: 3,
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  profileContactId: {
    fontFamily: 'monospace',
    fontSize: 15,
    letterSpacing: 1.1,
    fontWeight: 'bold',
  },
  profileName: {
    fontWeight: '600',
    marginBottom: 1,
    fontSize: 20,
    letterSpacing: 0.4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    elevation: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    elevation: 1,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.05,
  },
  settingSubtitle: {
    marginTop: 2,
    fontSize: 13,
    opacity: 0.8,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/common/Input';
import { typography } from '../../styles/typography';

const DEFAULT_AVATAR =
  'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/drlxxyu9o/upload';
const CLOUDINARY_PRESET = 'securelink_default';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { theme } = useTheme();

  // Always prefer userProfile for profile data
  const contactId = userProfile?.contactId || user?.contactId || '';
  const displayName = userProfile?.displayName || user?.displayName || '';
  const email = userProfile?.email || user?.email || '';
  const about = userProfile?.about || 'Hey there! I am using SecureLink.';

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: displayName,
    about: about,
    email: email,
    photoURL: userProfile?.photoURL || user?.photoURL || DEFAULT_AVATAR,
  });
  const [imageUploading, setImageUploading] = useState(false);

  // Pick and upload image
  const handleSelectImage = async () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.9 },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorCode || !response.assets?.[0]?.uri) {
          Alert.alert('Error', 'Could not select image.');
          return;
        }
        setImageUploading(true);
        try {
          const { uri, type, fileName } = response.assets[0];
          const data = new FormData();
          data.append('file', {
            uri,
            type: type || 'image/jpeg',
            name: fileName || `profile_${contactId}.jpg`,
          });
          data.append('upload_preset', CLOUDINARY_PRESET);
          data.append('public_id', `securelink/profile_pictures/profile_${contactId}`);

          const result = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: data,
          });
          const resultJson = await result.json();
          if (resultJson.secure_url) {
            setFormData((prev) => ({ ...prev, photoURL: resultJson.secure_url }));
            Alert.alert('Success', 'Profile photo updated!');
          } else {
            Alert.alert('Error', 'Cloudinary upload failed.');
          }
        } catch (error) {
          Alert.alert('Error', 'Image upload failed.');
        } finally {
          setImageUploading(false);
        }
      }
    );
  };

  const handleSave = () => {
    // Implement actual save/profile update logic (including About, Name, photo) here
    Alert.alert('Success', 'Profile updated successfully');
    setEditing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Custom Header */}
      {!editing && (
  <TouchableOpacity
    style={styles.headerEditIcon}
    onPress={() => setEditing(true)}
    activeOpacity={0.85}
  >
    <Icon name="edit" size={26} color={theme.textOnPrimary} />
  </TouchableOpacity>
)}
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarCenterSection}>
          <View>
            <Image
              source={{ uri: formData.photoURL || DEFAULT_AVATAR }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
            {/* Floating edit button */}
            {editing && (
              <TouchableOpacity
                disabled={imageUploading}
                style={[
                  styles.avatarEditBtn,
                  { backgroundColor: theme.surface, borderColor: theme.border }
                ]}
                onPress={handleSelectImage}
              >
                <Icon name="photo-camera" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
            {imageUploading && (
              <View style={styles.uploadOverlay}>
                <Icon name="cloud-upload" size={28} color={theme.primary} />
                <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 13, marginTop: 2 }}>Uploading...</Text>
              </View>
            )}
          </View>
        </View>
        {/* Name */}
        <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Name</Text>
          {editing ? (
            <Input
              value={formData.displayName}
              onChangeText={value => setFormData({ ...formData, displayName: value })}
              editable
              style={styles.infoInput}
              inputStyle={{ fontSize: 20, fontWeight: '700' }}
              autoFocus
              selectionColor={theme.primary}
            />
          ) : (
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>{formData.displayName || 'User'}</Text>
          )}
        </View>
        {/* Contact ID */}
        <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Contact ID</Text>
          <Text style={[styles.infoValue, { color: theme.primary, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 0.8 }]}>
            {contactId || 'Loading...'}
          </Text>
        </View>
        {/* About Section */}
        <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>About</Text>
          {editing ? (
            <Input
              value={formData.about}
              onChangeText={value => setFormData({ ...formData, about: value })}
              editable
              style={styles.infoInput}
              inputStyle={{ fontSize: 17 }}
              selectionColor={theme.primary}
              maxLength={80}
              placeholder="Hey there! I am using SecureLink."
            />
          ) : (
            <Text style={[styles.infoValue, { color: theme.textSecondary, fontStyle: 'italic' }]}>
              {formData.about || 'Hey there! I am using SecureLink.'}
            </Text>
          )}
        </View>
        {/* Email Section */}
        <View style={[styles.infoSection, { backgroundColor: theme.surface, marginBottom: 35 }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Email</Text>
          {editing ? (
            <Input
              value={formData.email}
              onChangeText={value => setFormData({ ...formData, email: value })}
              editable
              keyboardType="email-address"
              style={styles.infoInput}
              inputStyle={{ fontSize: 16 }}
              selectionColor={theme.primary}
            />
          ) : (
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '400' }]}>{formData.email || '-'}</Text>
          )}
        </View>
        {/* Footer - Save/Cancel */}
        {editing && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={imageUploading}
            >
              <Icon name="check" size={20} color={theme.textOnPrimary} />
              <Text style={[styles.footerBtnText, { color: theme.textOnPrimary }]}>
                Save
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: theme.border }]}
              onPress={() => setEditing(false)}
              disabled={imageUploading}
            >
              <Icon name="close" size={20} color={theme.text} />
              <Text style={[styles.footerBtnText, { color: theme.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 130;

const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e1e1e1',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
    paddingLeft: 18,
  },
  headerEditIcon: {
    position: 'absolute',
    right: 18,
    top: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 20,
    padding: 5,
    zIndex:99,
  },
  scrollContainer: {
    paddingBottom: 48,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  avatarCenterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    marginBottom: 8,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#f2f3f5',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: 5,
    bottom: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    elevation: 4,
    zIndex: 4,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  infoSection: {
    marginHorizontal: 20,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 13,
    elevation: 1,
    shadowOpacity: 0.04,
    shadowColor: '#1112',
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.3,
    opacity: 0.75,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.09,
    paddingTop: 2,
    paddingBottom: 2,
  },
  infoInput: {
    marginVertical: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderRadius: 2,
    fontWeight: '700',
    fontSize: 19,
    paddingVertical: 1,
    paddingLeft: 0,
    color: '#333',
    minHeight: 28,
  },
  contactIdInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  contactIdLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.87,
  },
  contactIdValue: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
    opacity: 0.96,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 34,
    marginBottom: 18,
    gap: 18,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 12,
    elevation: 3,
    marginHorizontal: 6,
  },
  footerBtnText: {
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.1,
    marginLeft: 7,
  },
});
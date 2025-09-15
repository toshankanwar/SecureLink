import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

class FirebaseService {
  constructor() {
    this.currentUser = null;
    this.initializeGoogleSignIn();
  }

  initializeGoogleSignIn() {
    GoogleSignin.configure({
      webClientId: '896317303681-qjetqdl3kdq7661l0qrecquikqb6fkhk.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }

  async generateUniqueContactId() {
    let contactId;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    while (!isUnique && attempts < maxAttempts) {
      const timestamp = Date.now().toString().slice(-6);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      contactId = timestamp + randomNum.toString();
      const existingUser = await firestore()
        .collection('users')
        .where('contactId', '==', contactId)
        .get();
      if (existingUser.empty) {
        isUnique = true;
      }
      attempts++;
    }
    if (!isUnique) {
      throw new Error('Failed to generate unique Contact ID');
    }
    return contactId;
  }

  async createUserProfile(user, contactId, photoURL = null) {
    try {
      const profileData = {
        uid: user.uid,
        contactId: contactId,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: photoURL || this.getCloudinaryPhotoUrl(contactId),
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastSeen: firestore.FieldValue.serverTimestamp(),
        isOnline: true,
        deviceInfo: {
          lastDevice: 'mobile',
          appVersion: '1.0.0',
        },
        settings: {
          profilePhotoVisible: true,
          lastSeenVisible: true,
          onlineStatusVisible: true,
        }
      };
      await firestore().collection('users').doc(user.uid).set(profileData);
      return profileData;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  getCloudinaryPhotoUrl(contactId, transformation = 'w_400,h_400,c_fill,f_auto,q_auto') {
    return `https://res.cloudinary.com/drlxxyu9o/image/upload/${transformation}/securelink/profile_pictures/profile_${contactId}.jpg`;
  }

  async findUserByContactId(contactId) {
    try {
      if (!contactId || contactId.length !== 10) return null;
      const userQuery = await firestore()
        .collection('users')
        .where('contactId', '==', contactId)
        .get();
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data();
        return {
          uid: userData.uid,
          contactId: userData.contactId,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          lastSeen: userData.settings?.lastSeenVisible ? userData.lastSeen : null,
          isOnline: userData.settings?.onlineStatusVisible ? userData.isOnline : false,
        };
      }
      return null;
    } catch (error) {
      console.error('Error finding user by contactID:', error);
      return null;
    }
  }

  async updateUserProfile(uid, updates) {
    try {
      await firestore().collection('users').doc(uid).update({
        ...updates,
        lastSeen: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getCurrentUserProfile() {
    try {
      const user = auth().currentUser;
      if (!user) return null;
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      return userDoc.exists ? userDoc.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async signUpWithEmail(email, password, displayName) {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: displayName });
      const contactId = await this.generateUniqueContactId();
      const profileData = await this.createUserProfile(userCredential.user, contactId);
      await userCredential.user.sendEmailVerification();
      return {
        user: userCredential.user,
        contactId: contactId,
        profileData: profileData,
        needsEmailVerification: true,
      };
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithEmail(email, password) {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      if (userCredential.user) {
        await this.updateUserProfile(userCredential.user.uid, {
          isOnline: true,
          lastSeen: firestore.FieldValue.serverTimestamp(),
        });
      }
      return {
        user: userCredential.user,
        needsEmailVerification: !userCredential.user.emailVerified,
      };
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.idToken || userInfo?.serverAuthCode || userInfo?.accessToken;
      if (!idToken) {
        throw new Error(
          'Google sign-in failed: No ID token received. Make sure you configured the SHA1 key for your app in Firebase and use the proper webClientId.'
        );
      }
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const isNewUser = userCredential.additionalUserInfo?.isNewUser || false;
      const contactId = await this.generateUniqueContactId();
      const profileData = await this.createUserProfile(userCredential.user, contactId);

      await this.updateUserProfile(userCredential.user.uid, {
        isOnline: true,
        lastSeen: firestore.FieldValue.serverTimestamp(),
        contactId,
      });

      return {
        user: userCredential.user,
        contactId: contactId,
        profileData: profileData,
        isNewUser,
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  async signOut() {
    try {
      const user = auth().currentUser;
      if (user) {
        await this.updateUserProfile(user.uid, {
          isOnline: false,
          lastSeen: firestore.FieldValue.serverTimestamp(),
        });
      }
      // Defensive check: only call GoogleSignin if the methods exist
      if (
        GoogleSignin &&
        typeof GoogleSignin.isSignedIn === 'function' &&
        typeof GoogleSignin.signOut === 'function'
      ) {
        const isGoogleSignedIn = await GoogleSignin.isSignedIn();
        if (isGoogleSignedIn) {
          await GoogleSignin.signOut();
        }
      }
      await auth().signOut();
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async sendPasswordReset(email) {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async sendEmailVerification() {
    try {
      const user = auth().currentUser;
      if (user) await user.sendEmailVerification();
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async reloadUser() {
    try {
      const user = auth().currentUser;
      if (user) {
        await user.reload();
        return auth().currentUser;
      }
      return null;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async updateProfile(updates) {
    try {
      const user = auth().currentUser;
      if (user) {
        await user.updateProfile(updates);
        return auth().currentUser;
      }
      throw new Error('No authenticated user');
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async updateEmail(newEmail) {
    try {
      const user = auth().currentUser;
      if (user) {
        await user.updateEmail(newEmail);
        await user.sendEmailVerification();
        return auth().currentUser;
      }
      throw new Error('No authenticated user');
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async updatePassword(newPassword) {
    try {
      const user = auth().currentUser;
      if (user) {
        await user.updatePassword(newPassword);
        return user;
      }
      throw new Error('No authenticated user');
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  onAuthStateChanged(callback) {
    return auth().onAuthStateChanged(callback);
  }

  getCurrentUser() {
    return auth().currentUser;
  }

  async getIdToken(forceRefresh = false) {
    try {
      const user = auth().currentUser;
      if (user) {
        return await user.getIdToken(forceRefresh);
      }
      return null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  handleFirebaseError(error) {
    const code = (error && (error.code || error.errorCode)) || null;
    const message = (error && error.message) || 'An error occurred';
    switch (code) {
      case 'auth/user-not-found':
        return new Error('No account found with this email');
      case 'auth/wrong-password':
        return new Error('Incorrect password');
      case 'auth/email-already-in-use':
        return new Error('Email already registered');
      case 'auth/weak-password':
        return new Error('Password should be at least 6 characters');
      case 'auth/invalid-email':
        return new Error('Invalid email address');
      case 'auth/user-disabled':
        return new Error('Account has been disabled');
      case 'auth/too-many-requests':
        return new Error('Too many failed attempts. Please try again later');
      case 'auth/network-request-failed':
        return new Error('Network connection error');
      case 'auth/requires-recent-login':
        return new Error('Please log in again to continue');
      case 'firestore/permission-denied':
        return new Error('Permission denied. Check Firestore security rules');
      case 'firestore/unavailable':
        return new Error('Firestore service temporarily unavailable');
      default:
        return new Error(message || 'Authentication failed');
    }
  }
}

export default new FirebaseService();
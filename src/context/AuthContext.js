import React, { createContext, useContext, useReducer, useEffect } from 'react';
import FirebaseService from '../services/firebase';
import StorageService from '../services/storage';

const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  emailVerified: false,
};

// Helper function to build a unified user object combining Firebase Auth and Firestore profile
async function buildFullUser(firebaseUser) {
  if (!firebaseUser) return null;
  // Get Firestore user profile
  const profile = await FirebaseService.getCurrentUserProfile();
  return {
    // Firebase Auth data
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    token: await firebaseUser.getIdToken(),
    emailVerified: firebaseUser.emailVerified,
    phoneNumber: firebaseUser.phoneNumber || null,
    photoURL: firebaseUser.photoURL || profile?.photoURL || null,
    // Firestore profile data (has priority for the custom fields)
    contactId: profile?.contactId || firebaseUser.uid,
    displayName: profile?.displayName || firebaseUser.displayName || '',
    // Add any extra profile data you want
    ...profile,
  };
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        emailVerified: action.payload.user?.emailVerified || false,
        loading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        emailVerified: action.payload.emailVerified !== undefined 
          ? action.payload.emailVerified 
          : state.emailVerified,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const unsubscribe = FirebaseService.onAuthStateChanged(handleAuthStateChange);
    return unsubscribe;
    // eslint-disable-next-line
  }, []);

  // Main function to setup state and storage after login/auth state
  const initializeUserSession = async (firebaseUser) => {
    try {
      const fullUser = await buildFullUser(firebaseUser);

      // Always store credentials for API authorization (with contactId, token, etc.)
      if (fullUser) {
        await StorageService.storeUserCredentials(fullUser.contactId, fullUser.token, fullUser.contactId);
      }
      if (StorageService.initializeForUser) {
        await StorageService.initializeForUser(firebaseUser.uid);
      }

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: fullUser },
      });
    } catch (error) {
      console.error('Error initializing user session:', error);
      throw error;
    }
  };

  const handleAuthStateChange = async (firebaseUser) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      if (firebaseUser) {
        await initializeUserSession(firebaseUser);
      } else {
        dispatch({ type: 'LOGOUT' });
        await StorageService.clearUserData();
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Auth/sign up actions: always refresh/full profile after the operation
  const signUpWithEmail = async (email, password, displayName) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await FirebaseService.signUpWithEmail(email, password, displayName);
      if (result && result.user) {
        await initializeUserSession(result.user);
      }
      if (result.needsEmailVerification) {
        dispatch({ type: 'SET_ERROR', payload: 'Please verify your email address' });
      }
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await FirebaseService.signInWithEmail(email, password);
      if (result && result.user) {
        await initializeUserSession(result.user);
      }
      if (result.needsEmailVerification) {
        dispatch({ type: 'SET_ERROR', payload: 'Please verify your email address' });
      }
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await FirebaseService.signInWithGoogle();
      if (result && result.user) {
        await initializeUserSession(result.user);
      }
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const logout = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await StorageService.clearUserData();
      await FirebaseService.signOut();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const sendPasswordReset = (email) => FirebaseService.sendPasswordReset(email);
  const sendEmailVerification = () => FirebaseService.sendEmailVerification();

  // Reload user profile and merge in Firestore updates too
  const reloadUser = async () => {
    try {
      const updatedUser = await FirebaseService.reloadUser();
      if (updatedUser) {
        const fullUser = await buildFullUser(updatedUser);
        await StorageService.storeUserCredentials(fullUser.contactId, fullUser.token, fullUser.contactId);
        dispatch({
          type: 'UPDATE_USER',
          payload: fullUser,
        });
      }
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (updates) => {
    try {
      const updatedUser = await FirebaseService.updateProfile(updates);
      // After updating in auth, also update in Firestore (optional)
      await reloadUser();
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const getIdToken = async () => {
    try {
      const user = FirebaseService.currentUser();
      if (user) {
        const idToken = await user.getIdToken();
        await StorageService.storeUserCredentials(user.contactId, idToken, user.contactId);
        return idToken;
      }
      return null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        logout,
        sendPasswordReset,
        sendEmailVerification,
        reloadUser,
        updateProfile,
        getIdToken,
        clearError,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
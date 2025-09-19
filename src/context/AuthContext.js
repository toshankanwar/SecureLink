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

// Simple user object builder - no token handling
async function buildFullUser(firebaseUser) {
  if (!firebaseUser) return null;
  
  try {
    const profile = await FirebaseService.getCurrentUserProfile();
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      phoneNumber: firebaseUser.phoneNumber || null,
      photoURL: firebaseUser.photoURL || profile?.photoURL || null,
      contactId: profile?.contactId || firebaseUser.uid,
      displayName: profile?.displayName || firebaseUser.displayName || '',
      isOnline: profile?.isOnline || false,
      lastSeen: profile?.lastSeen || null,
      // Include any other profile data
      ...profile,
    };
  } catch (error) {
    console.error('Error building user profile:', error);
    // Return basic user info if profile fetch fails
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      contactId: firebaseUser.uid,
      displayName: firebaseUser.displayName || '',
    };
  }
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
  }, []);

  // Simplified session initialization - no token storage
  const initializeUserSession = async (firebaseUser) => {
    try {
      const fullUser = await buildFullUser(firebaseUser);
      
      if (fullUser) {
        // Store only basic profile data locally - NO TOKENS
        await StorageService.storeUserProfile(fullUser);
        console.log('User session initialized:', fullUser.contactId);
      }

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: fullUser }
      });
    } catch (error) {
      console.error('Error initializing user session:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to initialize user session'
      });
    }
  };

  const handleAuthStateChange = async (firebaseUser) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      if (firebaseUser) {
        console.log('User authenticated:', firebaseUser.uid);
        await initializeUserSession(firebaseUser);
      } else {
        console.log('User signed out');
        dispatch({ type: 'LOGOUT' });
        // Clear all local storage on logout
        await StorageService.clearAllAppData();
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Authentication error occurred'
      });
    }
  };

  // Simplified signup - no token handling
  const signUpWithEmail = async (email, password, displayName) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await FirebaseService.signUpWithEmail(email, password, displayName);
      
      if (result && result.user) {
        console.log('Signup successful:', result.user.uid);
        
        if (result.needsEmailVerification) {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Please check your email and verify your account before signing in.'
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Registration failed. Please try again.'
      });
      throw error;
    }
  };

  // Simplified signin - no token handling
  const signInWithEmail = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await FirebaseService.signInWithEmail(email, password);
      
      if (result && result.user) {
        console.log('Signin successful:', result.user.uid);
        
        if (result.needsEmailVerification) {
          dispatch({
            type: 'SET_ERROR',
            payload: 'Please verify your email address before signing in.'
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Signin error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Login failed. Please check your credentials.'
      });
      throw error;
    }
  };

  // Simplified Google signin
  const signInWithGoogle = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await FirebaseService.signInWithGoogle();
      
      if (result && result.user) {
        console.log('Google signin successful:', result.user.uid);
      }
      
      return result;
    } catch (error) {
      console.error('Google signin error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Google sign-in failed. Please try again.'
      });
      throw error;
    }
  };

  // Simplified logout - clear all data
  const logout = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Clear all local storage first
      await StorageService.clearAllAppData();
      
      // Sign out from Firebase
      await FirebaseService.signOut();
      
      dispatch({ type: 'LOGOUT' });
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Password reset
  const sendPasswordReset = async (email) => {
    try {
      await FirebaseService.sendPasswordReset(email);
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Email verification
  const sendEmailVerification = async () => {
    try {
      await FirebaseService.sendEmailVerification();
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Reload user profile
  const reloadUser = async () => {
    try {
      const updatedFirebaseUser = await FirebaseService.reloadUser();
      if (updatedFirebaseUser) {
        const fullUser = await buildFullUser(updatedFirebaseUser);
        
        // Update local storage
        await StorageService.storeUserProfile(fullUser);
        
        dispatch({
          type: 'UPDATE_USER',
          payload: fullUser,
        });
        
        return fullUser;
      }
      return null;
    } catch (error) {
      console.error('Reload user error:', error);
      throw error;
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    try {
      const updatedUser = await FirebaseService.updateProfile(updates);
      
      if (updatedUser) {
        // Reload complete profile after update
        await reloadUser();
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const contextValue = {
    // State
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    loading: state.loading,
    error: state.error,
    emailVerified: state.emailVerified,
    
    // Methods
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    logout,
    sendPasswordReset,
    sendEmailVerification,
    reloadUser,
    updateProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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

export default AuthContext;

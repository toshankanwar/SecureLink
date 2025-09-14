import React, { createContext, useContext, useReducer, useEffect } from 'react';
import FirebaseService from '../services/firebase';
import DeviceStorageService from '../services/deviceStorage';

const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  emailVerified: false,
};

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

  const handleAuthStateChange = async (firebaseUser) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      if (firebaseUser) {
        // User is authenticated
        await initializeUserSession(firebaseUser);
      } else {
        // User is not authenticated
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const initializeUserSession = async (firebaseUser) => {
    try {
      // Initialize device storage for this user (no encryption)
      await DeviceStorageService.initializeForUser(firebaseUser.uid);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: firebaseUser,
        },
      });

    } catch (error) {
      console.error('Error initializing user session:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await FirebaseService.signUpWithEmail(email, password, displayName);
      
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
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const logout = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Clear device storage
      await DeviceStorageService.clearUserData();
      
      // Sign out from Firebase
      await FirebaseService.signOut();
      
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      dispatch({ type: 'LOGOUT' });
    }
  };

  const sendPasswordReset = async (email) => {
    try {
      await FirebaseService.sendPasswordReset(email);
    } catch (error) {
      throw error;
    }
  };

  const sendEmailVerification = async () => {
    try {
      await FirebaseService.sendEmailVerification();
    } catch (error) {
      throw error;
    }
  };

  const reloadUser = async () => {
    try {
      const updatedUser = await FirebaseService.reloadUser();
      if (updatedUser) {
        dispatch({
          type: 'UPDATE_USER',
          payload: updatedUser,
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
      dispatch({
        type: 'UPDATE_USER',
        payload: updatedUser,
      });
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const getIdToken = async () => {
    try {
      return await FirebaseService.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

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
      }}
    >
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

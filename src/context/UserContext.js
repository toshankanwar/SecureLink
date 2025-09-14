import React, { createContext, useContext, useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from './AuthContext';

// Create context
const UserContext = createContext(undefined);

export function UserProvider({ children }) {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    if (user) {
      setLoading(true);
      unsubscribe = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot((doc) => {
          if (doc.exists) {
            setUserProfile(doc.data());
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });
    } else {
      setUserProfile(null);
      setLoading(false);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const updateUserProfile = async (updates) => {
    if (!user) return;
    try {
      await firestore().collection('users').doc(user.uid).update(updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  return (
    <UserContext.Provider value={{ 
      userProfile, 
      loading, 
      updateUserProfile 
    }}>
      {children}
    </UserContext.Provider>
  );
}

// Hook with defensive guard: throws clear error if context is missing
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
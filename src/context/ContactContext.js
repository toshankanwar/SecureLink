import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firestore from '@react-native-firebase/firestore';
import StorageService from '../services/storage';

const ContactContext = createContext();

export function ContactProvider({ children }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    loadContacts();
    setupFirebaseListener();
  }, [user]);

  // Load contacts from local storage first, then sync with Firebase
  const loadContacts = async () => {
    try {
      setLoading(true);
      
      // Load from local storage first for instant UI
      const localContacts = await StorageService.getContacts();
      setContacts(localContacts);
      
      console.log(`Loaded ${localContacts.length} contacts from local storage`);
    } catch (err) {
      console.error('Error loading local contacts:', err);
      setError('Failed to load contacts from local storage');
    } finally {
      setLoading(false);
    }
  };

  // Setup Firebase real-time listener
  const setupFirebaseListener = () => {
    if (!user?.uid) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('contacts')
      .orderBy('addedAt', 'desc')
      .onSnapshot(
        async (snapshot) => {
          try {
            if (snapshot && snapshot.docs) {
              const firebaseContacts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              }));

              // Sync Firebase contacts to local storage
              for (const contact of firebaseContacts) {
                await StorageService.addContact(contact);
              }

              // Update state with merged contacts
              const mergedContacts = await StorageService.getContacts();
              setContacts(mergedContacts);
              
              console.log(`Synced ${firebaseContacts.length} contacts from Firebase`);
            } else {
              setContacts([]);
            }
            setLoading(false);
          } catch (err) {
            console.error('Error syncing Firebase contacts:', err);
            setError('Failed to sync contacts from Firebase');
            setLoading(false);
          }
        },
        (err) => {
          console.error('Firebase contacts listener error:', err);
          setError('Firebase connection failed');
          setLoading(false);
        }
      );

    return unsubscribe;
  };

  const addContact = async (contactId, displayName) => {
    try {
      setLoading(true);
      setError(null);

      // Validation
      if (!contactId || !displayName) {
        throw new Error('Contact ID and display name are required');
      }

      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      // Self-contact guard
      const currentUserProfile = await StorageService.getUserProfile();
      if (contactId === currentUserProfile?.contactId) {
        throw new Error('You cannot add yourself as a contact');
      }

      // Check for existing contact
      const existingContact = contacts.find(c => c.contactId === contactId);
      if (existingContact) {
        throw new Error('Contact already exists');
      }

      const contactData = {
        contactId,
        displayName: displayName.trim(),
        addedAt: new Date().toISOString(),
        photoURL: null,
        isOnline: false,
        lastSeen: null,
      };

      // Add to Firebase first (if online)
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('contacts')
          .doc(contactId)
          .set({
            ...contactData,
            addedAt: firestore.FieldValue.serverTimestamp(),
          });
        
        console.log('Contact added to Firebase:', contactId);
      } catch (firebaseError) {
        console.warn('Failed to add to Firebase (offline?):', firebaseError.message);
        // Continue with local storage even if Firebase fails
      }

      // Add to local storage
      await StorageService.addContact(contactData);

      // Update local state
      setContacts(prev => {
        const updated = prev.filter(c => c.contactId !== contactId);
        return [...updated, contactData].sort((a, b) => 
          new Date(b.addedAt) - new Date(a.addedAt)
        );
      });

      console.log('Contact added successfully:', contactId);
      return contactData;
    } catch (err) {
      console.error('Error adding contact:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeContact = async (contactId) => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      // Remove from Firebase first (if online)
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('contacts')
          .doc(contactId)
          .delete();
        
        console.log('Contact removed from Firebase:', contactId);
      } catch (firebaseError) {
        console.warn('Failed to remove from Firebase (offline?):', firebaseError.message);
        // Continue with local removal even if Firebase fails
      }

      // Remove from local storage
      await StorageService.removeContact(contactId);

      // Update local state
      setContacts(prev => prev.filter(c => c.contactId !== contactId));

      console.log('Contact removed successfully:', contactId);
      return true;
    } catch (err) {
      console.error('Error removing contact:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchContacts = (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      return contacts;
    }

    const query = searchQuery.toLowerCase().trim();
    return contacts.filter(contact => {
      const displayName = contact.displayName?.toLowerCase() || '';
      const contactId = contact.contactId?.toLowerCase() || '';
      
      return displayName.includes(query) || contactId.includes(query);
    });
  };

  const getContact = (contactId) => {
    return contacts.find(c => c.contactId === contactId) || null;
  };

  const updateContact = async (contactId, updates) => {
    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const updatedContact = {
        ...updates,
        contactId,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firebase
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('contacts')
          .doc(contactId)
          .update({
            ...updates,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      } catch (firebaseError) {
        console.warn('Failed to update in Firebase:', firebaseError.message);
      }

      // Update in local storage
      const existingContact = await StorageService.getContact(contactId);
      if (existingContact) {
        const merged = { ...existingContact, ...updatedContact };
        await StorageService.addContact(merged);

        // Update local state
        setContacts(prev => prev.map(c => 
          c.contactId === contactId ? merged : c
        ));
      }

      return true;
    } catch (err) {
      console.error('Error updating contact:', err);
      throw err;
    }
  };

  const refreshContacts = async () => {
    await loadContacts();
  };

  const clearError = () => {
    setError(null);
  };

  const clearAllContacts = async () => {
    try {
      setLoading(true);
      
      // Clear from Firebase (if online)
      if (user?.uid) {
        try {
          const batch = firestore().batch();
          const contactsSnapshot = await firestore()
            .collection('users')
            .doc(user.uid)
            .collection('contacts')
            .get();
          
          contactsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          console.log('All contacts cleared from Firebase');
        } catch (firebaseError) {
          console.warn('Failed to clear from Firebase:', firebaseError.message);
        }
      }

      // Clear from local storage
      await StorageService.clearAllContactData();

      // Clear local state
      setContacts([]);
      
      console.log('All contacts cleared successfully');
      return true;
    } catch (err) {
      console.error('Error clearing contacts:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const contextValue = {
    // State
    contacts,
    loading,
    error,
    
    // Actions
    addContact,
    removeContact,
    updateContact,
    searchContacts,
    getContact,
    refreshContacts,
    clearAllContacts,
    clearError,
  };

  return (
    <ContactContext.Provider value={contextValue}>
      {children}
    </ContactContext.Provider>
  );
}

export const useContacts = () => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactProvider');
  }
  return context;
};

export default ContactContext;

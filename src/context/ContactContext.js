import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useUser } from './UserContext';
import firestore from '@react-native-firebase/firestore';
import FirebaseService from '../services/firebase';

const ContactContext = createContext();

export function ContactProvider({ children }) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userProfile) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('contacts')
      .orderBy('addedAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          if (snapshot && snapshot.docs) {
            const contactsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            setContacts(contactsList);
          } else {
            setContacts([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Firestore contacts error:', error);
          setContacts([]);
          setLoading(false);
        }
      );
    return () => unsubscribe();
  }, [user, userProfile]);

  const addContact = async (contactId) => {
    try {
      if (!user || !userProfile) {
        throw new Error('User profile not loaded. Please try again.');
      }
  
      // Self-contact guard
      if (contactId === userProfile.contactId) {
        throw new Error('You cannot add yourself as a contact.');
      }
  
      // Prevent duplicate
      const existingContact = contacts.find(c => c.contactId === contactId);
      if (existingContact) throw new Error('Contact already added.');
  
      // Query users for this contactId
      const userQuery = await firestore()
        .collection('users')
        .where('contactId', '==', contactId)
        .get();
  
      if (userQuery.empty) {
        throw new Error('User not found with this Contact ID.');
      }
  
      // Grab first matching user's info
      const userDoc = userQuery.docs[0];
      const foundUser = {
        uid: userDoc.id,
        ...(userDoc.data() || {}),
      };
  
      // Safety: Make sure all required fields exist
      if (!foundUser.uid || !foundUser.displayName)
        throw new Error('User profile is invalid or incomplete.');
  
      // Add to contacts
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('contacts')
        .doc(foundUser.uid)
        .set({
          uid: foundUser.uid,
          contactId: foundUser.contactId,
          displayName: foundUser.displayName,
          photoURL: foundUser.photoURL || '',
          addedAt: firestore.FieldValue.serverTimestamp(),
          chatRoomId: null,
        });
  
      return foundUser;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  };

  const removeContact = async (contactUid) => {
    try {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('contacts')
        .doc(contactUid)
        .delete();
    } catch (error) {
      console.error('Error removing contact:', error);
      throw error;
    }
  };

  const searchContacts = (searchText) => {
    if (!searchText.trim()) return contacts;
    const lowercaseSearch = searchText.toLowerCase();
    return contacts.filter(contact =>
      (contact.displayName && contact.displayName.toLowerCase().includes(lowercaseSearch)) ||
      (contact.contactId && contact.contactId.includes(searchText))
    );
  };

  const refreshContacts = () => setLoading(true);

  return (
    <ContactContext.Provider value={{
      contacts,
      loading,
      addContact,
      removeContact,
      searchContacts,
      refreshContacts
    }}>
      {children}
    </ContactContext.Provider>
  );
}

export const useContacts = () => useContext(ContactContext);
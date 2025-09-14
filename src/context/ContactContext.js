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
    if (user && userProfile) {
      loadContacts();
    }
  }, [user, userProfile]);

  const loadContacts = () => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('contacts')
      .orderBy('addedAt', 'desc')
      .onSnapshot((snapshot) => {
        const contactsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContacts(contactsList);
        setLoading(false);
      });

    return () => unsubscribe();
  };

  const addContact = async (contactId) => {
    try {
      // Search user by ContactID
      const foundUser = await FirebaseService.findUserByContactId(contactId);
      
      if (!foundUser) {
        throw new Error('User not found with this Contact ID');
      }

      if (foundUser.contactId === userProfile.contactId) {
        throw new Error('You cannot add yourself as a contact');
      }

      // Check if contact already exists
      const existingContact = contacts.find(c => c.contactId === contactId);
      if (existingContact) {
        throw new Error('Contact already added');
      }

      // Add to user's contacts subcollection
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('contacts')
        .doc(foundUser.uid)
        .set({
          uid: foundUser.uid,
          contactId: foundUser.contactId,
          displayName: foundUser.displayName,
          photoURL: foundUser.photoURL,
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
      contact.displayName.toLowerCase().includes(lowercaseSearch) ||
      contact.contactId.includes(searchText)
    );
  };

  return (
    <ContactContext.Provider value={{ 
      contacts, 
      loading, 
      addContact, 
      removeContact, 
      searchContacts,
      refreshContacts: loadContacts 
    }}>
      {children}
    </ContactContext.Provider>
  );
}

export const useContacts = () => useContext(ContactContext);

// src/components/UserMigration.js
import { useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export default function UserMigration() {
  useEffect(() => {
    const createUserProfileIfMissing = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        // Check if user profile already exists
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', currentUser.email)
        );
        const userSnapshot = await getDocs(userQuery);

        // If no user profile exists, create one
        if (userSnapshot.empty) {
          const userHandle = currentUser.email.split('@')[0];
          
          await addDoc(collection(db, 'users'), {
            email: currentUser.email,
            handle: userHandle,
            displayName: currentUser.displayName || userHandle,
            userId: currentUser.uid,
            createdAt: new Date(),
            timestamp: Date.now(),
            migrated: true // Flag to indicate this was created via migration
          });

          console.log('User profile created for existing user:', currentUser.email);
        }
      } catch (error) {
        console.error('Error creating user profile:', error);
      }
    };

    // Run migration when component mounts and user is authenticated
    if (auth.currentUser) {
      createUserProfileIfMissing();
    }
  }, []);

  // This component doesn't render anything
  return null;
}

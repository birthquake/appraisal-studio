// src/firebase/FirebaseContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './config';

// Create Firebase Context
const FirebaseContext = createContext();

// Custom hook to use Firebase context
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

// Firebase Provider Component
export const FirebaseProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user profile from Firestore
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        // Create default user profile if it doesn't exist
        const defaultProfile = {
          uid,
          email: auth.currentUser?.email,
          plan: 'free',
          usageCount: 0,
          usageLimit: 5,
          lastReset: new Date(),
          createdAt: serverTimestamp(),
          stripeCustomerId: null
        };
        
        await setDoc(doc(db, 'users', uid), defaultProfile);
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    setAuthLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const userProfile = {
        uid: newUser.uid,
        email: newUser.email,
        displayName: displayName || '',
        plan: 'free',
        usageCount: 0,
        usageLimit: 5,
        lastReset: new Date(),
        createdAt: serverTimestamp(),
        stripeCustomerId: null
      };
      
      await setDoc(doc(db, 'users', newUser.uid), userProfile);
      
      // Send email verification
      await sendEmailVerification(newUser);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    setAuthLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  };

  // Track content generation
  const trackGeneration = async (contentType, content, propertyData) => {
    if (!user || !userProfile) return { success: false, error: 'User not authenticated' };

    try {
      // Check if user has exceeded usage limit
      if (userProfile.usageCount >= userProfile.usageLimit && userProfile.plan !== 'agency') {
        return { success: false, error: 'Usage limit exceeded', needsUpgrade: true };
      }

      // Add generation record
      const generationData = {
        userId: user.uid,
        contentType,
        content,
        propertyData,
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'generations'), generationData);

      // Update user usage count
      const newUsageCount = userProfile.usageCount + 1;
      await updateDoc(doc(db, 'users', user.uid), {
        usageCount: newUsageCount
      });

      // Update local user profile
      setUserProfile(prev => ({
        ...prev,
        usageCount: newUsageCount
      }));

      const remaining = userProfile.plan === 'agency' ? -1 : userProfile.usageLimit - newUsageCount;
      return { success: true, remainingGenerations: remaining };
    } catch (error) {
      console.error('Error tracking generation:', error);
      return { success: false, error: error.message };
    }
  };

  // Get user's generation history
  const getGenerationHistory = async () => {
    if (!user) return [];

    try {
      const q = query(
        collection(db, 'generations'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });

      return history;
    } catch (error) {
      console.error('Error fetching generation history:', error);
      return [];
    }
  };

  // Update user plan
  const updateUserPlan = async (newPlan, stripeCustomerId = null) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const planLimits = {
        free: 5,
        professional: 100,
        agency: -1 // unlimited
      };

      const updateData = {
        plan: newPlan,
        usageLimit: planLimits[newPlan],
        usageCount: 0, // Reset usage count when changing plans
        lastReset: new Date()
      };

      if (stripeCustomerId) {
        updateData.stripeCustomerId = stripeCustomerId;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);

      // Update local user profile
      setUserProfile(prev => ({
        ...prev,
        ...updateData
      }));

      return { success: true };
    } catch (error) {
      console.error('Error updating user plan:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if user can generate content
  const canGenerate = () => {
    if (!userProfile) return false;
    return userProfile.plan === 'agency' || userProfile.usageCount < userProfile.usageLimit;
  };

  // Get remaining generations
  const getRemainingGenerations = () => {
    if (!userProfile) return 0;
    if (userProfile.plan === 'agency') return -1; // unlimited
    return Math.max(0, userProfile.usageLimit - userProfile.usageCount);
  };

  const value = {
    // Auth state
    user,
    userProfile,
    loading,
    authLoading,

    // Auth methods
    signUp,
    signIn,
    signOut,
    resetPassword,

    // Generation methods
    trackGeneration,
    getGenerationHistory,
    canGenerate,
    getRemainingGenerations,

    // Plan methods
    updateUserPlan,

    // Helper methods
    fetchUserProfile
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '@/types/workout';

const STORAGE_KEY = 'user_profile';

const DEFAULT_PROFILE: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  email: '',
  phone: '',
  address: {},
  profilePictureUri: undefined,
  dateOfBirth: undefined,
  bio: '',
};

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setProfile(JSON.parse(raw) as UserProfile);
        }
      } catch (e) {
        console.error('Failed to load user profile', e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoaded && profile) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  }, [profile, isLoaded]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) {
        // Create new profile if none exists
        const now = new Date().toISOString();
        return {
          id: `profile-${Date.now()}`,
          ...DEFAULT_PROFILE,
          ...updates,
          createdAt: now,
          updatedAt: now,
        };
      }
      return {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const setProfilePicture = useCallback((uri: string | null) => {
    updateProfile({ profilePictureUri: uri || undefined });
  }, [updateProfile]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    profile,
    updateProfile,
    setProfilePicture,
    clearProfile,
    isLoaded,
  };
};

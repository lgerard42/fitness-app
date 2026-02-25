import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import {
  fetchProfile as apiFetchProfile,
  updateProfile as apiUpdateProfile,
} from '@/api/profile';
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

        if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
          try {
            const remote = await apiFetchProfile();
            setProfile(prev => ({
              ...DEFAULT_PROFILE,
              id: remote.id,
              createdAt: remote.createdAt,
              updatedAt: remote.updatedAt,
              ...prev,
              name: remote.name,
              email: remote.email,
              phone: remote.phone ?? prev?.phone ?? '',
              bio: remote.bio ?? prev?.bio ?? '',
              dateOfBirth: remote.dateOfBirth ?? prev?.dateOfBirth,
              bodyWeight: remote.bodyWeight ?? prev?.bodyWeight,
              profilePictureUri: remote.profilePictureUri ?? prev?.profilePictureUri,
            }));
            console.log("[sync] loaded profile from backend");
          } catch (err) {
            console.warn("[sync] profile fetch failed:", (err as Error).message);
          }
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

    if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
      apiUpdateProfile(updates).catch(err =>
        console.warn("[sync] failed to push profile:", (err as Error).message)
      );
    }
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

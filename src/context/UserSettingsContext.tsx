import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSettings as apiFetchSettings, updateSettings as apiUpdateSettings } from '@/api/profile';
import type { UserSettings } from '@/types/workout';

const DEFAULT_SETTINGS: UserSettings = {
  distanceUnit: 'US',
  weightUnit: 'lbs',
  weightCalcMode: '1x',
  repsConfigMode: '1x',
  defaultRestTimerSeconds: 90,
  vibrateOnTimerFinish: true,
  keepScreenAwake: false,
};

interface UserSettingsContextValue {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  isLoaded: boolean;
}

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

const STORAGE_KEY = 'user_settings';

interface UserSettingsProviderProps {
  children: ReactNode;
}

export const UserSettingsProvider = ({ children }: UserSettingsProviderProps) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<UserSettings>;
          setSettings(prev => ({ ...prev, ...parsed }));
        }

        try {
          const remote = await apiFetchSettings();
          if (remote) {
            setSettings(prev => ({ ...prev, ...remote }));
            console.log("[sync] loaded settings from backend");
          }
        } catch (err) {
          console.warn("[sync] settings fetch failed:", (err as Error).message);
        }
      } catch (e) {
        console.error('Failed to load user settings', e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));

    apiUpdateSettings(partial).catch(err =>
      console.warn("[sync] failed to push settings:", (err as Error).message)
    );
  }, []);

  return (
    <UserSettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = (): UserSettingsContextValue => {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
};

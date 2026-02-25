import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import {
  fetchMeasurements as apiFetchMeasurements,
  createMeasurement as apiCreateMeasurement,
  deleteMeasurement as apiDeleteMeasurement,
} from '@/api/measurements';
import type { BodyMeasurement } from '@/types/workout';

const STORAGE_KEY = 'body_measurements';

export const useBodyStats = () => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setMeasurements(JSON.parse(raw) as BodyMeasurement[]);
        }

        if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
          try {
            const remote = await apiFetchMeasurements();
            if (remote.length > 0) {
              setMeasurements(remote);
              console.log("[sync] loaded measurements:", remote.length);
            }
          } catch (err) {
            console.warn("[sync] measurements fetch failed:", (err as Error).message);
          }
        }
      } catch (e) {
        console.error('Failed to load body measurements', e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(measurements));
    }
  }, [measurements, isLoaded]);

  const addMeasurement = useCallback((measurement: Omit<BodyMeasurement, 'id'>) => {
    const newMeasurement: BodyMeasurement = {
      ...measurement,
      id: `bm-${Date.now()}`,
    };
    setMeasurements(prev => [newMeasurement, ...prev]);

    if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
      apiCreateMeasurement(measurement).catch(err =>
        console.warn("[sync] failed to push measurement:", (err as Error).message)
      );
    }
  }, []);

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));

    if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
      apiDeleteMeasurement(id).catch(err =>
        console.warn("[sync] failed to delete measurement:", (err as Error).message)
      );
    }
  }, []);

  const latestMeasurement = measurements.length > 0 ? measurements[0] : null;

  const previousMeasurement = measurements.length > 1 ? measurements[1] : null;

  const getWeightDelta = (): { value: number; label: string } | null => {
    if (!latestMeasurement?.weight || !previousMeasurement?.weight) return null;
    const delta = latestMeasurement.weight - previousMeasurement.weight;
    const unit = latestMeasurement.unit === 'kg' ? 'kg' : 'lbs';
    const sign = delta >= 0 ? '+' : '';
    return {
      value: delta,
      label: `${sign}${delta.toFixed(1)} ${unit} since last`,
    };
  };

  const getBodyFatDelta = (): { value: number; label: string } | null => {
    if (!latestMeasurement?.bodyFatPercent || !previousMeasurement?.bodyFatPercent) return null;
    const delta = latestMeasurement.bodyFatPercent - previousMeasurement.bodyFatPercent;
    const sign = delta >= 0 ? '+' : '';
    return {
      value: delta,
      label: `${sign}${delta.toFixed(1)}% BF since last`,
    };
  };

  return {
    measurements,
    latestMeasurement,
    previousMeasurement,
    addMeasurement,
    deleteMeasurement,
    getWeightDelta,
    getBodyFatDelta,
    isLoaded,
  };
};

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  }, []);

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
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

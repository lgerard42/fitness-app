import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { UserSettingsProvider, useUserSettings } from './UserSettingsContext';

const TestConsumer = () => {
  const { settings, updateSettings, isLoaded } = useUserSettings();
  return (
    <View>
      <Text testID="loaded">{String(isLoaded)}</Text>
      <Text testID="weight-unit">{settings.weightUnit}</Text>
      <Text testID="rest-timer">{settings.defaultRestTimerSeconds}</Text>
      <TouchableOpacity
        testID="update"
        onPress={() => updateSettings({ weightUnit: 'kg', defaultRestTimerSeconds: 120 })}
      >
        <Text>Update</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('UserSettingsContext', () => {
  it('throws when useUserSettings is used outside provider', () => {
    const BadConsumer = () => {
      useUserSettings();
      return null;
    };
    expect(() => render(<BadConsumer />)).toThrow('useUserSettings must be used within a UserSettingsProvider');
  });

  it('loads with default settings after loading', async () => {
    render(
      <UserSettingsProvider>
        <TestConsumer />
      </UserSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loaded').props.children).toBe('true');
    });

    expect(screen.getByTestId('weight-unit').props.children).toBe('lbs');
    expect(screen.getByTestId('rest-timer').props.children).toBe(90);
  });

  it('updateSettings updates state', async () => {
    render(
      <UserSettingsProvider>
        <TestConsumer />
      </UserSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loaded').props.children).toBe('true');
    });

    fireEvent.press(screen.getByTestId('update'));

    expect(screen.getByTestId('weight-unit').props.children).toBe('kg');
    expect(screen.getByTestId('rest-timer').props.children).toBe(120);
  });

  it('persists loaded settings when AsyncStorage has data', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ weightUnit: 'kg', defaultRestTimerSeconds: 60 })
    );

    render(
      <UserSettingsProvider>
        <TestConsumer />
      </UserSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loaded').props.children).toBe('true');
    });

    expect(screen.getByTestId('weight-unit').props.children).toBe('kg');
    expect(screen.getByTestId('rest-timer').props.children).toBe(60);
  });
});

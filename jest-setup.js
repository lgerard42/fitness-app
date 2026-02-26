// Extend Jest with React Native Testing Library matchers
require('@testing-library/jest-native/extend-expect');
// Mock Reanimated for component tests
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
// Mock AsyncStorage for context/component tests (jest.mock is hoisted, so define mock inside factory)
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    multiGet: jest.fn((keys) => Promise.resolve(keys.map(k => [k, null]))),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  };
  return { __esModule: true, default: storage };
});
// Mock lucide-react-native icons (avoid native SVG in tests)
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = (props) => React.createElement(View, { ...props, testID: 'mock-icon' });
  const icons = ['Star', 'X', 'Trash2', 'Timer'];
  return icons.reduce((acc, name) => ({ ...acc, [name]: MockIcon }), {});
});

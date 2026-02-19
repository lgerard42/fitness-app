import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MoveModeBanner from './MoveModeBanner';

const mockStyles = {
  moveModeBanner: {},
  moveModeBannerButtonText: {},
  moveModeBannerCenter: {},
  moveModeBannerTitle: {},
  moveModeBannerSubtitle: {},
};

describe('MoveModeBanner', () => {
  it('renders title and subtitle', () => {
    render(<MoveModeBanner onCancel={jest.fn()} onDone={jest.fn()} styles={mockStyles} />);
    expect(screen.getByText('Move Item')).toBeTruthy();
    expect(screen.getByText('Press and hold on an exercise or group to move it')).toBeTruthy();
  });

  it('renders Cancel and Done buttons', () => {
    render(<MoveModeBanner onCancel={jest.fn()} onDone={jest.fn()} styles={mockStyles} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn();
    render(<MoveModeBanner onCancel={onCancel} onDone={jest.fn()} styles={mockStyles} />);
    fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onDone when Done is pressed', () => {
    const onDone = jest.fn();
    render(<MoveModeBanner onCancel={jest.fn()} onDone={onDone} styles={mockStyles} />);
    fireEvent.press(screen.getByText('Done'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

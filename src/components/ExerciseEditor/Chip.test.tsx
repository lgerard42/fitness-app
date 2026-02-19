import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Chip from './Chip';

describe('Chip', () => {
  it('renders label', () => {
    render(<Chip label="Barbell" selected={false} onClick={jest.fn()} />);
    expect(screen.getByText('Barbell')).toBeTruthy();
  });

  it('calls onClick when pressed', () => {
    const onClick = jest.fn();
    render(<Chip label="Barbell" selected={false} onClick={onClick} />);
    fireEvent.press(screen.getByText('Barbell'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows remove button when onRemove is provided', () => {
    render(<Chip label="Barbell" selected={false} onClick={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByTestId('chip-remove')).toBeTruthy();
  });

  it('calls onRemove when remove icon is pressed', () => {
    const onRemove = jest.fn();
    render(<Chip label="Barbell" selected={false} onClick={jest.fn()} onRemove={onRemove} />);
    fireEvent.press(screen.getByTestId('chip-remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('shows secondary button when selected and onSecondaryPress provided', () => {
    render(
      <Chip
        label="Primary"
        selected={true}
        isPrimary={true}
        onClick={jest.fn()}
        onSecondaryPress={jest.fn()}
      />
    );
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows "3" when hasTertiarySelected', () => {
    render(
      <Chip
        label="Primary"
        selected={true}
        isPrimary={true}
        onClick={jest.fn()}
        onSecondaryPress={jest.fn()}
        hasTertiarySelected={true}
      />
    );
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('calls onSecondaryPress when secondary button pressed', () => {
    const onSecondaryPress = jest.fn();
    render(
      <Chip
        label="Primary"
        selected={true}
        isPrimary={true}
        onClick={jest.fn()}
        onSecondaryPress={onSecondaryPress}
      />
    );
    fireEvent.press(screen.getByText('2'));
    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });
});

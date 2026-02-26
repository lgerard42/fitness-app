import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberField from '../NumberField';

describe('NumberField', () => {
  it('renders a number input with the provided value', () => {
    render(<NumberField value={42} onChange={vi.fn()} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(42);
  });

  it('defaults to 0 when value is null', () => {
    render(<NumberField value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(0);
  });

  it('defaults to 0 when value is undefined', () => {
    render(<NumberField value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(0);
  });

  it('calls onChange with the numeric value', () => {
    const onChange = vi.fn();
    render(<NumberField value={10} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('uses step=1 by default', () => {
    render(<NumberField value={0} onChange={vi.fn()} />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('step', '1');
  });

  it('applies custom step prop', () => {
    render(<NumberField value={0} onChange={vi.fn()} step={0.1} />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('step', '0.1');
  });
});

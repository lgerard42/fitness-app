import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BooleanField from '../BooleanField';

describe('BooleanField', () => {
  it('renders a toggle button', () => {
    render(<BooleanField value={false} onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies active class when value is true', () => {
    render(<BooleanField value={true} onChange={vi.fn()} />);
    expect(screen.getByRole('button').className).toContain('bg-blue-600');
  });

  it('applies inactive class when value is false', () => {
    render(<BooleanField value={false} onChange={vi.fn()} />);
    expect(screen.getByRole('button').className).toContain('bg-gray-300');
  });

  it('calls onChange with true when clicked while false', () => {
    const onChange = vi.fn();
    render(<BooleanField value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when clicked while true', () => {
    const onChange = vi.fn();
    render(<BooleanField value={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

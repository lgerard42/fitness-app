import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StringField from '../StringField';

describe('StringField', () => {
  it('renders an input with the provided value', () => {
    render(<StringField value="hello" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
  });

  it('renders a text input by default (not textarea)', () => {
    render(<StringField value="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox').tagName).toBe('INPUT');
  });

  it('calls onChange with the new value on input change', () => {
    const onChange = vi.fn();
    render(<StringField value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });

  it('renders a textarea when multiline is true', () => {
    render(<StringField value="multi" onChange={vi.fn()} multiline />);
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it('calls onChange on textarea change', () => {
    const onChange = vi.fn();
    render(<StringField value="" onChange={onChange} multiline />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'line1\nline2' } });
    expect(onChange).toHaveBeenCalledWith('line1\nline2');
  });
});

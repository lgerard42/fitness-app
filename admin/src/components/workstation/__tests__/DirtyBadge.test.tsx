import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DirtyBadge from '../DirtyBadge';

describe('DirtyBadge', () => {
  it('renders nothing when dirtyCount is 0', () => {
    const { container } = render(<DirtyBadge dirtyCount={0} domains={new Set()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the unsaved count', () => {
    render(<DirtyBadge dirtyCount={2} domains={new Set(['baseline', 'config'])} />);
    expect(screen.getByText('2 unsaved')).toBeInTheDocument();
  });

  it('includes Baseline in title when baseline is dirty', () => {
    render(<DirtyBadge dirtyCount={1} domains={new Set(['baseline'])} />);
    expect(screen.getByText('1 unsaved')).toHaveAttribute('title', 'Baseline');
  });

  it('includes Config in title when config is dirty', () => {
    render(<DirtyBadge dirtyCount={1} domains={new Set(['config'])} />);
    expect(screen.getByText('1 unsaved')).toHaveAttribute('title', 'Config');
  });

  it('includes delta branch count in title', () => {
    render(
      <DirtyBadge
        dirtyCount={3}
        domains={new Set(['baseline', 'grips.wide', 'torsoAngles.DEG_45'])}
      />,
    );
    const badge = screen.getByText('3 unsaved');
    expect(badge.getAttribute('title')).toContain('Baseline');
    expect(badge.getAttribute('title')).toContain('2 delta branches');
  });

  it('shows singular "delta branch" for one delta domain', () => {
    render(
      <DirtyBadge dirtyCount={1} domains={new Set(['grips.wide'])} />,
    );
    expect(screen.getByText('1 unsaved')).toHaveAttribute('title', '1 delta branch');
  });

  it('combines baseline, config, and deltas in title', () => {
    render(
      <DirtyBadge
        dirtyCount={4}
        domains={new Set(['baseline', 'config', 'grips.wide', 'torsoAngles.DEG_45'])}
      />,
    );
    const title = screen.getByText('4 unsaved').getAttribute('title')!;
    expect(title).toContain('Baseline');
    expect(title).toContain('Config');
    expect(title).toContain('2 delta branches');
  });
});

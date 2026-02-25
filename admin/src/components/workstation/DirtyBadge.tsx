import React from 'react';

interface DirtyBadgeProps {
  dirtyCount: number;
  domains: Set<string>;
}

export default function DirtyBadge({ dirtyCount, domains }: DirtyBadgeProps) {
  if (dirtyCount === 0) return null;

  const domainLabels: string[] = [];
  if (domains.has('baseline')) domainLabels.push('Baseline');
  if (domains.has('config')) domainLabels.push('Config');
  const deltaCount = Array.from(domains).filter(d => d !== 'baseline' && d !== 'config').length;
  if (deltaCount > 0) domainLabels.push(`${deltaCount} delta branch${deltaCount > 1 ? 'es' : ''}`);

  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 font-medium cursor-default"
      title={domainLabels.join(', ')}
    >
      {dirtyCount} unsaved
    </span>
  );
}

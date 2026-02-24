import React from 'react';
import { NavLink } from 'react-router-dom';
import type { TableInfo } from '../api';

interface SidebarProps {
  tables: TableInfo[];
  groups: string[];
}

const groupIcons: Record<string, string> = {
  'Exercise Setup': '🏋️',
  'Muscles & Motions': '💪',
  'Trajectory & Posture': '📐',
  'Upper Body Mechanics': '🤲',
  'Lower Body Mechanics': '🦵',
  'Execution Variables': '⚙️',
  'Equipment': '🔧',
};

export default function Sidebar({ tables, groups }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-900 text-gray-100 h-screen overflow-y-auto flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <NavLink to="/" className="text-lg font-bold text-white hover:text-blue-400 no-underline">
          Exercise Config Admin
        </NavLink>
      </div>

      <nav className="flex-1 p-2 pb-[30px] space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `block px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/matrix"
          className={({ isActive }) =>
            `block px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`
          }
        >
          Filter Matrix
        </NavLink>

        <NavLink
          to="/motion-delta-matrix"
          className={({ isActive }) =>
            `block px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`
          }
        >
          Motion Delta Matrix
        </NavLink>

        <NavLink
          to="/scoring"
          className={({ isActive }) =>
            `block px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`
          }
        >
          Scoring Engine
        </NavLink>

        <NavLink
          to="/graph"
          className={({ isActive }) =>
            `block px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`
          }
        >
          Relationship Graph
        </NavLink>

        <div className="h-px bg-gray-700 my-2" />

        {groups.map((group) => {
          const groupTables = tables.filter((t) => t.group === group);
          const depthOf = (key: string): number => {
            const t = groupTables.find((x) => x.key === key);
            if (!t?.parentTableKey) return 0;
            return 1 + depthOf(t.parentTableKey);
          };
          return (
            <div key={group} className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {groupIcons[group] || '📋'} {group}
              </div>
              {groupTables.map((t) => {
                const depth = depthOf(t.key);
                const paddingLeftPx = 24 + depth * 16;
                return (
                  <NavLink
                    key={t.key}
                    to={`/table/${t.key}`}
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded text-sm ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`
                    }
                    style={{ paddingLeft: `${paddingLeftPx}px` }}
                  >
                    <span>{t.label}</span>
                    <span className="ml-auto text-xs text-gray-500 float-right">{t.rowCount}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

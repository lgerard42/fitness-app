import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TableSchema } from '../api';

interface RelationshipsProps {
  tableKey: string;
  recordId: string;
  recordLabel: string;
  schema: TableSchema;
  recordData: Record<string, unknown>;
  refData: Record<string, Record<string, unknown>[]>;
}

export default function Relationships({
  tableKey,
  recordId,
  recordLabel,
  schema,
  recordData,
  refData,
}: RelationshipsProps) {
  // Compute table relationships based on exercise_input_permissions
  const tableRelationships = useMemo(() => {
    const relationships: Array<{ label: string; tableKey: string }> = [];
    
    // Exercise Categories: show relationships based on exercise_input_permissions
    if (tableKey === 'exerciseCategories') {
      const permissions = recordData.exercise_input_permissions;
      if (permissions) {
        let parsed: Record<string, string>;
        try {
          parsed = typeof permissions === 'string' 
            ? JSON.parse(permissions) 
            : (permissions as Record<string, string>);
        } catch {
          return relationships;
        }
        
        if (parsed && typeof parsed === 'object') {
          // Cardio Types
          if (parsed.cardio_types && parsed.cardio_types !== 'forbidden') {
            relationships.push({ label: 'Cardio Types', tableKey: 'cardioTypes' });
          }
          
          // Training Focus
          if (parsed.training_focus && parsed.training_focus !== 'forbidden') {
            relationships.push({ label: 'Training Focus', tableKey: 'trainingFocus' });
          }
          
          // Muscle Groups
          if (parsed.muscle_groups && parsed.muscle_groups !== 'forbidden') {
            relationships.push({ label: 'Muscle Groups', tableKey: 'muscleGroups' });
          }
        }
      }
    }
    
    // Muscle Groups: show relationships to Primary, Secondary, and Tertiary Muscles
    if (tableKey === 'muscleGroups') {
      relationships.push(
        { label: 'Primary Muscles', tableKey: 'primaryMuscles' },
        { label: 'Secondary Muscles', tableKey: 'secondaryMuscles' },
        { label: 'Tertiary Muscles', tableKey: 'tertiaryMuscles' }
      );
    }

    // Primary Motions: show relationships to Variations and Motion Planes
    if (tableKey === 'primaryMotions') {
      relationships.push(
        { label: 'Motion Variations', tableKey: 'primaryMotionVariations' },
        { label: 'Motion Planes', tableKey: 'motionPlanes' }
      );
    }

    // Primary Motion Variations: show relationships to Primary Motions and Motion Planes
    if (tableKey === 'primaryMotionVariations') {
      relationships.push(
        { label: 'Primary Motions', tableKey: 'primaryMotions' },
        { label: 'Motion Planes', tableKey: 'motionPlanes' }
      );
    }

    // Motion Planes: show relationships to Primary Motions and Variations
    if (tableKey === 'motionPlanes') {
      relationships.push(
        { label: 'Primary Motions', tableKey: 'primaryMotions' },
        { label: 'Motion Variations', tableKey: 'primaryMotionVariations' }
      );
    }
    
    return relationships;
  }, [tableKey, recordData]);

  if (tableRelationships.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-2 italic">
        No relationships found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Relationships */}
      {tableRelationships.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              Table Relationships
            </span>
            <span className="text-xs text-gray-400">
              ({tableRelationships.length} related table{tableRelationships.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="space-y-1.5">
            {tableRelationships.map((rel) => (
              <div key={rel.tableKey} className="bg-white border rounded">
                <Link
                  to={`/table/${rel.tableKey}`}
                  className="flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 block"
                >
                  <span className="text-sm text-gray-700 flex-1">
                    <span className="text-blue-600 hover:underline font-medium">
                      {rel.label}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">
                      → {rel.tableKey}
                    </span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

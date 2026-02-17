import React from 'react';

interface ExerciseInputPermissionsFieldProps {
  value: Record<string, string> | null | undefined;
  onChange: (v: Record<string, string>) => void;
}

type PermissionType = 'required' | 'allowed' | 'forbidden';
type PermissionKey = 'cardio_types' | 'muscle_groups' | 'training_focus';

const ROWS: { key: PermissionKey; label: string }[] = [
  { key: 'cardio_types', label: 'Cardio Types' },
  { key: 'muscle_groups', label: 'Muscle Groups' },
  { key: 'training_focus', label: 'Training Focus' },
];

const COLUMNS: { value: PermissionType; label: string }[] = [
  { value: 'required', label: 'Required' },
  { value: 'allowed', label: 'Allowed' },
  { value: 'forbidden', label: 'Forbidden' },
];

export default function ExerciseInputPermissionsField({
  value,
  onChange,
}: ExerciseInputPermissionsFieldProps) {
  const currentValue = value || {
    cardio_types: 'allowed',
    muscle_groups: 'allowed',
    training_focus: 'allowed',
  };

  const handleChange = (rowKey: PermissionKey, permission: PermissionType) => {
    onChange({
      ...currentValue,
      [rowKey]: permission,
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-r">
                Permission Type
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.value}
                  className="px-4 py-2 text-center text-sm font-medium text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const currentPermission = (currentValue[row.key] || 'allowed') as PermissionType;
              return (
                <tr key={row.key} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 border-r">
                    {row.label}
                  </td>
                  {COLUMNS.map((col) => {
                    const isChecked = currentPermission === col.value;
                    return (
                      <td key={col.value} className="px-4 py-3 text-center">
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="radio"
                            name={`permission-${row.key}`}
                            value={col.value}
                            checked={isChecked}
                            onChange={() => handleChange(row.key, col.value)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
        Current value: {JSON.stringify(currentValue)}
      </div>
    </div>
  );
}

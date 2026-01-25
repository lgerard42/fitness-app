// Utility functions for workout operations

// Deep update an exercise in a nested structure
export const updateExercisesDeep = (list, instanceId, updateFn) => {
  return list.map(item => {
    if (item.instanceId === instanceId) return updateFn(item);
    if (item.type === 'group' && item.children) {
      return { ...item, children: updateExercisesDeep(item.children, instanceId, updateFn) };
    }
    return item;
  });
};

// Deep delete an exercise from a nested structure
export const deleteExerciseDeep = (list, instanceId) => {
  return list.reduce((acc, item) => {
    if (item.instanceId === instanceId) return acc;
    if (item.type === 'group' && item.children) {
      const newChildren = deleteExerciseDeep(item.children, instanceId);
      if (newChildren.length === 0) return acc; // Remove empty group
      return [...acc, { ...item, children: newChildren }];
    }
    return [...acc, item];
  }, []);
};

// Find an exercise in a nested structure
export const findExerciseDeep = (list, instanceId) => {
  for (const item of list) {
    if (item.instanceId === instanceId) return item;
    if (item.type === 'group' && item.children) {
      const found = findExerciseDeep(item.children, instanceId);
      if (found) return found;
    }
  }
  return null;
};

// Flatten exercises into a flat list with depth information
export const flattenExercises = (exercises) => {
  const rows = [];
  exercises.forEach(item => {
    if (item.type === 'group') {
      rows.push({ type: 'group_header', id: item.instanceId, data: item, depth: 0 });
      if (item.children) {
        item.children.forEach(child => {
          rows.push({ type: 'exercise', id: child.instanceId, data: child, depth: 1, groupId: item.instanceId });
        });
      }
    } else {
      rows.push({ type: 'exercise', id: item.instanceId, data: item, depth: 0, groupId: null });
    }
  });
  return rows;
};

// Reconstruct exercises from a flat list
export const reconstructExercises = (flatRows) => {
  const newExercises = [];
  let currentGroup = null;

  flatRows.forEach(row => {
    if (row.type === 'group_header') {
      // Start new group
      currentGroup = { ...row.data, children: [] };
      newExercises.push(currentGroup);
    } else if (row.type === 'exercise') {
      // If we are "inside" a group (i.e. following a header), add to it.
      // BUT: We need to respect the user's intent. 
      // Simple heuristic: If the row has a groupId that matches the currentGroup, keep it there?
      // No, the order in flatRows is the truth.
      // The greedy approach: If currentGroup is active, add to it.
      // To allow "breaking out", we would need explicit "end group" markers or depth changes.
      // For this implementation, we'll assume:
      // 1. If we hit a group header, we are in that group.
      // 2. If we hit a standalone exercise (depth 0), we exit the group? 
      //    But how do we know it's depth 0 if we just moved it?
      //    We update the depth based on where it was dropped!
      
      if (row.depth === 1 && currentGroup) {
        currentGroup.children.push(row.data);
      } else {
        // Standalone
        newExercises.push(row.data);
        currentGroup = null; // Reset current group
      }
    }
  });
  return newExercises;
};

// Format seconds to MM:SS display
export const formatRestTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Smart parse time input to seconds
// - 1-2 digits: treat as seconds (e.g., "30" → 30s, "90" → 90s)
// - 3+ digits with last 2 < 60: parse as MMSS (e.g., "110" → 1:10 = 70s)
// - 3+ digits with last 2 >= 60: treat as total seconds (e.g., "165" → 165s)
export const parseRestTimeInput = (input) => {
  const num = parseInt(input, 10);
  if (isNaN(num) || num <= 0) return 0;
  
  if (num <= 99) {
    // 1-2 digits: treat as seconds
    return num;
  } else {
    // 3+ digits: check if last two digits are valid seconds (< 60)
    const lastTwo = num % 100;
    const rest = Math.floor(num / 100);
    
    if (lastTwo < 60) {
      // Parse as MMSS format (e.g., 110 → 1 min 10 sec)
      return rest * 60 + lastTwo;
    } else {
      // Last two digits >= 60, treat as total seconds
      return num;
    }
  }
};

// Helper functions for superset detection
export const getAllSupersets = (exercises) => {
  return exercises.filter(ex => ex.type === 'group' && ex.groupType === 'Superset');
};

export const findExerciseSuperset = (exercises, exerciseInstanceId) => {
  for (const item of exercises) {
    if (item.type === 'group' && item.groupType === 'Superset' && item.children) {
      const found = item.children.find(child => child.instanceId === exerciseInstanceId);
      if (found) return item;
    }
  }
  return null;
};

export const isExerciseInSuperset = (exercises, exerciseInstanceId) => {
  return !!findExerciseSuperset(exercises, exerciseInstanceId);
};

export const getStandaloneExercises = (exercises) => {
  const standalone = [];
  exercises.forEach(item => {
    if (item.type === 'exercise') {
      standalone.push(item);
    }
  });
  return standalone;
};

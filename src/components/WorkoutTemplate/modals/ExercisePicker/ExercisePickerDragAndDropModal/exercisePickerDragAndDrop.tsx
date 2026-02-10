import React from 'react';
import type { ExerciseLibraryItem, GroupType } from '@/types/workout';
import type { SetGroup } from '@/utils/workoutInstanceHelpers';

export interface DragItemBase {
  id: string;
  isCollapsed?: boolean;
  groupId?: string | null;
}

export interface GroupHeaderItem extends DragItemBase {
  type: 'GroupHeader';
  group: {
    id: string;
    type: GroupType;
    number: number;
    exerciseIndices: number[];
  };
  groupExercises: Array<{
    exercise: ExerciseLibraryItem;
    orderIndex: number;
    count: number;
  }>;
}

export interface GroupFooterItem extends DragItemBase {
  type: 'GroupFooter';
  group: {
    id: string;
    type: GroupType;
    number: number;
    exerciseIndices: number[];
  };
}

export interface ExerciseItem extends DragItemBase {
  type: 'Item';
  exercise: ExerciseLibraryItem;
  orderIndex: number;
  count: number;
  setGroups: SetGroup[];
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isDropset?: boolean;
}

export type DragItem = GroupHeaderItem | GroupFooterItem | ExerciseItem;

// Export helper functions for drag-and-drop operations
export const collapseGroup = (items: DragItem[], groupId: string): DragItem[] => {
  return items.map(item => {
    if (item.type === 'Item' && item.groupId === groupId) {
      return { ...item, isCollapsed: true };
    }
    if (item.type === 'GroupHeader' && item.groupId === groupId) {
      return { ...item, isCollapsed: true, id: `${item.id}-col` };
    }
    if (item.type === 'GroupFooter' && item.groupId === groupId) {
      return { ...item, isCollapsed: true };
    }
    return item;
  });
};

export const collapseAllOtherGroups = (items: DragItem[], draggedGroupId: string): DragItem[] => {
  const otherGroupIds = new Set<string>();
  items.forEach(item => {
    if (item.groupId && item.groupId !== draggedGroupId) {
      otherGroupIds.add(item.groupId);
    }
  });

  return items.map(item => {
    if (item.groupId && otherGroupIds.has(item.groupId)) {
      if (item.type === 'GroupHeader' || item.type === 'Item' || item.type === 'GroupFooter') {
        return { ...item, isCollapsed: true };
      }
    }
    return item;
  });
};

export const expandAllGroups = (items: DragItem[]): DragItem[] => {
  const collapsedGroupIds = new Set<string>();
  items.forEach(item => {
    if (item.isCollapsed && item.groupId) {
      collapsedGroupIds.add(item.groupId);
    }
  });

  if (collapsedGroupIds.size === 0) {
    return items.map(item => {
      if (item.isCollapsed) {
        const { isCollapsed, ...rest } = item;
        return rest as DragItem;
      }
      return item;
    });
  }

  let result = [...items];

  collapsedGroupIds.forEach(groupId => {
    const headerIndex = result.findIndex(item =>
      item.type === 'GroupHeader' && item.groupId === groupId
    );

    if (headerIndex === -1) {
      result = result.map(item => {
        if (item.groupId === groupId && item.isCollapsed) {
          const { isCollapsed, ...rest } = item;
          return rest as DragItem;
        }
        return item;
      });
      return;
    }

    const groupItems: DragItem[] = [];
    result.forEach(item => {
      if (item.groupId === groupId && (item.type === 'Item' || item.type === 'GroupFooter')) {
        if (item.isCollapsed) {
          const { isCollapsed, ...rest } = item;
          groupItems.push(rest as DragItem);
        } else {
          groupItems.push(item);
        }
      }
    });

    groupItems.sort((a, b) => {
      if (a.type === 'GroupFooter') return 1;
      if (b.type === 'GroupFooter') return -1;
      const aOrder = a.type === 'Item' ? (a.orderIndex || 0) : 0;
      const bOrder = b.type === 'Item' ? (b.orderIndex || 0) : 0;
      return aOrder - bOrder;
    });

    const newResult: DragItem[] = [];

    for (let i = 0; i < headerIndex; i++) {
      if (result[i].groupId !== groupId || result[i].type === 'GroupHeader') {
        newResult.push(result[i]);
      }
    }

    const header = result[headerIndex];
    if (header.type === 'GroupHeader') {
      const { isCollapsed, id, ...headerRest } = header;
      const originalId = id.endsWith('-col') ? id.slice(0, -4) : id;
      newResult.push({ ...headerRest, id: originalId });
    }

    newResult.push(...groupItems);

    for (let i = headerIndex + 1; i < result.length; i++) {
      if (result[i].groupId !== groupId || result[i].type === 'GroupHeader') {
        newResult.push(result[i]);
      }
    }

    result = newResult;
  });

  return result.map(item => {
    if (item.isCollapsed) {
      const { isCollapsed, ...rest } = item;
      return rest as DragItem;
    }
    return item;
  });
};

export const createHandleDragEnd = (
  collapsedGroupId: string | null,
  setCollapsedGroupId: (id: string | null) => void,
  setReorderedItems: (items: DragItem[]) => void,
  pendingDragRef: React.MutableRefObject<(() => void) | null>
) => {
  return ({ data, from, to }: { data: DragItem[]; from: number; to: number }) => {
    let updatedData = data;
    if (collapsedGroupId) {
      updatedData = expandAllGroups(data);
      setCollapsedGroupId(null);
    }

    updatedData = updatedData.map((item, index) => {
      if (item.type !== 'Item') return item;

      let foundGroupId: string | null = null;

      for (let i = index - 1; i >= 0; i--) {
        const prevItem = updatedData[i];
        if (prevItem.type === 'GroupHeader') {
          const groupId = prevItem.groupId;
          if (!groupId) continue;
          for (let j = index + 1; j < updatedData.length; j++) {
            const nextItem = updatedData[j];
            if (nextItem.type === 'GroupFooter' && nextItem.groupId === groupId) {
              foundGroupId = groupId;
              break;
            }
            if (nextItem.type === 'GroupHeader') break;
          }
          break;
        }
      }

      if (foundGroupId) {
        return {
          ...item,
          groupId: foundGroupId,
          isFirstInGroup: false,
          isLastInGroup: false,
        };
      } else {
        if (item.groupId) {
          const { groupId, ...rest } = item;
          return rest as ExerciseItem;
        }
        return item;
      }
    });

    setReorderedItems(updatedData);
    pendingDragRef.current = null;
  };
};

export const createInitiateGroupDrag = (
  reorderedItems: DragItem[],
  setReorderedItems: (items: DragItem[]) => void,
  setCollapsedGroupId: (id: string | null) => void,
  pendingDragRef: React.MutableRefObject<(() => void) | null>
) => {
  return (groupId: string, drag: () => void) => {
    let collapsed = collapseGroup(reorderedItems, groupId);
    collapsed = collapseAllOtherGroups(collapsed, groupId);

    setReorderedItems(collapsed);
    setCollapsedGroupId(groupId);
    pendingDragRef.current = drag;
  };
};

export const keyExtractor = (item: DragItem) => item.id;

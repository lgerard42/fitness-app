import { useState, useCallback } from "react";

export interface DropdownPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extracted modal/overlay state from indexWorkoutTemplate.tsx.
 * Manages visibility of all workout-screen modals and menus.
 */
export function useWorkoutModals() {
  const [showPicker, setShowPicker] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const [optionsModalExId, setOptionsModalExId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);
  const [replacingExerciseId, setReplacingExerciseId] = useState<
    string | null
  >(null);

  const openPicker = useCallback(() => setShowPicker(true), []);
  const closePicker = useCallback(() => setShowPicker(false), []);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);

  const openFinishModal = useCallback(() => setFinishModalOpen(true), []);
  const closeFinishModal = useCallback(() => setFinishModalOpen(false), []);

  const openCancelModal = useCallback(() => setCancelModalOpen(true), []);
  const closeCancelModal = useCallback(() => setCancelModalOpen(false), []);

  const openHistoryModal = useCallback(
    () => setHistoryModalVisible(true),
    []
  );
  const closeHistoryModal = useCallback(
    () => setHistoryModalVisible(false),
    []
  );

  const openOptionsModal = useCallback(
    (exId: string, pos: DropdownPosition) => {
      setOptionsModalExId(exId);
      setDropdownPos(pos);
    },
    []
  );
  const closeOptionsModal = useCallback(() => {
    setOptionsModalExId(null);
    setDropdownPos(null);
  }, []);

  return {
    showPicker,
    openPicker,
    closePicker,
    isCreateModalOpen,
    openCreateModal,
    closeCreateModal,
    finishModalOpen,
    openFinishModal,
    closeFinishModal,
    cancelModalOpen,
    openCancelModal,
    closeCancelModal,
    historyModalVisible,
    openHistoryModal,
    closeHistoryModal,
    optionsModalExId,
    dropdownPos,
    openOptionsModal,
    closeOptionsModal,
    replacingExerciseId,
    setReplacingExerciseId,
  };
}

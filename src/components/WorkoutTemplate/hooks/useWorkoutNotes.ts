import { useState, useMemo } from 'react';
import { updateExercisesDeep, findExerciseDeep } from '@/utils/workoutHelpers';
import type { Workout, Note, ExerciseLibraryItem } from '@/types/workout';

interface UseWorkoutNotesReturn {
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  isNoteModalOpen: boolean;
  setIsNoteModalOpen: (open: boolean) => void;
  newNote: string;
  setNewNote: (note: string) => void;
  newNoteDate: string;
  setNewNoteDate: (date: string) => void;
  sortedNotes: Note[];
  handleAddNote: () => void;
  handleRemoveNote: (noteId: string) => void;
  handlePinNote: (noteId: string) => void;
}

export const useWorkoutNotes = (
  currentWorkout: Workout,
  handleWorkoutUpdate: (workout: Workout) => void
): UseWorkoutNotesReturn => {
  const [showNotes, setShowNotes] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const noteToAdd: Note = { 
      id: `note-${Date.now()}`, 
      text: newNote, 
      date: newNoteDate, 
      pinned: false 
    };
    handleWorkoutUpdate({ 
      ...currentWorkout, 
      sessionNotes: [noteToAdd, ...(currentWorkout.sessionNotes || [])] 
    });
    setNewNote("");
    setNewNoteDate(new Date().toISOString().split('T')[0]);
    setIsNoteModalOpen(false);
    setShowNotes(true);
  };

  const handleRemoveNote = (noteId: string) => {
    handleWorkoutUpdate({ 
      ...currentWorkout, 
      sessionNotes: (currentWorkout.sessionNotes || []).filter(n => n.id !== noteId) 
    });
  };

  const handlePinNote = (noteId: string) => {
    handleWorkoutUpdate({ 
      ...currentWorkout, 
      sessionNotes: (currentWorkout.sessionNotes || []).map(n => 
        n.id === noteId ? { ...n, pinned: !n.pinned } : n
      ) 
    });
  };

  const sortedNotes = useMemo(() => {
    return [...(currentWorkout.sessionNotes || [])].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [currentWorkout.sessionNotes]);

  return {
    showNotes,
    setShowNotes,
    isNoteModalOpen,
    setIsNoteModalOpen,
    newNote,
    setNewNote,
    newNoteDate,
    setNewNoteDate,
    sortedNotes,
    handleAddNote,
    handleRemoveNote,
    handlePinNote,
  };
};

interface UseExerciseNotesReturn {
  exerciseNoteModalOpen: boolean;
  setExerciseNoteModalOpen: (open: boolean) => void;
  currentExerciseNote: string;
  setCurrentExerciseNote: (note: string) => void;
  expandedExerciseNotes: Record<string, boolean>;
  setExpandedExerciseNotes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleOpenExerciseNote: (instanceId: string) => void;
  handleSaveExerciseNote: () => void;
  handlePinExerciseNote: (exId: string, noteId: string, exercisesLibrary: ExerciseLibraryItem[], updateExerciseInLibrary: (exerciseId: string, updates: Partial<ExerciseLibraryItem>) => void) => void;
  handleRemoveExerciseNote: (exId: string, noteId: string) => void;
  handleUpdateExerciseNote: (exId: string, updatedNote: Note) => void;
  toggleExerciseNotes: (exId: string) => void;
}

export const useExerciseNotes = (
  currentWorkout: Workout,
  handleWorkoutUpdate: (workout: Workout) => void
): UseExerciseNotesReturn => {
  const [exerciseNoteModalOpen, setExerciseNoteModalOpen] = useState(false);
  const [currentExerciseNote, setCurrentExerciseNote] = useState("");
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState<Record<string, boolean>>({});
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);

  const handleOpenExerciseNote = (instanceId: string) => {
    setCurrentExerciseNote("");
    setReplacingExerciseId(instanceId);
    setExerciseNoteModalOpen(true);
  };

  const handleSaveExerciseNote = () => {
    if (replacingExerciseId && currentExerciseNote.trim()) {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, replacingExerciseId, (ex) => {
          if (ex.type === 'group') return ex;
          return {
            ...ex,
            notes: [
              { 
                id: `note-${Date.now()}`, 
                text: currentExerciseNote, 
                date: new Date().toISOString().split('T')[0], 
                pinned: false 
              },
              ...(ex.notes || [])
            ]
          };
        })
      });
      // Auto-expand notes for this exercise
      setExpandedExerciseNotes(prev => ({ ...prev, [replacingExerciseId]: true }));
    }
    setExerciseNoteModalOpen(false);
    setReplacingExerciseId(null);
    setCurrentExerciseNote("");
  };

  const handlePinExerciseNote = (
    exId: string, 
    noteId: string,
    exercisesLibrary: ExerciseLibraryItem[],
    updateExerciseInLibrary: (exerciseId: string, updates: Partial<ExerciseLibraryItem>) => void
  ) => {
    const exercise = findExerciseDeep(currentWorkout.exercises, exId);
    if (!exercise) return;

    // Update the workout
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => {
        if (ex.type === 'group') return ex;
        const updatedNotes = (ex.notes || []).map((n: Note) =>
          n.id === noteId ? { ...n, pinned: !n.pinned } : n
        );

        // If pinning, also save to library
        const pinnedNote = updatedNotes.find((n: Note) => n.id === noteId);
        if (pinnedNote && pinnedNote.pinned && ex.exerciseId) {
          // Get current pinned notes from library
          const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.exerciseId);
          const currentPinnedNotes = libraryExercise?.pinnedNotes || [];

          // Add this note to library's pinned notes
          updateExerciseInLibrary(ex.exerciseId, {
            pinnedNotes: [...currentPinnedNotes, pinnedNote]
          });
        } else if (pinnedNote && !pinnedNote.pinned && ex.exerciseId) {
          // If unpinning, remove from library
          const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.exerciseId);
          const currentPinnedNotes = libraryExercise?.pinnedNotes || [];

          updateExerciseInLibrary(ex.exerciseId, {
            pinnedNotes: currentPinnedNotes.filter((n: Note) => n.id !== noteId)
          });
        }

        return {
          ...ex,
          notes: updatedNotes
        };
      })
    });
  };

  const handleRemoveExerciseNote = (exId: string, noteId: string) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => {
        if (ex.type === 'group') return ex;
        return {
          ...ex,
          notes: (ex.notes || []).filter((n: Note) => n.id !== noteId)
        };
      })
    });
  };

  const handleUpdateExerciseNote = (exId: string, updatedNote: Note) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => {
        if (ex.type === 'group') return ex;
        return {
          ...ex,
          notes: (ex.notes || []).map((n: Note) => n.id === updatedNote.id ? updatedNote : n)
        };
      })
    });
  };

  const toggleExerciseNotes = (exId: string) => {
    setExpandedExerciseNotes(prev => ({ ...prev, [exId]: !prev[exId] }));
  };

  return {
    exerciseNoteModalOpen,
    setExerciseNoteModalOpen,
    currentExerciseNote,
    setCurrentExerciseNote,
    expandedExerciseNotes,
    setExpandedExerciseNotes,
    handleOpenExerciseNote,
    handleSaveExerciseNote: () => handleSaveExerciseNote(replacingExerciseId || ''),
    handlePinExerciseNote,
    handleRemoveExerciseNote,
    handleUpdateExerciseNote,
    toggleExerciseNotes,
  };
};

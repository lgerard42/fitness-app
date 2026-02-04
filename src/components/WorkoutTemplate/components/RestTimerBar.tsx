import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, SharedValue } from 'react-native-reanimated';
import { Timer } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, updateExercisesDeep } from '@/utils/workoutHelpers';
import SwipeToDelete from '@/components/common/SwipeToDelete';
import type { Set, Workout, RestTimer, GroupSetType } from '@/types/workout';

interface RestTimerBarProps {
  set: Set;
  exerciseId: string;
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
  activeRestTimer: RestTimer | null;
  setActiveRestTimer: React.Dispatch<React.SetStateAction<RestTimer | null>>;
  setRestPeriodSetInfo: (info: { exerciseId: string; setId: string }) => void;
  setRestTimerInput: (input: string) => void;
  setRestPeriodModalOpen: (open: boolean) => void;
  setRestTimerPopupOpen: (open: boolean) => void;
  isRestTimerDropSetStart: boolean;
  isRestTimerDropSetEnd: boolean;
  displayGroupSetType: GroupSetType;
  isBeingEdited: boolean;
}

interface AnimatedCharacterProps {
  character: string;
  charIndex: number;
  totalChars: number;
  progressShared: SharedValue<number>;
  barWidthShared: SharedValue<number>;
  textLeftShared: SharedValue<number>;
  textWidthShared: SharedValue<number>;
}

// Component to render a single character with color based on progress bar position
const AnimatedCharacter: React.FC<AnimatedCharacterProps> = ({
  character,
  charIndex,
  totalChars,
  progressShared,
  barWidthShared,
  textLeftShared,
  textWidthShared
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const progressValue = progressShared.value;
    const barWidth = barWidthShared.value;
    const textLeft = textLeftShared.value;
    const textWidth = textWidthShared.value;

    // Calculate character's position within the progress bar
    let charPosition = 0.5; // Default to center if measurements not ready
    if (barWidth > 0 && textWidth > 0 && textLeft >= 0) {
      // Calculate character's position within the text
      // Use a small offset (0.15) from left edge to account for visual spacing/padding/borders
      // This makes the color change happen slightly before the bar visually reaches the character
      const charOffsetInText = (charIndex + 2) * (textWidth / totalChars);
      // Calculate character's absolute position within the bar
      const charAbsolutePosition = textLeft + charOffsetInText;
      // Convert to percentage of bar width (0 to 1)
      charPosition = Math.max(0, Math.min(1, charAbsolutePosition / barWidth));
    }

    // Character is white if progress bar hasn't passed its position, blue if it has
    const color = progressValue > charPosition ? COLORS.white : COLORS.blue[600];
    return {
      color,
    };
  });

  return (
    <Reanimated.Text style={[localStyles.restTimerText__activeLarge, animatedStyle]}>
      {character}
    </Reanimated.Text>
  );
};

const RestTimerBarComponent: React.FC<RestTimerBarProps> = ({
  set,
  exerciseId,
  currentWorkout,
  handleWorkoutUpdate,
  activeRestTimer,
  setActiveRestTimer,
  setRestPeriodSetInfo,
  setRestTimerInput,
  setRestPeriodModalOpen,
  setRestTimerPopupOpen,
  isRestTimerDropSetStart,
  isRestTimerDropSetEnd,
  displayGroupSetType,
  isBeingEdited,
}) => {
  const isRestTimerActive = activeRestTimer?.setId === set.id;

  // Animated value for smooth progress transitions (for width)
  const progressAnim = useRef(new Animated.Value(1)).current;
  // Shared value for text color animation (react-native-reanimated)
  const progressShared = useSharedValue(1);
  const previousSetIdRef = useRef<string | null>(null);
  // Refs for smooth requestAnimationFrame-based animation
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const initialRemainingSecondsRef = useRef<number>(0);
  const totalSecondsRef = useRef<number>(0);
  // Refs for pause/resume handling
  const pauseStartTimeRef = useRef<number | null>(null);
  const totalPausedDurationRef = useRef<number>(0);
  const previousIsPausedRef = useRef<boolean | undefined>(undefined);
  // Use a ref for isPaused to avoid stale closure issues in the animation loop
  const isPausedRef = useRef<boolean>(false);

  // Local state for displaying remaining seconds (calculated from animation, not from props)
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState(0);
  // Track the last second we displayed to avoid unnecessary state updates
  const lastDisplayedSecondRef = useRef<number>(-1);

  // Refs to measure bar and text container for accurate character position calculation
  const barContainerRef = useRef<View>(null);
  const textContainerRef = useRef<View>(null);
  // Use shared values so they can be accessed in animated styles
  const barWidthShared = useSharedValue(0);
  const textLeftShared = useSharedValue(0);
  const textWidthShared = useSharedValue(0);

  // Measure text position relative to bar container
  const measureTextPosition = useCallback(() => {
    if (textContainerRef.current && barContainerRef.current) {
      textContainerRef.current.measureLayout(
        barContainerRef.current as any,
        (x, y, width, height) => {
          if (width > 0) {
            textWidthShared.value = width;
            textLeftShared.value = x;
          }
        },
        () => {
          // Error callback - measurement failed
        }
      );
    }
  }, [textWidthShared, textLeftShared]);

  // Animation loop using requestAnimationFrame for smooth 60fps animation
  // Uses refs instead of props to avoid stale closure issues
  const animate = useCallback(() => {
    if (animationStartTimeRef.current === null || totalSecondsRef.current === 0) {
      return;
    }

    // Check if timer is paused using ref (not props) to avoid stale closure
    if (isPausedRef.current) {
      animationFrameRef.current = null;
      return;
    }

    // Calculate elapsed time, accounting for paused duration
    const elapsedMs = Date.now() - animationStartTimeRef.current - totalPausedDurationRef.current;
    const elapsedSeconds = elapsedMs / 1000;
    const currentRemainingSeconds = Math.max(0, initialRemainingSecondsRef.current - elapsedSeconds);
    const expectedProgress = Math.max(0, currentRemainingSeconds / totalSecondsRef.current);

    progressAnim.setValue(expectedProgress);
    progressShared.value = expectedProgress;

    // Update display only when the second changes (to avoid excessive re-renders)
    const displaySecond = Math.ceil(currentRemainingSeconds);
    if (displaySecond !== lastDisplayedSecondRef.current) {
      lastDisplayedSecondRef.current = displaySecond;
      setLocalRemainingSeconds(displaySecond);
    }

    if (expectedProgress > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      animationFrameRef.current = null;
    }
  }, [progressAnim, progressShared]);

  // Start/stop animation based on timer state
  // Only depends on setId and totalSeconds - NOT remainingSeconds to avoid restarts every second
  useEffect(() => {
    if (isRestTimerActive && activeRestTimer && activeRestTimer.totalSeconds > 0) {
      const isNewTimer = previousSetIdRef.current !== activeRestTimer.setId;
      const isPaused = activeRestTimer.isPaused || false;
      const wasPaused = previousIsPausedRef.current;

      // Always update the ref so animation loop can check it
      isPausedRef.current = isPaused;

      if (isNewTimer) {
        // Cancel any existing animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // Initialize for new timer using the initial remaining seconds from props
        const initialRemaining = activeRestTimer.remainingSeconds;
        const totalSecs = activeRestTimer.totalSeconds;
        const initialProgress = Math.max(0, Math.min(1, initialRemaining / totalSecs));

        progressAnim.setValue(initialProgress);
        progressShared.value = initialProgress;
        previousSetIdRef.current = activeRestTimer.setId;

        // Store animation parameters in refs
        animationStartTimeRef.current = Date.now();
        initialRemainingSecondsRef.current = initialRemaining;
        totalSecondsRef.current = totalSecs;
        totalPausedDurationRef.current = 0;
        pauseStartTimeRef.current = null;
        previousIsPausedRef.current = isPaused;

        // Initialize local display
        const displaySecond = Math.ceil(initialRemaining);
        lastDisplayedSecondRef.current = displaySecond;
        setLocalRemainingSeconds(displaySecond);

        // Measure text position after initial layout
        setTimeout(measureTextPosition, 100);

        // Start animation loop only if not paused
        if (!isPaused) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      } else {
        // Handle pause/resume transitions for existing timer
        if (wasPaused !== isPaused) {
          if (isPaused) {
            // Timer just paused - record pause start time and stop animation
            pauseStartTimeRef.current = Date.now();
            if (animationFrameRef.current !== null) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            // Sync display and progress with actual remaining seconds from parent when paused
            if (activeRestTimer.remainingSeconds !== undefined) {
              const displaySecond = Math.ceil(activeRestTimer.remainingSeconds);
              lastDisplayedSecondRef.current = displaySecond;
              setLocalRemainingSeconds(displaySecond);
              // Update progress bar to match current state
              const currentProgress = Math.max(0, Math.min(1, activeRestTimer.remainingSeconds / totalSecondsRef.current));
              progressAnim.setValue(currentProgress);
              progressShared.value = currentProgress;
            }
          } else {
            // Timer just resumed - calculate paused duration and restart animation
            if (pauseStartTimeRef.current !== null) {
              const pausedDuration = Date.now() - pauseStartTimeRef.current;
              totalPausedDurationRef.current += pausedDuration;
              pauseStartTimeRef.current = null;
            }
            // Reset animation start time based on current remaining seconds
            // This ensures smooth continuation from where we paused
            animationStartTimeRef.current = Date.now();
            totalPausedDurationRef.current = 0;
            if (activeRestTimer.remainingSeconds !== undefined) {
              initialRemainingSecondsRef.current = activeRestTimer.remainingSeconds;
              const currentProgress = Math.max(0, Math.min(1, activeRestTimer.remainingSeconds / totalSecondsRef.current));
              progressAnim.setValue(currentProgress);
              progressShared.value = currentProgress;
            }
            // Restart animation loop
            animationFrameRef.current = requestAnimationFrame(animate);
          }
          previousIsPausedRef.current = isPaused;
        } else if (isPaused && activeRestTimer.remainingSeconds !== undefined) {
          // If already paused, keep display and progress in sync with parent's remainingSeconds
          const displaySecond = Math.ceil(activeRestTimer.remainingSeconds);
          if (displaySecond !== lastDisplayedSecondRef.current) {
            lastDisplayedSecondRef.current = displaySecond;
            setLocalRemainingSeconds(displaySecond);
            // Update progress bar to match current state
            const currentProgress = Math.max(0, Math.min(1, activeRestTimer.remainingSeconds / totalSecondsRef.current));
            progressAnim.setValue(currentProgress);
            progressShared.value = currentProgress;
          }
        } else if (!isPaused && animationFrameRef.current === null) {
          // Animation stopped but not paused - restart it
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      }
      // Note: We intentionally do NOT restart on remainingSeconds changes
      // The animation runs independently for smooth animation
    } else {
      // Cancel animation and reset when timer is not active
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      progressAnim.setValue(1);
      progressShared.value = 1;
      previousSetIdRef.current = null;
      animationStartTimeRef.current = null;
      initialRemainingSecondsRef.current = 0;
      totalSecondsRef.current = 0;
      lastDisplayedSecondRef.current = -1;
      setLocalRemainingSeconds(0);
      totalPausedDurationRef.current = 0;
      pauseStartTimeRef.current = null;
      previousIsPausedRef.current = undefined;
      isPausedRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRestTimerActive, activeRestTimer?.setId, activeRestTimer?.totalSeconds, activeRestTimer?.isPaused, progressAnim, progressShared, measureTextPosition, animate]);

  // Component to render each character with individual color based on position
  const renderAnimatedTimerText = () => {
    if (!isRestTimerActive) return null;

    // Use locally calculated remaining seconds instead of props
    const timerText = formatRestTime(localRemainingSeconds);
    const characters = timerText.split('');

    return (
      <View
        ref={textContainerRef}
        collapsable={false}
        onLayout={() => {
          // Measure position relative to bar container after layout
          setTimeout(measureTextPosition, 0);
        }}
        style={localStyles.timerTextContainer}
      >
        {characters.map((char, index) => {
          return (
            <AnimatedCharacter
              key={`${char}-${index}`}
              character={char}
              charIndex={index}
              totalChars={characters.length}
              progressShared={progressShared}
              barWidthShared={barWidthShared}
              textLeftShared={textLeftShared}
              textWidthShared={textWidthShared}
            />
          );
        })}
      </View>
    );
  };

  const handleDeleteRestTimer = useCallback(() => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (exercise) => {
        if (exercise.type === 'group') return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map(s => {
            if (s.id === set.id) {
              const { restPeriodSeconds, restTimerCompleted, ...rest } = s;
              return rest;
            }
            return s;
          })
        };
      })
    });
    if (activeRestTimer?.setId === set.id) {
      setActiveRestTimer(null);
    }
  }, [handleWorkoutUpdate, currentWorkout, exerciseId, set.id, activeRestTimer, setActiveRestTimer]);

  return (
    <SwipeToDelete onDelete={handleDeleteRestTimer}>
      <View style={localStyles.restTimerWrapper}>
        {set.dropSetId && (
          <View style={[
            localStyles.restTimerDropSetIndicator,
            isRestTimerDropSetStart && localStyles.restTimerDropSetIndicator__start,
            isRestTimerDropSetEnd && localStyles.restTimerDropSetIndicator__end,
            displayGroupSetType === 'warmup' && localStyles.restTimerDropSetIndicator__warmup,
            displayGroupSetType === 'failure' && localStyles.restTimerDropSetIndicator__failure
          ]} />
        )}
        <View
          ref={barContainerRef}
          collapsable={false}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            if (width > 0) {
              barWidthShared.value = width;
              // Measure text position when bar is laid out
              setTimeout(measureTextPosition, 50);
            }
          }}
          style={[
            localStyles.restTimerBar,
            set.completed && set.restTimerCompleted && localStyles.restTimerBar__completed,
            isBeingEdited && set.dropSetId && localStyles.restTimerBar__editing__dropSet,
            isBeingEdited && !set.dropSetId && localStyles.restTimerBar__editing,
            !isBeingEdited && isRestTimerActive && set.dropSetId && localStyles.restTimerBar__dropSet__active,
            !isBeingEdited && isRestTimerActive && !set.dropSetId && localStyles.restTimerBar__active,
            !isBeingEdited && !isRestTimerActive && set.dropSetId && localStyles.restTimerBar__dropSet
          ]}
        >
          {isRestTimerActive && (
            <Animated.View style={[
              localStyles.restTimerProgressBackground,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} />
          )}
          {!isRestTimerActive && (
            <View style={[
              localStyles.restTimerLine,
              set.dropSetId && set.restTimerCompleted && localStyles.restTimerLine__completed__dropSet,
              set.dropSetId && !set.restTimerCompleted && localStyles.restTimerLine__dropSet,
              !set.dropSetId && set.restTimerCompleted && localStyles.restTimerLine__completed
            ]} />
          )}
          <TouchableOpacity
            style={[
              localStyles.restTimerBadge,
              !isRestTimerActive && localStyles.restTimerBadge__withLines,
              isRestTimerActive && localStyles.restTimerBadge__active,
              set.restTimerCompleted && !isRestTimerActive && localStyles.restTimerBadge__completed,
              isBeingEdited && localStyles.restTimerBadge__editing
            ]}
            onPress={() => {
              if (isRestTimerActive) {
                setRestTimerPopupOpen(true);
              } else {
                setRestPeriodSetInfo({ exerciseId, setId: set.id });
                setRestTimerInput(String(set.restPeriodSeconds || ''));
                setRestPeriodModalOpen(true);
              }
            }}
          >
            {isRestTimerActive && activeRestTimer ? (
              renderAnimatedTimerText()
            ) : (
              <>
                <Text style={[
                  localStyles.restTimerText,
                  set.restTimerCompleted && localStyles.restTimerText__completed,
                  isBeingEdited && localStyles.restTimerText__editing
                ]}>
                  {formatRestTime(set.restPeriodSeconds || 0)}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {!isRestTimerActive && (
            <View style={[
              localStyles.restTimerLine,
              set.dropSetId && set.restTimerCompleted && localStyles.restTimerLine__completed__dropSet,
              set.dropSetId && !set.restTimerCompleted && localStyles.restTimerLine__dropSet,
              !set.dropSetId && set.restTimerCompleted && localStyles.restTimerLine__completed
            ]} />
          )}
        </View>
      </View>
    </SwipeToDelete>
  );
};

const localStyles = StyleSheet.create({
  restTimerWrapper: {
    flexDirection: 'row',
    overflow: 'visible',
    position: 'relative',
  },
  restTimerBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  restTimerBar__dropSet: {
    marginLeft: 0,
  },
  restTimerBar__active: {
    borderWidth: 2,
    borderColor: COLORS.blue[500],
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 4,
    marginLeft: 8,
    marginRight: 8,
    paddingVertical: 0,
    backgroundColor: COLORS.white,
  },
  restTimerBar__dropSet__active: {
    borderWidth: 2,
    borderColor: COLORS.blue[500],
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 4,
    marginLeft: 8,
    marginRight: 8,
    paddingVertical: 0,
    backgroundColor: COLORS.white,
  },
  restTimerProgressBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.blue[500],
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    zIndex: 0,
  },
  restTimerBar__completed: {
    backgroundColor: COLORS.green[50],
  },
  restTimerLine: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.slate[200],
  },
  restTimerLine__completed: {
    backgroundColor: COLORS.forestgreen[200],
    height: 3,
  },
  restTimerLine__dropSet: {
    marginLeft: 0,
    height: 2,
  },
  restTimerLine__completed__dropSet: {
    backgroundColor: COLORS.forestgreen[200],
    height: 2,
    marginLeft: 0,
  },
  restTimerBar__editing: {
    backgroundColor: COLORS.blue[100],
    borderWidth: 2,
    borderColor: COLORS.blue[400],
    borderRadius: 6,
    borderStyle: 'dashed',
    marginVertical: 2,
    marginHorizontal: 8,
  },
  restTimerBar__editing__dropSet: {
    backgroundColor: COLORS.blue[100],
    borderWidth: 2,
    borderColor: COLORS.blue[400],
    borderRadius: 6,
    marginVertical: 2,
    marginLeft: 8,
    marginRight: 8,
  },
  restTimerDropSetIndicator: {
    position: 'absolute',
    left: 0,
    top: -16, // Extend upward to meet the set row's indicator bottom
    bottom: 0,
    width: 5,
    backgroundColor: COLORS.slate[400],
    zIndex: 10,
  },
  restTimerDropSetIndicator__start: {
    top: -12, // When start, extend to align with set row start (which has top: 4)
  },
  restTimerDropSetIndicator__end: {
    bottom: 8,
  },
  restTimerDropSetIndicator__warmup: {
    backgroundColor: COLORS.orange[500],
  },
  restTimerDropSetIndicator__failure: {
    backgroundColor: COLORS.red[500],
  },
  restTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 58,
    zIndex: 1,
  },
  restTimerBadge__withLines: {
    marginHorizontal: 8,
  },
  restTimerBadge__active: {
    paddingHorizontal: 10,
    paddingVertical: 1,
    minWidth: 70,
  },
  restTimerBadge__completed: {
    // No background for completed state
  },
  restTimerBadge__editing: {
    backgroundColor: 'transparent',
    borderRadius: 6,
  },
  restTimerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[500],
  },
  restTimerText__completed: {
    color: COLORS.green[600],
  },
  timerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTimerText__activeLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.blue[600],
  },
  restTimerText__editing: {
    color: COLORS.blue[700],
    fontSize: 18,
    fontWeight: '700',
  },
});

// Custom comparison function to prevent re-renders when only remainingSeconds changes
// This allows the animation to run smoothly without React re-render chops every second
const RestTimerBar = React.memo(RestTimerBarComponent, (prevProps, nextProps) => {
  // If the active timer's setId, totalSeconds, or isPaused changed, we need to re-render
  if (prevProps.activeRestTimer?.setId !== nextProps.activeRestTimer?.setId) {
    return false; // Props are different, re-render
  }
  if (prevProps.activeRestTimer?.totalSeconds !== nextProps.activeRestTimer?.totalSeconds) {
    return false;
  }
  // Re-render when isPaused changes so animation can pause/resume
  if (prevProps.activeRestTimer?.isPaused !== nextProps.activeRestTimer?.isPaused) {
    return false;
  }
  // Ignore remainingSeconds changes - animation handles this internally
  // Compare all other props
  if (prevProps.set !== nextProps.set) return false;
  if (prevProps.exerciseId !== nextProps.exerciseId) return false;
  if (prevProps.currentWorkout !== nextProps.currentWorkout) return false;
  if (prevProps.handleWorkoutUpdate !== nextProps.handleWorkoutUpdate) return false;
  if (prevProps.setActiveRestTimer !== nextProps.setActiveRestTimer) return false;
  if (prevProps.setRestPeriodSetInfo !== nextProps.setRestPeriodSetInfo) return false;
  if (prevProps.setRestTimerInput !== nextProps.setRestTimerInput) return false;
  if (prevProps.setRestPeriodModalOpen !== nextProps.setRestPeriodModalOpen) return false;
  if (prevProps.setRestTimerPopupOpen !== nextProps.setRestTimerPopupOpen) return false;
  if (prevProps.isRestTimerDropSetStart !== nextProps.isRestTimerDropSetStart) return false;
  if (prevProps.isRestTimerDropSetEnd !== nextProps.isRestTimerDropSetEnd) return false;
  if (prevProps.displayGroupSetType !== nextProps.displayGroupSetType) return false;
  if (prevProps.isBeingEdited !== nextProps.isBeingEdited) return false;

  return true; // Props are equal, don't re-render
});

export default RestTimerBar;

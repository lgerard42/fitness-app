import React, { useState, useCallback, memo, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS, withSpring } from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  trashBackgroundColor?: string;
  trashIconColor?: string;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  /** Optional callback to close trash when another item is swiped (for list synchronization) */
  onCloseTrash?: () => void;
  /** Callback when trash should be shown (for list synchronization) */
  onShowTrash?: () => void;
  /** Whether trash is currently visible (for list synchronization) */
  isTrashVisible?: boolean;
  /** Unique ID for this swipe item (for list synchronization) */
  itemId?: string;
}

// Cache screen width - it doesn't change during component lifecycle
const getScreenWidth = () => Dimensions.get('window').width;

const SwipeToDelete: React.FC<SwipeToDeleteProps> = memo(({
  children,
  onDelete,
  disabled = false,
  trashBackgroundColor = COLORS.red[500],
  trashIconColor = '#ffffff',
  onSwipeStart,
  onSwipeEnd,
  onCloseTrash,
  onShowTrash,
  isTrashVisible: externalTrashVisible,
  itemId,
}) => {
  // Memoize screen width - only computed once per mount
  const screenWidth = useMemo(() => getScreenWidth(), []);
  const translateX = useSharedValue(0);
  const [internalTrashVisible, setInternalTrashVisible] = useState(false);

  // Use external trash visibility if provided, otherwise use internal state
  const trashVisible = externalTrashVisible !== undefined ? externalTrashVisible : internalTrashVisible;

  // Constants
  const cardWidth = screenWidth * 0.9;
  const swipeThreshold = cardWidth * 0.7;
  const velocityThreshold = 500;
  const trashRevealThreshold = 50;
  const trashPosition = -60;

  // Reset translation when trash visibility changes externally
  React.useEffect(() => {
    if (externalTrashVisible !== undefined) {
      if (!externalTrashVisible) {
        translateX.value = withSpring(0, {
          damping: 30,
          stiffness: 150,
        });
      } else {
        translateX.value = withSpring(trashPosition, {
          damping: 30,
          stiffness: 150,
        });
      }
    }
  }, [externalTrashVisible, trashPosition]);

  const handleDelete = useCallback(() => {
    onDelete();
    translateX.value = 0;
    setInternalTrashVisible(false);
  }, [onDelete]);

  const showTrash = useCallback(() => {
    if (onCloseTrash) {
      onCloseTrash();
    }
    if (onShowTrash) {
      onShowTrash();
    } else {
      setInternalTrashVisible(true);
    }
    translateX.value = withSpring(trashPosition, {
      damping: 30,
      stiffness: 150,
    });
  }, [onCloseTrash, onShowTrash, trashPosition]);

  const hideTrash = useCallback(() => {
    setInternalTrashVisible(false);
    translateX.value = withSpring(0, {
      damping: 30,
      stiffness: 150,
    });
  }, []);

  const updateTranslation = useCallback((value: number, currentTrashVisible: boolean) => {
    'worklet';
    // Only allow left swipes (negative) or right swipes when trash is visible
    if (value < 0 || (value >= 0 && currentTrashVisible)) {
      translateX.value = value;
    }
  }, []);

  const handleSwipeEnd = useCallback((translationX: number, velocityX: number) => {
    'worklet';
    const swipeDistance = Math.abs(translationX);
    const swipeVelocity = Math.abs(velocityX);
    // Check if trash is currently visible by checking translateX position
    const isCurrentlyVisible = translateX.value <= trashPosition + 10; // Small threshold for comparison

    // If trash is visible, handle differently - only allow deletion on LEFT swipe
    if (isCurrentlyVisible) {
      // Swiping right (positive translationX) - close trash, never delete
      if (translationX > -trashRevealThreshold) {
        runOnJS(hideTrash)();
      }
      // Swiping left (negative translationX) - check if should delete
      else if (translationX < 0 && (swipeDistance > swipeThreshold || swipeVelocity > velocityThreshold)) {
        // Only delete if swiping LEFT with sufficient distance/velocity
        runOnJS(handleDelete)();
      } else {
        // Small left swipe when trash visible: keep trash visible
        translateX.value = withSpring(trashPosition, {
          damping: 30,
          stiffness: 150,
        });
      }
    }
    // Trash not visible - normal swipe behavior
    else {
      if (swipeDistance > swipeThreshold || swipeVelocity > velocityThreshold) {
        // Clear intention: immediate deletion (only works when swiping left)
        if (translationX < 0) {
          runOnJS(handleDelete)();
        } else {
          // Swiping right shouldn't delete, just reset
          translateX.value = withSpring(0, {
            damping: 30,
            stiffness: 150,
          });
        }
      } else if (swipeDistance > trashRevealThreshold && translationX < 0) {
        // Ambiguous swipe: show trash icon (only on left swipe)
        runOnJS(showTrash)();
      } else {
        // Small swipe: reset
        translateX.value = withSpring(0, {
          damping: 30,
          stiffness: 150,
        });
      }
    }

    if (onSwipeEnd) {
      runOnJS(onSwipeEnd)();
    }
  }, [swipeThreshold, velocityThreshold, trashRevealThreshold, trashPosition, handleDelete, showTrash, hideTrash, onSwipeEnd]);

  const swipeGesture = useMemo(() => Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onStart(() => {
      'worklet';
      if (onSwipeStart) {
        runOnJS(onSwipeStart)();
      }
    })
    .onUpdate((e) => {
      'worklet';
      // Check if trash is currently visible by checking translateX position
      const isCurrentlyVisible = translateX.value <= trashPosition + 10;
      updateTranslation(e.translationX, isCurrentlyVisible);
    })
    .onEnd((e) => {
      'worklet';
      handleSwipeEnd(e.translationX, e.velocityX);
    }), [disabled, onSwipeStart, trashPosition, updateTranslation, handleSwipeEnd]);

  // Animated styles for the content
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Animated styles for the red indicator bar
  const animatedBarStyle = useAnimatedStyle(() => {
    const clampedTranslation = Math.max(-cardWidth, Math.min(0, translateX.value));
    const width = Math.abs(clampedTranslation);
    const opacity = clampedTranslation < 0 ? 1 : 0;

    return {
      width,
      opacity,
    };
  });

  const handleContentPress = useCallback(() => {
    if (trashVisible) {
      hideTrash();
    }
  }, [trashVisible, hideTrash]);

  return (
    <View style={styles.container}>
      {/* Red deletion indicator bar with trash icon */}
      <Animated.View
        style={[
          styles.swipeIndicatorBar,
          { backgroundColor: trashBackgroundColor },
          animatedBarStyle,
        ]}
      >
        <Animated.View style={styles.swipeIndicatorBarContent}>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.swipeDeleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={20} color={trashIconColor} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={animatedContentStyle}>
          <TouchableOpacity
            onPress={handleContentPress}
            activeOpacity={1}
            disabled={!trashVisible}
          >
            {children}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeIndicatorBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  swipeIndicatorBarContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteButton: {
    padding: 12,
    borderRadius: 6,
  },
});

// Display name for debugging
SwipeToDelete.displayName = 'SwipeToDelete';

export default SwipeToDelete;

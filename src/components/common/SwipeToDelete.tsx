import React, { useRef, useState, useCallback } from 'react';
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

const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({
  children,
  onDelete,
  disabled = false,
  trashBackgroundColor = COLORS.red[100],
  trashIconColor = COLORS.red[600],
  onSwipeStart,
  onSwipeEnd,
  onCloseTrash,
  onShowTrash,
  isTrashVisible: externalTrashVisible,
  itemId,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);
  const [internalTrashVisible, setInternalTrashVisible] = useState(false);
  
  // Use external trash visibility if provided, otherwise use internal state
  const trashVisible = externalTrashVisible !== undefined ? externalTrashVisible : internalTrashVisible;
  
  // Reset translation when trash visibility changes externally
  React.useEffect(() => {
    if (externalTrashVisible !== undefined) {
      if (!externalTrashVisible) {
        translateX.value = withSpring(0, {
          damping: 8,
          stiffness: 100,
        });
      } else {
        translateX.value = withSpring(trashPosition, {
          damping: 8,
          stiffness: 100,
        });
      }
    }
  }, [externalTrashVisible, trashPosition]);
  
  const cardWidth = screenWidth * 0.9;
  const swipeThreshold = cardWidth * 0.7;
  const velocityThreshold = 500;
  const trashRevealThreshold = 50;
  const trashPosition = -60;

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
      damping: 8,
      stiffness: 100,
    });
  }, [onCloseTrash, onShowTrash, trashPosition]);

  const hideTrash = useCallback(() => {
    setInternalTrashVisible(false);
    translateX.value = withSpring(0, {
      damping: 8,
      stiffness: 100,
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

    if (swipeDistance > swipeThreshold || swipeVelocity > velocityThreshold) {
      // Clear intention: immediate deletion
      runOnJS(handleDelete)();
    } else if (swipeDistance > trashRevealThreshold) {
      // Ambiguous swipe: show trash icon
      runOnJS(showTrash)();
    } else if (isCurrentlyVisible) {
      // If trash is visible, check if we should close it
      if (translationX > -trashRevealThreshold) {
        // Swiping right to close
        runOnJS(hideTrash)();
      } else {
        // Small left swipe when trash visible: keep trash visible
        translateX.value = withSpring(trashPosition, {
          damping: 8,
          stiffness: 100,
        });
      }
    } else {
      // Small swipe: reset
      translateX.value = withSpring(0, {
        damping: 8,
        stiffness: 100,
      });
    }
    
    if (onSwipeEnd) {
      runOnJS(onSwipeEnd)();
    }
  }, [swipeThreshold, velocityThreshold, trashRevealThreshold, trashPosition, handleDelete, showTrash, hideTrash, onSwipeEnd]);

  const swipeGesture = Gesture.Pan()
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
    });

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
      {/* Red deletion indicator bar */}
      <Animated.View
        style={[
          styles.swipeIndicatorBar,
          animatedBarStyle,
        ]}
      />

      {/* Trash icon background */}
      {trashVisible && (
        <View style={[styles.swipeDeleteBackground, { backgroundColor: trashBackgroundColor }]}>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.swipeDeleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={20} color={trashIconColor} />
          </TouchableOpacity>
        </View>
      )}

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
};

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
    backgroundColor: COLORS.red[500],
    zIndex: 0,
  },
  swipeDeleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  swipeDeleteButton: {
    padding: 12,
    borderRadius: 6,
  },
});

export default SwipeToDelete;

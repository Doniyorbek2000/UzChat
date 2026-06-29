import React, { useRef, useCallback } from "react";
import { Animated, PanResponder, StyleSheet, View, Text, Dimensions } from "react-native";
import { colors } from "../theme/colors";

const SWIPE_THRESHOLD = 60;

interface Props {
  children: React.ReactNode;
  onSwipeReply: () => void;
  enabled?: boolean;
}

export function SwipeableMessageRow({ children, onSwipeReply, enabled = true }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const triggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        enabled && Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 1.5),
      onPanResponderMove: (_, gestureState) => {
        if (!enabled) return;
        const dx = Math.min(0, gestureState.dx);
        translateX.setValue(dx);
        if (dx < -SWIPE_THRESHOLD && !triggered.current) {
          triggered.current = true;
        }
      },
      onPanResponderRelease: () => {
        if (triggered.current) {
          onSwipeReply();
          triggered.current = false;
        }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
      },
      onPanResponderTerminate: () => {
        triggered.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
      },
    })
  ).current;

  if (!enabled) return <>{children}</>;

  const iconOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.replyHint, { opacity: iconOpacity }]}>
        <Text style={styles.replyIcon}>↩</Text>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  replyHint: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 36,
  },
  replyIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "bold",
  },
});

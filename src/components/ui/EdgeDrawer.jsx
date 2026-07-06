import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const HANDLE_TOUCH_WIDTH = 48;
const HANDLE_HEIGHT = 150;

const EdgeDrawer = ({
  side,
  width,
  open,
  onOpen,
  onClose,
  onMotionStart,
  onMotionEnd,
  enabled = true,
  containerStyle,
  drawerStyle,
  panelStyle,
  handleTouchStyle,
  renderHandle,
  renderDecorations,
  children,
}) => {
  const isLeft = side === "left";
  const closedValue = isLeft ? -width : width;
  const translateX = useRef(new Animated.Value(open ? 0 : closedValue)).current;
  const isMotionActive = useRef(false);
  const didMount = useRef(false);

  const notifyMotionStart = useCallback(() => {
    if (isMotionActive.current) return;
    isMotionActive.current = true;
    onMotionStart?.();
  }, [onMotionStart]);

  const notifyMotionEnd = useCallback(() => {
    if (!isMotionActive.current) return;
    isMotionActive.current = false;
    onMotionEnd?.();
  }, [onMotionEnd]);

  const progress = useMemo(
    () =>
      translateX.interpolate({
        inputRange: isLeft ? [-width, 0] : [0, width],
        outputRange: isLeft ? [0, 1] : [1, 0],
        extrapolate: "clamp",
      }),
    [isLeft, translateX, width],
  );

  const drift = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [isLeft ? -18 : 18, 0],
        extrapolate: "clamp",
      }),
    [isLeft, progress],
  );

  const animateTo = useCallback(
    (toValue, afterFinish) => {
      notifyMotionStart();
      translateX.stopAnimation();
      Animated.timing(translateX, {
        toValue,
        duration: toValue === 0 ? 260 : 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          afterFinish?.();
        }
        notifyMotionEnd();
      });
    },
    [notifyMotionEnd, notifyMotionStart, translateX],
  );

  const requestToggle = useCallback(() => {
    if (!enabled) return;
    if (open) {
      onClose?.();
      return;
    }
    onOpen?.();
  }, [enabled, onClose, onOpen, open]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    animateTo(open ? 0 : closedValue);
  }, [animateTo, closedValue, open]);

  const animatedValues = useMemo(
    () => ({
      translateX,
      progress,
      opacity: progress,
      drift,
    }),
    [drift, progress, translateX],
  );

  const content =
    typeof children === "function" ? children(animatedValues) : children;

  const rootStyle = useMemo(
    () => [
      {
        position: "absolute",
        top: 0,
        bottom: 0,
        zIndex: 999,
        elevation: 999,
      },
      open
        ? {
            left: isLeft ? 0 : undefined,
            right: isLeft ? undefined : 0,
            width: width + HANDLE_TOUCH_WIDTH,
          }
        : isLeft
          ? { left: 0, right: undefined, width: HANDLE_TOUCH_WIDTH }
          : { left: undefined, right: 0, width: HANDLE_TOUCH_WIDTH },
    ],
    [isLeft, open, width],
  );

  return (
    <View
      style={[containerStyle, rootStyle]}
      pointerEvents={enabled ? "box-none" : "none"}
    >
      <Animated.View
        style={[
          styles.drawer,
          isLeft ? styles.leftDrawer : styles.rightDrawer,
          drawerStyle,
          {
            width: width + HANDLE_TOUCH_WIDTH,
            flexDirection: isLeft ? "row" : "row-reverse",
            transform: [{ translateX }],
          },
        ]}
        pointerEvents={enabled || open ? "box-none" : "none"}
      >
        <View style={[styles.panel, panelStyle, { width }]}>
          {renderDecorations ? renderDecorations(animatedValues) : null}
          {content}
        </View>

        <Pressable
          style={[handleTouchStyle, styles.handleTouch]}
          onPress={requestToggle}
        >
          {renderHandle ? renderHandle({ open, progress }) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 1002,
    elevation: 1002,
  },
  leftDrawer: {
    left: 0,
  },
  rightDrawer: {
    right: 0,
  },
  panel: {
    height: "100%",
  },
  handleTouch: {
    width: HANDLE_TOUCH_WIDTH,
    height: HANDLE_HEIGHT,
    marginTop: -HANDLE_HEIGHT / 2,
    top: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default memo(EdgeDrawer);

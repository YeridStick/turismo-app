import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

export const BREAKPOINTS = {
  small: 360,
  medium: 400,
  large: 480,
};

export const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const isSmallDevice = () => SCREEN_WIDTH < BREAKPOINTS.medium;

export const getResponsiveSize = (size, smallSize) =>
  SCREEN_WIDTH < BREAKPOINTS.medium ? smallSize ?? size : size;

export const responsiveFont = (size) =>
  PixelRatio.roundToNearestPixel(moderateScale(size, 0.3));


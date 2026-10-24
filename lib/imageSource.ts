import type { ImageProps } from 'expo-image';

/**
 * A photo as the app hands it around: a bundled `require()`, a URI or a
 * signed URL. It is expo-image's own source type rather than React Native's
 * `ImageSourcePropType`, because every photo is drawn by expo-image, and since
 * RN 0.88 React Native's type also allows a readonly array that expo-image's
 * `source` refuses.
 */
export type ImageSourcePropType = Exclude<ImageProps['source'], null | undefined>;

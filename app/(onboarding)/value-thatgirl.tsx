import { StyleSheet, View, type DimensionValue } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { ValueProp } from '@/components/ValueProp';
import { radii } from '@/constants/theme';

/**
 * The scrapbook collage: cut-out images scattered at angles across the canvas.
 * Positions are hand-placed to echo the reference's loose arrangement.
 */
const PIECES: {
  seed: string;
  top: DimensionValue;
  left: DimensionValue;
  width: DimensionValue;
  height: DimensionValue;
  rotate: string;
  radius?: number;
}[] = [
  { seed: 'collage-body', top: '0%', left: '-4%', width: '38%', height: '22%', rotate: '-4deg' },
  { seed: 'collage-bangles', top: '-1%', left: '40%', width: '30%', height: '14%', rotate: '5deg' },
  { seed: 'collage-cup', top: '1%', left: '73%', width: '28%', height: '18%', rotate: '-7deg' },
  { seed: 'collage-flower', top: '11%', left: '36%', width: '32%', height: '17%', rotate: '3deg', radius: 999 },
  { seed: 'collage-brunch', top: '22%', left: '-6%', width: '32%', height: '17%', rotate: '6deg', radius: 999 },
  { seed: 'collage-roller', top: '28%', left: '32%', width: '22%', height: '12%', rotate: '-3deg', radius: 999 },
  { seed: 'collage-tracker', top: '24%', left: '60%', width: '40%', height: '20%', rotate: '4deg' },
  { seed: 'collage-camera', top: '40%', left: '-2%', width: '34%', height: '15%', rotate: '-6deg' },
  { seed: 'collage-peach', top: '48%', left: '82%', width: '20%', height: '11%', rotate: '8deg', radius: 999 },
  { seed: 'collage-lounge', top: '55%', left: '2%', width: '86%', height: '25%', rotate: '-2deg' },
  { seed: 'collage-book', top: '80%', left: '-6%', width: '30%', height: '20%', rotate: '4deg' },
  { seed: 'collage-matcha', top: '82%', left: '74%', width: '32%', height: '18%', rotate: '-5deg' },
];

export default function ValueThatGirlScreen() {
  return (
    <ValueProp
      headline={'Become\n*“that girl”*'}
      cta="I'm ready"
      href="/(onboarding)/name"
    >
      <View style={styles.canvas}>
        {PIECES.map((piece) => (
          <Placeholder
            key={piece.seed}
            seed={piece.seed}
            radius={piece.radius ?? radii.md}
            style={{
              position: 'absolute',
              top: piece.top,
              left: piece.left,
              width: piece.width,
              height: piece.height,
              transform: [{ rotate: piece.rotate }],
            }}
          />
        ))}
      </View>
    </ValueProp>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});

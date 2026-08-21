import Svg, {
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { auras, type AuraKey } from '@/constants/theme';

export interface AuraProps {
  variant: AuraKey;
  /** Slight off-centre placement stops the four tiles looking identical. */
  centerX?: number;
  centerY?: number;
}

/**
 * The soft radial orb behind each ideal-day option. Drawn with SVG because a
 * linear gradient cannot produce the centre-out falloff the reference uses.
 */
export function Aura({ variant, centerX = 0.5, centerY = 0.46 }: AuraProps) {
  const stops = auras[variant];
  const id = `aura-${variant}`;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient
          id={id}
          cx={`${centerX * 100}%`}
          cy={`${centerY * 100}%`}
          r="72%"
        >
          {stops.map((stop) => (
            <Stop
              key={stop.offset}
              offset={`${stop.offset * 100}%`}
              stopColor={stop.color}
              stopOpacity={1}
            />
          ))}
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
    </Svg>
  );
}

export default Aura;

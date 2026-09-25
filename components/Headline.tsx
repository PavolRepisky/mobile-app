import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';

import { colors, fonts, type as typeScale } from '@/constants/theme';

type Size = 'hero' | 'headline' | 'headlineSm' | 'title';
type Weight = 500 | 700 | 900;

/**
 * Almost every headline in the reference sets one or two words apart. Two
 * markers are supported because some headlines use both at once:
 *
 *   `*word*`   → the accent weight             ("Choose your *challenge*")
 *   `**word**` → the heaviest cut              ("Why do you want to **complete** …")
 *
 * "Finding **your** *perfect* challenge" needs the pair, which is why this is
 * a tokenizer rather than a simple split.
 *
 * Headlines are set in Quicksand like the rest of the app. It has no italic
 * and nothing past Bold, so an accent only stands out against a lighter base
 * weight — at the default weight the markers read as plain text.
 */
export interface HeadlineProps {
  children: string;
  size?: Size;
  /** Base weight. Accented `**runs**` always step up to the heaviest cut. */
  weight?: Weight;
  /**
   * Weight of the `*accent*` runs. Defaults to the base weight; set it heavier
   * to let the rest of the line lighten while the accent holds its own.
   */
  accentWeight?: Weight;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /**
   * Legacy single-accent switch: `accent="bold"` makes plain `*word*` markers
   * render in the heaviest cut instead of the accent weight.
   */
  accent?: 'italic' | 'bold';
}

/** Quicksand's ramp stops at Bold, so the two heavier weights share it. */
const FACE: Record<Weight, string> = {
  500: fonts.bodyMedium,
  700: fonts.bodyBold,
  900: fonts.bodyBold,
};

type Run = { text: string; style: 'plain' | 'italic' | 'bold' };

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

function tokenize(source: string, starIsBold: boolean): Run[] {
  const runs: Run[] = [];
  let cursor = 0;

  for (const match of source.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      runs.push({ text: source.slice(cursor, start), style: 'plain' });
    }

    const token = match[0];
    if (token.startsWith('**')) {
      runs.push({ text: token.slice(2, -2), style: 'bold' });
    } else {
      runs.push({
        text: token.slice(1, -1),
        style: starIsBold ? 'bold' : 'italic',
      });
    }
    cursor = start + token.length;
  }

  if (cursor < source.length) {
    runs.push({ text: source.slice(cursor), style: 'plain' });
  }

  return runs.filter((run) => run.text.length > 0);
}

export function Headline({
  children,
  size = 'headline',
  weight = 900,
  accentWeight,
  color = colors.ink,
  align = 'center',
  style,
  numberOfLines,
  accent = 'italic',
}: HeadlineProps) {
  const scale = typeScale[size];
  const baseWeight: Weight = size === 'title' && weight === 900 ? 700 : weight;
  const italicWeight = accentWeight ?? baseWeight;
  const runs = tokenize(children, accent === 'bold');

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        scale,
        { fontFamily: FACE[baseWeight], color, textAlign: align },
        style,
      ]}
    >
      {runs.map((run, i) => {
        if (run.style === 'plain') return run.text;
        const family =
          run.style === 'italic' ? FACE[italicWeight] : fonts.bodyBold;
        return (
          <RNText key={i} style={{ fontFamily: family }}>
            {run.text}
          </RNText>
        );
      })}
    </RNText>
  );
}

export default Headline;

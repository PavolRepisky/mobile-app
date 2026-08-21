import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';

import { colors, fonts, type as typeScale } from '@/constants/theme';

type Size = 'hero' | 'headline' | 'headlineSm' | 'title';
type Weight = 700 | 900;

/**
 * Almost every headline in the reference sets one or two words apart. Two
 * markers are supported because some headlines use both at once:
 *
 *   `*word*`   → italic of the current weight  ("Choose your *challenge*")
 *   `**word**` → upright black                 ("Why do you want to **complete** …")
 *
 * "Finding **your** *perfect* challenge" needs the pair, which is why this is
 * a tokenizer rather than a simple split.
 */
export interface HeadlineProps {
  children: string;
  size?: Size;
  /** Base weight. Accented `**runs**` always step up to 900. */
  weight?: Weight;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /**
   * Legacy single-accent switch: `accent="bold"` makes plain `*word*` markers
   * render upright-black instead of italic.
   */
  accent?: 'italic' | 'bold';
}

const BASE: Record<Weight, string> = {
  700: fonts.displayBold,
  900: fonts.displayBlack,
};

const ITALIC: Record<Weight, string> = {
  700: fonts.displayBoldItalic,
  900: fonts.displayBlackItalic,
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
  color = colors.ink,
  align = 'center',
  style,
  numberOfLines,
  accent = 'italic',
}: HeadlineProps) {
  const scale = typeScale[size];
  const baseWeight: Weight = size === 'title' && weight === 900 ? 700 : weight;
  const runs = tokenize(children, accent === 'bold');

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        scale,
        { fontFamily: BASE[baseWeight], color, textAlign: align },
        style,
      ]}
    >
      {runs.map((run, i) => {
        if (run.style === 'plain') return run.text;
        const family =
          run.style === 'italic' ? ITALIC[baseWeight] : fonts.displayBlack;
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

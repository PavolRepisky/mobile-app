import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, type AuraKey } from '@/constants/theme';
import { ChoiceCard } from './Choice';

export interface QuizOption {
  key: string;
  label: string;
  seed?: string;
  aura?: AuraKey;
}

export interface QuizGridProps {
  options: readonly QuizOption[];
  value: string | null;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The 2x2 image-and-radio grid shared by the motivation, ideal-day and
 * biggest-challenge questions.
 */
export function QuizGrid({ options, value, onChange, style }: QuizGridProps) {
  return (
    <View style={[styles.grid, style]}>
      {options.map((option) => (
        <View key={option.key} style={styles.cell}>
          <ChoiceCard
            label={option.label}
            seed={option.seed}
            aura={option.aura}
            selected={value === option.key}
            onPress={() => onChange(option.key)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing['2xl'],
  },
  cell: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
  },
});

export default QuizGrid;

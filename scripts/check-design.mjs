/**
 * Design-system guard. Fails on the three ways the visual language actually
 * erodes: a colour that bypasses the tokens, type set by hand, and text that
 * falls back to the platform font.
 *
 * Rules live in CLAUDE.md. Run with `npm run check:design`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ROOTS = ['app', 'components'];

/**
 * Files allowed to break a rule, with the reason. `Placeholder` *is* the
 * gradient stand-in palette, so its hex list is the point of the file; `Text`
 * and `Headline` are the wrappers everything else goes through.
 */
const ALLOW = {
  'components/Placeholder.tsx': ['colour'],
  'components/Text.tsx': ['rn-text'],
  'components/Headline.tsx': ['rn-text', 'font-family'],
  // A reaction emoji is deliberately not run through the type system: giving it
  // a font family only fights the platform's own emoji face.
  'app/feed/[id].tsx': ['rn-text'],
};

const RULES = [
  {
    id: 'colour',
    test: /#[0-9A-Fa-f]{3,8}\b|\brgba?\s*\(/,
    message: 'literal colour — add a semantic token to constants/theme.ts',
  },
  {
    // A token reference (`fonts.body`) passes; only a quoted face is drift.
    id: 'font-family',
    test: /\bfontFamily\s*:\s*['"`]/,
    message: 'literal font family — use a face from `fonts` in theme.ts',
  },
  {
    id: 'rn-text',
    test: /^\s*import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*'react-native'/,
    message: "`Text` imported from react-native — use @/components/Text",
  },
];

/**
 * Type set by hand rather than taken from the scale. Widespread already, so it
 * is reported rather than enforced — a count that should trend down, not a
 * gate that would fail on day one.
 */
const DRIFT = /\b(fontSize|lineHeight)\s*:\s*[0-9]/;

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory()
      ? walk(full)
      : full.endsWith('.tsx') || full.endsWith('.ts')
        ? [full]
        : [];
  });

const violations = [];
const drift = [];

for (const root of ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const rel = relative(ROOT, file).split(sep).join('/');
    const allowed = ALLOW[rel] ?? [];
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);

    lines.forEach((line, i) => {
      // Comments describe the tokens constantly; they are not violations.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

      for (const rule of RULES) {
        if (allowed.includes(rule.id)) continue;
        if (rule.test.test(line)) {
          violations.push(`${rel}:${i + 1}  ${rule.message}\n    ${line.trim()}`);
        }
      }

      if (DRIFT.test(line)) drift.push(`${rel}:${i + 1}  ${line.trim()}`);
    });
  }
}

if (violations.length) {
  console.error(`\nDesign check FAILED — ${violations.length} violation(s):\n`);
  console.error(violations.join('\n\n'));
  console.error('\nSee CLAUDE.md for the rules.\n');
  process.exit(1);
}

console.log('Design check passed.');

if (drift.length) {
  console.log(
    `\n${drift.length} hand-set type value(s) — not a failure, but each one is a` +
      ' cut that should probably live in the `type` scale:',
  );
  console.log(drift.map((d) => `  ${d}`).join('\n'));
}

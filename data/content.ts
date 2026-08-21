import type { Review } from '@/components/ReviewCard';

// ---------------------------------------------------------------------------
// Onboarding question copy
// ---------------------------------------------------------------------------

export const REFERRAL_SOURCES = [
  'TikTok',
  'Pinterest',
  'Content Creator',
  'Instagram',
  'Friend',
  'Family',
  'Other',
] as const;

export const MOTIVATIONS = [
  { key: 'best-self', label: 'Become\nmy best self', seed: 'mot-a' },
  { key: 'reset', label: 'Reset\nmy life', seed: 'mot-b' },
  { key: 'confident', label: 'Feel confident', seed: 'mot-c' },
  { key: 'discipline', label: 'Build\ndiscipline', seed: 'mot-d' },
] as const;

export const IDEAL_DAYS = [
  { key: 'early', label: 'Early mornings,\nstructured', aura: 'auraSunrise' },
  { key: 'flexible', label: 'Flexible,\nbut consistent', aura: 'auraDusk' },
  { key: 'balanced', label: 'Balanced\nwork hard, rest too', aura: 'auraEmber' },
  { key: 'gentle', label: 'Gentle reset,\nstart fresh', aura: 'auraMint' },
] as const;

export const BIGGEST_CHALLENGES = [
  { key: 'workouts', label: 'Staying\nconsistent\nwith workouts', seed: 'chal-a' },
  { key: 'eating', label: 'Eating better,\nless junk', seed: 'chal-b' },
  { key: 'sleep', label: 'Sleep &\nenergy levels', seed: 'chal-c' },
  { key: 'focus', label: 'Mental clarity\n& focus', seed: 'chal-d' },
] as const;

export const PAYWALL_BENEFITS = [
  'Join the community',
  'Stay accountable with real people',
  'Build habits that actually stick',
] as const;

// ---------------------------------------------------------------------------
// Reviews shown under every challenge detail
// ---------------------------------------------------------------------------

export const REVIEWS: readonly Review[] = [
  {
    id: 'r1',
    title: 'me and my roommate survived lol',
    handle: 'zoe_runner',
    body: 'we started the same day and basically lived on voice notes. day 4 i wanted to quit; she sent a meme and we went for the walk anyway.',
  },
  {
    id: 'r2',
    title: 'low pressure, high payoff',
    handle: 'ninaknight',
    body: 'my friend roped me in after i whined about feeling stuck. we voice memo each other on walks like we’re 16 again.',
  },
  {
    id: 'r3',
    title: 'first week i kept forgetting',
    handle: 'elliehayes',
    body: 'was hard at first bc my days blur together. once i stacked two tiny wins i started wanting a third.',
  },
  {
    id: 'r4',
    title: 'glow without the guilt trip',
    handle: 'camilleinthesix',
    body: 'i actually see it in photos, less puffy, more rested. didn’t think soft could feel this real.',
  },
  {
    id: 'r5',
    title: 'doing it parallel with my cousin',
    handle: 'jadejournal',
    body: 'different time zones, same checklist. when one of us slips we don’t spiral, we just reset next block.',
  },
];

// ---------------------------------------------------------------------------
// Friends & the discover feed
// ---------------------------------------------------------------------------

export interface Friend {
  id: string;
  name: string;
  avatarSeed: string;
  day: number;
  bio: string | null;
  tasks: readonly { label: string; done: boolean; time?: string }[];
}

export const FRIENDS: readonly Friend[] = [
  {
    id: 'lily',
    name: 'Lily',
    avatarSeed: 'friend-lily',
    day: 3,
    bio: null,
    tasks: [
      { label: 'Follow a strict diet (no cheat meals, no alcohol)', done: true, time: '2:14 PM' },
      { label: 'Drink water', done: true, time: '4:30 PM' },
      { label: 'Do two 45-minute workouts, one must be outside', done: false },
      { label: 'Read 10 pages of a non-fiction book', done: false },
    ],
  },
  {
    id: 'maddy',
    name: 'Maddy',
    avatarSeed: 'friend-maddy',
    day: 12,
    bio: 'slow mornings, long walks',
    tasks: [
      { label: 'Walk 10,000 steps', done: true, time: '8:02 AM' },
      { label: 'Read 10 pages', done: false },
      { label: 'Workout', done: false },
      { label: 'Follow a strict diet', done: false },
    ],
  },
  {
    id: 'anna',
    name: 'Anna',
    avatarSeed: 'friend-anna',
    day: 7,
    bio: 'here for the accountability',
    tasks: [
      { label: 'Walk 10,000 steps', done: false },
      { label: 'Read 10 pages', done: false },
      { label: 'Workout', done: true, time: '6:45 AM' },
      { label: 'Follow a strict diet', done: false },
    ],
  },
];

export interface DiscoverSection {
  id: string;
  title: string;
  seeds: readonly string[];
  meta: string;
  metaTime?: string;
  members: number;
}

export const DISCOVER: readonly DiscoverSection[] = [
  {
    id: 'her75',
    title: 'Her 75 Challenge',
    seeds: ['her75-a', 'her75-b', 'her75-c', 'her75-d'],
    meta: '8 new posts',
    members: 226754,
  },
  {
    id: 'hard',
    title: '75 Day Hard',
    seeds: ['hard-a', 'hard-b', 'hard-c', 'hard-d'],
    meta: 'Sarah posted',
    metaTime: '23h ago',
    members: 118402,
  },
  {
    id: 'medium',
    title: '75 Medium',
    seeds: ['med-a', 'med-b', 'med-c', 'med-d'],
    meta: '3 new posts',
    members: 64810,
  },
  {
    id: 'soft',
    title: '75 Soft',
    seeds: ['soft-a', 'soft-b', 'soft-c', 'soft-d'],
    meta: '12 new posts',
    members: 91233,
  },
];

export interface FeedPost {
  id: string;
  authorSeed: string;
  photoSeed: string;
  views: number;
  time: string;
  reaction?: string;
}

export const FEED_POSTS: readonly FeedPost[] = [
  { id: 'p1', authorSeed: 'author-1', photoSeed: 'post-1', views: 8, time: '6:53 AM' },
  { id: 'p2', authorSeed: 'author-1', photoSeed: 'post-2', views: 10, time: '6:54 AM' },
  { id: 'p3', authorSeed: 'author-1', photoSeed: 'post-3', views: 10, time: '6:55 AM', reaction: '🔥' },
  { id: 'p4', authorSeed: 'author-2', photoSeed: 'post-4', views: 3, time: '2:06 PM' },
  { id: 'p5', authorSeed: 'author-3', photoSeed: 'post-5', views: 21, time: '4:18 PM' },
];

export const REACTIONS = ['❤️', '🔥', '👏', '😍', '😂'] as const;

// ---------------------------------------------------------------------------
// Profile wall
// ---------------------------------------------------------------------------

export const WALL_SECTIONS = [
  'My Wishlist',
  'My What I Eat in a Day',
  'My Workouts',
  'My Books',
  'My Supplements',
  'My Skincare',
  'My Podcasts',
  'My Playlists',
] as const;

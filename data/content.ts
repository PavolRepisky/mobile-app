import type { ImageSourcePropType } from 'react-native';

import type { AvatarSource } from '@/components/Avatar';
import type { PhotoSource } from '@/components/PhotoStrip';
import type { Review } from '@/components/ReviewCard';

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
  /** Shown under their name on their profile, the way `profile.handle` is
   * shown under yours. */
  handle: string;
  /** Bundled profile photo, or a seed for the drawn stand-in. */
  avatar: AvatarSource;
  day: number;
  bio: string | null;
  /**
   * How long ago today's post went up — same static-string convention as
   * `DiscoverSection.metaTime`, since there is no backend clock to read one
   * from. Only ever shown on the Friends tab, so the feed authors — who never
   * appear there — leave it unset.
   */
  postedAgo?: string;
  /** The three stats their own profile shows under its bio — the same set
   * your own Profile screen reads off `useApp()` for the signed-in account. */
  friendCount: number;
  trophies: number;
  livesLeft: number;
  tasks: readonly {
    label: string;
    done: boolean;
    time?: string;
    /** Bundled proof photo for a done task. */
    photo?: ImageSourcePropType;
    /** Stand-in seed, used whenever a done task has no bundled photo yet. */
    photoSeed?: string;
  }[];
}

export const FRIENDS: readonly Friend[] = [
  {
    id: 'lily',
    name: 'Lily',
    handle: '@lily.days',
    avatar: require('../assets/friends/lily.jpg'),
    day: 3,
    bio: null,
    postedAgo: '15h ago',
    friendCount: 18,
    trophies: 2,
    livesLeft: 3,
    tasks: [
      {
        label: 'Follow a strict diet (no cheat meals, no alcohol)',
        done: true,
        time: '2:14 PM',
        // Already bundled for the home screen's own "eat clean" stand-in.
        photo: require('../assets/tasks/patio-sandwiches-iced-coffee.jpg'),
      },
      {
        label: 'Drink water',
        done: true,
        time: '4:30 PM',
        // Already bundled for the water task elsewhere in the app's history.
        photo: require('../assets/challenges/medium/infused-water.jpg'),
      },
      { label: 'Do two 45-minute workouts, one must be outside', done: false },
      { label: 'Read 10 pages of a non-fiction book', done: false },
    ],
  },
  {
    id: 'zoe',
    name: 'Zoe',
    handle: '@zoegoesfor',
    // Not used as an avatar anywhere else in the app.
    avatar: require('../assets/ambassadors/amb-2.jpg'),
    day: 12,
    bio: null,
    postedAgo: '3h ago',
    friendCount: 24,
    trophies: 4,
    livesLeft: 2,
    tasks: [
      {
        label: 'Follow a strict diet (no cheat meals, no alcohol)',
        done: true,
        time: '7:45 AM',
        // Already bundled for the wall's own "what I eat" set.
        photo: require('../assets/wall/eat/sesame-chicken-rice-bowl.jpg'),
      },
      { label: 'Drink water', done: false },
      {
        label: 'Do two 45-minute workouts, one must be outside',
        done: true,
        time: '6:10 PM',
        // Already bundled for the medium challenge's own strip.
        photo: require('../assets/challenges/medium/outdoor-run.jpg'),
      },
      { label: 'Read 10 pages of a non-fiction book', done: false },
    ],
  },
];

/** The checklist everyone in a challenge is working through. */
const CHALLENGE_TASKS = FRIENDS[0].tasks.map((task) => task.label);

/** Builds a person's day from which of the four tasks they have ticked off. */
const tasksDone = (times: readonly (string | null)[]) =>
  CHALLENGE_TASKS.map((label, i) => ({
    label,
    done: !!times[i],
    ...(times[i] ? { time: times[i]! } : null),
  }));

/**
 * The people posting in the challenge feeds. Same shape as a friend — tapping
 * an avatar in a feed opens the profile screen the Friends tab opens — but
 * kept apart from FRIENDS, since posting in a challenge you are both in does
 * not make someone your friend.
 */
export const FEED_AUTHORS: readonly Friend[] = [
  {
    id: 'mia',
    name: 'Mia',
    handle: '@mia.moves',
    avatar: require('../assets/feed/author-neon-room-mirror.jpg'),
    day: 12,
    bio: 'purple lights and 5am alarms',
    friendCount: 31,
    trophies: 6,
    livesLeft: 3,
    tasks: tasksDone(['7:10 AM', '11:02 AM', '6:40 PM', null]),
  },
  {
    id: 'sofia',
    name: 'Sofia',
    handle: '@sofia.sleeps',
    avatar: require('../assets/feed/author-hair-flip.jpg'),
    day: 28,
    bio: 'day 28 and finally sleeping properly',
    friendCount: 40,
    trophies: 9,
    livesLeft: 1,
    tasks: tasksDone(['9:15 AM', '1:20 PM', null, '10:05 PM']),
  },
  {
    id: 'elena',
    name: 'Elena',
    handle: '@elena_drives',
    avatar: require('../assets/feed/author-car-night.jpg'),
    day: 41,
    bio: 'late drives, early gym',
    friendCount: 27,
    trophies: 11,
    livesLeft: 3,
    tasks: tasksDone(['6:02 AM', '8:45 AM', '7:30 PM', '9:50 PM']),
  },
  {
    id: 'nora',
    name: 'Nora',
    handle: '@norainthehood',
    avatar: require('../assets/feed/author-green-hoodie-mirror.jpg'),
    day: 7,
    bio: 'same hoodie in every photo, sorry',
    friendCount: 15,
    trophies: 1,
    livesLeft: 2,
    tasks: tasksDone([null, '3:12 PM', null, null]),
  },
  {
    id: 'camila',
    name: 'Camila',
    handle: '@camilaglow',
    avatar: require('../assets/feed/author-butterfly-earrings.jpg'),
    day: 55,
    bio: 'started for the glow, stayed for the walks',
    friendCount: 52,
    trophies: 14,
    livesLeft: 3,
    tasks: tasksDone(['8:30 AM', '12:00 PM', '5:15 PM', null]),
  },
];

/** Everyone the profile screen can open, whether or not they are a friend. */
export const PEOPLE: readonly Friend[] = [...FRIENDS, ...FEED_AUTHORS];

export interface DiscoverSection {
  id: string;
  title: string;
  /** The four tiles standing for the challenge wherever it appears. */
  photos: readonly PhotoSource[];
  members: number;
  /**
   * When this round started, ISO `YYYY-MM-DD`. The card's own end date is
   * this plus the matching `Challenge.defaultDays` — never stored twice.
   */
  startDate: string;
  /** Who started this round. An id into `PEOPLE`, so the preview's "Created
   * by" row opens the same profile screen the Friends tab does. */
  creatorId: string;
}

export const DISCOVER: readonly DiscoverSection[] = [
  {
    id: 'her75',
    title: 'Get Fit for Summer',
    photos: [
      require('../assets/challenges/her75/gym-floor-selfie.jpg'),
      require('../assets/challenges/her75/grocery-cart.jpg'),
      require('../assets/challenges/her75/terrace-treadmill.jpg'),
      require('../assets/challenges/her75/sunset-table.jpg'),
    ],
    members: 226754,
    startDate: '2026-06-01',
    creatorId: 'mia',
  },
  {
    id: 'hard',
    title: 'No Excuses Challenge',
    photos: [
      require('../assets/challenges/hard/mirror-selfie.jpg'),
      require('../assets/challenges/hard/dumbbells-overhead.jpg'),
      require('../assets/challenges/hard/grocery-basket.jpg'),
      require('../assets/challenges/hard/study-desk.jpg'),
    ],
    members: 118402,
    startDate: '2026-07-14',
    creatorId: 'elena',
  },
  {
    id: 'medium',
    title: 'Balanced Reset',
    photos: [
      require('../assets/challenges/medium/outdoor-run.jpg'),
      require('../assets/challenges/medium/infused-water.jpg'),
      require('../assets/challenges/medium/guasha-ice-bowl.jpg'),
      require('../assets/challenges/medium/book-in-bed.jpg'),
    ],
    members: 64810,
    startDate: '2026-08-01',
    creatorId: 'sofia',
  },
  {
    id: 'soft',
    title: 'Fresh Start',
    photos: [
      require('../assets/challenges/soft/early-alarm.jpg'),
      require('../assets/challenges/soft/sunset-walk.jpg'),
      require('../assets/challenges/soft/poolside-stretch.jpg'),
      require('../assets/challenges/soft/evening-reading.jpg'),
    ],
    members: 91233,
    startDate: '2026-08-20',
    creatorId: 'camila',
  },
];

/**
 * The four bundled tiles standing for a challenge, by id — the very ones
 * Discover shows, so a challenge looks the same wherever it turns up. A
 * challenge with no feed of its own (the custom one) has no photos here, and
 * the caller keeps its drawn stand-ins.
 */
export function challengePhotos(id: string): readonly PhotoSource[] | undefined {
  return DISCOVER.find((section) => section.id === id)?.photos;
}

/**
 * The custom challenge has no photographs of its own — it is whatever you make
 * it — so its strip takes the opening shot from each of the four that do. Four
 * sets, four tiles, and the row reads as every challenge at once.
 */
export const CUSTOM_PHOTOS: readonly PhotoSource[] = DISCOVER.map(
  (section) => section.photos[0],
);

/**
 * The four tiles that stand for a challenge anywhere it is shown — the picker,
 * and its own screen once it has been chosen. Anything without a set of its
 * own falls back to the custom row, which is every challenge at once.
 */
export function challengeStrip(id: string): readonly PhotoSource[] {
  return challengePhotos(id) ?? CUSTOM_PHOTOS;
}

export interface FeedPost {
  id: string;
  /** Who posted it — an id into PEOPLE, so the tile can open their profile. */
  authorId: string;
  /** What they posted. */
  photo: ImageSourcePropType;
  views: number;
  time: string;
  reaction?: string;
}

/**
 * The day's posts. Every challenge feed shows the same ones — the challenge
 * a feed belongs to only sets its header, not who posted in it.
 */
export const FEED_POSTS: readonly FeedPost[] = [
  {
    id: 'p1',
    authorId: 'mia',
    photo: require('../assets/feed/posts/mountain-hike.jpg'),
    views: 8,
    time: '6:53 AM',
  },
  {
    id: 'p2',
    authorId: 'sofia',
    photo: require('../assets/feed/posts/post-workout-smoothie.jpg'),
    views: 10,
    time: '6:54 AM',
  },
  {
    id: 'p3',
    authorId: 'elena',
    photo: require('../assets/feed/posts/orange-chicken-fried-rice.jpg'),
    views: 10,
    time: '6:55 AM',
    reaction: '🔥',
  },
  {
    id: 'p4',
    authorId: 'nora',
    photo: require('../assets/feed/posts/canal-dog-walk.jpg'),
    views: 3,
    time: '2:06 PM',
  },
  {
    id: 'p5',
    authorId: 'camila',
    photo: require('../assets/feed/posts/park-bench-reading.jpg'),
    views: 21,
    time: '4:18 PM',
  },
  {
    id: 'p6',
    authorId: 'mia',
    photo: require('../assets/feed/posts/studying-in-bed.jpg'),
    views: 14,
    time: '8:41 PM',
    reaction: '❤️',
  },
  {
    id: 'p7',
    authorId: 'sofia',
    photo: require('../assets/feed/posts/golden-retriever-garden.jpg'),
    views: 32,
    time: '9:12 PM',
  },
];

export const REACTIONS = ['❤️', '🔥', '👏', '😂'] as const;

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

/**
 * One thing pinned to a wall collection. Photos are bundled with the app;
 * collections whose photos have not been shot yet fall back to the drawn
 * stand-in through `seed`.
 */
export interface WallItem {
  id: string;
  /** Headline on the item's own screen, and the tile's accessibility label. */
  title: string;
  /** Bundled photo. Omitted until there is one, and `seed` stands in. */
  photo?: ImageSourcePropType;
  /** Stand-in seed, used whenever there is no photo. */
  seed?: string;
  /** The lines under the title: a caption, ingredients, a routine. */
  note?: readonly string[];
}

export interface WallCollection {
  id: string;
  title: string;
  items: readonly WallItem[];
}

/**
 * A friend's wall. Only the collections they have actually filled are listed,
 * so an empty section never reaches the screen — which is why there is no
 * "My Wishlist" here even though the wall offers one.
 */
export const WALL_COLLECTIONS: readonly WallCollection[] = [
  {
    id: 'eat',
    title: 'My What I Eat in a Day',
    items: [
      {
        id: 'eat-eggs',
        title: 'Spinach eggs & avo toast',
        photo: require('../assets/wall/eat/spinach-eggs-avocado-toast.jpg'),
        note: [
          '3 eggs + a handful of spinach',
          'Seeded toast, smashed avocado',
          'Berries and an iced coffee',
        ],
      },
      {
        id: 'eat-sesame-chicken',
        title: 'Sesame chicken bowl',
        photo: require('../assets/wall/eat/sesame-chicken-rice-bowl.jpg'),
        note: [
          'Crispy chicken in sticky sesame sauce',
          'Rice with peas and spring onion',
          'Cucumber on the side',
        ],
      },
      {
        id: 'eat-salmon',
        title: 'Salmon rice bowl',
        photo: require('../assets/wall/eat/salmon-rice-asparagus.jpg'),
        note: [
          'Pan-seared salmon',
          'Jasmine rice',
          'Roasted asparagus + half an avocado',
        ],
      },
      {
        id: 'eat-fruit',
        title: 'Fruit plate',
        photo: require('../assets/wall/eat/berry-watermelon-plate.jpg'),
        note: [
          'Strawberries, raspberries, blueberries',
          'Cold watermelon',
          'My favourite summer breakfast',
        ],
      },
      {
        id: 'eat-dates',
        title: 'PB stuffed dates',
        photo: require('../assets/wall/eat/peanut-butter-dates.jpg'),
        note: [
          'Medjool dates',
          'Peanut butter',
          'Flaky salt',
          'The 4pm sweet craving, handled',
        ],
      },
    ],
  },
  {
    id: 'books',
    title: 'My Books',
    items: [
      {
        id: 'book-normal-people',
        title: 'Normal People',
        photo: require('../assets/wall/books/normal-people.jpg'),
        note: ['Sally Rooney', 'Read it in two nights', 'Still thinking about the ending'],
      },
      {
        id: 'book-mockingbird',
        title: 'To Kill a Mockingbird',
        photo: require('../assets/wall/books/to-kill-a-mockingbird.jpg'),
        note: ['Harper Lee', 'Reread from school', 'Hits completely differently now'],
      },
      {
        id: 'book-1984',
        title: '1984',
        photo: require('../assets/wall/books/nineteen-eighty-four.jpg'),
        note: ['George Orwell', 'My 10 pages a day book', 'Heavy, but I keep going back'],
      },
      {
        id: 'book-alchemist',
        title: 'The Alchemist',
        photo: require('../assets/wall/books/the-alchemist.jpg'),
        note: ['Paulo Coelho', 'Lives in my tote bag', 'The one I lend to everyone'],
      },
      {
        id: 'book-cmbyn',
        title: 'Call Me By Your Name',
        photo: require('../assets/wall/books/call-me-by-your-name.jpg'),
        note: ['André Aciman', 'Summer read', 'Cried on the last page, no regrets'],
      },
    ],
  },
  {
    id: 'workouts',
    title: 'My Workouts',
    items: [
      {
        id: 'workout-plank',
        title: 'Plank holds',
        photo: require('../assets/wall/workouts/gym-plank.jpg'),
        note: ['3 × 60 seconds', 'At the end of every gym session', 'The longest minute of my day'],
      },
      {
        id: 'workout-walk',
        title: 'Incline walk',
        photo: require('../assets/wall/workouts/treadmill-incline-walk.jpg'),
        note: ['12 incline, 5 km/h', '45 minutes', 'Headphones in, podcast on'],
      },
      {
        id: 'workout-core',
        title: 'Core on the mat',
        photo: require('../assets/wall/workouts/home-mat-core.jpg'),
        note: ['20 minutes at home', 'Dead bugs, crunches, leg raises', 'Morning sun, no equipment'],
      },
    ],
  },
  {
    id: 'skincare',
    title: 'My Skincare',
    items: [
      {
        id: 'skin-shelf',
        title: 'Everything on my shelf',
        photo: require('../assets/wall/skincare/skincare-shelf.jpg'),
        note: [
          'The Ordinary Niacinamide 10%',
          'CeraVe Moisturising Lotion',
          'La Roche-Posay Effaclar cleansing gel',
          'Effaclar Duo+ on the bad days',
          'Cicaplast Baume B5+ and Vaseline to slug',
        ],
      },
    ],
  },
];

/** Every wall item, flattened — how the item screen resolves its `id`. */
export const WALL_ITEMS: readonly WallItem[] = WALL_COLLECTIONS.flatMap(
  (collection) => collection.items,
);

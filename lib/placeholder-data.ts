/**
 * Placeholder content for layout work only. No API calls yet -- when the
 * Vercel backend is wired in, this file is the single thing that gets deleted.
 */

export const overallProgress = {
  percent: 78,
  caption: 'Good Progress!',
  lastUpdated: 'Today',
};

export type Bureau = 'Equifax' | 'Experian' | 'TransUnion';

export const bureaus: Bureau[] = ['Equifax', 'Experian', 'TransUnion'];

/** Per-bureau score history. `points` drive the line chart, oldest -> newest. */
export const creditScores: Record<
  Bureau,
  { score: number; delta: number; updated: string; points: number[]; labels: string[] }
> = {
  Equifax: {
    score: 682,
    delta: 56,
    updated: 'Updated 2 days ago',
    points: [618, 624, 641, 638, 662, 682],
    labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  },
  Experian: {
    score: 671,
    delta: 43,
    updated: 'Updated 2 days ago',
    points: [628, 630, 645, 652, 660, 671],
    labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  },
  TransUnion: {
    score: 695,
    delta: 61,
    updated: 'Updated 3 days ago',
    points: [634, 648, 655, 670, 679, 695],
    labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
  },
};

export const disputeRound = {
  round: 2,
  status: 'In Progress',
  completed: 3,
  total: 7,
};

export const chatMessages = [
  {
    id: '1',
    from: 'zoey' as const,
    text: "Hey Grizz. I'm Zoey, your AI Credit Assistant. How can I help you today?",
  },
  {
    id: '2',
    from: 'zoey' as const,
    text: 'Your Equifax score moved up 56 points since your last dispute round.',
  },
];

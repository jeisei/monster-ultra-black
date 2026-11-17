export type StoryScene = {
  id: string;
  title: string;
  description?: string;
};

export const scenes: StoryScene[] = [
  { id: 'intro', title: 'FALL INTO\nTHE DARK.', description: 'Black cherry. Zero sugar.' },
  { id: 'flavor', title: 'DARK\nCHERRY.', description: 'The bold side of black cherry.' },
  {
    id: 'fall',
    title: 'FOLLOW\nTHE LIGHT.',
    description: 'From the silver edge to the details within.',
  },
  { id: 'label', title: 'NUTRITION.\nIN FOCUS.', description: 'A closer look at the label.' },
  { id: 'return', title: 'THE DETAILS\nWITHIN.', description: 'Taurine. Caffeine. B vitamins.' },
  { id: 'detail', title: 'FINISHED\nIN BLACK.', description: 'Black lacquer. A silver edge.' },
  { id: 'finale', title: 'Monster Ultra Black' },
];

export const disclaimer =
  'Concept Project for Portfolio purposes only, not affiliated with Monster Energy Company. All trademarks belong to their respective owners.';

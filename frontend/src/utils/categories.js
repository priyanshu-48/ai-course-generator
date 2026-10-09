// One colour per course category, used for icon chips and thumbnails.
const COLORS = {
  AI: '#4cd3dd',
  'Web Development': '#ff8a5c',
  'Mobile Development': '#b98ae0',
  'Data Science': '#5b8def',
  'Cloud Computing': '#3fb6e8',
  Cybersecurity: '#ff6b81',
  DevOps: '#f2b84b',
  Blockchain: '#8bd17c',
  'Game Development': '#e770b5',
  Other: '#9496b0',
};

export const categoryColor = (category) => COLORS[category] || COLORS.Other;

export const categoryInitial = (category) => (category || '?').trim().charAt(0).toUpperCase();

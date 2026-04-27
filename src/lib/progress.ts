// Lightweight progress tracking using localStorage
// Tracks: daily streak, XP, weak concepts, session history

export interface ProgressData {
  xp: number;
  streak: number;
  lastActiveDate: string; // ISO date string YYYY-MM-DD
  weakConcepts: string[];
  totalQuizzesCompleted: number;
  totalGuidesCreated: number;
}

const KEY = 'quizflow_progress';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function getProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    return JSON.parse(raw) as ProgressData;
  } catch {
    return defaultProgress();
  }
}

function defaultProgress(): ProgressData {
  return {
    xp: 0,
    streak: 0,
    lastActiveDate: '',
    weakConcepts: [],
    totalQuizzesCompleted: 0,
    totalGuidesCreated: 0,
  };
}

function save(data: ProgressData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* ignore storage errors */ }
}

/** Call after completing a quiz. Pass score percentage (0-100). */
export function recordQuizCompletion(scorePct: number, wrongConcepts: string[] = []) {
  const data = getProgress();
  const t = today();

  // Update streak
  if (data.lastActiveDate === yesterday()) {
    data.streak += 1;
  } else if (data.lastActiveDate !== t) {
    data.streak = 1;
  }
  data.lastActiveDate = t;

  // XP: base 50, bonus for high scores
  const xpGain = scorePct >= 90 ? 100 : scorePct >= 70 ? 75 : 50;
  data.xp += xpGain;
  data.totalQuizzesCompleted += 1;

  // Track weak concepts
  if (wrongConcepts.length > 0) {
    const merged = Array.from(new Set([...data.weakConcepts, ...wrongConcepts]));
    data.weakConcepts = merged.slice(-20); // keep last 20
  }

  save(data);
  return data;
}

/** Call after creating a study guide. */
export function recordGuideCreation() {
  const data = getProgress();
  const t = today();

  if (data.lastActiveDate === yesterday()) {
    data.streak += 1;
  } else if (data.lastActiveDate !== t) {
    data.streak = 1;
  }
  data.lastActiveDate = t;
  data.xp += 30;
  data.totalGuidesCreated += 1;
  save(data);
  return data;
}

/** Add weak concepts from a wrong answer session. */
export function addWeakConcepts(concepts: string[]) {
  const data = getProgress();
  const merged = Array.from(new Set([...data.weakConcepts, ...concepts]));
  data.weakConcepts = merged.slice(-20);
  save(data);
}

/** Clear a specific weak concept once mastered. */
export function removeWeakConcept(concept: string) {
  const data = getProgress();
  data.weakConcepts = data.weakConcepts.filter((c) => c !== concept);
  save(data);
}

export function getXpLevel(xp: number): { level: number; title: string; nextLevelXp: number; currentLevelXp: number } {
  const levels = [
    { threshold: 0, title: 'Learner' },
    { threshold: 150, title: 'Explorer' },
    { threshold: 400, title: 'Scholar' },
    { threshold: 800, title: 'Expert' },
    { threshold: 1500, title: 'Master' },
    { threshold: 3000, title: 'Genius' },
  ];

  let level = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].threshold) {
      level = i;
      break;
    }
  }

  const currentLevelXp = levels[level].threshold;
  const nextLevelXp = levels[level + 1]?.threshold ?? currentLevelXp + 1000;

  return {
    level: level + 1,
    title: levels[level].title,
    nextLevelXp,
    currentLevelXp,
  };
}

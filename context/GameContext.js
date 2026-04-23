import { createContext, useContext, useReducer, useEffect, useState } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DOOR_POOL_TEMPLATE = [
  // ── Positive points (27) ───────────────────────────────────────────────
  ...Array(7).fill(null).map(() => ({ type: 'points',  value: 100,  label: '+100'  })),
  ...Array(6).fill(null).map(() => ({ type: 'points',  value: 200,  label: '+200'  })),
  ...Array(4).fill(null).map(() => ({ type: 'points',  value: 300,  label: '+300'  })),
  ...Array(4).fill(null).map(() => ({ type: 'points',  value: 500,  label: '+500'  })),
  ...Array(3).fill(null).map(() => ({ type: 'points',  value: 1000, label: '+1000' })),
  ...Array(2).fill(null).map(() => ({ type: 'points',  value: 1500, label: '+1500' })),
  ...Array(1).fill(null).map(() => ({ type: 'jackpot', value: 2500, label: 'JACKPOT +2500' })),
  // ── Negative points (12) ───────────────────────────────────────────────
  ...Array(4).fill(null).map(() => ({ type: 'points', value: -100, label: '-100' })),
  ...Array(3).fill(null).map(() => ({ type: 'points', value: -200, label: '-200' })),
  ...Array(3).fill(null).map(() => ({ type: 'points', value: -300, label: '-300' })),
  ...Array(2).fill(null).map(() => ({ type: 'points', value: -500, label: '-500' })),
  // ── Score-reset & turn specials (10) ───────────────────────────────────
  ...Array(2).fill(null).map(() => ({ type: 'bankrupt', label: 'GROUND ZERO'   })),
  ...Array(3).fill(null).map(() => ({ type: 'swap',     label: 'PASS TURN!'    })),
  ...Array(3).fill(null).map(() => ({ type: 'steal',    label: 'STEAL 300!'    })),
  ...Array(2).fill(null).map(() => ({ type: 'double',   label: 'DOUBLE SCORE!' })),
  // ── Economy / interaction specials (11) ────────────────────────────────
  ...Array(3).fill(null).map(() => ({ type: 'bonus',       label: '+1 REVEAL'       })),
  ...Array(2).fill(null).map(() => ({ type: 'gift',        label: 'GIFT 300'        })),
  ...Array(2).fill(null).map(() => ({ type: 'tax',         label: 'TAX THE LEADER'  })),
  ...Array(2).fill(null).map(() => ({ type: 'swap_scores', label: 'SWAP SCORES!'    })),
  ...Array(2).fill(null).map(() => ({ type: 'skip_turn',   label: 'SKIP NEXT TURN!' })),
]; // 60 total

function generateDoors() {
  return shuffleArray(DOOR_POOL_TEMPLATE).map((content, id) => ({
    id,
    content: { ...content },
    revealed: false,
  }));
}

function countCorrect(submitted, correct) {
  return submitted.reduce((n, item, i) => (item === correct[i] ? n + 1 : n), 0);
}

// ─── Initial State ──────────────────────────────────────────────────────────

const defaultTeams = [
  { id: 't1', name: 'Team Alpha', points: 0 },
  { id: 't2', name: 'Team Beta',  points: 0 },
  { id: 't3', name: 'Team Gamma', points: 0 },
];

const emptyMedia = () => ({ url: '', question: '', answer: '', reward: 2 });

// Bring any persisted round (possibly saved under an older schema) up to the
// current shape — guarantees every nested field the UI reads exists.
function normalizeRound(r, fallbackId) {
  const safe = r || {};
  const p1   = safe.phase1 || {};
  const p2   = safe.phase2 || {};
  const m    = p2.media   || {};
  const items = Array.isArray(p2.items) && p2.items.length >= 4
    ? p2.items.slice(0, 4).map(x => (typeof x === 'string' ? x : ''))
    : ['', '', '', ''];
  const rewardNum = Number(m.reward);
  return {
    id: safe.id ?? fallbackId ?? `r${Date.now()}${Math.random().toString(36).slice(2,6)}`,
    phase1: {
      question: typeof p1.question === 'string' ? p1.question : '',
      answer:   typeof p1.answer   === 'string' ? p1.answer   : '',
    },
    phase2: {
      challengeType: p2.challengeType === 'media_trivia' ? 'media_trivia' : 'sort_list',
      title: typeof p2.title === 'string' ? p2.title : '',
      items,
      media: {
        url:      typeof m.url      === 'string' ? m.url      : '',
        question: typeof m.question === 'string' ? m.question : '',
        answer:   typeof m.answer   === 'string' ? m.answer   : '',
        reward:   Number.isFinite(rewardNum) ? Math.max(0, Math.floor(rewardNum)) : 2,
      },
    },
  };
}

function normalizeTeam(t, i) {
  const safe = t || {};
  const points = Number(safe.points);
  return {
    id: safe.id ?? `t${Date.now()}_${i}`,
    name: typeof safe.name === 'string' ? safe.name : `Team ${i + 1}`,
    points: Number.isFinite(points) ? points : 0,
  };
}

const defaultRounds = [
  {
    id: 'r1',
    phase1: { question: 'How many feet tall is the Eiffel Tower?', answer: '984' },
    phase2: {
      challengeType: 'sort_list',
      title: 'Rank these planets by distance from the Sun (closest first)',
      items: ['Mercury', 'Venus', 'Earth', 'Mars'],
      media: emptyMedia(),
    },
  },
  {
    id: 'r2',
    phase1: { question: 'In what year was the first iPhone released?', answer: '2007' },
    phase2: {
      challengeType: 'sort_list',
      title: 'Order these movies by box office gross (highest first)',
      items: ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars: The Force Awakens'],
      media: emptyMedia(),
    },
  },
];

const FRESH_GAME = {
  currentRoundIndex: 0,
  currentPhase: 1,
  activeTeamId: null,
  phase1Revealed: false,
  phase2Items: [],
  phase2Submitted: false,
  phase2ShowResults: false,   // ← must be here so START_GAME always clears it
  phase2RevealCount: 0,
  phase2EndTurn: false,
  phase3Doors: [],
  phase3RevealsLeft: 0,
  phase3AwaitingSwap: false,
  phase3AwaitingSteal: false,
  phase3AwaitingGift: false,
  phase3AwaitingSwapScores: false,
  phase3AwaitingTax: false,
  phase3AwaitingSkipTurn: false,
  phase3Complete: false,
};

const initialState = {
  view: 'settings',
  teams: defaultTeams,
  rounds: defaultRounds,
  ...FRESH_GAME,
};

// ─── Reducer ────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    // ── Team Management ──────────────────────────────────────────────────────

    case 'ADD_TEAM': {
      const id = `t${Date.now()}`;
      return { ...state, teams: [...state.teams, { id, name: action.name, points: 0 }] };
    }

    case 'REMOVE_TEAM': {
      return {
        ...state,
        teams: state.teams.filter(t => t.id !== action.id),
        activeTeamId: state.activeTeamId === action.id ? null : state.activeTeamId,
      };
    }

    case 'UPDATE_TEAM_NAME': {
      return {
        ...state,
        teams: state.teams.map(t => t.id === action.id ? { ...t, name: action.name } : t),
      };
    }

    case 'ADJUST_SCORE': {
      return {
        ...state,
        teams: state.teams.map(t =>
          t.id === action.id ? { ...t, points: t.points + action.delta } : t
        ),
      };
    }

    case 'RESET_ALL_SCORES': {
      return {
        ...state,
        teams: state.teams.map(t => ({ ...t, points: 0 })),
      };
    }

    // ── Round Management ─────────────────────────────────────────────────────

    case 'ADD_ROUND': {
      const id = `r${Date.now()}`;
      return {
        ...state,
        rounds: [
          ...state.rounds,
          {
            id,
            phase1: { question: '', answer: '' },
            phase2: {
              challengeType: 'sort_list',
              title: '',
              items: ['', '', '', ''],
              media: emptyMedia(),
            },
          },
        ],
      };
    }

    case 'UPDATE_ROUND_FIELD': {
      return {
        ...state,
        rounds: state.rounds.map(r =>
          r.id === action.id
            ? { ...r, [action.phase]: { ...r[action.phase], [action.field]: action.value } }
            : r
        ),
      };
    }

    case 'UPDATE_ROUND_ITEM': {
      return {
        ...state,
        rounds: state.rounds.map(r =>
          r.id === action.id
            ? {
                ...r,
                phase2: {
                  ...r.phase2,
                  items: r.phase2.items.map((item, i) =>
                    i === action.index ? action.value : item
                  ),
                },
              }
            : r
        ),
      };
    }

    case 'UPDATE_ROUND_MEDIA': {
      return {
        ...state,
        rounds: state.rounds.map(r =>
          r.id === action.id
            ? {
                ...r,
                phase2: {
                  ...r.phase2,
                  media: { ...(r.phase2.media || emptyMedia()), [action.field]: action.value },
                },
              }
            : r
        ),
      };
    }

    case 'REMOVE_ROUND': {
      return { ...state, rounds: state.rounds.filter(r => r.id !== action.id) };
    }

    case 'REPLACE_ROUNDS': {
      // Used by preset/import flow — normalize to the current schema.
      const rounds = Array.isArray(action.rounds) ? action.rounds : [];
      if (rounds.length === 0) return state;
      return {
        ...state,
        rounds: rounds.map((r, i) => normalizeRound(r, `r${Date.now()}_${i}`)),
      };
    }

    case 'MOVE_ROUND': {
      const { from, to } = action;
      if (from === to) return state;
      if (from < 0 || from >= state.rounds.length) return state;
      if (to   < 0 || to   >= state.rounds.length) return state;
      const rounds = [...state.rounds];
      const [moved] = rounds.splice(from, 1);
      rounds.splice(to, 0, moved);
      return { ...state, rounds };
    }

    // ── Game Flow ────────────────────────────────────────────────────────────

    case 'START_GAME': {
      return {
        ...state,
        view: 'game',
        teams: state.teams.map(t => ({ ...t, points: 0 })),
        ...FRESH_GAME,
        // Generate the door grid ONCE per game — doors stay open across all rounds
        phase3Doors: generateDoors(),
        activeTeamId: state.teams[0]?.id ?? null,
      };
    }

    case 'BACK_TO_SETTINGS': {
      return { ...state, view: 'settings' };
    }

    case 'SET_ACTIVE_TEAM': {
      if (state.phase3AwaitingSwap) {
        if (action.id === state.activeTeamId) return state;
        const phase3Complete = state.phase3RevealsLeft === 0;
        return {
          ...state,
          activeTeamId: action.id,
          phase3AwaitingSwap: false,
          phase3Complete,
        };
      }
      // All other awaiting states use dedicated buttons — ignore team-card clicks
      if (
        state.phase3AwaitingSteal ||
        state.phase3AwaitingGift ||
        state.phase3AwaitingSwapScores ||
        state.phase3AwaitingTax ||
        state.phase3AwaitingSkipTurn
      ) return state;
      return { ...state, activeTeamId: action.id };
    }

    // ── Phase 1 ──────────────────────────────────────────────────────────────

    case 'REVEAL_PHASE1': {
      return { ...state, phase1Revealed: true };
    }

    case 'GO_TO_PHASE2': {
      const round = state.rounds[state.currentRoundIndex];
      const items = round?.phase2?.items ?? ['', '', '', ''];
      return {
        ...state,
        currentPhase: 2,
        phase1Revealed: false,
        phase2Items: shuffleArray([...items]),
        phase2Submitted: false,
        phase2ShowResults: false,  // ← always reset on entering phase 2
        phase2RevealCount: 0,
        phase2EndTurn: false,
      };
    }

    // ── Phase 2 ──────────────────────────────────────────────────────────────

    case 'PHASE2_MOVE': {
      const { from, to } = action;
      if (to < 0 || to >= state.phase2Items.length) return state;
      const items = [...state.phase2Items];
      [items[from], items[to]] = [items[to], items[from]];
      return { ...state, phase2Items: items };
    }

    case 'PHASE2_SUBMIT': {
      const round = state.rounds[state.currentRoundIndex];
      const correctItems = round?.phase2?.items ?? [];
      const correct = countCorrect(state.phase2Items, correctItems);

      let revealCount;
      if (correct === 4)      revealCount = 3;
      else if (correct >= 2)  revealCount = 2;
      else if (correct === 1) revealCount = 1;
      else                    revealCount = 0;

      // Stay in phase 2 — show results screen first
      return {
        ...state,
        phase2Submitted: true,
        phase2ShowResults: true,
        phase2RevealCount: revealCount,
        phase2EndTurn: revealCount === 0,
      };
    }

    // ── Phase 2: Media Trivia adjudication ───────────────────────────────────
    case 'PHASE2_MEDIA_CORRECT': {
      const round = state.rounds[state.currentRoundIndex];
      const rawReward = round?.phase2?.media?.reward;
      const reward = Math.max(0, Number.isFinite(+rawReward) ? Math.floor(+rawReward) : 2);
      // Team got it right — skip the results screen, go directly to Phase 3
      const doors = state.phase3Doors.length ? state.phase3Doors : generateDoors();
      return {
        ...state,
        currentPhase: 3,
        phase2Submitted: true,
        phase2ShowResults: false,
        phase2RevealCount: reward,
        phase2EndTurn: false,
        phase3Doors: doors,
        phase3RevealsLeft: reward,
        phase3AwaitingSwap: false,
        phase3AwaitingSteal: false,
        phase3AwaitingGift: false,
        phase3AwaitingSwapScores: false,
        phase3Complete: reward === 0,
      };
    }

    case 'PHASE2_MEDIA_INCORRECT': {
      // Wrong answer — show results screen in "end turn" mode
      return {
        ...state,
        phase2Submitted: true,
        phase2ShowResults: true,
        phase2RevealCount: 0,
        phase2EndTurn: true,
      };
    }

    case 'GO_TO_PHASE3': {
      // Keep existing doors — only create new grid if there isn't one yet (safety)
      const doors = state.phase3Doors.length ? state.phase3Doors : generateDoors();
      return {
        ...state,
        currentPhase: 3,
        phase3Doors: doors,
        phase3RevealsLeft: state.phase2RevealCount,
        phase3AwaitingSwap: false,
        phase3AwaitingSteal: false,
        phase3Complete: false,
      };
    }

    // ── Phase 3 ──────────────────────────────────────────────────────────────

    case 'REVEAL_DOOR': {
      const { index } = action;
      const door = state.phase3Doors[index];
      if (
        !door ||
        door.revealed ||
        state.phase3RevealsLeft <= 0 ||
        state.phase3AwaitingSwap ||
        state.phase3AwaitingSteal ||
        state.phase3AwaitingGift ||
        state.phase3AwaitingSwapScores ||
        state.phase3AwaitingTax ||
        state.phase3AwaitingSkipTurn ||
        state.phase3Complete
      ) return state;

      const newDoors = state.phase3Doors.map((d, i) =>
        i === index ? { ...d, revealed: true } : d
      );

      let newRevealsLeft = state.phase3RevealsLeft - 1;
      let newTeams = state.teams;
      let awaitingSwap = false;
      let awaitingSteal = false;
      let awaitingGift = false;
      let awaitingSwapScores = false;
      let awaitingTax = false;
      let awaitingSkipTurn = false;

      const { type, value } = door.content;

      if (type === 'points' || type === 'jackpot') {
        // Points can push a team into negatives — no clamping
        newTeams = state.teams.map(t =>
          t.id === state.activeTeamId ? { ...t, points: t.points + value } : t
        );
      } else if (type === 'bankrupt') {
        newTeams = state.teams.map(t =>
          t.id === state.activeTeamId ? { ...t, points: 0 } : t
        );
      } else if (type === 'double') {
        newTeams = state.teams.map(t =>
          t.id === state.activeTeamId ? { ...t, points: t.points * 2 } : t
        );
      } else if (type === 'bonus') {
        // "+1 REVEAL" — net +1 (offset the -1 decrement)
        newRevealsLeft = state.phase3RevealsLeft + 1;
      } else if (type === 'tax') {
        // Auto-apply if there's a single clear leader with positive points.
        // Otherwise (ties or all-zero/negative) let the active team pick a target.
        const others = state.teams.filter(t => t.id !== state.activeTeamId);
        if (others.length > 0) {
          const maxPoints = Math.max(...others.map(t => t.points));
          const leaders   = others.filter(t => t.points === maxPoints);
          if (leaders.length === 1 && maxPoints > 0) {
            const leader = leaders[0];
            newTeams = state.teams.map(t => {
              if (t.id === leader.id)          return { ...t, points: t.points - 500 };
              if (t.id === state.activeTeamId) return { ...t, points: t.points + 500 };
              return t;
            });
          } else {
            awaitingTax = true;
          }
        }
      } else if (type === 'swap') {
        awaitingSwap = true;
      } else if (type === 'steal') {
        awaitingSteal = true;
      } else if (type === 'gift') {
        awaitingGift = true;
      } else if (type === 'swap_scores') {
        awaitingSwapScores = true;
      } else if (type === 'skip_turn') {
        awaitingSkipTurn = true;
      }

      const phase3Complete = newRevealsLeft === 0
        && !awaitingSwap && !awaitingSteal && !awaitingGift
        && !awaitingSwapScores && !awaitingTax && !awaitingSkipTurn;

      return {
        ...state,
        phase3Doors: newDoors,
        teams: newTeams,
        phase3RevealsLeft: newRevealsLeft,
        phase3AwaitingSwap: awaitingSwap,
        phase3AwaitingSteal: awaitingSteal,
        phase3AwaitingGift: awaitingGift,
        phase3AwaitingSwapScores: awaitingSwapScores,
        phase3AwaitingTax: awaitingTax,
        phase3AwaitingSkipTurn: awaitingSkipTurn,
        phase3Complete,
      };
    }

    case 'COMPLETE_STEAL': {
      // Guard: can't steal from self
      if (action.targetId === state.activeTeamId) return state;
      const target = state.teams.find(t => t.id === action.targetId);
      if (!target) return state;
      // Steal only what the target actually has — no free points if they're at 0
      const stolen = Math.min(300, Math.max(0, target.points));
      const newTeams = state.teams.map(t => {
        if (t.id === action.targetId)    return { ...t, points: t.points - stolen };
        if (t.id === state.activeTeamId) return { ...t, points: t.points + stolen };
        return t;
      });
      const phase3Complete = state.phase3RevealsLeft === 0;
      return { ...state, teams: newTeams, phase3AwaitingSteal: false, phase3Complete };
    }

    // Host skips a steal when no valid targets exist (all others at 0)
    case 'SKIP_STEAL': {
      const phase3Complete = state.phase3RevealsLeft === 0;
      return { ...state, phase3AwaitingSteal: false, phase3Complete };
    }

    case 'COMPLETE_GIFT': {
      // Free bonus — active team picks who receives 300, no cost to themselves
      if (action.targetId === state.activeTeamId) return state;
      const newTeams = state.teams.map(t =>
        t.id === action.targetId ? { ...t, points: t.points + 300 } : t
      );
      const phase3Complete = state.phase3RevealsLeft === 0;
      return { ...state, teams: newTeams, phase3AwaitingGift: false, phase3Complete };
    }

    case 'COMPLETE_SKIP_TURN': {
      // Purely informational — host enforces the sit-out verbally.
      // Just clears the prompt; no state change beyond that.
      if (action.targetId === state.activeTeamId) return state;
      const phase3Complete = state.phase3RevealsLeft === 0;
      return { ...state, phase3AwaitingSkipTurn: false, phase3Complete };
    }

    case 'COMPLETE_TAX': {
      if (action.targetId === state.activeTeamId) return state;
      const target = state.teams.find(t => t.id === action.targetId);
      if (!target) return state;
      const newTeams = state.teams.map(t => {
        if (t.id === action.targetId)    return { ...t, points: t.points - 500 };
        if (t.id === state.activeTeamId) return { ...t, points: t.points + 500 };
        return t;
      });
      const phase3Complete = state.phase3RevealsLeft === 0;
      return { ...state, teams: newTeams, phase3AwaitingTax: false, phase3Complete };
    }

    case 'COMPLETE_SWAP_SCORES': {
      if (action.targetId === state.activeTeamId) return state;
      const active = state.teams.find(t => t.id === state.activeTeamId);
      const target = state.teams.find(t => t.id === action.targetId);
      if (!active || !target) return state;
      const newTeams = state.teams.map(t => {
        if (t.id === state.activeTeamId) return { ...t, points: target.points };
        if (t.id === action.targetId)    return { ...t, points: active.points };
        return t;
      });
      const phase3Complete = state.phase3RevealsLeft === 0;
      return { ...state, teams: newTeams, phase3AwaitingSwapScores: false, phase3Complete };
    }

    case 'RESET_ROUND': {
      const next = state.currentRoundIndex + 1;
      // Cycle back to round 0 after the last round (matches the "חזור לסיבוב הראשון" button label)
      const nextIndex = next < state.rounds.length ? next : 0;
      return {
        ...state,
        currentRoundIndex: nextIndex,
        currentPhase: 1,
        phase1Revealed: false,
        phase2Items: [],
        phase2Submitted: false,
        phase2ShowResults: false,
        phase2RevealCount: 0,
        phase2EndTurn: false,
        // NOTE: phase3Doors intentionally preserved — opened doors stay open across rounds
        phase3RevealsLeft: 0,
        phase3AwaitingSwap: false,
        phase3AwaitingSteal: false,
        phase3AwaitingGift: false,
        phase3AwaitingSwapScores: false,
        phase3AwaitingTax: false,
        phase3AwaitingSkipTurn: false,
        phase3Complete: false,
      };
    }

    case 'LOAD_STATE':
      return { ...action.payload };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const GameContext = createContext(null);

// Read and normalize persisted state. Only call client-side.
function readSavedState() {
  try {
    const raw = localStorage.getItem('witb-state');
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const teams = Array.isArray(saved.teams) && saved.teams.length
      ? saved.teams.map(normalizeTeam)
      : null;
    const rounds = Array.isArray(saved.rounds) && saved.rounds.length
      ? saved.rounds.map((r, i) => normalizeRound(r, `r${Date.now()}_${i}`))
      : null;
    if (!teams && !rounds) return null;
    return {
      teams:  teams  ?? initialState.teams,
      rounds: rounds ?? initialState.rounds,
    };
  } catch (_) {
    return null;
  }
}

export function GameProvider({ children }) {
  // Always start from `initialState` so SSR and first client render produce the
  // same HTML (no hydration mismatch). Saved data is applied in a useEffect below.
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage after mount (client-only)
  useEffect(() => {
    const saved = readSavedState();
    if (saved) {
      dispatch({
        type: 'LOAD_STATE',
        payload: { ...initialState, teams: saved.teams, rounds: saved.rounds },
      });
    }
    setLoaded(true);
  }, []);

  // Persist — but only after we've hydrated from storage, so we don't clobber
  // the saved snapshot with the default one during the first render pass.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('witb-state', JSON.stringify({ teams: state.teams, rounds: state.rounds }));
    } catch (_) {}
  }, [state.teams, state.rounds, loaded]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

export default function Phase1() {
  const { state, dispatch } = useGame();
  const { rounds, currentRoundIndex, phase1Revealed, teams, activeTeamId } = state;

  const round = rounds[currentRoundIndex];
  const [timeLeft, setTimeLeft] = useState(30);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimeLeft(30);
    setIsRunning(false);
  }, [currentRoundIndex]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) setIsRunning(false);
  }, [timeLeft]);

  const timerClass =
    timeLeft <= 5  ? 'timer-display danger' :
    timeLeft <= 10 ? 'timer-display warn'   : 'timer-display';

  const activeTeam = teams.find(t => t.id === activeTeamId);

  if (!round) {
    return (
      <div className="phase-container">
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <h2 style={{ marginBottom: 8 }}>No rounds configured</h2>
          <p>Head to Settings and add some rounds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="phase-container">
      <div className="round-indicator">Round {currentRoundIndex + 1} of {rounds.length}</div>
      <div className="phase-tag p1">Phase 1 — Closest-To</div>

      <div className="question-card">
        <p className="question-text">{round.phase1.question || '(No question entered)'}</p>
      </div>

      <div className="timer-block">
        <div className={timerClass}>{String(timeLeft).padStart(2, '0')}</div>
        <div className="timer-controls">
          <button
            className="btn btn-neon"
            onClick={() => {
              if (isRunning) { setIsRunning(false); }
              else { if (timeLeft === 0) setTimeLeft(30); setIsRunning(true); }
            }}
          >
            {isRunning ? '⏸ Pause' : timeLeft === 0 ? '↺ Restart' : '▶ Start'}
          </button>
          <button className="btn btn-outline" onClick={() => { setIsRunning(false); setTimeLeft(30); }}>
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="phase1-actions">
        {!phase1Revealed ? (
          <button className="btn btn-gold btn-xl" onClick={() => dispatch({ type: 'REVEAL_PHASE1' })}>
            Reveal Answer
          </button>
        ) : (
          <div className="answer-reveal">
            <div className="answer-label">The Answer Is</div>
            <div className="answer-value">{round.phase1.answer}</div>
          </div>
        )}

        {phase1Revealed && (
          <>
            <p className="next-phase-hint">
              {activeTeam
                ? <>Active team: <strong style={{ color: 'var(--gold)' }}>{activeTeam.name}</strong> — click a team in the header to change</>
                : 'Click a team in the header to set the active team'}
            </p>
            <button
              className="btn btn-gold btn-lg"
              disabled={!activeTeamId}
              onClick={() => dispatch({ type: 'GO_TO_PHASE2' })}
            >
              Next Phase →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

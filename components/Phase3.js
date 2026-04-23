import { useGame } from '../context/GameContext';

// Map every door type to a CSS class (back-face color) and a clear, explanatory label.
function doorClass(content) {
  if (!content) return '';
  if (content.type === 'points') {
    if (content.value >= 1000) return 'points-big';
    if (content.value >= 0)    return 'points-pos';
    return 'points-neg';
  }
  // Normalize underscore → dash so CSS class matches e.g. .door-back.swap-scores
  return content.type.replace('_', '-');
}

// Top line (category) for the door back — tells the player *what kind* of prize this is.
function doorCategory(content) {
  if (!content) return '';
  switch (content.type) {
    case 'points':      return content.value > 0 ? 'POINTS' : 'PENALTY';
    case 'jackpot':     return '★ JACKPOT ★';
    case 'bankrupt':    return 'GROUND ZERO';
    case 'double':      return 'BONUS';
    case 'bonus':       return 'BONUS REVEAL';
    case 'swap':        return 'PASS THE TURN';
    case 'steal':       return 'STEAL';
    case 'gift':        return 'GIFT';
    case 'tax':         return 'TAX';
    case 'swap_scores': return 'SWAP SCORES';
    case 'skip_turn':   return 'SKIP NEXT TURN';
    default:            return '';
  }
}

// Bottom line (effect) — explains exactly what happens when this door is opened.
function doorExplanation(content) {
  if (!content) return '';
  switch (content.type) {
    case 'points':      return content.value > 0
                          ? `Add ${content.value} to your score`
                          : `Lose ${Math.abs(content.value)} points`;
    case 'jackpot':     return 'Add 2,500 to your score!';
    case 'bankrupt':    return 'Your score resets to 0';
    case 'double':      return 'Your total score × 2';
    case 'bonus':       return 'Gain one extra door reveal';
    case 'swap':        return 'Pass remaining reveals to another team';
    case 'steal':       return 'Take up to 300 from another team';
    case 'gift':        return 'Give a free 300 to another team';
    case 'tax':         return 'Take 500 from the leading team';
    case 'swap_scores': return 'Trade your total score with another team';
    case 'skip_turn':   return 'Pick a team to sit out the next turn';
    default:            return '';
  }
}

function Door({ door, index }) {
  const { state, dispatch } = useGame();
  const {
    phase3RevealsLeft, phase3AwaitingSwap, phase3AwaitingSteal,
    phase3AwaitingGift, phase3AwaitingSwapScores, phase3AwaitingTax,
    phase3AwaitingSkipTurn, phase3Complete,
  } = state;

  const canReveal =
    !door.revealed &&
    phase3RevealsLeft > 0 &&
    !phase3AwaitingSwap &&
    !phase3AwaitingSteal &&
    !phase3AwaitingGift &&
    !phase3AwaitingSwapScores &&
    !phase3AwaitingTax &&
    !phase3AwaitingSkipTurn &&
    !phase3Complete;

  const c = door.content;
  const isPointsLike = c?.type === 'points' || c?.type === 'jackpot';

  return (
    <div
      className={`door-wrap ${door.revealed ? 'revealed' : ''} ${canReveal ? 'clickable' : ''}`}
      onClick={() => canReveal && dispatch({ type: 'REVEAL_DOOR', index })}
      title={canReveal ? `Open door ${index + 1}` : undefined}
    >
      <div className="door-inner">
        <div className="door-face door-front">
          <span className="door-front-number">{index + 1}</span>
          <span className="door-front-star">✦</span>
        </div>
        <div className={`door-face door-back ${doorClass(c)}`}>
          <span className="door-content-label">{doorCategory(c)}</span>
          {isPointsLike ? (
            <span className="door-content-value">{c.label}</span>
          ) : (
            <span className="door-content-special">{c?.label}</span>
          )}
          <span className="door-content-explain">{doorExplanation(c)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Phase3() {
  const { state, dispatch } = useGame();
  const {
    phase3Doors, phase3RevealsLeft,
    phase3AwaitingSwap, phase3AwaitingSteal,
    phase3AwaitingGift, phase3AwaitingSwapScores, phase3AwaitingTax,
    phase3AwaitingSkipTurn, phase3Complete,
    activeTeamId, teams, currentRoundIndex, rounds,
  } = state;

  const activeTeam  = teams.find(t => t.id === activeTeamId);
  const isLastRound = currentRoundIndex >= rounds.length - 1;
  const anyAwaiting = phase3AwaitingSwap || phase3AwaitingSteal ||
                      phase3AwaitingGift || phase3AwaitingSwapScores ||
                      phase3AwaitingTax || phase3AwaitingSkipTurn;
  const turnDone    = phase3Complete || (phase3RevealsLeft === 0 && !anyAwaiting);
  const doorsOpened = phase3Doors.filter(d => d.revealed).length;

  return (
    <div className="phase3-wrapper">

      {/* ── Turn-over banner ──────────────────────────────────────────────── */}
      {turnDone && (
        <div className="phase3-done-banner">
          <div className="done-banner-inner">
            <span className="done-banner-text">
              🎉 Turn complete — <strong>{activeTeam?.name ?? 'Team'}</strong> ends with{' '}
              <strong className="done-score">{(activeTeam?.points ?? 0).toLocaleString()} pts</strong>
            </span>
            <button
              className="btn btn-gold btn-lg"
              onClick={() => dispatch({ type: 'RESET_ROUND' })}
            >
              {isLastRound ? '↺ Back to Round 1' : 'Next Round →'}
            </button>
          </div>
        </div>
      )}

      {/* ── HUD ───────────────────────────────────────────────────────────── */}
      <div className="phase3-hud">
        <div className="hud-item">
          <span className="hud-label">Active Team</span>
          <span className="hud-value" style={{ fontSize: '1rem' }}>
            {activeTeam ? activeTeam.name : '—'}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Score</span>
          <span className={`hud-value${activeTeam && activeTeam.points < 0 ? ' hud-danger' : ''}`}>
            {activeTeam ? activeTeam.points.toLocaleString() : '—'}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Reveals Left</span>
          <span className={`hud-value hud-cyan${phase3RevealsLeft === 0 ? ' hud-danger' : ''}`}>
            {phase3RevealsLeft}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Opened</span>
          <span className="hud-value" style={{ color: 'var(--muted-light)', fontSize: '1.2rem' }}>
            {doorsOpened} / {phase3Doors.length}
          </span>
        </div>
      </div>

      {/* ── Door grid (always visible) ────────────────────────────────────── */}
      <div className="phase3-grid-area">
        <div className="door-grid">
          {phase3Doors.map((door, i) => (
            <Door key={door.id} door={door} index={i} />
          ))}
        </div>
      </div>

      {/* ── Footer hint ───────────────────────────────────────────────────── */}
      {!turnDone && (
        <div className="phase3-footer">
          {phase3AwaitingSwap ? (
            <span className="footer-hint">Resolve the pass — click a team above 🔄</span>
          ) : phase3AwaitingSteal ? (
            <span className="footer-hint">Resolve the steal — see the banner above 💰</span>
          ) : phase3AwaitingGift ? (
            <span className="footer-hint">Choose who receives your gift 🎁</span>
          ) : phase3AwaitingSwapScores ? (
            <span className="footer-hint">Choose a team to swap total scores with 🔀</span>
          ) : phase3AwaitingTax ? (
            <span className="footer-hint">No single leader — pick a team to tax 💸</span>
          ) : phase3AwaitingSkipTurn ? (
            <span className="footer-hint">Pick a team to sit out the next turn 🚫</span>
          ) : (
            <span className="footer-hint">
              Click a door to reveal · {phase3RevealsLeft} {phase3RevealsLeft === 1 ? 'reveal' : 'reveals'} left
            </span>
          )}
        </div>
      )}
    </div>
  );
}

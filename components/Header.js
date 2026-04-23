import { useGame } from '../context/GameContext';

export default function Header() {
  const { state, dispatch } = useGame();
  const {
    teams, activeTeamId, view,
    phase3AwaitingSwap, phase3AwaitingSteal,
    phase3AwaitingGift, phase3AwaitingSwapScores, phase3AwaitingTax,
    phase3AwaitingSkipTurn,
  } = state;

  const handleTeamClick = (teamId) => {
    if (view !== 'game') return;
    dispatch({ type: 'SET_ACTIVE_TEAM', id: teamId });
  };

  const hasStealTargets = phase3AwaitingSteal &&
    teams.some(t => t.id !== activeTeamId && t.points > 0);

  return (
    <>
      <header className="game-header">
        <div className="header-logo">What&apos;s In <span>the</span> Box?</div>

        <div className="teams-rail">
          {teams.map((team) => {
            const isActive         = team.id === activeTeamId;
            const canSwapTo        = phase3AwaitingSwap        && !isActive;
            const canStealFrom     = phase3AwaitingSteal       && !isActive && team.points > 0;
            const canGiftTo        = phase3AwaitingGift        && !isActive;
            const canSwapScoresWith= phase3AwaitingSwapScores  && !isActive;
            const canTax           = phase3AwaitingTax         && !isActive;
            const canSkipTurn      = phase3AwaitingSkipTurn    && !isActive;

            const anyAwaiting = phase3AwaitingSwap || phase3AwaitingSteal ||
                                phase3AwaitingGift || phase3AwaitingSwapScores ||
                                phase3AwaitingTax || phase3AwaitingSkipTurn;
            const clickable = view === 'game' && (canSwapTo || !anyAwaiting);

            return (
              <div
                key={team.id}
                className={[
                  'team-card',
                  isActive  ? 'active'      : '',
                  canSwapTo ? 'swap-target' : '',
                ].join(' ')}
                onClick={clickable ? () => handleTeamClick(team.id) : undefined}
                title={canSwapTo ? `Pass turn to ${team.name}` : undefined}
              >
                <div className="team-name">{team.name}</div>
                <div className={`team-points${team.points < 0 ? ' negative' : ''}`}>
                  {team.points.toLocaleString()}
                </div>
                <div className="score-controls">
                  <button
                    className="score-btn minus"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ADJUST_SCORE', id: team.id, delta: -100 }); }}
                    title="-100"
                  >−</button>
                  <button
                    className="score-btn plus"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ADJUST_SCORE', id: team.id, delta: +100 }); }}
                    title="+100"
                  >+</button>
                </div>

                {canStealFrom && (
                  <button
                    className="action-btn steal-btn"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'COMPLETE_STEAL', targetId: team.id }); }}
                    title={`Steal ${Math.min(300, team.points)} from ${team.name}`}
                  >
                    Steal {Math.min(300, team.points)}
                  </button>
                )}

                {canGiftTo && (
                  <button
                    className="action-btn gift-btn"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'COMPLETE_GIFT', targetId: team.id }); }}
                    title={`Give 300 to ${team.name}`}
                  >
                    Gift 300
                  </button>
                )}

                {canSwapScoresWith && (
                  <button
                    className="action-btn swap-scores-btn"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'COMPLETE_SWAP_SCORES', targetId: team.id }); }}
                    title={`Swap scores with ${team.name}`}
                  >
                    Swap ({team.points.toLocaleString()})
                  </button>
                )}

                {canTax && (
                  <button
                    className="action-btn tax-btn"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'COMPLETE_TAX', targetId: team.id }); }}
                    title={`Tax ${team.name} 500 points`}
                  >
                    Tax ({team.points.toLocaleString()})
                  </button>
                )}

                {canSkipTurn && (
                  <button
                    className="action-btn skip-btn"
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'COMPLETE_SKIP_TURN', targetId: team.id }); }}
                    title={`${team.name} sits out the next turn`}
                  >
                    Sit Out
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="header-actions">
          {view === 'game' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => dispatch({ type: 'BACK_TO_SETTINGS' })}
            >
              ⚙ Settings
            </button>
          )}
          {view === 'game' && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--warn)' }}
              onClick={() => dispatch({ type: 'RESET_ROUND' })}
            >
              ↻ Next Round
            </button>
          )}
        </div>
      </header>

      {/* ── Status banners ────────────────────────────────────────────────── */}
      {view === 'game' && phase3AwaitingSwap && (
        <div className="status-banner swap">
          🔄 PASS THE TURN! Click a team to transfer the remaining {state.phase3RevealsLeft} reveal(s).
        </div>
      )}
      {view === 'game' && phase3AwaitingSteal && (
        <div className="status-banner steal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {hasStealTargets ? (
            <span>💰 STEAL! Click a team&apos;s Steal button — up to 300 (or whatever they have).</span>
          ) : (
            <>
              <span>💰 STEAL! No team has points available to steal.</span>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--orange)', color: '#fff', padding: '4px 14px', fontSize: '0.75rem' }}
                onClick={() => dispatch({ type: 'SKIP_STEAL' })}
              >
                Skip Steal
              </button>
            </>
          )}
        </div>
      )}
      {view === 'game' && phase3AwaitingGift && (
        <div className="status-banner gift">
          🎁 GIFT 300! Click a team to give them 300 points (comes out of your own score).
        </div>
      )}
      {view === 'game' && phase3AwaitingSwapScores && (
        <div className="status-banner swap-scores">
          🔀 SWAP SCORES! Click a team to swap your total score with theirs.
        </div>
      )}
      {view === 'game' && phase3AwaitingTax && (
        <div className="status-banner tax">
          💸 TAX! No single leader — click a team&apos;s Tax button to take 500 from them.
        </div>
      )}
      {view === 'game' && phase3AwaitingSkipTurn && (
        <div className="status-banner skip">
          🚫 SIT OUT! Pick the team that will skip the next turn (host enforces).
        </div>
      )}
    </>
  );
}

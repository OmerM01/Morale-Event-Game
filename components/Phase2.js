import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

// ── Media helpers ────────────────────────────────────────────────────────────
function parseYouTubeId(url) {
  if (!url) return null;
  // Handles: youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>, youtube.com/v/<id>, youtube.com/shorts/<id>
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{6,})/
  );
  return m ? m[1] : null;
}

function isImageUrl(url) {
  if (!url) return false;
  if (String(url).startsWith('data:image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(url);
}

export default function Phase2() {
  const { state, dispatch } = useGame();
  const {
    rounds, currentRoundIndex,
    phase2Items, phase2Submitted, phase2ShowResults, phase2EndTurn, phase2RevealCount,
    activeTeamId, teams,
  } = state;

  const round = rounds[currentRoundIndex];
  const challengeType = round?.phase2?.challengeType ?? 'sort_list';

  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false); // media: host peek
  const [mediaStarted, setMediaStarted] = useState(false); // YouTube: iframe only mounts after play

  // Reset per round
  useEffect(() => {
    setTimeLeft(60);
    setIsRunning(false);
    setShowAnswer(false);
    setMediaStarted(false);
  }, [currentRoundIndex, challengeType]);

  // Timer tick (shared for both challenge types)
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) setIsRunning(false);
  }, [timeLeft]);

  const activeTeam   = teams.find(t => t.id === activeTeamId);
  const correctItems = round?.phase2?.items ?? [];
  const media        = round?.phase2?.media ?? { url: '', question: '', answer: '', reward: 2 };

  const timerClass =
    timeLeft <= 10 ? 'timer-display danger' :
    timeLeft <= 20 ? 'timer-display warn'   : 'timer-display';

  if (!round) return null;

  // ── Results screen (sort list and media-incorrect share this) ─────────────
  if (phase2ShowResults) {
    const isMedia = challengeType === 'media_trivia';

    // For media trivia, skip the per-item table — render a simple "incorrect" view.
    if (isMedia) {
      return (
        <div className="phase-container">
          <div className="phase-tag p2">Phase 2 — Results</div>
          <div className="results-card">
            <h2 className="results-title">{media.question || '(Media question)'}</h2>

            <div className="media-answer-reveal">
              <div className="answer-label">Correct Answer</div>
              <div className="answer-value" style={{ fontSize: '2.2rem' }}>{media.answer || '—'}</div>
            </div>

            <div className="results-endturn" style={{ marginTop: 24 }}>
              <div className="endturn-headline">Incorrect</div>
              <p className="endturn-sub">No reveals earned — better luck next round!</p>
              <button className="btn btn-gold btn-lg" style={{ marginTop: 20 }}
                onClick={() => dispatch({ type: 'RESET_ROUND' })}>
                Next Round →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Sort-list results (original behavior)
    const results = phase2Items.map((item, i) => ({
      pos: i + 1,
      submitted: item,
      correct: correctItems[i],
      ok: item === correctItems[i],
    }));
    const correctCount = results.filter(r => r.ok).length;

    return (
      <div className="phase-container">
        <div className="phase-tag p2">Phase 2 — Results</div>

        <div className="results-card">
          <h2 className="results-title">{round?.phase2?.title}</h2>

          <div className="results-table">
            <div className="results-header-row">
              <span className="rh-pos">#</span>
              <span className="rh-col">Your Order</span>
              <span className="rh-col">Correct Order</span>
              <span className="rh-mark" />
            </div>
            {results.map((r) => (
              <div key={r.pos} className={`results-row ${r.ok ? 'row-correct' : 'row-wrong'}`}>
                <span className="r-pos">{r.pos}</span>
                <span className="r-submitted">{r.submitted}</span>
                <span className="r-correct">{r.correct}</span>
                <span className={`r-mark ${r.ok ? 'mark-ok' : 'mark-no'}`}>
                  {r.ok ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>

          <div className="results-score-line">
            <span className="score-fraction">{correctCount}<span>/4</span></span>
            <span className="score-label">correct</span>
          </div>

          {phase2EndTurn ? (
            <div className="results-endturn">
              <div className="endturn-headline">No Reveals Earned</div>
              <p className="endturn-sub">Better luck next round!</p>
              <button className="btn btn-gold btn-lg" style={{ marginTop: 20 }}
                onClick={() => dispatch({ type: 'RESET_ROUND' })}>
                Next Round →
              </button>
            </div>
          ) : (
            <div className="results-reveals">
              <div className="reveals-earned">
                <span className="reveals-number">{phase2RevealCount}</span>
                <span className="reveals-label">
                  Reveal{phase2RevealCount !== 1 ? 's' : ''} Earned
                </span>
              </div>
              <button className="btn btn-gold btn-xl" onClick={() => dispatch({ type: 'GO_TO_PHASE3' })}>
                ✦ Enter the Doors!
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Shared header row ─────────────────────────────────────────────────────
  const header = (
    <>
      <div className="round-indicator">Round {currentRoundIndex + 1} of {rounds.length}</div>
      <div className="phase-tag p2">
        Phase 2 — {challengeType === 'media_trivia' ? 'Media Challenge' : 'List Task'}
      </div>
      {activeTeam && (
        <p className="active-hint">
          Active: <strong>{activeTeam.name}</strong>
        </p>
      )}
    </>
  );

  const timerControls = (
    <div className="timer-block" style={{ marginBottom: 20 }}>
      <div className={timerClass} style={{ fontSize: '3.5rem' }}>
        {String(timeLeft).padStart(2, '0')}
      </div>
      <div className="timer-controls">
        <button className="btn btn-neon btn-sm" onClick={() => {
          if (isRunning) { setIsRunning(false); }
          else { if (timeLeft === 0) setTimeLeft(60); setIsRunning(true); }
        }}>
          {isRunning ? '⏸ Pause' : timeLeft === 0 ? '↺ Restart' : '▶ Start'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => { setIsRunning(false); setTimeLeft(60); }}>
          ↺ Reset
        </button>
      </div>
    </div>
  );

  // ── Media Trivia view ─────────────────────────────────────────────────────
  if (challengeType === 'media_trivia') {
    const ytId = parseYouTubeId(media.url);
    const img  = !ytId && isImageUrl(media.url);

    return (
      <div className="phase-container phase2-media-container" style={{ paddingTop: 16 }}>
        {header}

        <div className="media-stage">
          {ytId ? (
            mediaStarted ? (
              <iframe
                key={ytId}
                className="media-iframe"
                // autoplay=1 starts the video immediately on mount; rel/modestbranding/showinfo hide related/title overlays as best we can
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&playsinline=1`}
                title="Media challenge"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                className="media-play-cover"
                onClick={() => { setMediaStarted(true); if (timeLeft > 0) setIsRunning(true); }}
                title="Play video"
              >
                <span className="media-play-icon">▶</span>
                <span className="media-play-label">Click to play</span>
                <span className="media-play-sub">Video is hidden until you press play</span>
              </button>
            )
          ) : img ? (
            <img className="media-image" src={media.url} alt="Media challenge" />
          ) : media.url ? (
            <div className="media-fallback">
              <a href={media.url} target="_blank" rel="noreferrer">{media.url}</a>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 8 }}>
                (Unrecognized media — open link in a new tab)
              </div>
            </div>
          ) : (
            <div className="media-fallback">
              <em style={{ color: 'var(--muted)' }}>No media URL set for this round.</em>
            </div>
          )}
        </div>

        <div className="media-question-card">
          <p className="media-question-text">{media.question || '(No question entered)'}</p>
        </div>

        {timerControls}

        <div className="media-adjudication">
          {!showAnswer ? (
            <button className="btn btn-neon btn-sm" onClick={() => setShowAnswer(true)}>
              👁 Check Answer
            </button>
          ) : (
            <div className="media-answer-peek">
              <span className="answer-label">Answer</span>
              <span className="media-answer-text">{media.answer || '—'}</span>
            </div>
          )}

          <div className="media-adjudication-buttons">
            <button
              className="btn btn-gold btn-lg"
              onClick={() => dispatch({ type: 'PHASE2_MEDIA_CORRECT' })}
              title={`Award ${media.reward ?? 2} reveal(s) and move to the doors`}
            >
              ✓ Correct — Award {media.reward ?? 2} Reveal{(media.reward ?? 2) !== 1 ? 's' : ''}
            </button>
            <button
              className="btn btn-outline btn-lg"
              style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
              onClick={() => dispatch({ type: 'PHASE2_MEDIA_INCORRECT' })}
            >
              ✗ Incorrect — 0 Reveals
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sort List view (original) ─────────────────────────────────────────────
  return (
    <div className="phase-container" style={{ paddingTop: 16 }}>
      {header}

      <div className="phase2-container">
        <p className="list-title">{round.phase2.title || '(No list title)'}</p>

        {timerControls}

        <div className="list-items">
          {phase2Items.map((item, i) => (
            <div className="list-item" key={i}>
              <div className="item-rank">{i + 1}</div>
              <div className="item-text">{item || `Item ${i + 1}`}</div>
              <div className="item-move-btns">
                <button className="move-btn" disabled={i === 0}
                  onClick={() => dispatch({ type: 'PHASE2_MOVE', from: i, to: i - 1 })}>▲</button>
                <button className="move-btn" disabled={i === phase2Items.length - 1}
                  onClick={() => dispatch({ type: 'PHASE2_MOVE', from: i, to: i + 1 })}>▼</button>
              </div>
            </div>
          ))}
        </div>

        <div className="phase2-actions">
          <button className="btn btn-gold btn-lg" onClick={() => dispatch({ type: 'PHASE2_SUBMIT' })}>
            Lock In Order
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';

// Read a file and downscale if needed so it fits comfortably in localStorage.
// Returns a data URL (JPEG) suitable for <img src=... />.
function fileToResizedDataUrl(file, { maxDim = 1280, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onerror = () => reject(new Error('Unable to decode image'));
      img.onload = () => {
        const { width, height } = img;
        // If already small, keep original bytes (preserves transparency for PNG, etc.)
        if (width <= maxDim && height <= maxDim && file.size < 400_000) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(maxDim / width, maxDim / height, 1);
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const { state, dispatch } = useGame();
  const { teams, rounds } = state;
  const [newTeamName, setNewTeamName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const addTeam = () => {
    const name = newTeamName.trim();
    if (!name) return;
    dispatch({ type: 'ADD_TEAM', name });
    setNewTeamName('');
  };

  const canStart = teams.length >= 2 && rounds.length >= 1;

  return (
    <div className="settings-view">
      <div className="settings-title">Game Setup</div>
      <div className="settings-subtitle">Configure teams and content before going live.</div>

      {/* ── Teams ───────────────────────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-header">
          <span className="section-label">Teams</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {teams.length} team{teams.length !== 1 ? 's' : ''}
          </span>
        </div>

        {teams.map((team, i) => (
          <div className="team-row" key={team.id}>
            <div className="team-row-badge">{i + 1}</div>
            <input
              className="text-input"
              value={team.name}
              onChange={(e) => dispatch({ type: 'UPDATE_TEAM_NAME', id: team.id, name: e.target.value })}
              placeholder="Team name"
            />
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => dispatch({ type: 'REMOVE_TEAM', id: team.id })}
              title="Remove team"
            >✕</button>
          </div>
        ))}

        <div className="team-row" style={{ marginTop: 12 }}>
          <input
            className="text-input"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTeam()}
            placeholder="New team name…"
          />
          <button className="btn btn-outline btn-sm" onClick={addTeam}>+ Add</button>
        </div>
      </div>

      {/* ── Rounds ──────────────────────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-header">
          <span className="section-label">Rounds</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {rounds.length} round{rounds.length !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPresets(s => !s)}
            >
              {showPresets ? 'Hide Presets' : '📦 Presets'}
            </button>
          </div>
        </div>

        {showPresets && <PresetsPanel rounds={rounds} dispatch={dispatch} />}

        {rounds.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 12 }}>
            No rounds yet. Add one below.
          </p>
        )}

        {rounds.map((round, ri) => (
          <RoundEditor
            key={round.id}
            round={round}
            index={ri}
            total={rounds.length}
            dispatch={dispatch}
          />
        ))}

        <button
          className="btn btn-outline btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => dispatch({ type: 'ADD_ROUND' })}
        >
          + Add Round
        </button>
      </div>

      {!canStart && (
        <div className="warning-box">
          {teams.length < 2 ? 'Add at least 2 teams. ' : ''}
          {rounds.length < 1 ? 'Add at least 1 round.' : ''}
        </div>
      )}

      <div className="settings-footer">
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--danger)' }}
          onClick={() => {
            if (confirm('Reset all team scores to 0?')) dispatch({ type: 'RESET_ALL_SCORES' });
          }}
        >
          Reset Scores
        </button>
        <button
          className="btn btn-gold btn-lg"
          disabled={!canStart}
          onClick={() => dispatch({ type: 'START_GAME' })}
        >
          🎬 Start Game
        </button>
      </div>
    </div>
  );
}

function RoundEditor({ round, index, total, dispatch }) {
  const [open, setOpen] = useState(index === 0);
  const isFirst = index === 0;
  const isLast  = index === total - 1;

  return (
    <div className="round-card">
      <div className="round-card-header">
        <span className="round-badge">Round {index + 1}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => dispatch({ type: 'MOVE_ROUND', from: index, to: index - 1 })}
            disabled={isFirst}
            title="Move round up"
          >▲</button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => dispatch({ type: 'MOVE_ROUND', from: index, to: index + 1 })}
            disabled={isLast}
            title="Move round down"
          >▼</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
            {open ? 'Collapse' : 'Expand'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger)' }}
            onClick={() => {
              if (confirm(`Delete Round ${index + 1}?`)) dispatch({ type: 'REMOVE_ROUND', id: round.id });
            }}
          >✕</button>
        </div>
      </div>

      {open && (
        <>
          {/* Phase 1 */}
          <div className="phase-block">
            <div className="phase-block-label">Phase 1 — Closest-To</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                className="text-input"
                value={round.phase1.question}
                onChange={(e) => dispatch({ type: 'UPDATE_ROUND_FIELD', id: round.id, phase: 'phase1', field: 'question', value: e.target.value })}
                placeholder="Question text…"
              />
              <input
                className="number-input"
                type="number"
                value={round.phase1.answer}
                onChange={(e) => dispatch({ type: 'UPDATE_ROUND_FIELD', id: round.id, phase: 'phase1', field: 'answer', value: e.target.value })}
                placeholder="Numerical answer"
              />
            </div>
          </div>

          {/* Phase 2 */}
          <div className="phase-block">
            <div className="phase-block-label">Phase 2 — Challenge</div>

            {/* Challenge type toggle */}
            <div className="challenge-type-toggle" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className={`chtype-btn ${(round.phase2.challengeType ?? 'sort_list') === 'sort_list' ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'UPDATE_ROUND_FIELD', id: round.id, phase: 'phase2', field: 'challengeType', value: 'sort_list' })}
              >
                ≡ Sort List
              </button>
              <button
                type="button"
                className={`chtype-btn ${round.phase2.challengeType === 'media_trivia' ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'UPDATE_ROUND_FIELD', id: round.id, phase: 'phase2', field: 'challengeType', value: 'media_trivia' })}
              >
                ▶ Media Trivia
              </button>
            </div>

            {(round.phase2.challengeType ?? 'sort_list') === 'sort_list' ? (
              <>
                <input
                  className="text-input"
                  style={{ marginBottom: 12 }}
                  value={round.phase2.title}
                  onChange={(e) => dispatch({ type: 'UPDATE_ROUND_FIELD', id: round.id, phase: 'phase2', field: 'title', value: e.target.value })}
                  placeholder="List task title / instructions…"
                />
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Items in correct order (1 = first / highest)
                </div>
                <div className="items-grid">
                  {round.phase2.items.map((item, i) => (
                    <div className="item-label-row" key={i}>
                      <div className="item-num">{i + 1}</div>
                      <input
                        className="text-input"
                        value={item}
                        onChange={(e) => dispatch({ type: 'UPDATE_ROUND_ITEM', id: round.id, index: i, value: e.target.value })}
                        placeholder={`Item ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <MediaUrlField
                  url={round.phase2.media?.url ?? ''}
                  onChange={(value) => dispatch({ type: 'UPDATE_ROUND_MEDIA', id: round.id, field: 'url', value })}
                />
                <input
                  className="text-input"
                  value={round.phase2.media?.question ?? ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_ROUND_MEDIA', id: round.id, field: 'question', value: e.target.value })}
                  placeholder="Question (e.g. 'What is this song based on?')"
                />
                <input
                  className="text-input"
                  value={round.phase2.media?.answer ?? ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_ROUND_MEDIA', id: round.id, field: 'answer', value: e.target.value })}
                  placeholder="Correct answer (host-only)"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Reward (grid reveals)
                  </label>
                  <input
                    className="number-input"
                    type="number"
                    min="0"
                    max="10"
                    value={round.phase2.media?.reward ?? 2}
                    onChange={(e) => dispatch({ type: 'UPDATE_ROUND_MEDIA', id: round.id, field: 'reward', value: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Media URL + Upload field ─────────────────────────────────────────────────
function MediaUrlField({ url, onChange }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isDataUrl = typeof url === 'string' && url.startsWith('data:image/');
  const isImage = isDataUrl ||
    /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(url || '');

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <input
          className="text-input"
          value={isDataUrl ? '(uploaded image)' : url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Media URL (YouTube link or image URL)"
          readOnly={isDataUrl}
          style={{ flex: 1, fontStyle: isDataUrl ? 'italic' : 'normal', color: isDataUrl ? 'var(--muted)' : undefined }}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{ whiteSpace: 'nowrap' }}
        >
          {busy ? '…' : '📷 Upload'}
        </button>
        {url && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { onChange(''); setError(''); }}
            title="Clear media"
          >✕</button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePick}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</div>
      )}

      {isImage && url && (
        <div className="media-thumb-wrap">
          <img src={url} alt="Media preview" className="media-thumb" />
          <span className="media-thumb-hint">
            {isDataUrl ? 'Uploaded image (stored in this round)' : 'Image preview'}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Presets: export / import / named browser presets ────────────────────────
const PRESETS_KEY = 'witb-presets';

function readPresets() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch { return {}; }
}
function writePresets(presets) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch {}
}

function PresetsPanel({ rounds, dispatch }) {
  const fileRef = useRef(null);
  const [presets, setPresets] = useState({});
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState('');

  // Load presets on mount
  useEffect(() => { setPresets(readPresets()); }, []);

  const showStatus = (msg) => {
    setStatus(msg);
    const id = setTimeout(() => setStatus(''), 2500);
    return () => clearTimeout(id);
  };

  const savePreset = () => {
    const name = newName.trim();
    if (!name) { showStatus('Give the preset a name first.'); return; }
    if (!rounds.length) { showStatus('Add at least one round before saving.'); return; }
    const next = { ...presets, [name]: { savedAt: Date.now(), rounds } };
    writePresets(next);
    setPresets(next);
    setNewName('');
    showStatus(`Saved "${name}".`);
  };

  const loadPreset = (name) => {
    const p = presets[name];
    if (!p) return;
    if (!confirm(`Replace current rounds with preset "${name}"?`)) return;
    dispatch({ type: 'REPLACE_ROUNDS', rounds: p.rounds });
    showStatus(`Loaded "${name}".`);
  };

  const deletePreset = (name) => {
    if (!confirm(`Delete preset "${name}"?`)) return;
    const next = { ...presets };
    delete next[name];
    writePresets(next);
    setPresets(next);
  };

  const exportToFile = () => {
    const data = {
      app: 'whats-in-the-box',
      version: 1,
      exportedAt: new Date().toISOString(),
      rounds,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `witb-rounds-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('Downloaded JSON file.');
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data) ? data : data.rounds;
      if (!Array.isArray(incoming) || incoming.length === 0) {
        showStatus('File does not contain any rounds.');
        return;
      }
      if (!confirm(`Import ${incoming.length} round(s)? Current rounds will be replaced.`)) return;
      dispatch({ type: 'REPLACE_ROUNDS', rounds: incoming });
      showStatus(`Imported ${incoming.length} round(s).`);
    } catch (err) {
      showStatus('Could not read file: ' + (err?.message || 'invalid JSON'));
    }
  };

  const names = Object.keys(presets).sort();

  return (
    <div className="presets-panel">
      <div className="presets-row">
        <button className="btn btn-outline btn-sm" onClick={exportToFile}>
          ⬇ Export to File
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
          ⬆ Import from File
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={onImportFile}
        />
      </div>

      <div className="presets-row">
        <input
          className="text-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Preset name (saved in this browser)…"
          onKeyDown={(e) => e.key === 'Enter' && savePreset()}
        />
        <button className="btn btn-outline btn-sm" onClick={savePreset}>
          💾 Save Current
        </button>
      </div>

      {names.length > 0 ? (
        <div className="presets-list">
          {names.map(name => {
            const p = presets[name];
            return (
              <div className="preset-item" key={name}>
                <div className="preset-info">
                  <div className="preset-name">{name}</div>
                  <div className="preset-meta">
                    {p.rounds?.length ?? 0} round{(p.rounds?.length ?? 0) !== 1 ? 's' : ''}
                    {p.savedAt ? ` · ${new Date(p.savedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => loadPreset(name)}>Load</button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => deletePreset(name)}
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="presets-empty">
          No saved presets yet. Type a name above and click Save Current. Use Export for another computer.
        </p>
      )}

      {status && <div className="presets-status">{status}</div>}
    </div>
  );
}

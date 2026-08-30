import { useEffect, useState } from 'react';
import { Octokit } from '@octokit/rest';
import './App.css';

type SubmissionData = {
  submissionId: number;
  code: string;
  lang: string;
  title: string;
  titleSlug: string;
  questionId: string;
  questionFrontendId: string;
  difficulty: string;
  topicTags: { name: string; slug: string; translatedName: string | null }[];
  runtime: string;
  memory: string;
  capturedAt: number;
};

type LeetflowConfig = {
  githubToken: string;
  owner: string;
  repo: string;
};

const EXTENSION_MAP: Record<string, string> = {
  java: 'java', python: 'py', python3: 'py', javascript: 'js',
  typescript: 'ts', cpp: 'cpp', c: 'c', csharp: 'cs', golang: 'go',
  kotlin: 'kt', swift: 'swift', rust: 'rs', ruby: 'rb', scala: 'scala', php: 'php',
};

const NEW_FOLDER_OPTION = '__new__';

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function toPascalCase(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Looks for a line like "// Approach: HashMap" or "# Technique: Two Pointers"
// in the first 10 lines of the code, regardless of language/comment syntax.
function extractApproachTag(code: string): string | null {
  const lines = code.split('\n').slice(0, 10);
  for (const rawLine of lines) {
    const cleaned = rawLine
      .replace(/^[\s/*#-]+/, '')
      .replace(/\*+\/\s*$/, '')
      .trim();
    const match = cleaned.match(/^(?:approach|technique)\s*[:\-]\s*(.+)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

function difficultyClass(difficulty: string): string {
  const d = difficulty.toLowerCase();
  if (d === 'easy') return 'badge badge--easy';
  if (d === 'medium') return 'badge badge--medium';
  if (d === 'hard') return 'badge badge--hard';
  return 'badge';
}

function App() {
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LeetflowConfig | null>(null);

  const [filename, setFilename] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  const [folders, setFolders] = useState<string[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const [codeExpanded, setCodeExpanded] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [overwriteConfirmed, setOverwriteConfirmed] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ type: 'pending' | 'success' | 'error' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      browser.storage.local.get('leetsyncLatestSubmission'),
      browser.storage.local.get('leetflowConfig'),
    ]).then(([subResult, configResult]) => {
      const sub = (subResult.leetsyncLatestSubmission as SubmissionData) ?? null;
      const cfg = (configResult.leetflowConfig as LeetflowConfig) ?? null;

      setSubmission(sub);
      setConfig(cfg);

      if (sub) {
        const ext = EXTENSION_MAP[sub.lang] ?? 'txt';
        const approach = extractApproachTag(sub.code);
        const baseTitle = toPascalCase(sub.title);

        if (approach) {
          setFilename(`${sub.questionFrontendId}_${baseTitle}_${toPascalCase(approach)}.${ext}`);
          setCommitMessage(`Solved ${sub.questionFrontendId}. ${sub.title} using ${approach}`);
        } else {
          setFilename(`${sub.questionFrontendId}_${baseTitle}.${ext}`);
          setCommitMessage(
            `Solved ${sub.questionFrontendId}. ${sub.title} — ${sub.topicTags.map((t) => t.name).join(', ')}`
          );
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!config) return;
    setFoldersLoading(true);
    const octokit = new Octokit({ auth: config.githubToken });
    octokit.rest.repos
      .getContent({ owner: config.owner, repo: config.repo, path: '' })
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          const dirs = data.filter((item) => item.type === 'dir').map((item) => item.name);
          setFolders(dirs);
          if (dirs.length > 0) setSelectedFolder(dirs[0]);
        }
      })
      .catch((err) => console.error('[LeetFlow] failed to list folders:', err))
      .finally(() => setFoldersLoading(false));
  }, [config]);

  const activeFolder = selectedFolder === NEW_FOLDER_OPTION ? newFolderName.trim() : selectedFolder;
  const destinationPath = activeFolder && filename ? `${activeFolder}/${filename}` : null;

  // Check whether the target path already has a file — resets the confirm
  // gate any time the destination actually changes.
  useEffect(() => {
    setOverwriteConfirmed(false);
    if (!config || !destinationPath) {
      setFileExists(false);
      return;
    }
    const timer = setTimeout(() => {
      const octokit = new Octokit({ auth: config.githubToken });
      octokit.rest.repos
        .getContent({ owner: config.owner, repo: config.repo, path: destinationPath })
        .then(() => setFileExists(true))
        .catch(() => setFileExists(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [config, destinationPath]);

  async function handlePush() {
    if (!submission || !config) return;

    if (!activeFolder) {
      setPushStatus({ type: 'error', message: 'Choose or name a folder first.' });
      return;
    }
    if (!filename.trim()) {
      setPushStatus({ type: 'error', message: 'Filename is empty.' });
      return;
    }

    // First click on a collision only asks for confirmation — nothing is
    // written to GitHub yet.
    if (fileExists && !overwriteConfirmed) {
      setOverwriteConfirmed(true);
      setPushStatus({
        type: 'warning',
        message: 'A file already exists at this path. Click "Confirm Overwrite" to replace it, or change the filename to keep both.',
      });
      return;
    }

    setPushStatus({ type: 'pending', message: overwriteConfirmed ? 'Overwriting…' : 'Pushing…' });
    try {
      const octokit = new Octokit({ auth: config.githubToken });
      const path = `${activeFolder}/${filename.trim()}`;

      let existingSha: string | undefined;
      try {
        const existing = await octokit.rest.repos.getContent({ owner: config.owner, repo: config.repo, path });
        if (!Array.isArray(existing.data)) existingSha = existing.data.sha;
      } catch (err: any) {
        if (err.status !== 404) throw err;
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: config.owner,
        repo: config.repo,
        path,
        message: commitMessage.trim() || `Add solution: ${submission.title}`,
        content: toBase64(submission.code),
        ...(existingSha ? { sha: existingSha } : {}),
      });

      setPushStatus({ type: 'success', message: existingSha ? `Updated ${path}` : `Pushed to ${path}` });
      setOverwriteConfirmed(false);

      if (selectedFolder === NEW_FOLDER_OPTION && activeFolder) {
        setFolders((prev) => [...prev, activeFolder].sort());
        setSelectedFolder(activeFolder);
        setNewFolderName('');
      }
    } catch (err: any) {
      let message = err.message ?? 'Unknown error';
      if (err.status === 401) message = 'GitHub token is invalid or expired — update it in Options.';
      else if (err.status === 403) message = 'Rate limited, or token lacks permission for this repo.';
      else if (err.status === 404) message = 'Repo not found — check owner/repo in Options.';
      setPushStatus({ type: 'error', message });
    }
  }

  if (loading) {
    return (
      <div className="popup">
        <div className="popup__header">
          <span className="popup__logo">Leet<span className="popup__logo-accent">Flow</span></span>
        </div>
        <div className="empty-state">Loading…</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="popup">
        <div className="popup__header">
          <span className="popup__logo">Leet<span className="popup__logo-accent">Flow</span></span>
        </div>
        <div className="empty-state">No accepted submission captured yet.<br />Solve and submit a problem on LeetCode to get started.</div>
      </div>
    );
  }

  let buttonLabel = 'Push to GitHub';
  if (pushStatus?.type === 'pending') buttonLabel = overwriteConfirmed ? 'Overwriting…' : 'Pushing…';
  else if (fileExists && overwriteConfirmed) buttonLabel = 'Confirm Overwrite';
  else if (fileExists) buttonLabel = 'File exists — Push anyway?';

  return (
    <div className="popup">
      <div className="popup__header">
        <span className="popup__logo">Leet<span className="popup__logo-accent">Flow</span></span>
      </div>
      <p className="popup__timestamp">Captured {new Date(submission.capturedAt).toLocaleString()}</p>

      <div className="card">
        <p className="problem-title">{submission.questionFrontendId}. {submission.title}</p>
        <div className="meta-row">
          <span className={difficultyClass(submission.difficulty)}>{submission.difficulty}</span>
          <span className="stat">{submission.lang}</span>
          <span className="stat">{submission.runtime}</span>
          <span className="stat">{submission.memory}</span>
        </div>
        <div className="tags">
          {submission.topicTags.map((tag) => (
            <span key={tag.slug} className="tag">{tag.name}</span>
          ))}
        </div>
      </div>

      <div className="code-window">
        <div className="code-window__chrome" onClick={() => setCodeExpanded((v) => !v)}>
          <span className="code-window__dot" />
          <span className="code-window__dot" />
          <span className="code-window__dot" />
          <span className="code-window__filename">{filename || 'solution'}</span>
          <span className="code-window__toggle">{codeExpanded ? 'Hide' : 'View'}</span>
        </div>
        {codeExpanded && <pre>{submission.code}</pre>}
      </div>

      <div className="field">
        <label>Filename</label>
        <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} />
      </div>

      <div className="field">
        <label>Commit message</label>
        <input type="text" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} />
      </div>

      <div className="field">
        <label>Folder</label>
        {foldersLoading ? (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading folders…</p>
        ) : (
          <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)}>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
            <option value={NEW_FOLDER_OPTION}>+ Create new folder…</option>
          </select>
        )}
      </div>

      {selectedFolder === NEW_FOLDER_OPTION && (
        <div className="field">
          <label>New folder name</label>
          <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g. Trees" />
        </div>
      )}

      {destinationPath && (
        <div className="destination">
          <span>→</span>
          <span className="destination__path">{destinationPath}</span>
        </div>
      )}

      {fileExists && (
        <div className="status status--warning">
          A file already exists at this path. Rename to keep both, or push twice to confirm overwrite.
        </div>
      )}

      <button className="push-button" onClick={handlePush} disabled={pushStatus?.type === 'pending'}>
        {buttonLabel}
      </button>

      {pushStatus && pushStatus.type !== 'warning' && (
        <div className={`status status--${pushStatus.type}`}>
          {pushStatus.type === 'success' ? '✓ ' : pushStatus.type === 'error' ? '✕ ' : ''}{pushStatus.message}
        </div>
      )}
    </div>
  );
}

export default App;
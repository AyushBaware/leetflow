import { useEffect, useState } from 'react';
import { Octokit } from '@octokit/rest';

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

  const [pushStatus, setPushStatus] = useState<string | null>(null);

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
        setFilename(`${sub.questionFrontendId}-${sub.titleSlug}.${ext}`);
        setCommitMessage(`Solved ${sub.questionFrontendId}. ${sub.title}`);
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

  async function handlePush() {
    if (!submission || !config) return;

    const folder = selectedFolder === NEW_FOLDER_OPTION ? newFolderName.trim() : selectedFolder;
    if (!folder) {
      setPushStatus('❌ Choose or name a folder first.');
      return;
    }
    if (!filename.trim()) {
      setPushStatus('❌ Filename is empty.');
      return;
    }

    setPushStatus('Pushing…');
    try {
      const octokit = new Octokit({ auth: config.githubToken });
      const path = `${folder}/${filename.trim()}`;

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: config.owner,
        repo: config.repo,
        path,
        message: commitMessage.trim() || `Add solution: ${submission.title}`,
        content: toBase64(submission.code),
      });

      setPushStatus(`✅ Pushed to ${path}`);
    } catch (err: any) {
      setPushStatus(`❌ Push failed: ${err.message ?? 'unknown error'}`);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', width: '320px', fontFamily: 'sans-serif' }}>
        <h3>LeetFlow</h3>
        <p>Loading…</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={{ padding: '16px', width: '320px', fontFamily: 'sans-serif' }}>
        <h3>LeetFlow</h3>
        <p>No accepted submission captured yet. Solve and submit a problem on LeetCode to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', width: '320px', fontFamily: 'sans-serif' }}>
      <h3 style={{ marginBottom: '4px' }}>LeetFlow</h3>
      <p style={{ margin: '0 0 12px', color: '#888', fontSize: '12px' }}>
        Captured {new Date(submission.capturedAt).toLocaleString()}
      </p>

      <div style={{ marginBottom: '8px' }}>
        <strong>{submission.questionFrontendId}. {submission.title}</strong>
      </div>

      <div style={{ marginBottom: '8px', fontSize: '13px' }}>
        <span>{submission.difficulty}</span> · <span>{submission.lang}</span> ·{' '}
        <span>{submission.runtime}</span> · <span>{submission.memory}</span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        {submission.topicTags.map((tag) => (
          <span key={tag.slug} style={{
            display: 'inline-block', fontSize: '11px', background: '#eee',
            borderRadius: '4px', padding: '2px 6px', marginRight: '4px', marginBottom: '4px',
          }}>
            {tag.name}
          </span>
        ))}
      </div>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: '13px' }}>View code</summary>
        <pre style={{
          fontSize: '11px', background: '#f5f5f5', padding: '8px',
          borderRadius: '4px', overflowX: 'auto', maxHeight: '200px',
        }}>
          {submission.code}
        </pre>
      </details>

      <hr style={{ margin: '12px 0' }} />

      <label style={{ display: 'block', fontSize: '12px', marginBottom: '10px' }}>
        Filename
        <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '5px', marginTop: '3px' }} />
      </label>

      <label style={{ display: 'block', fontSize: '12px', marginBottom: '10px' }}>
        Commit message
        <input type="text" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '5px', marginTop: '3px' }} />
      </label>

      <label style={{ display: 'block', fontSize: '12px', marginBottom: '10px' }}>
        Folder
        {foldersLoading ? (
          <p style={{ fontSize: '12px', color: '#888' }}>Loading folders…</p>
        ) : (
          <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '5px', marginTop: '3px' }}>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
            <option value={NEW_FOLDER_OPTION}>+ Create new folder…</option>
          </select>
        )}
      </label>

      {selectedFolder === NEW_FOLDER_OPTION && (
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '10px' }}>
          New folder name
          <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Arrays"
            style={{ display: 'block', width: '100%', padding: '5px', marginTop: '3px' }} />
        </label>
      )}

      <button onClick={handlePush} style={{ marginTop: '8px', padding: '6px 14px' }}>
        Push to GitHub
      </button>
      {pushStatus && <p style={{ marginTop: '8px', fontSize: '12px' }}>{pushStatus}</p>}
    </div>
  );
}

export default App;
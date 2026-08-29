import { useEffect, useState } from 'react';
import { Octokit } from '@octokit/rest';
import './App.css';

type LeetflowConfig = {
  githubToken: string;
  owner: string;
  repo: string;
};

function App() {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [status, setStatus] = useState<{ type: 'pending' | 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    browser.storage.local.get('leetflowConfig').then((result) => {
      const config = result.leetflowConfig as LeetflowConfig | undefined;
      if (config) {
        setToken(config.githubToken);
        setOwner(config.owner);
        setRepo(config.repo);
      }
    });
  }, []);

  async function handleSave() {
    setStatus({ type: 'pending', message: 'Testing connection…' });
    try {
      const octokit = new Octokit({ auth: token });
      const res = await octokit.rest.repos.get({ owner, repo });
      await browser.storage.local.set({
        leetflowConfig: { githubToken: token, owner, repo } satisfies LeetflowConfig,
      });
      setStatus({ type: 'success', message: `Connected to ${res.data.full_name}. Settings saved.` });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message ?? 'unknown error' });
    }
  }

  return (
    <div className="options">
      <p className="options__logo">Leet<span className="options__logo-accent">Flow</span></p>
      <p className="options__subtitle">
        Fine-grained GitHub token, scoped to this repo only, with "Contents: Read and write."
      </p>

      <div className="field">
        <label>GitHub Token</label>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} />
      </div>

      <div className="field">
        <label>Repo owner</label>
        <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="AyushBaware" />
      </div>

      <div className="field">
        <label>Repo name</label>
        <input type="text" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="java-dsa-journey" />
      </div>

      <button className="save-button" onClick={handleSave}>Save &amp; Test Connection</button>

      {status && (
        <div className={`status status--${status.type}`}>
          {status.type === 'success' ? '✓ ' : status.type === 'error' ? '✕ ' : ''}{status.message}
        </div>
      )}
    </div>
  );
}

export default App;
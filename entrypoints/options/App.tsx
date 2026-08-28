import { useEffect, useState } from 'react';
import { Octokit } from '@octokit/rest';

type LeetflowConfig = {
  githubToken: string;
  owner: string;
  repo: string;
};

function App() {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [status, setStatus] = useState<string | null>(null);

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
    setStatus('Testing connection…');
    try {
      const octokit = new Octokit({ auth: token });
      const res = await octokit.rest.repos.get({ owner, repo });
      await browser.storage.local.set({
        leetflowConfig: { githubToken: token, owner, repo } satisfies LeetflowConfig,
      });
      setStatus(`✅ Connected to ${res.data.full_name}. Settings saved.`);
    } catch (err: any) {
      setStatus(`❌ Failed: ${err.message ?? 'unknown error'}`);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '420px', fontFamily: 'sans-serif' }}>
      <h2>LeetFlow Settings</h2>
      <p style={{ fontSize: '13px', color: '#888' }}>
        Fine-grained GitHub token, scoped to this repo only, with "Contents: Read and write."
      </p>

      <label style={{ display: 'block', marginTop: '12px', fontSize: '13px' }}>
        GitHub Token
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '6px', marginTop: '4px' }} />
      </label>

      <label style={{ display: 'block', marginTop: '12px', fontSize: '13px' }}>
        Repo owner
        <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)}
          placeholder="AyushBaware"
          style={{ display: 'block', width: '100%', padding: '6px', marginTop: '4px' }} />
      </label>

      <label style={{ display: 'block', marginTop: '12px', fontSize: '13px' }}>
        Repo name
        <input type="text" value={repo} onChange={(e) => setRepo(e.target.value)}
          placeholder="leetflow"
          style={{ display: 'block', width: '100%', padding: '6px', marginTop: '4px' }} />
      </label>

      <button onClick={handleSave} style={{ marginTop: '16px', padding: '8px 16px' }}>
        Save &amp; Test Connection
      </button>

      {status && <p style={{ marginTop: '12px', fontSize: '13px' }}>{status}</p>}
    </div>
  );
}

export default App;
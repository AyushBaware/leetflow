import { useEffect, useState } from 'react';

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

function App() {
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browser.storage.local.get('leetsyncLatestSubmission').then((result) => {
      setSubmission((result.leetsyncLatestSubmission as SubmissionData) ?? null);
      setLoading(false);
    });
  }, []);

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
          <span
            key={tag.slug}
            style={{
              display: 'inline-block',
              fontSize: '11px',
              background: '#eee',
              borderRadius: '4px',
              padding: '2px 6px',
              marginRight: '4px',
              marginBottom: '4px',
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      <details>
        <summary style={{ cursor: 'pointer', fontSize: '13px' }}>View code</summary>
        <pre
          style={{
            fontSize: '11px',
            background: '#f5f5f5',
            padding: '8px',
            borderRadius: '4px',
            overflowX: 'auto',
            maxHeight: '200px',
          }}
        >
          {submission.code}
        </pre>
      </details>
    </div>
  );
}

export default App;
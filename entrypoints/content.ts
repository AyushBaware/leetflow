export default defineContentScript({
  matches: ['*://*.leetcode.com/problems/*'],
  main() {
    console.log('[LeetSync] relay content script loaded');

    window.addEventListener('leetsync:accepted', async (event: Event) => {
      const { submissionId } = (event as CustomEvent).detail;
      console.log('[LeetSync] relay received accepted submission:', submissionId);

      try {
        const submissionDetails = await fetchSubmissionDetails(submissionId);
        console.log('[LeetSync] submissionDetails:', submissionDetails);

        const titleSlug = submissionDetails?.question?.titleSlug;
        if (!titleSlug) {
          console.warn('[LeetSync] no titleSlug in submissionDetails, aborting');
          return;
        }

        const questionDetail = await fetchQuestionDetail(titleSlug);
        console.log('[LeetSync] questionDetail:', questionDetail);

        const payload = {
          submissionId,
          code: submissionDetails.code,
          lang: submissionDetails.lang?.name,
          title: questionDetail.title,
          titleSlug: questionDetail.titleSlug,
          questionId: questionDetail.questionId,
          questionFrontendId: questionDetail.questionFrontendId,
          difficulty: questionDetail.difficulty,
          topicTags: questionDetail.topicTags,
          runtime: submissionDetails.runtimeDisplay,
          memory: submissionDetails.memoryDisplay,
          capturedAt: Date.now(),
        };

        console.log('[LeetSync] sending package to background:', payload);

        const response = await browser.runtime.sendMessage({
          type: 'leetsync:accepted-submission',
          payload,
        });

        console.log('[LeetSync] background acknowledged:', response);
      } catch (err) {
        console.error('[LeetSync] failed to fetch/send submission data', err);
      }
    });
  },
});

async function fetchSubmissionDetails(submissionId: string | number) {
  const query = {
    query: `
    query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        runtime
        runtimeDisplay
        runtimePercentile
        memory
        memoryDisplay
        memoryPercentile
        code
        timestamp
        statusCode
        lang {
          name
          verboseName
        }
        question {
          questionId
          questionFrontendId
          title
          titleSlug
          difficulty
        }
        topicTags {
          tagId
          slug
          name
        }
      }
    }`,
    variables: { submissionId: Number(submissionId) },
    operationName: 'submissionDetails',
  };

  const res = await fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  });
  const json = await res.json();
  return json?.data?.submissionDetails;
}

async function fetchQuestionDetail(titleSlug: string) {
  const query = {
    query: `
    query questionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        titleSlug
        questionId
        questionFrontendId
        content
        difficulty
        topicTags {
          name
          slug
          translatedName
        }
      }
    }`,
    variables: { titleSlug },
    operationName: 'questionDetail',
  };

  const res = await fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  });
  const json = await res.json();
  return json?.data?.question;
}
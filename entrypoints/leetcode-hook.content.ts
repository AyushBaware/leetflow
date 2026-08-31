export default defineContentScript({
  matches: ['*://*.leetcode.com/problems/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    console.log('[LeetSync] hook loaded in page context');

    // Tracks every submission currently being judged — a Set rather than a
    // single value, so a fast double-submit can't drop an earlier one.
    const pendingSubmissionIds = new Set<string>();

    function handleCheckResponse(body: string) {
      try {
        const parsed = JSON.parse(body);
        const id = String(parsed.submission_id);
        if (!pendingSubmissionIds.has(id)) return;
        if (parsed.state === 'SUCCESS') {
          if (parsed.status_msg === 'Accepted' && parsed.status_code === 10) {
            console.log('[LeetSync] Accepted! submissionId:', id);
            window.dispatchEvent(
              new CustomEvent('leetsync:accepted', {
                detail: { submissionId: id },
              }),
            );
          } else {
            console.log('[LeetSync] Submission finished, not accepted:', parsed.status_msg);
          }
          pendingSubmissionIds.delete(id);
        }
      } catch {
        // not JSON / not relevant
      }
    }

    // --- fetch() hook ---
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const url =
        typeof args[0] === 'string'
          ? args[0]
          : args[0] instanceof Request
          ? args[0].url
          : String(args[0]);

      const response = await originalFetch(...args);

      if (/\/submit\/$/.test(url)) {
        response
          .clone()
          .text()
          .then((body) => {
            try {
              const parsed = JSON.parse(body);
              if (parsed.submission_id) {
                pendingSubmissionIds.add(String(parsed.submission_id));
                console.log('[LeetSync] submission started:', parsed.submission_id);
              }
            } catch {}
          })
          .catch(() => {});
      } else if (/\/check\//.test(url)) {
        response.clone().text().then(handleCheckResponse).catch(() => {});
      }

      return response;
    };

    // --- XHR hook (fallback) ---
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      (this as any).__leetsyncUrl = url.toString();
      // @ts-ignore
      return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: any[]) {
      const url = (this as any).__leetsyncUrl || '';
      this.addEventListener('load', () => {
        if (/\/submit\/$/.test(url)) {
          try {
            const body =
              this.responseType === '' || this.responseType === 'text' ? this.responseText : null;
            if (body) {
              const parsed = JSON.parse(body);
              if (parsed.submission_id) {
                pendingSubmissionIds.add(String(parsed.submission_id));
                console.log('[LeetSync] submission started (XHR):', parsed.submission_id);
              }
            }
          } catch {}
        } else if (/\/check\//.test(url)) {
          if (this.responseType === '' || this.responseType === 'text') {
            handleCheckResponse(this.responseText);
          } else if (this.responseType === 'blob') {
            (this.response as Blob).text().then(handleCheckResponse).catch(() => {});
          }
        }
      });
      // @ts-ignore
      return originalSend.apply(this, args);
    };
  },
});
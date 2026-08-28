export default defineBackground(() => {
  console.log('[LeetSync] background loaded', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'leetsync:accepted-submission') {
      console.log('[LeetSync] background received accepted submission:', message.payload);

      browser.storage.local.set({ leetsyncLatestSubmission: message.payload }).then(() => {
        console.log('[LeetSync] background stored submission in local storage');
        sendResponse({ ok: true });
      });

      return true; // keep the message channel open for the async sendResponse above
    }
  });
});
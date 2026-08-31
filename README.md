# LeetFlow

A Chrome extension that reviews and pushes your accepted LeetCode submissions to GitHub — with a folder picker, an editable commit message, and an explicit push step, instead of auto-committing blindly.

## How it works

1. Solve a problem and submit on LeetCode.
2. LeetFlow detects "Accepted" directly from LeetCode's own network responses — not by reading the page's DOM — and captures your code and the problem's metadata.
3. Open the popup: review the auto-generated filename and commit message, pick an existing folder in your repo or create a new one, and see exactly where the file is about to go before anything is written.
4. Click Push. Nothing reaches GitHub before that.

## Naming and commit messages

Filenames follow `{problem number}_{TitleInPascalCase}.{extension}`. Add a comment like `// Approach: HashMap` anywhere in the first 10 lines of your code (any language, any comment syntax) and LeetFlow uses it to generate a distinct filename and commit message — so solving the same problem with a different technique never silently overwrites an earlier solution.

## Overwrite protection

If a push would overwrite an existing file, LeetFlow won't do it on the first click — it warns you and requires a second, explicit confirmation.

## Setup

1. `chrome://extensions` → Developer mode → Load unpacked → select the built `.output/chrome-mv3` folder.
2. Open the extension's Options page, generate a GitHub fine-grained token scoped to just your target repo with "Contents: Read and write," and enter your token, repo owner, and repo name.
3. Save & Test Connection.

## Stack

TypeScript, React, Vite/WXT, Octokit (GitHub REST API) — no backend, no server, no local git required.

🚧 Under active development.
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

## Use it

Takes about 5 minutes, no coding required.

**1. Download**
Go to the [Releases](../../releases) page and download the latest `leetflow-*-chrome.zip` under "Assets." Unzip it into a folder — keep that folder where it is afterward, Chrome reads the extension directly from it.

**2. Load it into Chrome**
- Open `chrome://extensions`
- Turn on **Developer mode** using the toggle in the top-right corner
- Click **Load unpacked** and select the folder you just unzipped
- LeetFlow should now show up in your extensions list

**3. Connect your GitHub account**
- Click the LeetFlow icon in your toolbar, then **Open Settings**
- You'll need a GitHub token — this is what lets LeetFlow push code to your repo on your behalf, and it's scoped so it can only touch the one repo you pick, nothing else on your account:
  - Go to `github.com/settings/tokens?type=beta` and click **Generate new token**
  - Under "Repository access," choose **Only select repositories** and pick the repo you want your solutions pushed to
  - Under "Permissions," set **Contents** to **Read and write**
  - Click **Generate token** and copy it immediately — GitHub only shows it once
- Paste the token into LeetFlow's Settings page along with your GitHub username and repo name, then click **Save & Test Connection**

**4. You're set**
Solve any problem on LeetCode and submit it. Once it's Accepted, click the LeetFlow icon — your solution is waiting there for you to review and push.

## Build it yourself

For anyone who wants to read, modify, or contribute to the source.

git clone https://github.com/AyushBaware/leetflow.git
cd leetflow
npm install
npm run dev # development, with hot reload
npm run build # production build
npm run zip # packages a distributable zip

Then load `.output/chrome-mv3` (or `.output/chrome-mv3-dev` if using `npm run dev`) unpacked, the same way as step 2 above.

## Stack

TypeScript, React, Vite/WXT, Octokit (GitHub REST API) — no backend, no server, no local git required.

🚧 Under active development.
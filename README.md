# ✦ Claude Usage Tracker

> Real-time Claude AI rate limit bars, per-chat usage tracking, and conversation export — right in your Chrome toolbar.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install%20Free-brightgreen?logo=googlechrome)](https://chromewebstore.google.com/detail/claude-usage-tracker/lemlablhcjgpgkhpbhcbcflgpiiidpkn)
[![Version](https://img.shields.io/badge/version-2.1.0-blue)](https://chromewebstore.google.com/detail/claude-usage-tracker/lemlablhcjgpgkhpbhcbcflgpiiidpkn)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

---

## 🔥 The Problem

You're deep into a Claude conversation — and suddenly hit a rate limit with zero warning. No visibility into how much you've used, no heads-up before it cuts you off.

**Claude Usage Tracker fixes that.**

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Live Usage Bars** | 5-Hour, 7-Day, Claude Design & Extra Credits — synced directly from Claude's API |
| 🕒 **Per-Chat History** | See exactly how much % of your limit each conversation consumed |
| ⬇ **Conversation Export** | Download any tracked chat as a clean `.md` transcript file |
| 🔢 **Toolbar Badge** | Current 5-hour usage % on your Chrome icon at a glance |
| 🔔 **Custom Alerts** *($3 one-time)* | Desktop notifications at any threshold you choose — 60%, 85%, anything |

---

## 📸 Screenshots

> Usage tab · History tab · Alerts tab
<img width="1280" height="800" alt="store_screenshot_1_usage_tab" src="https://github.com/user-attachments/assets/560e40e5-6007-4074-b044-db9a93050f45" />

<img width="1280" height="800" alt="store_screenshot_2_history_tab" src="https://github.com/user-attachments/assets/6f00294a-f05b-45a1-92ad-d9d3b061aea4" />

<img width="1280" height="800" alt="store_screenshot_4_alerts_custom" src="https://github.com/user-attachments/assets/c0dd159a-e306-4d39-8c7f-ebb986a47942" />


---

## 🚀 Install

**[→ Add to Chrome (Free)](https://chromewebstore.google.com/detail/claude-usage-tracker/lemlablhcjgpgkhpbhcbcflgpiiidpkn)**

Or install manually:
1. Clone this repo
2. Go to `chrome://extensions` → Enable **Developer Mode**
3. Click **Load unpacked** → select the `claude-usage-extension/` folder

---

## 🛠 How It Works

The extension runs a content script on `claude.ai` that:

1. Detects your organization ID from Claude's API calls
2. Polls `/api/organizations/{orgId}/usage` every 30 seconds for live rate limit data
3. On each message sent, snapshots usage **before** and **after** the response to compute a per-chat delta
4. Stores the last 10 conversations locally in `chrome.storage`

**No data ever leaves your browser.** Everything is stored locally via Chrome's storage API.

---

## 📁 Project Structure

```
claude-usage-extension/
├── manifest.json       # MV3 manifest
├── content.js          # Runs on claude.ai — usage polling & chat tracking
├── background.js       # Service worker — notifications & badge updates
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic — usage rendering, history, alerts
├── onboarding.html     # First-install welcome page
└── icons/              # Extension icons
```

---

## 🔔 Unlock Custom Alerts — $3 One-Time

Set your own alert thresholds (60%, 80%, anything you want). Get desktop notifications before you hit a limit, even when the Claude tab is in the background.

**[→ Get Custom Alerts on Gumroad](https://ramakrishna27.gumroad.com/l/hjwyk)**

---

## 🔒 Privacy

- ✅ No data collection
- ✅ No tracking
- ✅ No third-party servers
- ✅ All data stored locally in your browser

[Privacy Policy](https://gist.github.com/Krishna6699/cd380c57d0de7e5032d7ab767ca2eff7)

---

## 📬 Contact

Built by **Rama Krishna Jujjuri**  
📧 ramakrishna466999@gmail.com

---

*If this saved you from a rate-limit surprise, consider starring the repo ⭐*

# ✨ AI Assist for Google Forms

A Chrome Extension (Manifest V3) that uses the **Groq API** to intelligently auto-fill Google Forms based on your personal profile. It injects a clean **AI Assist button** next to every answer field, allowing you to instantly generate accurate responses for any question type.

---

## Features

- **Profile-Aware AI Responses:** Fills answers based on your configurable user profile (Name, Email, Date of Birth, Custom Fields, etc.).
- **Groq API Integration:** Powered by blazing fast LLMs like `llama-3.3-70b-versatile` via Groq.
- **Form Context Panel:** Add specific instructions for the AI on a per-form basis (e.g., "I'm applying for a frontend role, emphasize React experience").
- **Smart "Fill All" Button:** Automatically fills out the entire form with a single click.
- **Universal Field Detection:** Detects every question type: Short Answer, Paragraph, Multiple Choice, Checkboxes, and Dropdowns.
- **Dynamic Question Handling:** Seamlessly supports dynamically loaded questions (e.g., multi-page forms) via `MutationObserver`.
- **Light/Dark Mode Support:** Works flawlessly in both light and dark browser themes.

---

## Project Structure

```
extension/
├── manifest.json   — Permissions, content script registration, Groq API permissions
├── background.js   — Service worker: handles Groq API communication, prompt building
├── content.js      — Core logic: form detection, button injection, answer filling
├── popup.html/js/css — Extension popup for configuring your Groq API Key and Profile
├── utils.js        — DOM helpers: question extraction, type detection, guards
├── styles.css      — Button styling, animations, light/dark themes
├── icons/          — Extension icons (16×16, 48×48, 128×128)
└── README.md
```

---

## Installation (Developer Mode)

1. **Clone or download** this repository so you have the `extension/` folder on your machine.
2. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **"Load unpacked"** and select the `extension/` folder.
5. Click on the extension icon in your toolbar to open the **Settings Popup**.
6. Enter your **Groq API Key** and fill out your **User Profile**.
7. Open any Google Form:
   ```
   https://docs.google.com/forms/d/...
   ```
   You should see `✨ AI` buttons beside every question's answer field, as well as a **"Fill All"** button and a **"Form Context"** panel.

---

## How It Works

### 1. Google Form Detection
The content script is registered in `manifest.json` to run only on `https://docs.google.com/forms/*` pages. At runtime, `content.js` confirms the page is an active form before injecting UI elements.

### 2. Context & Profile Gathering
When an AI button is clicked, `background.js` gathers your saved Profile from `chrome.storage`, any Form Context you've provided, and the specific question context (including available dropdown/multiple-choice options).

### 3. Prompt Construction
A specialized prompt is built dynamically to instruct the Groq AI on how to answer. If options are available, the AI is constrained to picking an exact match. If you've already started typing an answer, the AI uses that as context to finish your thought.

### 4. Smart Filling
The resulting AI answer is sent back to `content.js`, which simulates native DOM events (`input`, `change`, `click`, `mousedown`) to ensure Google Forms registers the answer properly. 

---

## Permissions
- `storage`: Used to securely store your Groq API Key, preferences, and Profile data locally.
- `https://api.groq.com/*`: Used to communicate with the Groq inference endpoints.
- Content scripts only run on `https://docs.google.com/forms/*`.

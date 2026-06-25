# ✨ AI Assist for Google Forms

A Chrome Extension (Manifest V3) that injects a clean **AI Assist button** next
to every answer field on Google Forms — built as a proof-of-concept with a
ready-to-extend architecture for future AI integration.

---

## Features

- Detects every question type: Short Answer, Paragraph, Multiple Choice,
  Checkboxes, Dropdown
- Injects a non-intrusive `✨ AI` button beside each answer field
- Handles dynamically loaded questions via `MutationObserver`
- Prevents duplicate button injection
- Works in both light and dark browser themes
- Smooth hover/click animations with accessibility support (keyboard nav,
  reduced motion)

---

## Project Structure

```
extension/
├── manifest.json   — Permissions, content script registration
├── content.js      — Core logic: form detection, button injection, observer
├── utils.js        — DOM helpers: question extraction, type detection, guards
├── styles.css      — Button styling, animations, light/dark themes
├── icons/          — Extension icons (16×16, 48×48, 128×128)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Installation (Developer Mode)

1. **Clone or download** this repository so you have the `extension/` folder
   on your machine.

2. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** using the toggle in the top-right corner.

4. Click **"Load unpacked"** and select the `extension/` folder.

5. The extension is now installed. Open any Google Form:
   ```
   https://docs.google.com/forms/d/...
   ```
   You should see `✨ AI` buttons beside every question's answer field.

---

## How It Works

### 1. Google Form Detection

The content script is registered in `manifest.json` to run only on
`https://docs.google.com/forms/*` pages. At runtime, `content.js` additionally
checks for the presence of a `[role="list"]` or `<form>` element to confirm
the page is an active form (and not a submission confirmation page).

### 2. Question Container Discovery (`utils.js`)

Google Forms renders every question as a `<div role="listitem">` element.
`getAllQuestionContainers()` returns all such elements from the live DOM.

### 3. Question Type Detection (`utils.js → detectQuestionType`)

Each container is inspected for its answer widget:

| Selector found               | Type detected    |
|------------------------------|------------------|
| `<textarea>`                 | Paragraph        |
| `<input type="text">`        | Short Answer     |
| `[role="radio"]`             | Multiple Choice  |
| `[role="checkbox"]`          | Checkboxes       |
| `[role="listbox"]`           | Dropdown         |

### 4. Button Injection (`content.js → injectButtonIntoContainer`)

For each container that hasn't been processed yet:
- A question object `{ text, type, answerEl, container }` is built
- A `<button class="ai-assist-btn">` is created with a click handler
- The button is wrapped in a `<div class="ai-assist-wrapper">` and appended
  after the answer element's parent — no existing elements are moved or restyled

### 5. Duplicate Prevention (`utils.js → isAlreadyInjected / markAsInjected`)

After injection, the container receives a `data-ai-assist-injected="true"`
attribute. All scanning functions check for this attribute first and skip
containers that already have a button.

### 6. Dynamic Question Handling (`content.js → startMutationObserver`)

A `MutationObserver` watches `document.body` for `childList` + `subtree`
mutations. Whenever new nodes are added (e.g., the user navigates to the next
page of a multi-page form), `scanAndInjectAll()` is called — which safely
re-scans the DOM and injects buttons only into new, unprocessed containers.

---

## Console Output (Demo Behaviour)

Clicking any `✨ AI` button logs to the browser console:

```
✨ AI Assist
Question:
What is your name?

Type:
Short Answer
```

---

## Extending for Real AI Integration

The click handler is intentionally isolated in `content.js`:

```js
async function handleAIClick(question) {
  // TODAY: logs to console
  // FUTURE: replace this body with your API call

  // Example future implementation:
  // const answer = await fetchAISuggestion(question.text, question.type);
  // fillAnswerField(question.answerEl, answer);

  console.log(`Question:\n${question.text}\n\nType:\n${question.type}`);
}
```

To add AI functionality later:

1. Implement `fetchAISuggestion(questionText, questionType)` — call your AI API
2. Implement `fillAnswerField(answerEl, answer)` — write the answer into the DOM
3. Call both from inside `handleAIClick`
4. Add your API key management (e.g., via `chrome.storage` or a background
   service worker) — **never hard-code keys in content scripts**

---

## Notes

- The extension only requests **no special permissions** beyond content script
  access to Google Forms URLs, keeping it minimal and safe.
- `utils.js` is loaded before `content.js` (see `manifest.json`) so all helper
  functions are available when the main script runs.
- Google may update their Forms DOM structure over time; if buttons stop
  appearing, review the selectors in `utils.js`.

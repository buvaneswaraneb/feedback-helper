# Release Notes: AI Assist for Google Forms (v1.0.0-beta)

Welcome to the **v1.0.0-beta** release of **AI Assist for Google Forms**! This extension turns filling out tedious forms, feedback questionnaires, or registrations into a single-click experience powered by blazing-fast LLMs via the **Groq API**.

---

## 🚀 Key Features

### 1. Context-Aware AI Autofill (`✨ AI` Buttons)
- Injects a clean **AI Assist button** next to every question's answer field on Google Forms.
- Detects the question context, options, and question types to generate customized, highly accurate answers.
- Seamlessly updates fields using simulated native DOM events (`input`, `change`, `click`, `mousedown`, `mouseup`), ensuring Google Forms records responses successfully.

### 2. Universal Question & Field Support
Intelligently handles a wide variety of form input elements:
- **Text Inputs**: Short Answer and Paragraph.
- **Selection Inputs**: Multiple Choice (Radio Buttons), Checkboxes, and Dropdowns (`role="listbox"`).
- Automatically handles multi-page and dynamic forms using a background `MutationObserver` that detects when new questions are loaded.

### 3. Global "Fill All" Automator
- Adds a **"Fill All"** button at the top of the form.
- Clicking "Fill All" automatically answers every empty field on the current page in parallel, saving substantial time.

### 4. Floating Context Panel (Per-Form Customization)
- Introduces an expandable, floating left-side panel.
- Allows you to supply form-specific instructions (e.g., *"Highlight React and Node experience"* or *"Act as a client submitting a bug report"*) that override or append to your default settings for that specific page.

### 5. Profile & Custom Attribute Manager
Configure how the AI represents you directly inside the Extension Popup:
- **Core Profile**: Store your Name, Email, Date of Birth, Register Number, and Department.
- **Rating Guides**: Choose a default feedback rating preference (e.g., *Excellent*, *Good*, *Average*) to guide rating questions.
- **Tone Guide**: Instruct the AI to generate answers in specific tones (e.g., *Professional and Formal*, *Simple and Concise*, *Friendly and Conversational*).
- **Custom Attributes**: Add dynamic key-value pairs (e.g., *"Skills": "Python, Docker"* or *"Company": "Acme Corp"*) to further feed details into the AI prompt.

### 6. Dynamic Theme Engine
- Supports **Light Mode**, **Dark Mode**, and **Auto (System Default)** themes.
- Dynamically queries system color schemes and binds classes cleanly using attribute selectors (`data-ai-theme="dark"`).

---

## 🛠️ Technical Highlights

- **Groq API Integration**: Requests are forwarded through `background.js` (Service Worker) to Groq's high-speed inference endpoints using lightweight, efficient models like `llama-3.3-70b-versatile` and `llama-3.1-8b-instant`.
- **Manifest V3 Compliant**: Built strictly on Chrome Extension Manifest V3 guidelines.
- **Storage Sync API**: Persists API keys, toggles, profile data, and custom attributes securely across browser sessions.
- **UI States & Loading Animations**: Injected buttons feature SVG icons showing distinct states: Sparkle (ready), Spinner (loading/requesting), and Error (failure indicator).

---

## 📥 Installation (Testing the Beta)

Since this is in **Beta**, you can install it directly in Developer Mode:

1. **Clone/Download** this repository to your computer.
2. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions
   ```
3. Toggle the **"Developer mode"** switch in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. Select the extension directory (`ai-auto-google-form-fill-up` containing `manifest.json`).
6. Click on the extension icon in your toolbar, enter your **Groq API Key**, and set up your **User Profile**.
7. Open any Google Form (e.g., `https://docs.google.com/forms/...`) and enjoy the magic!

---

## 🐛 Feedback & Issue Reporting

We need your help to make this extension flawless! If you encounter issues (e.g., fields not filling correctly, UI issues, or model timeouts):
- Please open an issue in this repository.
- Share the console logs and, if possible, a screenshot or link to the form you are trying to fill.

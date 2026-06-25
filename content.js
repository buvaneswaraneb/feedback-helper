/**
 * content.js
 * ----------
 * Entry point for the AI Assist Chrome Extension.
 *
 * Responsibilities:
 *  1. Verify we are on an active Google Form (not the confirmation page).
 *  2. Scan all current question containers and inject AI buttons.
 *  3. Watch for dynamic DOM changes (Google Forms loads sections lazily)
 *     and inject buttons into newly added questions automatically.
 *
 * Dependencies: utils.js (loaded first via manifest.json)
 */

// ─── AI answer fillers ────────────────────────────────────────────────────────

/**
 * Fills a short-answer or paragraph text input with a placeholder response.
 * Dispatches the native input/change events Google Forms listens for.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} el
 * @param {string} answer
 */
function fillTextAnswer(el, answer) {
  el.focus();
  el.value = answer;
  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Picks the option(s) from a list of radio or checkbox elements that match the AI answer
 * and simulates a real user click so Google Forms registers the selection.
 *
 * @param {Element[]} options   – elements with role="radio" or role="checkbox"
 * @param {boolean}   multi     – if true, allows multiple selections
 * @param {string}    answer    – the answer string from the AI
 */
function fillChoiceAnswer(options, multi = false, answer = "") {
  if (!options.length || !answer) return;

  const targetAnswer = answer.toLowerCase().trim();
  
  // Find the option whose aria-label best matches the answer
  const matchedOptions = options.filter(opt => {
    let optText = (opt.getAttribute("aria-label") || "").toLowerCase().trim();
    // basic fuzzy match
    return optText.includes(targetAnswer) || targetAnswer.includes(optText);
  });

  if (matchedOptions.length > 0) {
    const toClick = multi ? matchedOptions : [matchedOptions[0]];
    toClick.forEach(opt => {
      opt.click();
      opt.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      opt.dispatchEvent(new MouseEvent("mouseup",   { bubbles: true }));
    });
  } else {
    console.warn("AI Assist: Could not match AI choice to available options.");
  }
}

/**
 * Opens a Google Forms dropdown (role="listbox") and clicks the matching option.
 *
 * @param {Element} listbox
 * @param {string}  answer
 */
async function fillDropdownAnswer(listbox, answer) {
  // Open the dropdown by clicking the trigger
  listbox.click();

  // Wait a tick for the option list to render in the DOM
  await new Promise((r) => setTimeout(r, 150));

  // Options appear as role="option" elements
  const optionEls = Array.from(document.querySelectorAll('[role="option"]'))
    .filter((el) => el.offsetParent !== null); // only visible ones

  if (!optionEls.length) return;

  // Skip the first item if it is a blank/placeholder sentinel
  const choices = optionEls[0].textContent.trim() === "" ? optionEls.slice(1) : optionEls;
  if (!choices.length) return;

  const targetAnswer = answer.toLowerCase().trim();
  const pick = choices.find(opt => {
    return opt.textContent.toLowerCase().trim() === targetAnswer ||
           opt.textContent.toLowerCase().trim().includes(targetAnswer) ||
           targetAnswer.includes(opt.textContent.toLowerCase().trim());
  });

  if (pick) {
    pick.click();
  } else {
    console.warn("AI Assist: Could not match dropdown choice.");
    // Close dropdown if no match
    document.body.click(); 
  }
}

// ─── Core AI fill logic (shared by per-question buttons AND Fill All) ─────────

/**
 * Fetches an AI answer for a question and fills the appropriate field.
 * Returns true on success, false on failure.
 *
 * @param {{ text: string, type: string, answerEl: Element|null, container: Element }} question
 * @returns {Promise<boolean>}
 */
async function fillQuestion(question) {
  const { answerEl, container, type } = question;
  if (!answerEl) return false;

  const extractedOptions = extractOptionsText(container, type);

  let currentValue = "";
  if (answerEl.tagName === "INPUT" || answerEl.tagName === "TEXTAREA") {
    currentValue = answerEl.value || "";
  }

  const answer = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "GENERATE_ANSWER",
      payload: { question: question.text, type, options: extractedOptions, currentValue }
    }, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (res && res.success) resolve(res.data);
      else reject(new Error(res?.error || "Unknown error"));
    });
  });

  console.log(`AI Assist → "${question.text}" → "${answer}"`);

  switch (type) {
    case "Short Answer":
    case "Paragraph":
      if (answerEl.tagName === "INPUT" || answerEl.tagName === "TEXTAREA") fillTextAnswer(answerEl, answer);
      break;
    case "Multiple Choice": {
      const radios = Array.from(container.querySelectorAll('[role="radio"]'));
      fillChoiceAnswer(radios, false, answer);
      break;
    }
    case "Checkboxes": {
      const boxes = Array.from(container.querySelectorAll('[role="checkbox"]'));
      fillChoiceAnswer(boxes, true, answer);
      break;
    }
    case "Dropdown": {
      const listbox = container.querySelector('[role="listbox"]');
      if (listbox) await fillDropdownAnswer(listbox, answer);
      break;
    }
    default:
      console.log("AI Assist: unsupported question type →", type);
  }
  return true;
}

// ─── Per-question AI button handler ──────────────────────────────────────────

/**
 * Called when the user clicks an individual AI Assist button.
 *
 * @param {{ text: string, type: string, answerEl: Element|null, container: Element }} question
 * @param {HTMLButtonElement} btnEl
 */
async function handleAIClick(question, btnEl) {
  const originalHtml = btnEl.innerHTML;
  btnEl.innerHTML = `<span class="ai-assist-icon" aria-hidden="true">⏳</span><span class="ai-assist-label">Thinking...</span>`;
  btnEl.disabled = true;

  try {
    await fillQuestion(question);
    btnEl.innerHTML = originalHtml;
    btnEl.disabled = false;
  } catch (error) {
    console.error("AI Assist Error:", error.message);
    btnEl.innerHTML = `<span class="ai-assist-icon" aria-hidden="true">❌</span><span class="ai-assist-label">Error</span>`;
    btnEl.disabled = false;
    setTimeout(() => { btnEl.innerHTML = originalHtml; }, 3000);
  }
}

// ─── Fill All button ──────────────────────────────────────────────────────────

/**
 * Iterates through every visible question container and fills each one using AI.
 * Runs sequentially (one at a time) to avoid spamming the API and to let
 * dropdown animations settle before the next question is processed.
 *
 * @param {HTMLButtonElement} btn  – the Fill All button (for progress feedback)
 */
async function fillAllQuestions(btn) {
  const containers = getAllQuestionContainers();
  const questions = containers
    .map(c => buildQuestionObject(c))
    .filter(q => q.answerEl); // skip section headers

  if (!questions.length) return;

  const total = questions.length;
  let done = 0;
  let failed = 0;

  btn.disabled = true;

  for (const question of questions) {
    btn.innerHTML =
      `<span class="fill-all-icon">⏳</span>` +
      `<span class="fill-all-label">Filling ${done + 1}/${total}…</span>`;

    try {
      await fillQuestion(question);
      done++;
    } catch (err) {
      console.error(`AI Assist (Fill All): failed on "${question.text}":`, err.message);
      failed++;
      done++;
    }

    // Small delay between questions so dropdowns can close cleanly
    await new Promise(r => setTimeout(r, 300));
  }

  const label = failed > 0 ? `Done (${failed} failed)` : "Fill All ✓";
  btn.innerHTML = `<span class="fill-all-icon">✨</span><span class="fill-all-label">${label}</span>`;
  btn.disabled = false;

  // Revert label after 4 seconds
  setTimeout(() => {
    btn.innerHTML = `<span class="fill-all-icon">✨</span><span class="fill-all-label">Fill All</span>`;
  }, 4000);
}

/**
 * Creates and appends the floating "Fill All" button to the page.
 * The button is fixed to the bottom-right corner and persists across scrolling.
 */
function injectFillAllButton() {
  if (document.getElementById("ai-assist-fill-all")) return; // already injected

  const btn = document.createElement("button");
  btn.id = "ai-assist-fill-all";
  btn.setAttribute("type", "button");
  btn.setAttribute("aria-label", "Fill all form questions with AI");
  btn.innerHTML = `<span class="fill-all-icon">✨</span><span class="fill-all-label">Fill All</span>`;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    fillAllQuestions(btn);
  });

  document.body.appendChild(btn);
}

// ─── Button factory ───────────────────────────────────────────────────────────

/**
 * Creates the AI Assist button element for a given question.
 *
 * @param {{ text: string, type: string, answerEl: Element|null }} question
 * @returns {HTMLButtonElement}
 */
function createAIButton(question) {
  const button = document.createElement("button");
  button.className = "ai-assist-btn";
  button.setAttribute("aria-label", `AI Assist for: ${question.text}`);
  button.setAttribute("type", "button"); // Prevent any accidental form submission
  button.innerHTML = `<span class="ai-assist-icon" aria-hidden="true">✨</span><span class="ai-assist-label">AI</span>`;

  button.addEventListener("click", (event) => {
    // Stop the click from bubbling into Google Forms' own event handlers
    event.stopPropagation();
    event.preventDefault();
    handleAIClick(question, button);
  });

  return button;
}

/**
 * Wraps the AI button in a positioned container div.
 * The wrapper gives us a reliable layout hook without touching Google's DOM.
 *
 * @param {HTMLButtonElement} button
 * @returns {HTMLDivElement}
 */
function createButtonWrapper(button) {
  const wrapper = document.createElement("div");
  wrapper.className = "ai-assist-wrapper";
  wrapper.appendChild(button);
  return wrapper;
}

// ─── Injection logic ──────────────────────────────────────────────────────────

/**
 * Processes a single question container:
 *  - Skips if already injected or if it has no detectable answer element.
 *  - Builds the question object, creates the button, and inserts it.
 *
 * @param {Element} container
 */
function injectButtonIntoContainer(container) {
  // Guard: skip containers we've already processed
  if (isAlreadyInjected(container)) return;

  const question = buildQuestionObject(container);

  // Skip containers that appear to be section headers (no answer widget found)
  if (!question.answerEl && question.type === "Unknown") {
    // Still mark so we don't re-check on every observer tick
    markAsInjected(container);
    return;
  }

  const button = createAIButton(question);
  const wrapper = createButtonWrapper(button);
  const insertionTarget = findInsertionTarget(container, question.answerEl);

  // Stamp BEFORE DOM insertion so the MutationObserver that fires when we
  // append the wrapper doesn't find an unmarked container and inject again.
  markAsInjected(container);

  // Append the wrapper after the answer area so layout is undisturbed
  insertionTarget.appendChild(wrapper);
}

/**
 * Scans all question containers currently in the DOM and injects buttons.
 * Safe to call multiple times — duplicate detection is handled internally.
 */
function scanAndInjectAll() {
  const containers = getAllQuestionContainers();
  containers.forEach(injectButtonIntoContainer);
}

// ─── Dynamic form observer ────────────────────────────────────────────────────

/**
 * MutationObserver that watches for new question containers added by Google Forms'
 * dynamic rendering (e.g., multi-page forms, conditional questions).
 *
 * Strategy: observe the entire document body for subtree changes, then filter
 * added nodes to find new question containers.
 */
function startMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let foundNewNodes = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        foundNewNodes = true;
        break;
      }
    }

    // Only re-scan when nodes were actually added to the DOM
    if (foundNewNodes) {
      scanAndInjectAll();
    }
  });

  observer.observe(document.body, {
    childList: true, // Watch for added/removed child elements
    subtree: true,   // Watch the entire subtree, not just direct children
  });

  return observer;
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Checks whether the current page is an active Google Form (not a confirmation
 * or edit page). We look for the main form container as a reliable signal.
 *
 * @returns {boolean}
 */
function isActiveGoogleForm() {
  // The live form renders its questions inside a freebirdFormviewerViewItemList
  // or a generic form[action] element. Either confirms we are on a live form.
  return (
    document.querySelector('[role="list"]') !== null ||
    document.querySelector("form") !== null
  );
}

/**
 * Main init function. Waits briefly for Google Forms to finish its own
 * JavaScript hydration, then begins scanning and observing.
 */
function init() {
  if (!isActiveGoogleForm()) {
    // Not an active form — do nothing (e.g., form confirmation page)
    return;
  }

  // Initial scan for questions already in the DOM
  scanAndInjectAll();

  // Add the floating Fill All button
  injectFillAllButton();

  // Start observer for questions that load later
  startMutationObserver();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Google Forms may still be rendering when content scripts fire at document_idle.
// A short delay ensures the initial question list is present before we scan.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 500));
} else {
  setTimeout(init, 500);
}

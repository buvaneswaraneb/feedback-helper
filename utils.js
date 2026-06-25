/**
 * utils.js
 * --------
 * DOM helper utilities for the AI Assist Chrome Extension.
 * Handles question extraction, type detection, and duplicate button prevention.
 *
 * Google Forms renders questions as <div role="listitem"> elements.
 * Each question container holds a title element and one or more answer widgets.
 */

// ─── Sentinel attribute ──────────────────────────────────────────────────────
// We stamp every question container with this attribute once a button is added,
// so MutationObserver callbacks never inject a second button.
const AI_BUTTON_ATTR = "data-ai-assist-injected";

// ─── Question type identifiers ────────────────────────────────────────────────
// Maps a human-readable label to the CSS selector strategy used to find it.
const QUESTION_TYPES = {
  SHORT_ANSWER: "Short Answer",
  PARAGRAPH: "Paragraph",
  MULTIPLE_CHOICE: "Multiple Choice",
  CHECKBOXES: "Checkboxes",
  DROPDOWN: "Dropdown",
  UNKNOWN: "Unknown",
};

/**
 * Returns all top-level question containers currently in the DOM.
 * Google Forms wraps every question in a div with role="listitem".
 *
 * @returns {Element[]}
 */
function getAllQuestionContainers() {
  return Array.from(document.querySelectorAll('[role="listitem"]'));
}

/**
 * Extracts the visible question text from a container element.
 * Google Forms places the question title inside an element with role="heading".
 * Falls back to searching for common title class patterns.
 *
 * @param {Element} container
 * @returns {string}
 */
function extractQuestionText(container) {
  // Primary: role="heading" is the most reliable selector across Form themes
  const heading = container.querySelector('[role="heading"]');
  if (heading) return heading.innerText.trim();

  // Fallback: aria-label on the container itself sometimes holds the question
  const ariaLabel = container.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim();

  return "Unknown Question";
}

/**
 * CSS selector that matches any text-entry <input> Google Forms might render.
 * Excludes hidden fields, submit buttons, and native radio/checkbox controls.
 */
const TEXT_INPUT_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"])' +
  ':not([type="radio"]):not([type="checkbox"]):not([type="file"])';

/**
 * Detects the type of a Google Forms question by inspecting
 * the answer widget elements inside the container.
 *
 * Detection strategy:
 *  - <textarea>              → Paragraph
 *  - any text-entry <input>  → Short Answer  (text, email, number, date, …)
 *  - role="radio"            → Multiple Choice
 *  - role="checkbox"         → Checkboxes
 *  - role="listbox"          → Dropdown
 *
 * @param {Element} container
 * @returns {string} One of the QUESTION_TYPES values
 */
function detectQuestionType(container) {
  if (container.querySelector("textarea")) {
    return QUESTION_TYPES.PARAGRAPH;
  }

  if (container.querySelector(TEXT_INPUT_SELECTOR)) {
    return QUESTION_TYPES.SHORT_ANSWER;
  }

  if (container.querySelector('[role="radio"]')) {
    return QUESTION_TYPES.MULTIPLE_CHOICE;
  }

  if (container.querySelector('[role="checkbox"]')) {
    return QUESTION_TYPES.CHECKBOXES;
  }

  if (container.querySelector('[role="listbox"]')) {
    return QUESTION_TYPES.DROPDOWN;
  }

  return QUESTION_TYPES.UNKNOWN;
}

/**
 * Finds the primary interactive answer element within a question container.
 * This is the element the AI button will be anchored to.
 *
 * Priority order: textarea → any text-entry input → listbox → radio → checkbox
 *
 * @param {Element} container
 * @returns {Element|null}
 */
function findAnswerElement(container) {
  return (
    container.querySelector("textarea") ||
    container.querySelector(TEXT_INPUT_SELECTOR) ||
    container.querySelector('[role="listbox"]') ||
    container.querySelector('[role="radio"]') ||
    container.querySelector('[role="checkbox"]') ||
    null
  );
}

/**
 * Checks whether an AI button has already been injected into this container.
 *
 * @param {Element} container
 * @returns {boolean}
 */
function isAlreadyInjected(container) {
  return container.hasAttribute(AI_BUTTON_ATTR);
}

/**
 * Marks a container as having an AI button injected.
 * Prevents duplicate injection on subsequent MutationObserver triggers.
 *
 * @param {Element} container
 */
function markAsInjected(container) {
  container.setAttribute(AI_BUTTON_ATTR, "true");
}

/**
 * Builds a structured question object from a container element.
 *
 * @param {Element} container
 * @returns {{ text: string, type: string, answerEl: Element|null, container: Element }}
 */
function buildQuestionObject(container) {
  return {
    text: extractQuestionText(container),
    type: detectQuestionType(container),
    answerEl: findAnswerElement(container),
    container,
  };
}

/**
 * Finds the best parent element to append the AI button wrapper to.
 * For text inputs/textareas we walk up to their immediate wrapping div.
 * For choice-based questions we attach below the full answer area.
 *
 * @param {Element} container
 * @param {Element|null} answerEl
 * @returns {Element}
 */
function findInsertionTarget(container, answerEl) {
  if (!answerEl) return container;

  // For text/textarea: go up two levels to get the input wrapper
  if (
    answerEl.tagName === "INPUT" ||
    answerEl.tagName === "TEXTAREA"
  ) {
    return answerEl.closest('[role="presentation"]') ||
      answerEl.parentElement?.parentElement ||
      answerEl.parentElement ||
      container;
  }

  // For listbox (dropdown): use the direct parent
  if (answerEl.getAttribute("role") === "listbox") {
    return answerEl.parentElement || container;
  }

  // For radio/checkbox groups: find the outermost option list wrapper
  return (
    container.querySelector('[role="list"]') ||
    answerEl.closest('[role="group"]') ||
    container
  );
}

/**
 * Extracts text from radio, checkbox, or dropdown options.
 *
 * @param {Element} container
 * @param {string} type
 * @returns {string[]}
 */
function extractOptionsText(container, type) {
  let options = [];
  
  if (type === QUESTION_TYPES.MULTIPLE_CHOICE || type === QUESTION_TYPES.CHECKBOXES) {
    const els = Array.from(container.querySelectorAll('[role="radio"], [role="checkbox"]'));
    options = els.map(el => {
      // Typically the text is in the aria-label
      let text = el.getAttribute("aria-label") || "";
      // Strip out "checkbox" or "radio button" phrases if Google Forms injects them
      return text.replace(/checkbox|radio button/gi, "").trim();
    }).filter(Boolean);
  }
  
  // Dropdown options are trickier because they aren't fully in the DOM until clicked.
  // However, often there's a hidden select or the options are in a listbox attached to the body.
  // We'll skip extracting dropdown options for now and let the AI guess or just not provide them,
  // or we can simulate a click to open it just to read the options and close it.
  // Since dropdown options extraction is complex without opening it, we will return empty array for dropdowns here 
  // and handle it specially if needed, or rely on the AI's general knowledge.

  return options;
}

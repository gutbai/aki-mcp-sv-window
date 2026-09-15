const DEFAULT_AUTO_CONTINUE_PROMPT = 'continue. if all task done just return OK BOSS.';
const AUTO_CONTINUE_STABLE_MS = 1800;
const AUTO_CONTINUE_RETRY_MS = 5000;
const AUTO_CONTINUE_SESSION_KEY = 'akiProjectContextAutoContinue';

let lastUrl = location.href;
let prefilledForRoute = false;
let scheduled = false;
let autoContinueEnabled = sessionStorage.getItem(AUTO_CONTINUE_SESSION_KEY) === 'true';
let autoContinuePrompt = DEFAULT_AUTO_CONTINUE_PROMPT;
let lastObservedAssistantKey = '';
let handledAssistantKey = '';
let assistantChangedAt = Date.now();
let autoActionInFlight = false;
let nextAutoRetryAt = 0;

function isNewChat() {
  return location.pathname === '/';
}

function getComposer() {
  return document.querySelector('#prompt-textarea')
    || document.querySelector('textarea[placeholder]')
    || document.querySelector('[contenteditable="true"][data-virtualkeyboard="true"]');
}

function composerText(element) {
  return element instanceof HTMLTextAreaElement
    ? element.value.trim()
    : (element.innerText || element.textContent || '').trim();
}

function setComposerText(element, text) {
  element.focus();
  if (element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter ? setter.call(element, text) : (element.value = text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  if (!document.execCommand('insertText', false, text)) {
    element.textContent = text;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }
}

function isGenerating() {
  return Boolean(
    document.querySelector('[data-testid="stop-button"]')
    || document.querySelector('button[aria-label="Stop generating"]')
    || document.querySelector('button[aria-label^="Stop"]'),
  );
}

function getSendButton() {
  return document.querySelector('[data-testid="send-button"]')
    || document.querySelector('button[aria-label="Send prompt"]')
    || document.querySelector('button[aria-label^="Send"]');
}

function getLastAssistantSnapshot() {
  const messages = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
  const last = messages.at(-1);
  if (!last) return { key: '', text: '' };
  const text = (last.innerText || last.textContent || '').trim();
  return { key: `${messages.length}:${text}`, text };
}

function hasDoneMarker(text) {
  return /\bOK\s+BOSS\b/i.test(text);
}

function resetAutoContinueBaseline() {
  const snapshot = getLastAssistantSnapshot();
  lastObservedAssistantKey = snapshot.key;
  handledAssistantKey = snapshot.key;
  assistantChangedAt = Date.now();
  nextAutoRetryAt = 0;
}

function setAutoContinueEnabled(enabled) {
  autoContinueEnabled = Boolean(enabled);
  sessionStorage.setItem(AUTO_CONTINUE_SESSION_KEY, autoContinueEnabled ? 'true' : 'false');
  resetAutoContinueBaseline();
}

async function waitForSendButton(timeoutMs = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const button = getSendButton();
    if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true') return button;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return null;
}

async function sendAutoContinue(snapshot) {
  if (autoActionInFlight || Date.now() < nextAutoRetryAt) return;
  autoActionInFlight = true;
  try {
    if (!autoContinueEnabled || isGenerating()) return;

    const current = getLastAssistantSnapshot();
    if (!current.key || current.key !== snapshot.key || hasDoneMarker(current.text)) {
      handledAssistantKey = current.key || snapshot.key;
      return;
    }

    const composer = getComposer();
    if (!composer) {
      nextAutoRetryAt = Date.now() + AUTO_CONTINUE_RETRY_MS;
      return;
    }
    if (composerText(composer)) {
      handledAssistantKey = snapshot.key;
      return;
    }

    const prompt = autoContinuePrompt.trim() || DEFAULT_AUTO_CONTINUE_PROMPT;
    setComposerText(composer, prompt);
    const sendButton = await waitForSendButton();
    if (!sendButton) {
      if (composerText(composer) === prompt) setComposerText(composer, '');
      nextAutoRetryAt = Date.now() + AUTO_CONTINUE_RETRY_MS;
      return;
    }

    handledAssistantKey = snapshot.key;
    nextAutoRetryAt = 0;
    sendButton.click();
  } finally {
    autoActionInFlight = false;
  }
}

function autoContinueTick() {
  const snapshot = getLastAssistantSnapshot();
  if (snapshot.key !== lastObservedAssistantKey) {
    lastObservedAssistantKey = snapshot.key;
    assistantChangedAt = Date.now();
  }

  if (!autoContinueEnabled || !snapshot.key || snapshot.key === handledAssistantKey) return;
  if (isGenerating() || Date.now() - assistantChangedAt < AUTO_CONTINUE_STABLE_MS) return;

  if (hasDoneMarker(snapshot.text)) {
    handledAssistantKey = snapshot.key;
    return;
  }

  void sendAutoContinue(snapshot);
}

async function prefill() {
  scheduled = false;
  if (!isNewChat() || prefilledForRoute) return;

  const composer = getComposer();
  if (!composer || composerText(composer)) return;

  const { projects = [], defaultProjectId = null } = await chrome.storage.local.get(['projects', 'defaultProjectId']);
  const project = projects.find((item) => item.id === defaultProjectId);
  if (!project?.path) return;

  setComposerText(composer, `@Aki\nProject base folder: ${project.path}\n\nTask: `);
  prefilledForRoute = true;
}

function schedulePrefill() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(prefill, 120);
}

function detectRouteChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    prefilledForRoute = false;
    resetAutoContinueBaseline();
  }
  schedulePrefill();
}

document.addEventListener('click', (event) => {
  const newChatControl = event.target.closest('a[href="/"], [data-testid="create-new-chat-button"]');
  if (!newChatControl) return;
  prefilledForRoute = false;
  resetAutoContinueBaseline();
  setTimeout(schedulePrefill, 150);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.projects || changes.defaultProjectId) {
    prefilledForRoute = false;
    schedulePrefill();
  }
  if (changes.autoContinuePrompt) {
    autoContinuePrompt = changes.autoContinuePrompt.newValue?.trim() || DEFAULT_AUTO_CONTINUE_PROMPT;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'aki-project-context:get-auto-continue') {
    sendResponse({ enabled: autoContinueEnabled });
    return;
  }
  if (message?.type === 'aki-project-context:set-auto-continue') {
    setAutoContinueEnabled(message.enabled);
    sendResponse({ enabled: autoContinueEnabled });
  }
});

new MutationObserver(detectRouteChange).observe(document.documentElement, { childList: true, subtree: true });

chrome.storage.local.get('autoContinuePrompt').then(({ autoContinuePrompt: savedPrompt }) => {
  autoContinuePrompt = savedPrompt?.trim() || DEFAULT_AUTO_CONTINUE_PROMPT;
});

resetAutoContinueBaseline();
setInterval(autoContinueTick, 600);
schedulePrefill();

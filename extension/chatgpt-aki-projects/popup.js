const PICKER_URL = 'http://127.0.0.1:9998/api/pick-folder';
const PICKER_HEADER = 'project-context-v1';
const AUTO_CONTINUE_GET = 'aki-project-context:get-auto-continue';
const AUTO_CONTINUE_SET = 'aki-project-context:set-auto-continue';
const DEFAULT_AUTO_CONTINUE_PROMPT = 'continue. if all task done just return OK BOSS.';

const form = document.getElementById('project-form');
const nameInput = document.getElementById('project-name');
const pathInput = document.getElementById('project-path');
const pickButton = document.getElementById('pick-folder');
const saveButton = document.getElementById('save-project');
const cancelButton = document.getElementById('cancel-edit');
const list = document.getElementById('project-list');
const message = document.getElementById('message');
const preview = document.getElementById('preview-text');
const autoContinueToggle = document.getElementById('auto-continue');
const autoContinuePrompt = document.getElementById('auto-continue-prompt');
const saveAutoPromptButton = document.getElementById('save-auto-prompt');
const resetAutoPromptButton = document.getElementById('reset-auto-prompt');

let projects = [];
let defaultProjectId = null;
let editingId = null;

function contextText(project) {
  return `@Aki\nProject base folder: ${project.path}\n\nTask: `;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ? tab : null;
}

async function loadAutoContinueState() {
  try {
    const tab = await getActiveTab();
    if (!tab) throw new Error('no active tab');
    const state = await chrome.tabs.sendMessage(tab.id, { type: AUTO_CONTINUE_GET });
    autoContinueToggle.disabled = false;
    autoContinueToggle.checked = Boolean(state?.enabled);
  } catch {
    autoContinueToggle.checked = false;
    autoContinueToggle.disabled = true;
  }
}

async function loadState() {
  const stored = await chrome.storage.local.get(['projects', 'defaultProjectId', 'autoContinuePrompt']);
  projects = Array.isArray(stored.projects) ? stored.projects : [];
  defaultProjectId = stored.defaultProjectId || projects[0]?.id || null;
  autoContinuePrompt.value = stored.autoContinuePrompt?.trim() || DEFAULT_AUTO_CONTINUE_PROMPT;
  if (defaultProjectId && stored.defaultProjectId !== defaultProjectId) await persistProjects();
  render();
  await loadAutoContinueState();
}

async function persistProjects() {
  await chrome.storage.local.set({ projects, defaultProjectId });
}

function resetForm() {
  editingId = null;
  form.reset();
  pathInput.value = '';
  saveButton.textContent = 'Thêm project';
  cancelButton.hidden = true;
}

function setMessage(text) {
  message.textContent = text;
}

function normalizeProjectPath(value) {
  return value.trim().replace(/^"(.*)"$/, '$1').trim();
}

function folderName(folderPath) {
  return normalizeProjectPath(folderPath).split(/[\\/]/).filter(Boolean).pop() || '';
}

async function chooseFolder() {
  pickButton.disabled = true;
  setMessage('Đang mở hộp chọn folder…');
  try {
    const response = await fetch(PICKER_URL, {
      method: 'POST',
      headers: { 'X-Aki-Extension': PICKER_HEADER },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    if (!data.path) {
      setMessage('Đã hủy chọn folder.');
      return;
    }
    pathInput.value = data.path;
    if (!nameInput.value.trim()) nameInput.value = folderName(data.path);
    setMessage(`Đã chọn ${data.path}`);
  } catch (error) {
    setMessage(`Không mở được folder picker. Hãy chạy Aki local server rồi thử lại. ${error.message}`);
  } finally {
    pickButton.disabled = false;
  }
}

function render() {
  list.replaceChildren();
  for (const project of projects) {
    const row = document.createElement('div');
    row.className = 'project';

    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'star';
    star.title = project.id === defaultProjectId ? 'Project mặc định' : 'Đặt làm mặc định';
    star.textContent = project.id === defaultProjectId ? '★' : '☆';
    star.addEventListener('click', async () => {
      defaultProjectId = project.id;
      await persistProjects();
      render();
      setMessage(`Đã chọn ${project.name} làm mặc định.`);
    });

    const copy = document.createElement('div');
    copy.className = 'project-copy';
    const projectName = document.createElement('div');
    projectName.className = 'project-name';
    projectName.textContent = project.name;
    const projectPath = document.createElement('div');
    projectPath.className = 'project-path';
    projectPath.textContent = project.path;
    copy.append(projectName, projectPath);

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Sửa';
    edit.addEventListener('click', () => {
      editingId = project.id;
      nameInput.value = project.name;
      pathInput.value = project.path;
      saveButton.textContent = 'Lưu';
      cancelButton.hidden = false;
      nameInput.focus();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Xóa';
    remove.addEventListener('click', async () => {
      projects = projects.filter((item) => item.id !== project.id);
      if (defaultProjectId === project.id) defaultProjectId = projects[0]?.id || null;
      if (editingId === project.id) resetForm();
      await persistProjects();
      render();
      setMessage(`Đã xóa ${project.name}.`);
    });

    row.append(star, copy, edit, remove);
    list.append(row);
  }

  const defaultProject = projects.find((project) => project.id === defaultProjectId);
  preview.textContent = defaultProject ? contextText(defaultProject) : 'Chưa có project mặc định.';
}

pickButton.addEventListener('click', chooseFolder);

autoContinueToggle.addEventListener('change', async () => {
  const desired = autoContinueToggle.checked;
  autoContinueToggle.disabled = true;
  try {
    const tab = await getActiveTab();
    if (!tab) throw new Error('no active tab');
    const state = await chrome.tabs.sendMessage(tab.id, { type: AUTO_CONTINUE_SET, enabled: desired });
    autoContinueToggle.checked = Boolean(state?.enabled);
    setMessage(autoContinueToggle.checked ? 'Đã bật Auto Continue cho tab này.' : 'Đã tắt Auto Continue cho tab này.');
  } catch {
    autoContinueToggle.checked = false;
    setMessage('Auto Continue chỉ bật được khi popup đang mở trên tab ChatGPT.');
  } finally {
    autoContinueToggle.disabled = false;
  }
});

saveAutoPromptButton.addEventListener('click', async () => {
  const prompt = autoContinuePrompt.value.trim();
  if (!prompt) {
    setMessage('Prompt Auto Continue không được để trống.');
    return;
  }
  await chrome.storage.local.set({ autoContinuePrompt: prompt });
  autoContinuePrompt.value = prompt;
  setMessage('Đã lưu prompt Auto Continue.');
});

resetAutoPromptButton.addEventListener('click', async () => {
  autoContinuePrompt.value = DEFAULT_AUTO_CONTINUE_PROMPT;
  await chrome.storage.local.set({ autoContinuePrompt: DEFAULT_AUTO_CONTINUE_PROMPT });
  setMessage('Đã khôi phục prompt mặc định.');
});

pathInput.addEventListener('change', () => {
  const normalized = normalizeProjectPath(pathInput.value);
  pathInput.value = normalized;
  if (!nameInput.value.trim() && normalized) nameInput.value = folderName(normalized);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const projectPath = normalizeProjectPath(pathInput.value);
  pathInput.value = projectPath;
  if (!name || !projectPath) {
    setMessage('Hãy nhập tên project và dán hoặc chọn folder project.');
    return;
  }

  if (editingId) {
    projects = projects.map((project) => project.id === editingId ? { ...project, name, path: projectPath } : project);
    setMessage(`Đã cập nhật ${name}.`);
  } else {
    const project = { id: crypto.randomUUID(), name, path: projectPath };
    projects.push(project);
    if (!defaultProjectId) defaultProjectId = project.id;
    setMessage(`Đã thêm ${name}.`);
  }

  await persistProjects();
  resetForm();
  render();
});

cancelButton.addEventListener('click', resetForm);
loadState();

# Aki Project Context extension

Chrome/Edge extension for keeping multiple local project paths and prefilling the default project into a ChatGPT New Chat.

## Install

1. Open `chrome://extensions/` or `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this `extension/chatgpt-aki-projects` folder.
5. Pin **Aki Project Context** to the browser toolbar.

## Use

1. Start Aki so its local panel is available on `127.0.0.1:9998`.
2. Open the extension popup. Either paste/type an absolute project path directly, or click **Chọn folder…** to use the Explorer-style Windows picker with its address bar.
3. Enter or adjust the project name, then click **Thêm project**.
4. Add as many projects as needed.
5. Click `☆` beside one project to make it the `★` default.
6. Open ChatGPT New Chat. When the composer is empty, the extension prefills:

```text
@Aki
Project base folder: D:\path\to\project

Task: 
```

## Auto Continue

Turn **Auto Continue** on in the popup to keep a task moving automatically. The continuation prompt is editable in **Prompt mặc định** and is saved for future tabs; **Mặc định** restores `continue. if all task done just return OK BOSS.`. After a new assistant reply has stopped changing and ChatGPT is no longer generating, the extension checks the reply. If it contains `OK BOSS`, nothing else is sent. Otherwise it sends the saved continuation prompt.

The cycle repeats after each completed assistant reply until `OK BOSS` appears or Auto Continue is switched off. The extension never overwrites a non-empty composer; typing your own draft takes priority and skips auto-send for that reply. Enabling the toggle does not act on an old already-finished reply; it starts from the next assistant output. Auto Continue is **per ChatGPT tab**, so enabling it in one task does not make other open chats auto-send; the tab keeps its setting until that tab is closed.

The extension stores project names/paths in `chrome.storage.local`; Auto Continue lives only in that ChatGPT tab's session. The path field is editable, so paths copied from Explorer can be pasted directly (including quoted `Copy as path` values, which are normalized on save). Chrome does not expose an absolute local path from its web folder picker, so **Chọn folder…** calls the loopback-only Aki panel endpoint, which opens an Explorer-style Windows dialog and returns the selected absolute path. The endpoint accepts only `chrome-extension://` origins with the extension request header; Aki MCP remains responsible for filesystem access.

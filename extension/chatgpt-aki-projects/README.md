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

The extension stores only project names/paths in `chrome.storage.local`. The path field is editable, so paths copied from Explorer can be pasted directly (including quoted `Copy as path` values, which are normalized on save). Chrome does not expose an absolute local path from its web folder picker, so **Chọn folder…** calls the loopback-only Aki panel endpoint, which opens an Explorer-style Windows dialog and returns the selected absolute path. The endpoint accepts only `chrome-extension://` origins with the extension request header; Aki MCP remains responsible for filesystem access.

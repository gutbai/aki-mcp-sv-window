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
2. Open the extension popup and click **Chọn folder…** to choose the project base folder with the Windows folder picker.
3. Enter or adjust the project name, then click **Thêm project**.
4. Add as many projects as needed.
5. Click `☆` beside one project to make it the `★` default.
6. Open ChatGPT New Chat. When the composer is empty, the extension prefills:

```text
@Aki
Project base folder: D:\path\to\project

Task: 
```

The extension stores only project names/paths in `chrome.storage.local`. Chrome does not expose an absolute local path from its web folder picker, so **Chọn folder…** calls the loopback-only Aki panel endpoint, which opens the native Windows folder picker and returns the selected absolute path. The endpoint accepts only `chrome-extension://` origins with the extension request header; Aki MCP remains responsible for filesystem access.

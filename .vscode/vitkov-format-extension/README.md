# Vitkov Custom Format

Local VS Code extension providing syntax highlighting and formatting for the Vitkov content format.

## Features

- Syntax highlighting for directives (`@rootId:`, `@menu:`, `@block:`, ...)
- Highlighting for page separators (`#`), quiz questions (`?`) and answers (`-`, `(*)`)
- Basic document formatter for normalized directives, blocks, quiz rows and blank lines

## Install locally as VSIX

From this folder run:

```powershell
npm init -y
npm i -D @vscode/vsce
npx vsce package
code --install-extension .\vitkov-custom-format-0.0.1.vsix
```

Restart VS Code after installation.

const vscode = require("vscode");

function normalizeLine(line) {
  return line.replace(/\s+$/g, "");
}

function formatVitkovText(text) {
  const lines = text.split(/\r?\n/).map(normalizeLine);
  const output = [];

  const isDirective = (line) => /^\s*@\w+\s*:/.test(line);
  const isPageSeparator = (line) => /^\s*#+\s*$/.test(line);
  const isBlockStart = (line) => /^\s*@block\s*:/.test(line);
  const isQuizQuestion = (line) => /^\s*\?/.test(line);
  const isQuizAnswer = (line) => /^\s*-\s*/.test(line);
  const isMarkdownUnorderedList = (line) => /^\s*[-*+]\s+/.test(line);
  const isMarkdownOrderedList = (line) => /^\s*\d+\.\s+/.test(line);
  const isMarkdownQuote = (line) => /^\s*>\s+/.test(line);

  let previousNonEmpty = "";

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    const trimmed = line.trim();

    if (trimmed === "") {
      if (output.length > 0 && output[output.length - 1] !== "") {
        output.push("");
      }
      continue;
    }

    if (isPageSeparator(trimmed)) {
      line = "#";
    } else if (isBlockStart(trimmed)) {
      const normalizedBlock = trimmed
        .replace(/^@block\s*:\s*/i, "")
        .toLowerCase();
      line = `@block: ${normalizedBlock}`;
    } else if (isDirective(trimmed)) {
      const directiveMatch = trimmed.match(/^@(\w+)\s*:\s*(.*)$/);
      if (directiveMatch) {
        line = `@${directiveMatch[1]}: ${directiveMatch[2]}`.trimEnd();
      }
    } else if (isQuizQuestion(trimmed)) {
      line = `? ${trimmed.replace(/^\?\s*/, "")}`.trimEnd();
    } else if (isQuizAnswer(trimmed) && !isMarkdownUnorderedList(trimmed)) {
      const answerBody = trimmed.replace(/^-\s*/, "");
      if (/^\(\*\)/.test(answerBody)) {
        line = `- (*) ${answerBody.replace(/^\(\*\)\s*/, "")}`.trimEnd();
      } else {
        line = `- ${answerBody}`.trimEnd();
      }
    } else if (isMarkdownOrderedList(trimmed) || isMarkdownQuote(trimmed)) {
      line = trimmed;
    }

    if (
      (isPageSeparator(line) || isBlockStart(line)) &&
      output.length > 0 &&
      output[output.length - 1] !== ""
    ) {
      output.push("");
    }

    if (
      isQuizAnswer(line) &&
      !isMarkdownUnorderedList(line) &&
      previousNonEmpty !== "" &&
      !isQuizQuestion(previousNonEmpty) &&
      !isQuizAnswer(previousNonEmpty)
    ) {
      output.push("");
    }

    output.push(line);
    previousNonEmpty = line;
  }

  while (output.length > 0 && output[output.length - 1] === "") {
    output.pop();
  }

  return `${output.join("\n")}\n`;
}

function activate(context) {
  const disposable = vscode.languages.registerDocumentFormattingEditProvider(
    "vitkovfmt",
    {
      provideDocumentFormattingEdits(document) {
        const originalText = document.getText();
        const formattedText = formatVitkovText(originalText);

        if (formattedText === originalText) {
          return [];
        }

        const start = new vscode.Position(0, 0);
        const end = document.lineAt(document.lineCount - 1).range.end;
        const fullRange = new vscode.Range(start, end);
        return [vscode.TextEdit.replace(fullRange, formattedText)];
      },
    },
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

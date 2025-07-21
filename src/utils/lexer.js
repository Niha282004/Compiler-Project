/**
 * Lexical analyzer (tokenizer) for C code
 */

export const lexer = (code) => {
  if (!code) return [];

  const tokens = [];
  let current = 0;

  // Define token patterns
  const patterns = {
    whitespace: /^\s+/,
    comment: /^\/\/.*|^\/\*[\s\S]*?\*\//,
    preprocessor: /^#\w+/,
    keyword:
      /^(if|else|while|for|return|break|continue|switch|case|default|do)/,
    type: /^(int|char|float|double|void|long|short|signed|unsigned|struct|union|enum|const|volatile)/,
    string: /^"[^"]*"/,
    char: /^'[^']*'/,
    number: /^-?\d+(\.\d+)?([eE][+-]?\d+)?/,
    identifier: /^[a-zA-Z_][a-zA-Z0-9_]*/,
    operator:
      /^(\+\+|--|==|!=|<=|>=|&&|\|\||<<|>>|\+|-|\*|\/|%|<|>|!|~|\^|&|\||=|\.|->|,)/,
    punctuation: /^[;:{}()\[\]]/,
  };

  // Helper to get the current line and column
  const getLineAndColumn = (pos) => {
    const lines = code.slice(0, pos).split("\n");
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { line, column };
  };

  // Main tokenization loop
  while (current < code.length) {
    let matched = false;

    // Skip whitespace and comments without creating tokens
    if (code.slice(current).match(patterns.whitespace)) {
      const match = code.slice(current).match(patterns.whitespace)[0];
      current += match.length;
      continue;
    }

    if (code.slice(current).match(patterns.comment)) {
      const match = code.slice(current).match(patterns.comment)[0];
      const { line, column } = getLineAndColumn(current);
      tokens.push({
        type: "comment",
        value: match,
        start: current,
        end: current + match.length,
        line,
        column,
      });
      current += match.length;
      continue;
    }

    // Find matching token types
    for (const [type, pattern] of Object.entries(patterns)) {
      // Skip whitespace and comments which we already handled
      if (type === "whitespace" || type === "comment") continue;

      const match = code.slice(current).match(pattern);

      if (match) {
        const value = match[0];
        const { line, column } = getLineAndColumn(current);

        // Handle special tokens like preprocessor directives
        if (type === "preprocessor" && value === "#include") {
          tokens.push({
            type: "preprocessor",
            value,
            start: current,
            end: current + value.length,
            line,
            column,
          });

          // Advance past the whitespace
          current += value.length;
          const wsMatch = code.slice(current).match(/^\s+/);
          if (wsMatch) {
            current += wsMatch[0].length;
          }

          // Check for header format: <header.h> or "header.h"
          const headerMatch = code.slice(current).match(/^(<[^>]+>|"[^"]+")/);

          if (headerMatch) {
            const headerValue = headerMatch[0];
            const headerStart = current;
            const { line: headerLine, column: headerColumn } =
              getLineAndColumn(current);

            tokens.push({
              type: "string", // Treating headers as string literals
              value: headerValue,
              start: headerStart,
              end: headerStart + headerValue.length,
              line: headerLine,
              column: headerColumn,
            });

            current += headerValue.length;
          }

          matched = true;
          break;
        }
        // Process regular tokens
        else {
          tokens.push({
            type,
            value,
            start: current,
            end: current + value.length,
            line,
            column,
          });

          current += value.length;
          matched = true;
          break;
        }
      }
    }

    // If no pattern matched, handle as an error token
    if (!matched) {
      const { line, column } = getLineAndColumn(current);
      tokens.push({
        type: "error",
        value: code[current],
        start: current,
        end: current + 1,
        line,
        column,
      });
      current++;
    }
  }

  return tokens;
};

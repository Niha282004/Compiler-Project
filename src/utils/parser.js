/**
 * Parser module for analyzing tokens and generating an Abstract Syntax Tree (AST)
 * This implementation handles C language syntax elements
 */

export const parser = (tokens) => {
  // Initial state for the parser
  let current = 0;
  const ast = {
    type: "Program",
    body: [],
  };
  const errors = [];

  // Helper function to peek at the current token
  const peek = () => tokens[current] || null;

  // Helper function to peek ahead n positions
  const peekAhead = (n = 1) => tokens[current + n] || null;

  // Helper function to advance to the next token
  const advance = () => {
    current++;
    return tokens[current - 1];
  };

  // Helper function to check if current token matches expected type without advancing
  const check = (type) => {
    const token = peek();
    return token && token.type === type;
  };

  // Helper function to check if current token value matches expected value without advancing
  const checkValue = (value) => {
    const token = peek();
    return token && token.value === value;
  };

  // Helper function to expect a certain token type
  const expect = (type, message) => {
    const token = peek();
    if (!token || token.type !== type) {
      errors.push({
        message:
          message ||
          `Expected token of type ${type}, got ${token?.type || "end of file"}`,
        location: token
          ? { start: token.start, end: token.end }
          : {
              start: tokens[tokens.length - 1]?.end || 0,
              end: tokens[tokens.length - 1]?.end || 0,
            },
      });
      return null;
    }
    return advance();
  };

  // Helper function to expect a certain token value
  const expectValue = (value, message) => {
    const token = peek();
    if (!token || token.value !== value) {
      errors.push({
        message:
          message ||
          `Expected '${value}', got '${token?.value || "end of file"}'`,
        location: token
          ? { start: token.start, end: token.end }
          : {
              start: tokens[tokens.length - 1]?.end || 0,
              end: tokens[tokens.length - 1]?.end || 0,
            },
      });
      return null;
    }
    return advance();
  };

  // Parsing the include directive
  const parseInclude = () => {
    const startToken = peek();
    // Consume '#include'
    advance();

    // Check for the header name in angle brackets or quotes
    const headerToken = peek();
    if (!headerToken) {
      errors.push({
        message: "Expected header name after #include",
        location: { start: startToken.start, end: startToken.end },
      });
      return null;
    }

    // Process header in angle brackets (e.g., <stdio.h>)
    if (headerToken.value === "<") {
      advance(); // Consume '<'

      // Collect all tokens until '>'
      let headerName = "";
      while (peek() && peek().value !== ">") {
        headerName += peek().value;
        advance();
      }

      // Consume '>'
      if (!expectValue(">", "Expected '>' after header name")) {
        return null;
      }

      return {
        type: "Include",
        header: headerName,
        system: true, // System header
        location: {
          start: startToken.start,
          end: peek() ? peek().end : startToken.end,
        },
      };
    }
    // Process header in quotes (e.g., "myheader.h")
    else if (headerToken.type === "string") {
      advance();
      return {
        type: "Include",
        header: headerToken.value.replace(/['"]/g, ""),
        system: true, // User header
        location: { start: startToken.start, end: headerToken.end },
      };
    } else {
      errors.push({
        message: 'Invalid include directive, expected <header> or "header"',
        location: { start: headerToken.start, end: headerToken.end },
      });
      return null;
    }
  };

  // Parse declaration specifiers (type qualifiers and type specifiers)
  const parseDeclarationSpecifiers = () => {
    const specifiers = [];
    let startPos = peek()?.start || 0;

    // Parse type qualifiers (const, volatile) and type specifiers (int, char, etc.)
    while (
      peek() &&
      (peek().type === "type" ||
        peek().type === "qualifier" ||
        peek().value === "struct" ||
        peek().value === "union" ||
        peek().value === "enum")
    ) {
      const token = advance();

      // Handle struct/union/enum
      if (
        token.value === "struct" ||
        token.value === "union" ||
        token.value === "enum"
      ) {
        const tagType = token.value;
        const tagName =
          peek() && peek().type === "identifier" ? advance().value : null;

        specifiers.push({
          type: "ComplexType",
          kind: tagType,
          name: tagName,
          location: { start: token.start, end: peek()?.end || token.end },
        });

        // Handle struct/union/enum definition
        if (peek() && peek().value === "{") {
          // Skip the struct/union/enum definition for now
          let braceCount = 0;
          do {
            if (peek().value === "{") braceCount++;
            if (peek().value === "}") braceCount--;
            advance();
          } while (peek() && braceCount > 0);
        }
      } else {
        // Regular type or qualifier
        specifiers.push({
          type: token.type === "qualifier" ? "TypeQualifier" : "TypeSpecifier",
          name: token.value,
          location: { start: token.start, end: token.end },
        });
      }
    }

    if (specifiers.length === 0) {
      return null;
    }

    return {
      type: "DeclarationSpecifiers",
      specifiers: specifiers,
      location: {
        start: startPos,
        end: specifiers[specifiers.length - 1].location.end,
      },
    };
  };

  // Parse variable declarator (variable name and optional initializer)
  const parseVariableDeclarator = (typeSpecifiers) => {
    const identifierToken = expect("identifier", "Expected variable name");
    if (!identifierToken) return null;

    let initializer = null;
    let isArray = false;

    // Check for array declaration
    if (peek() && peek().value === "[") {
      isArray = true;
      advance(); // Consume '['

      // Parse array size expression (optional)
      let sizeExpr = null;
      if (peek() && peek().value !== "]") {
        sizeExpr = parseExpression();
      }

      expectValue("]", "Expected ']' after array dimension");
    }

    // Check for initializer
    if (peek() && peek().value === "=") {
      advance(); // Consume '='
      initializer = parseExpression();
    }

    return {
      type: "VariableDeclarator",
      id: {
        type: "Identifier",
        name: identifierToken.value,
        location: { start: identifierToken.start, end: identifierToken.end },
      },
      isArray: isArray,
      initializer: initializer,
      location: {
        start: identifierToken.start,
        end: initializer ? initializer.location.end : identifierToken.end,
      },
    };
  };

  // Parse variable declaration
  const parseVariableDeclaration = () => {
    const typeSpecifiers = parseDeclarationSpecifiers();

    if (!typeSpecifiers) {
      errors.push({
        message: "Expected type specifier",
        location: peek()
          ? { start: peek().start, end: peek().end }
          : { start: 0, end: 0 },
      });
      return null;
    }

    const declarators = [];

    // Continue parsing declarators until we hit a semicolon
    while (true) {
      // Check for pointer type (look for '*' after type)
      let isPointer = false;
      if (peek() && peek().value === "*") {
        isPointer = true;
        advance(); // Consume '*'
      }

      // Parse the declarator (variable name, array notation, initializer)
      const declarator = parseVariableDeclarator(typeSpecifiers);
      if (!declarator) break;

      // Set pointer flag if detected
      if (isPointer) {
        declarator.isPointer = true;
      }

      declarators.push(declarator);

      // Check if we have more declarators (separated by commas)
      if (peek() && peek().value === ",") {
        advance(); // Consume ','
      } else {
        break;
      }
    }

    // Expect semicolon
    expectValue(";", "Expected ';' after variable declaration");

    return {
      type: "VariableDeclaration",
      declarations: declarators,
      typeSpecifiers: typeSpecifiers,
      location: {
        start: typeSpecifiers.location.start,
        end:
          peek()?.end ||
          (declarators.length > 0
            ? declarators[declarators.length - 1].location.end
            : typeSpecifiers.location.end),
      },
    };
  };

  // Parse assignment expression
  const parseAssignmentExpression = () => {
    const left = parseBinaryExpression();

    if (!left) return null;

    // Check if this is an assignment
    if (peek() && peek().value === "=") {
      const operator = advance().value;
      const right = parseAssignmentExpression(); // Assignments are right-associative

      if (!right) return null;

      return {
        type: "AssignmentExpression",
        operator: operator,
        left: left,
        right: right,
        location: {
          start: left.location.start,
          end: right.location.end,
        },
      };
    }

    return left;
  };

  // Parse a binary expression
  const parseBinaryExpression = (precedence = 0) => {
    const operators = {
      "+": { precedence: 4, associativity: "left" },
      "-": { precedence: 4, associativity: "left" },
      "*": { precedence: 5, associativity: "left" },
      "/": { precedence: 5, associativity: "left" },
      "%": { precedence: 5, associativity: "left" },
      "<": { precedence: 3, associativity: "left" },
      ">": { precedence: 3, associativity: "left" },
      "<=": { precedence: 3, associativity: "left" },
      ">=": { precedence: 3, associativity: "left" },
      "==": { precedence: 2, associativity: "left" },
      "!=": { precedence: 2, associativity: "left" },
      "&&": { precedence: 1, associativity: "left" },
      "||": { precedence: 0, associativity: "left" },
    };

    // Parse the left-hand side of the expression
    let left = parseUnaryExpression();
    if (!left) {
      return null;
    }

    // Keep processing binary operators as long as they have higher precedence
    while (
      peek() &&
      operators[peek().value] &&
      operators[peek().value].precedence >= precedence
    ) {
      const operatorToken = advance();
      const operator = operatorToken.value;
      const nextPrecedence =
        operators[operator].precedence +
        (operators[operator].associativity === "left" ? 1 : 0);

      // Parse the right-hand side with appropriate precedence
      const right = parseBinaryExpression(nextPrecedence);
      if (!right) return null;

      // Combine into a binary expression
      left = {
        type: "BinaryExpression",
        operator: operator,
        left: left,
        right: right,
        location: {
          start: left.location.start,
          end: right.location.end,
        },
      };
    }

    return left;
  };

  // Parse unary expressions (!, -, ++, --, etc.)
  const parseUnaryExpression = () => {
    const unaryOperators = ["!", "-", "~", "++", "--", "&", "*"];

    if (peek() && unaryOperators.includes(peek().value)) {
      const operatorToken = advance();
      const argument = parseUnaryExpression();
      if (!argument) return null;

      return {
        type: "UnaryExpression",
        operator: operatorToken.value,
        argument: argument,
        prefix: true,
        location: {
          start: operatorToken.start,
          end: argument ? argument.location.end : operatorToken.end,
        },
      };
    }

    return parsePrimaryExpression();
  };

  // Parse primary expressions (literals, identifiers, parenthesized expressions)
  const parsePrimaryExpression = () => {
    const token = peek();
    if (!token) return null;

    if (token.type === "comment") {
      advance(); // Just skip comments
      return parsePrimaryExpression(); // Re-parse valid expression
    }

    // String literal
    if (token.type === "string") {
      const stringToken = advance();
      return {
        type: "Literal",
        value: stringToken.value,
        valueType: "string",
        location: { start: stringToken.start, end: stringToken.end },
      };
    }

    // Number literal
    if (token.type === "number") {
      const numberToken = advance();
      return {
        type: "Literal",
        value: numberToken.value,
        valueType: "number",
        location: { start: numberToken.start, end: numberToken.end },
      };
    }

    // Identifier
    if (token.type === "identifier") {
      const identifier = advance();

      // Function call
      if (peek() && peek().value === "(") {
        advance(); // Consume '('
        const args = [];

        // Empty argument list
        if (peek() && peek().value === ")") {
          advance(); // Consume ')'
        } else {
          // Parse arguments
          while (peek() && peek().value !== ")") {
            const arg = parseExpression();
            if (arg) args.push(arg);

            // Check for comma or end of argument list
            if (peek() && peek().value === ",") {
              advance(); // Consume ','
            } else {
              break;
            }
          }

          if (peek() && peek().value === ")") {
            advance(); // Consume ')'
          } else {
            errors.push({
              message: "Expected ')' after function arguments",
              location: { start: identifier.start, end: identifier.end },
            });
          }
        }

        return {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: identifier.value,
            location: { start: identifier.start, end: identifier.end },
          },
          arguments: args,
          location: {
            start: identifier.start,
            end: peek() ? peek().end : identifier.end,
          },
        };
      }

      // Simple identifier
      return {
        type: "Identifier",
        name: identifier.value,
        location: { start: identifier.start, end: identifier.end },
      };
    }

    // Parenthesized expression
    if (token.value === "(") {
      advance(); // Consume '('
      const expr = parseExpression();

      if (peek() && peek().value === ")") {
        advance(); // Consume ')'
      } else {
        errors.push({
          message: "Expected ')' after expression",
          location: { start: token.start, end: token.end },
        });
      }

      return expr;
    }

    // Skip tokens that aren't part of valid expressions
    if (token.value === ")" || token.value === ";" || token.value === ",") {
      return null;
    }

    // If we can't handle the token, advance and return an error
    errors.push({
      message: `Unexpected token in expression: ${token.value}`,
      location: { start: token.start, end: token.end },
    });
    advance();
    return null;
  };

  // Parse expression
  const parseExpression = () => {
    return parseAssignmentExpression();
  };

  // Parse a return statement
  const parseReturnStatement = () => {
    const returnToken = advance(); // Consume 'return'

    // Check if there's an expression or just a semicolon
    let argument = null;
    if (peek() && peek().value !== ";") {
      argument = parseExpression();
    }

    // Expect semicolon
    expectValue(";", "Expected ';' after return statement");

    return {
      type: "ReturnStatement",
      argument,
      location: {
        start: returnToken.start,
        end: peek() ? peek().end : returnToken.end,
      },
    };
  };

  // Parse a block statement (compound statement)
  const parseBlockStatement = () => {
    const startToken = peek();

    // Consume opening brace
    if (!expectValue("{", "Expected '{' for block statement")) {
      return null;
    }

    const body = [];

    // Parse statements until closing brace
    while (peek() && peek().value !== "}") {
      const statement = parseStatement();
      if (statement) {
        body.push(statement);
      } else if (peek() && peek().value !== "}") {
        advance();
      } else {
        break;
      }
    }

    // Consume closing brace
    const closingBrace = expectValue("}", "Expected '}' after block statement");

    return {
      type: "BlockStatement",
      body: body,
      location: {
        start: startToken.start,
        end: closingBrace
          ? closingBrace.end
          : body.length > 0
          ? body[body.length - 1].location.end
          : startToken.end,
      },
    };
  };

  // Parse if statement
  const parseIfStatement = () => {
    const startToken = peek();

    // Consume 'if'
    advance();

    // Parse condition
    if (!expectValue("(", "Expected '(' after 'if'")) {
      return null;
    }

    const test = parseExpression();

    if (!expectValue(")", "Expected ')' after if condition")) {
      return null;
    }

    // Parse consequent (then branch)
    const consequent = parseStatement();

    // Parse alternate (else branch) if it exists
    let alternate = null;
    if (peek() && peek().value === "else") {
      advance(); // Consume 'else'
      alternate = parseStatement();
    }

    return {
      type: "IfStatement",
      test: test,
      consequent: consequent,
      alternate: alternate,
      location: {
        start: startToken.start,
        end: alternate ? alternate.location.end : consequent.location.end,
      },
    };
  };

  // Parse while statement
  const parseWhileStatement = () => {
    const startToken = peek();

    // Consume 'while'
    advance();

    // Parse condition
    if (!expectValue("(", "Expected '(' after 'while'")) {
      return null;
    }

    const test = parseExpression();

    if (!expectValue(")", "Expected ')' after while condition")) {
      return null;
    }

    // Parse body
    const body = parseStatement();

    return {
      type: "WhileStatement",
      test: test,
      body: body,
      location: {
        start: startToken.start,
        end: body ? body.location.end : startToken.end,
      },
    };
  };

  const parseForStatement = () => {
    const startToken = peek();

    // Consume 'for'
    advance();

    // Parse for loop components
    expectValue("(", "Expected '(' after 'for'");

    // Initialize
    let init = null;
    if (peek() && peek().value !== ";") {
      // Check if it's a variable declaration
      if (peek().type === "type" || peek().type === "qualifier") {
        init = parseVariableDeclaration();
      } else {
        // It's an expression like i = 0
        init = parseExpression();
        expectValue(";", "Expected ';' after for loop initialization");
      }
    } else {
      advance(); // Consume ';'
    }

    // Test condition
    let test = null;
    if (peek() && peek().value !== ";") {
      test = parseExpression();
    }

    expectValue(";", "Expected ';' after for loop condition");

    // Update expression
    let update = null;
    if (peek() && peek().value !== ")") {
      update = parseExpression();
    }

    if (peek() && peek().value === ")") {
      advance(); // Consume ')' silently
    }

    // Body
    const body = parseStatement();

    return {
      type: "ForStatement",
      init: init,
      test: test,
      update: update,
      body: body,
      location: {
        start: startToken.start,
        end: body ? body.location.end : startToken.end,
      },
    };
  };

  // Parse expression statement
  const parseExpressionStatement = () => {
    const expr = parseExpression();
    if (!expr) {
      // Skip problematic token to avoid infinite loop
      if (peek()) advance();
      return null;
    }

    // Expect semicolon after expression
    expectValue(";", "Expected ';' after expression");

    return {
      type: "ExpressionStatement",
      expression: expr,
      location: {
        start: expr.location.start,
        end: peek() ? peek().end : expr.location.end,
      },
    };
  };

  // Parse a statement
  const parseStatement = () => {
    const token = peek();

    if (!token) return null;

    // Handle variable declarations
    if (
      token.type === "type" ||
      token.type === "qualifier" ||
      token.value === "struct" ||
      token.value === "union" ||
      token.value === "enum"
    ) {
      return parseVariableDeclaration();
    }

    // Handle control statements
    if (token.value === "return") return parseReturnStatement();
    if (token.value === "if") return parseIfStatement();
    if (token.value === "for") return parseForStatement();
    if (token.value === "while") return parseWhileStatement();

    // Handle compound/block statements
    if (token.value === "{") return parseBlockStatement();
    return parseExpressionStatement();
  };

  // Parse function parameters
  const parseParameters = () => {
    const params = [];

    // Consume opening parenthesis
    if (!expectValue("(", "Expected '(' for function parameters")) {
      return params;
    }

    // Handle void parameter list
    if (peek() && peek().type === "type" && peek().value === "void") {
      const voidToken = advance();
      // Check if it's just "void" with no parameter name
      if (peek() && peek().value === ")") {
        advance(); // Consume ')'
        return params; // Empty parameter list
      } else {
        // Reset position as this is a void return type with a parameter name
        current--;
      }
    }

    // Empty parameter list
    if (peek() && peek().value === ")") {
      advance(); // Consume ')'
      return params;
    }

    // Parse parameters until closing parenthesis
    while (peek() && peek().value !== ")") {
      const typeSpecifiers = parseDeclarationSpecifiers();

      if (!typeSpecifiers) {
        errors.push({
          message: "Expected parameter type",
          location: peek()
            ? { start: peek().start, end: peek().end }
            : { start: 0, end: 0 },
        });
        break;
      }

      // Check for pointer parameter
      let isPointer = false;
      if (peek() && peek().value === "*") {
        isPointer = true;
        advance(); // Consume '*'
      }

      // Parameter name
      const nameToken = expect("identifier", "Expected parameter name");

      if (nameToken) {
        // Check for array parameter
        let isArray = false;
        if (peek() && peek().value === "[") {
          advance(); // Consume '['
          // Parse array size expression (optional)
          if (peek() && peek().value !== "]") {
            parseExpression(); // We don't need to store this for now
          }
          expectValue("]", "Expected ']' after array parameter");
          isArray = true;
        }

        params.push({
          type: "Parameter",
          paramType: typeSpecifiers,
          name: nameToken.value,
          isArray: isArray,
          isPointer: isPointer,
          location: {
            start: typeSpecifiers.location.start,
            end: nameToken.end,
          },
        });
      }

      // Check for comma or end of parameter list
      if (peek() && peek().value === ",") {
        advance(); // Consume ','
      } else {
        break;
      }
    }

    // Consume closing parenthesis
    expectValue(")", "Expected ')' after function parameters");

    return params;
  };

  // Parse function body
  const parseFunctionBody = () => {
    return parseBlockStatement();
  };

  // Parse function declaration
  const parseFunctionDeclaration = () => {
    const startPos = peek()?.start || 0;
    const returnTypeSpecifiers = parseDeclarationSpecifiers();

    if (!returnTypeSpecifiers) {
      errors.push({
        message: "Expected function return type",
        location: peek()
          ? { start: peek().start, end: peek().end }
          : { start: 0, end: 0 },
      });
      return null;
    }

    // Check for pointer return type
    let isPointerReturn = false;
    if (peek() && peek().value === "*") {
      isPointerReturn = true;
      advance(); // Consume '*'
    }

    // Function name
    const nameToken = expect("identifier", "Expected function name");

    if (!nameToken) return null;

    // Function parameters
    const params = parseParameters();

    // Function body or forward declaration
    let body = null;
    if (peek() && peek().value === "{") {
      body = parseFunctionBody();
    } else {
      // Forward declaration ends with semicolon
      expectValue(";", "Expected ';' after function forward declaration");
    }

    return {
      type: "FunctionDeclaration",
      id: {
        type: "Identifier",
        name: nameToken.value,
        location: { start: nameToken.start, end: nameToken.end },
      },
      returnType: returnTypeSpecifiers,
      isPointerReturn: isPointerReturn,
      params,
      body,
      location: {
        start: startPos,
        end: body ? body.location.end : peek() ? peek().end : nameToken.end,
      },
    };
  };

  // Parse a typedef statement
  const parseTypedef = () => {
    const startToken = peek();
    advance(); // Consume 'typedef'

    // Parse the type being defined
    const typeSpecifiers = parseDeclarationSpecifiers();
    if (!typeSpecifiers) {
      errors.push({
        message: "Expected type specifier after typedef",
        location: { start: startToken.start, end: startToken.end },
      });
      return null;
    }

    // Get the new type name
    const nameToken = expect(
      "identifier",
      "Expected identifier for typedef name"
    );
    if (!nameToken) return null;

    // Expect semicolon
    expectValue(";", "Expected ';' after typedef");

    return {
      type: "Typedef",
      typeSpecifiers: typeSpecifiers,
      id: {
        type: "Identifier",
        name: nameToken.value,
        location: { start: nameToken.start, end: nameToken.end },
      },
      location: {
        start: startToken.start,
        end: peek() ? peek().end : nameToken.end,
      },
    };
  };

  // Parse preprocessor directive
  const parsePreprocessorDirective = () => {
    const token = peek();

    if (token.value === "#include") {
      return parseInclude();
    } else if (token.value === "#define") {
      // For now, just skip over #define directives
      advance(); // Consume '#define'

      // Skip to end of line
      while (peek() && !peek().value.includes("\n")) {
        advance();
      }

      return {
        type: "PreprocessorDirective",
        directive: "define",
        location: { start: token.start, end: peek() ? peek().end : token.end },
      };
    }

    // Skip unrecognized preprocessor directives
    errors.push({
      message: `Unrecognized preprocessor directive: ${token.value}`,
      location: { start: token.start, end: token.end },
    });
    advance();
    return null;
  };

  // Main parsing function
  const parseProgram = () => {
    while (current < tokens.length) {
      const token = peek();
      if (!token) break;

      try {
        // Handle different top-level constructs
        if (token.value.startsWith("#")) {
          const directive = parsePreprocessorDirective();
          if (directive) ast.body.push(directive);
        } else if (token.value === "typedef") {
          const typeDef = parseTypedef();
          if (typeDef) ast.body.push(typeDef);
        } else if (
          token.type === "type" ||
          token.type === "qualifier" ||
          token.value === "struct" ||
          token.value === "union" ||
          token.value === "enum"
        ) {
          // Look ahead to determine if this is a function or variable declaration
          const savedPosition = current;
          const typeSpecifiers = parseDeclarationSpecifiers();

          if (typeSpecifiers && peek() && peek().type === "identifier") {
            const identifierToken = peek();
            advance(); // Move past the identifier

            // Check for pointer
            if (peek() && peek().value === "*") {
              advance(); // Skip past pointer
            }

            // Check if this is a function
            if (peek() && peek().value === "(") {
              // Function declaration
              current = savedPosition;
              const func = parseFunctionDeclaration();
              if (func) ast.body.push(func);
            } else {
              // Variable declaration
              current = savedPosition;
              const varDecl = parseVariableDeclaration();
              if (varDecl) ast.body.push(varDecl);
            }
          } else {
            // Reset if we couldn't determine the construct
            current = savedPosition;
            errors.push({
              message: "Unrecognized declaration",
              location: { start: token.start, end: token.end },
            });
            advance();
          }
        } else if (token.type === "identifier") {
          // This could be a function call or other expression at program level
          const stmt = parseStatement();
          if (stmt) ast.body.push(stmt);
        } else if (token.value === "return") {
          // Handle top-level return statements (inside main function)
          const stmt = parseReturnStatement();
          if (stmt) ast.body.push(stmt);
        } else if (token.value === "{") {
          // Handle block statements at top level (might be part of function body)
          const block = parseBlockStatement();
          if (block) ast.body.push(block);
        } else if (token.value === "}") {
          // Skip unmatched closing braces at the top level
          advance(); // Just skip it without error
        } else {
          // Skip unrecognized tokens
          errors.push({
            message: `Unexpected token at program level: ${token.value}`,
            location: { start: token.start, end: token.end },
          });
          advance();
        }
      } catch (e) {
        // Recover from errors by advancing to the next token
        errors.push({
          message: `Parser error: ${e.message}`,
          location: token
            ? { start: token.start, end: token.end }
            : { start: 0, end: 0 },
        });
        advance();
      }
    }

    return { ast, errors };
  };

  return parseProgram();
};

/**
 * Enhanced Semantic Analyzer for C Compiler
 * Fixed to properly track variable usage in all contexts
 */

export const semanticAnalyzer = (ast, code) => {
  const symbolTable = {};
  const errors = [];
  const typeHierarchy = new Map();
  const functionCalls = [];
  const variableUses = new Set();

  // Helper to get line number from code and position
  const getLineNumber = (position) => {
    if (!code || position === undefined) return 1;
    try {
      return code.substring(0, position).split("\n").length;
    } catch (err) {
      return 1;
    }
  };

  // Helper to get the code line at a specific position
  const getCodeLine = (position) => {
    if (!code || position === undefined) return "";
    try {
      const lineNum = getLineNumber(position) - 1;
      return code.split("\n")[lineNum]?.trim() || "";
    } catch (err) {
      return "";
    }
  };

  // Generate unique symbol key
  const getSymbolKey = (name, scope) => {
    return `${scope}:${name}`;
  };

  // Resolve variable in scope chain
  const resolveVariable = (name, currentScope, scopeStack) => {
    if (!name) return null;

    // Check current scope first
    const currentKey = getSymbolKey(name, currentScope);
    if (symbolTable[currentKey]) return symbolTable[currentKey];

    // Check parent scopes in reverse order
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const key = getSymbolKey(name, scopeStack[i]);
      if (symbolTable[key]) return symbolTable[key];
    }

    // Check builtin scope
    const builtinKey = getSymbolKey(name, "builtin");
    if (symbolTable[builtinKey]) return symbolTable[builtinKey];

    return null;
  };

  // Enhanced type compatibility checking
  const areTypesCompatible = (targetType, sourceType) => {
    if (!targetType || !sourceType) return false;
    if (targetType === sourceType) return true;

    const normalizeType = (type) => {
      return type.replace(/\bconst\s+|\bvolatile\s+/g, "").trim();
    };

    const normalizedTarget = normalizeType(targetType);
    const normalizedSource = normalizeType(sourceType);

    if (normalizedTarget === normalizedSource) return true;

    // Numeric type conversions
    const numericTypes = [
      "int",
      "float",
      "double",
      "char",
      "short",
      "long",
      "long long",
      "unsigned int",
      "unsigned char",
      "unsigned short",
      "unsigned long",
    ];

    if (
      numericTypes.includes(normalizedTarget) &&
      numericTypes.includes(normalizedSource)
    ) {
      return true;
    }

    // Pointer compatibility
    if (normalizedTarget.endsWith("*") && normalizedSource.endsWith("*")) {
      if (normalizedTarget === "void*" || normalizedSource === "void*") {
        return true;
      }
      const baseTarget = normalizedTarget.slice(0, -1).trim();
      const baseSource = normalizedSource.slice(0, -1).trim();
      return areTypesCompatible(baseTarget, baseSource);
    }

    // Array to pointer decay
    if (normalizedTarget.endsWith("*") && normalizedSource.endsWith("[]")) {
      const baseTarget = normalizedTarget.slice(0, -1).trim();
      const baseSource = normalizedSource.slice(0, -2).trim();
      return areTypesCompatible(baseTarget, baseSource);
    }

    return false;
  };

  const getExpressionType = (node, scope, scopeStack) => {
    if (!node) return null;

    switch (node.type) {
      case "Identifier": {
        const variable = resolveVariable(node.name, scope, scopeStack);
        if (variable) {
          variableUses.add(node.name);
          return variable.type;
        }
        return null;
      }

      case "Literal":
        if (node.valueType === "string") return "char*";
        if (node.valueType === "number") {
          return node.value && node.value.includes(".") ? "float" : "int";
        }
        return "int";

      case "BinaryExpression": {
        const leftType = getExpressionType(node.left, scope, scopeStack);
        const rightType = getExpressionType(node.right, scope, scopeStack);

        if (
          ["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(node.operator)
        ) {
          return "int";
        }

        if (["+", "-", "*", "/", "%"].includes(node.operator)) {
          if (!leftType || !rightType) return null;

          if (leftType.includes("double") || rightType.includes("double"))
            return "double";
          if (leftType.includes("float") || rightType.includes("float"))
            return "float";
          if (leftType.includes("long") || rightType.includes("long"))
            return "long";

          if (
            (leftType.includes("*") || rightType.includes("*")) &&
            (node.operator === "+" || node.operator === "-")
          ) {
            return leftType.includes("*") ? leftType : rightType;
          }

          return "int";
        }

        return null;
      }

      case "UnaryExpression": {
        const argType = getExpressionType(node.argument, scope, scopeStack);
        if (!argType) return null;

        switch (node.operator) {
          case "&":
            return `${argType}*`;
          case "*":
            return argType.endsWith("*") ? argType.slice(0, -1).trim() : null;
          case "!":
            return "int";
          case "-":
          case "+":
          case "~":
          case "++":
          case "--":
            return argType;
          default:
            return null;
        }
      }

      case "AssignmentExpression":
        return getExpressionType(node.left, scope, scopeStack);

      case "CallExpression": {
        const funcName = node.callee?.name;
        const funcSymbol = resolveVariable(funcName, scope, scopeStack);

        functionCalls.push({
          name: funcName,
          location: node.location,
          arguments: node.arguments,
          scope,
          scopeStack,
        });

        return funcSymbol?.returnType || null;
      }

      default:
        return null;
    }
  };

  // FIXED: Comprehensive variable usage tracking
  const markVariablesAsUsed = (node, scope, scopeStack) => {
    if (!node || typeof node !== "object") return;

    // Handle different node types specifically
    switch (node.type) {
      case "Identifier": {
        const variable = resolveVariable(node.name, scope, scopeStack);
        if (variable) {
          variableUses.add(node.name);

          if (!variable.initialized && !variable.isParameter) {
            errors.push({
              message: `Variable '${node.name}' used before initialization`,
              line: getLineNumber(node.location?.start),
              code: getCodeLine(node.location?.start),
              description:
                "Using uninitialized variable may lead to undefined behavior",
              severity: "error",
            });
          }
        }
        return;
      }

      case "BinaryExpression": {
        // Recursively mark both operands
        markVariablesAsUsed(node.left, scope, scopeStack);
        markVariablesAsUsed(node.right, scope, scopeStack);
        return;
      }

      case "UnaryExpression": {
        markVariablesAsUsed(node.argument, scope, scopeStack);
        return;
      }

      case "AssignmentExpression": {
        // Mark right side as used, but not left side (it's being assigned to)
        markVariablesAsUsed(node.right, scope, scopeStack);
        return;
      }

      case "CallExpression": {
        // Mark all arguments as used
        if (node.arguments) {
          node.arguments.forEach((arg) =>
            markVariablesAsUsed(arg, scope, scopeStack)
          );
        }
        return;
      }

      case "ArrayAccess": {
        markVariablesAsUsed(node.array, scope, scopeStack);
        markVariablesAsUsed(node.index, scope, scopeStack);
        return;
      }

      case "MemberExpression": {
        markVariablesAsUsed(node.object, scope, scopeStack);
        if (node.computed) {
          markVariablesAsUsed(node.property, scope, scopeStack);
        }
        return;
      }

      case "ConditionalExpression": {
        markVariablesAsUsed(node.test, scope, scopeStack);
        markVariablesAsUsed(node.consequent, scope, scopeStack);
        markVariablesAsUsed(node.alternate, scope, scopeStack);
        return;
      }

      default:
        // For any other node types, traverse all properties
        for (const key in node) {
          if (node[key] && typeof node[key] === "object") {
            if (Array.isArray(node[key])) {
              node[key].forEach((item) =>
                markVariablesAsUsed(item, scope, scopeStack)
              );
            } else {
              markVariablesAsUsed(node[key], scope, scopeStack);
            }
          }
        }
    }
  };

  /**
   * Add standard library functions to the symbol table
   */
  const addStandardLibraryFunctions = () => {
    const stdFuncs = [
      {
        name: "printf",
        returnType: "int",
        params: [{ name: "format", type: "const char*" }],
        isVarArgs: true,
      },
      {
        name: "scanf",
        returnType: "int",
        params: [{ name: "format", type: "const char*" }],
        isVarArgs: true,
      },
      {
        name: "malloc",
        returnType: "void*",
        params: [{ name: "size", type: "size_t" }],
      },
      {
        name: "free",
        returnType: "void",
        params: [{ name: "ptr", type: "void*" }],
      },
      {
        name: "strcpy",
        returnType: "char*",
        params: [
          { name: "dest", type: "char*" },
          { name: "src", type: "const char*" },
        ],
      },
      {
        name: "strlen",
        returnType: "size_t",
        params: [{ name: "str", type: "const char*" }],
      },
      {
        name: "puts",
        returnType: "int",
        params: [{ name: "str", type: "const char*" }],
      },
      {
        name: "putchar",
        returnType: "int",
        params: [{ name: "char", type: "int" }],
      },
      { name: "getchar", returnType: "int", params: [] },
      {
        name: "fopen",
        returnType: "FILE*",
        params: [
          { name: "filename", type: "const char*" },
          { name: "mode", type: "const char*" },
        ],
      },
      {
        name: "fclose",
        returnType: "int",
        params: [{ name: "stream", type: "FILE*" }],
      },
      {
        name: "exit",
        returnType: "void",
        params: [{ name: "status", type: "int" }],
      },
      {
        name: "memcpy",
        returnType: "void*",
        params: [
          { name: "dest", type: "void*" },
          { name: "src", type: "const void*" },
          { name: "n", type: "size_t" },
        ],
      },
      {
        name: "memset",
        returnType: "void*",
        params: [
          { name: "str", type: "void*" },
          { name: "c", type: "int" },
          { name: "n", type: "size_t" },
        ],
      },
    ];

    stdFuncs.forEach((func) => {
      const key = getSymbolKey(func.name, "builtin");
      symbolTable[key] = {
        name: func.name,
        type: `${func.returnType} function`,
        returnType: func.returnType,
        scope: "builtin",
        line: 0,
        initialized: true,
        params: func.params,
        isVarArgs: func.isVarArgs,
      };
    });
  };

  /**
   * Process preprocessor directives
   */
  const processPreprocessorDirectives = (code) => {
    if (!code) return;

    // Add standard library functions immediately
    addStandardLibraryFunctions();

    // Process #include directives
    const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
    let match;

    while ((match = includeRegex.exec(code)) !== null) {
      const header = match[1];

      // Mark that we've included this header
      const includeKey = getSymbolKey(`#include_${header}`, "preprocessor");
      symbolTable[includeKey] = {
        name: `#include_${header}`,
        type: "preprocessor",
        scope: "preprocessor",
        line: getLineNumber(match.index),
        initialized: true,
      };
    }

    // Process #define directives
    const defineRegex = /#define\s+(\w+)(?:\s+(.*?))?$/gm;
    while ((match = defineRegex.exec(code)) !== null) {
      const macroName = match[1];
      const macroValue = match[2] ? match[2].trim() : "";

      const macroKey = getSymbolKey(macroName, "global");
      symbolTable[macroKey] = {
        name: macroName,
        type: "macro",
        value: macroValue,
        scope: "global",
        line: getLineNumber(match.index),
        initialized: true,
      };
    }
  };

  /**
   * Phase 1: Build Symbol Table
   */
  const buildSymbolTable = (
    node,
    scope = "global",
    localScopeStack = ["global"]
  ) => {
    if (!node || typeof node !== "object") return;

    switch (node.type) {
      case "Program": {
        if (node.body) {
          const statements = Array.isArray(node.body) ? node.body : [node.body];
          statements.forEach((stmt) =>
            buildSymbolTable(stmt, scope, localScopeStack)
          );
        }
        break;
      }

      case "Include":
      case "PreprocessorDirective": {
        // Handle preprocessor directives in AST
        break;
      }

      case "FunctionDeclaration": {
        const functionName = node.id?.name;
        if (!functionName) {
          errors.push({
            message: "Function declaration missing name",
            line: getLineNumber(node.location?.start),
            code: getCodeLine(node.location?.start),
            description: "Invalid function declaration",
          });
          return;
        }

        let returnType = "void";
        if (node.returnType?.specifiers) {
          returnType = node.returnType.specifiers
            .map((s) => s.name || s.kind || "")
            .filter(Boolean)
            .join(" ");
        } else if (node.returnType?.name) {
          returnType = node.returnType.name;
        }

        if (node.isPointerReturn) {
          returnType = `${returnType}*`;
        }

        const functionKey = getSymbolKey(functionName, "global");

        symbolTable[functionKey] = {
          name: functionName,
          type: `${returnType} function`,
          returnType: returnType,
          scope: "global",
          line: getLineNumber(node.location?.start),
          params:
            node.params?.map((param) => ({
              name: param.name || "unnamed",
              type: param.paramType?.specifiers
                ? param.paramType.specifiers
                    .map((s) => s.name || s.kind || "")
                    .filter(Boolean)
                    .join(" ")
                : param.paramType?.name || "unknown",
            })) || [],
          initialized: node.body !== null,
        };

        if (node.body) {
          const functionScope = functionName;
          const newScopeStack = [...localScopeStack, functionScope];

          // Add parameters to symbol table
          node.params?.forEach((param) => {
            if (!param.name) return;

            let paramType = "unknown";
            if (param.paramType?.specifiers) {
              paramType = param.paramType.specifiers
                .map((s) => s.name || s.kind || "")
                .filter(Boolean)
                .join(" ");
            } else if (param.paramType?.name) {
              paramType = param.paramType.name;
            }

            if (param.isPointer) paramType = `${paramType}*`;
            if (param.isArray) paramType = `${paramType}[]`;

            const paramKey = getSymbolKey(param.name, functionScope);
            symbolTable[paramKey] = {
              name: param.name,
              type: paramType,
              scope: functionScope,
              line: getLineNumber(param.location?.start),
              initialized: true,
              isParameter: true,
            };
          });

          buildSymbolTable(node.body, functionScope, newScopeStack);
        }
        break;
      }

      case "VariableDeclaration": {
        const typeSpecifiers = node.typeSpecifiers;
        if (!typeSpecifiers) {
          errors.push({
            message: "Variable declaration missing type",
            line: getLineNumber(node.location?.start),
            code: getCodeLine(node.location?.start),
            description: "Invalid variable declaration",
          });
          return;
        }

        let varType = "";
        if (typeSpecifiers.specifiers) {
          varType = typeSpecifiers.specifiers
            .map((s) => s.name || s.kind || "")
            .filter(Boolean)
            .join(" ");
        } else if (typeSpecifiers.name) {
          varType = typeSpecifiers.name;
        }

        node.declarations?.forEach((declarator) => {
          if (!declarator.id?.name) return;

          const varName = declarator.id.name;
          let finalType = varType;

          if (declarator.isPointer) finalType = `${finalType}*`;
          if (declarator.isArray) finalType = `${finalType}[]`;

          const varKey = getSymbolKey(varName, scope);

          if (symbolTable[varKey]) {
            errors.push({
              message: `Redeclaration of variable '${varName}' in ${scope} scope`,
              line: getLineNumber(
                declarator.id.location?.start || node.location?.start
              ),
              code: getCodeLine(
                declarator.id.location?.start || node.location?.start
              ),
              description: "Variable already declared in this scope",
            });
            return;
          }

          symbolTable[varKey] = {
            name: varName,
            type: finalType,
            scope: scope,
            line: getLineNumber(
              declarator.id.location?.start || node.location?.start
            ),
            initialized: declarator.initializer !== undefined,
            isArray: declarator.isArray || false,
            isPointer: declarator.isPointer || false,
          };

          if (declarator.initializer) {
            buildSymbolTable(declarator.initializer, scope, localScopeStack);
            markVariablesAsUsed(declarator.initializer, scope, localScopeStack);
          }
        });
        break;
      }

      case "BlockStatement": {
        const blockScope = `block_${scope}_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const newScopeStack = [...localScopeStack, blockScope];

        if (node.body) {
          const statements = Array.isArray(node.body) ? node.body : [node.body];
          statements.forEach((stmt) =>
            buildSymbolTable(stmt, blockScope, newScopeStack)
          );
        }
        break;
      }

      case "IfStatement": {
        const ifScope = `if_${scope}_${Date.now()}`;
        const newScopeStack = [...localScopeStack, ifScope];

        // FIXED: Mark variables in condition as used
        markVariablesAsUsed(node.test, scope, localScopeStack);
        buildSymbolTable(node.test, ifScope, newScopeStack);
        buildSymbolTable(node.consequent, ifScope, newScopeStack);

        if (node.alternate) {
          const elseScope = `else_${scope}_${Date.now()}`;
          const elseScopeStack = [...localScopeStack, elseScope];
          buildSymbolTable(node.alternate, elseScope, elseScopeStack);
        }
        break;
      }

      case "ForStatement": {
        const forScope = `for_${scope}_${Date.now()}`;
        const newScopeStack = [...localScopeStack, forScope];

        if (node.init) buildSymbolTable(node.init, forScope, newScopeStack);
        if (node.test) {
          markVariablesAsUsed(node.test, scope, localScopeStack);
          buildSymbolTable(node.test, forScope, newScopeStack);
        }
        if (node.update) {
          markVariablesAsUsed(node.update, scope, localScopeStack);
          buildSymbolTable(node.update, forScope, newScopeStack);
        }
        if (node.body) buildSymbolTable(node.body, forScope, newScopeStack);
        break;
      }

      case "WhileStatement": {
        const whileScope = `while_${scope}_${Date.now()}`;
        const newScopeStack = [...localScopeStack, whileScope];

        // FIXED: Mark variables in condition as used
        markVariablesAsUsed(node.test, scope, localScopeStack);
        buildSymbolTable(node.test, whileScope, newScopeStack);
        buildSymbolTable(node.body, whileScope, newScopeStack);
        break;
      }

      case "ReturnStatement": {
        if (node.argument) {
          buildSymbolTable(node.argument, scope, localScopeStack);
          markVariablesAsUsed(node.argument, scope, localScopeStack);
        }
        break;
      }

      case "ExpressionStatement": {
        if (node.expression) {
          buildSymbolTable(node.expression, scope, localScopeStack);
          markVariablesAsUsed(node.expression, scope, localScopeStack);
        }
        break;
      }

      case "AssignmentExpression": {
        buildSymbolTable(node.left, scope, localScopeStack);
        buildSymbolTable(node.right, scope, localScopeStack);
        markVariablesAsUsed(node.right, scope, localScopeStack);

        if (node.left.type === "Identifier") {
          const varName = node.left.name;
          const variable = resolveVariable(varName, scope, localScopeStack);
          if (variable) {
            const varKey = Object.keys(symbolTable).find(
              (key) => symbolTable[key] === variable
            );
            if (varKey) {
              symbolTable[varKey].initialized = true;
            }
          }
        }
        break;
      }

      case "CallExpression": {
        const funcName = node.callee?.name;
        if (["printf", "fprintf", "sprintf", "scanf"].includes(funcName)) {
          node.arguments?.forEach((arg) => {
            if (arg.type === "Identifier") {
              variableUses.add(arg.name);
            }
            markVariablesAsUsed(arg, scope, localScopeStack);
          });
        }

        node.arguments?.forEach((arg) => {
          buildSymbolTable(arg, scope, localScopeStack);
          markVariablesAsUsed(arg, scope, localScopeStack);
        });
        break;
      }

      default:
        // Recursively process all child nodes and mark variables as used
        for (const key in node) {
          if (node[key] && typeof node[key] === "object") {
            if (Array.isArray(node[key])) {
              node[key].forEach((item) => {
                buildSymbolTable(item, scope, localScopeStack);
                markVariablesAsUsed(item, scope, localScopeStack);
              });
            } else {
              buildSymbolTable(node[key], scope, localScopeStack);
              markVariablesAsUsed(node[key], scope, localScopeStack);
            }
          }
        }
    }
  };

  /**
   * Phase 2: Type Checking
   */
  const checkTypes = (node, scope = "global", localScopeStack = ["global"]) => {
    if (!node || typeof node !== "object") return;

    switch (node.type) {
      case "Program": {
        if (node.body) {
          const statements = Array.isArray(node.body) ? node.body : [node.body];
          statements.forEach((stmt) =>
            checkTypes(stmt, scope, localScopeStack)
          );
        }
        break;
      }

      case "AssignmentExpression": {
        const leftType = getExpressionType(node.left, scope, localScopeStack);
        const rightType = getExpressionType(node.right, scope, localScopeStack);

        if (leftType && rightType && !areTypesCompatible(leftType, rightType)) {
          errors.push({
            message: `Type mismatch in assignment: cannot assign '${rightType}' to '${leftType}'`,
            line: getLineNumber(node.location?.start),
            code: getCodeLine(node.location?.start),
            description: "Incompatible types in assignment",
          });
        }

        checkTypes(node.left, scope, localScopeStack);
        checkTypes(node.right, scope, localScopeStack);
        break;
      }

      case "CallExpression": {
        const funcName = node.callee?.name;
        const funcSymbol = resolveVariable(funcName, scope, localScopeStack);

        if (!funcSymbol) {
          errors.push({
            message: `Call to undefined function '${funcName}'`,
            line: getLineNumber(node.location?.start),
            code: getCodeLine(node.location?.start),
            description: "Function must be declared before use",
          });
          break;
        }

        const expectedParams = funcSymbol.params || [];
        const args = node.arguments || [];
        const isVarArgs =
          funcSymbol.isVarArgs || ["printf", "scanf"].includes(funcSymbol.name);

        if (!isVarArgs && args.length !== expectedParams.length) {
          errors.push({
            message: `Function '${funcName}' called with ${args.length} arguments, but expected ${expectedParams.length}`,
            line: getLineNumber(node.location?.start),
            code: getCodeLine(node.location?.start),
            description: "Incorrect number of arguments in function call",
          });
        }

        args.forEach((arg, i) => {
          checkTypes(arg, scope, localScopeStack);

          if (i < expectedParams.length) {
            const argType = getExpressionType(arg, scope, localScopeStack);
            const paramType = expectedParams[i].type;

            if (
              argType &&
              paramType &&
              !areTypesCompatible(paramType, argType)
            ) {
              errors.push({
                message: `Type mismatch in argument ${
                  i + 1
                } of call to '${funcName}': expected '${paramType}', got '${argType}'`,
                line: getLineNumber(arg.location?.start),
                code: getCodeLine(arg.location?.start),
                description: "Incompatible argument type",
              });
            }
          }
        });
        break;
      }

      default:
        // Recursively check all child nodes
        for (const key in node) {
          if (node[key] && typeof node[key] === "object") {
            if (Array.isArray(node[key])) {
              node[key].forEach((item) =>
                checkTypes(item, scope, localScopeStack)
              );
            } else {
              checkTypes(node[key], scope, localScopeStack);
            }
          }
        }
    }
  };

  /**
   * Phase 3: Semantic Checks
   */
  const performSemanticChecks = () => {
    // Check for main function
    const hasMainFunction = symbolTable[getSymbolKey("main", "global")];
    if (!hasMainFunction && Object.keys(symbolTable).length > 0) {
      errors.push({
        message: "Missing 'main' function",
        line: 1,
        code: "",
        description: "C program requires a 'main' function",
      });
    }

    // Check for unused variables
    Object.entries(symbolTable).forEach(([key, symbol]) => {
      if (
        symbol.type.includes("function") ||
        symbol.scope === "builtin" ||
        symbol.scope === "preprocessor" ||
        symbol.isParameter ||
        symbol.type === "macro"
      ) {
        return;
      }

      if (!variableUses.has(symbol.name)) {
        errors.push({
          message: `Unused variable '${symbol.name}'`,
          line: symbol.line,
          code: getCodeLine(symbol.line),
          description: "Variable is declared but never used",
          severity: "warning",
        });
      }
    });
  };

  /**
   * Format symbol table for display
   */
  const formatSymbolTable = () => {
    const displaySymbolTable = {};

    for (const [key, symbol] of Object.entries(symbolTable)) {
      if (symbol.scope === "builtin" || symbol.scope === "preprocessor")
        continue;

      const displayName =
        symbol.scope === "global"
          ? symbol.name
          : `${symbol.scope}.${symbol.name}`;

      displaySymbolTable[displayName] = {
        type: symbol.type,
        scope: symbol.scope,
        line: symbol.line,
        initialized: symbol.initialized,
        ...(symbol.params && { params: symbol.params }),
        ...(symbol.isArray && { isArray: true }),
        ...(symbol.isPointer && { isPointer: true }),
        ...(symbol.value && { value: symbol.value }),
      };
    }

    return displaySymbolTable;
  };

  // Main analysis execution
  try {
    processPreprocessorDirectives(code);
    buildSymbolTable(ast);
    checkTypes(ast);
    performSemanticChecks();

    return {
      symbolTable: formatSymbolTable(),
      errors,
    };
  } catch (err) {
    console.error("Semantic analyzer error:", err);
    errors.push({
      message: `Semantic analysis failed: ${err.message}`,
      line: 1,
      code: "",
      description: "Internal error in semantic analyzer",
    });

    return { symbolTable: {}, errors };
  }
};

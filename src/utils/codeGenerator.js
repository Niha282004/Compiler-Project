/**
 * Enhanced Code Generator for C Compiler
 * Generates proper Three Address Code (TAC), optimized code, and machine code
 * Fixed control flow, for-loops, and assembly generation
 */

export const codeGenerator = (ast, symbolTable) => {
  const intermediateCode = [];
  const assemblyCode = [];
  const machineCode = [];
  const errors = [];
  let tempVarCounter = 0;
  let labelCounter = 0;

  // Generate unique temporary variable names
  const generateTempVar = () => `t${tempVarCounter++}`;

  // Generate unique labels
  const generateLabel = (prefix = "L") => `${prefix}${labelCounter++}`;

  // Code generation context
  const context = {
    currentFunction: null,
    loopStack: [], // For break/continue with proper start/continue/end labels
    scopeLevel: 0,
    stringLiterals: new Map(),
    stringCounter: 0,
    hasStdio: false,
    hasStdlib: false,
    hasString: false,
    registerAllocation: new Map(), // For register allocation
    currentRegister: 0,
  };

  /**
   * Add instruction to intermediate code with proper formatting
   */
  const emit = (op, arg1, arg2, result) => {
    const instruction = {
      operation: op,
      arg1: arg1 || null,
      arg2: arg2 || null,
      result: result || null,
      label: null,
      lineNumber: intermediateCode.length,
    };
    intermediateCode.push(instruction);
    return instruction;
  };

  /**
   * Add label to intermediate code
   */
  const emitLabel = (label) => {
    const instruction = {
      operation: "LABEL",
      arg1: null,
      arg2: null,
      result: null,
      label: label,
      lineNumber: intermediateCode.length,
    };
    intermediateCode.push(instruction);
    return instruction;
  };

  /**
   * Generate code for expressions
   */
  const generateExpression = (node) => {
    if (!node) return null;

    switch (node.type) {
      case "Identifier":
        return node.name;

      case "Literal": {
        if (node.valueType === "string") {
          const stringLabel = `str${context.stringCounter++}`;
          context.stringLiterals.set(stringLabel, node.value);
          return stringLabel;
        }
        return node.value;
      }

      case "BinaryExpression": {
        const leftOperand = generateExpression(node.left);
        const rightOperand = generateExpression(node.right);
        const tempVar = generateTempVar();

        switch (node.operator) {
          case "+":
            emit("ADD", leftOperand, rightOperand, tempVar);
            break;
          case "-":
            emit("SUB", leftOperand, rightOperand, tempVar);
            break;
          case "*":
            emit("MUL", leftOperand, rightOperand, tempVar);
            break;
          case "/":
            emit("DIV", leftOperand, rightOperand, tempVar);
            break;
          case "%":
            emit("MOD", leftOperand, rightOperand, tempVar);
            break;
          case "==":
            emit("EQ", leftOperand, rightOperand, tempVar);
            break;
          case "!=":
            emit("NE", leftOperand, rightOperand, tempVar);
            break;
          case "<":
            emit("LT", leftOperand, rightOperand, tempVar);
            break;
          case ">":
            emit("GT", leftOperand, rightOperand, tempVar);
            break;
          case "<=":
            emit("LE", leftOperand, rightOperand, tempVar);
            break;
          case ">=":
            emit("GE", leftOperand, rightOperand, tempVar);
            break;
          case "&&":
            emit("AND", leftOperand, rightOperand, tempVar);
            break;
          case "||":
            emit("OR", leftOperand, rightOperand, tempVar);
            break;
          default:
            errors.push({
              message: `Unsupported binary operator: ${node.operator}`,
              type: "codegen",
            });
            return null;
        }

        return tempVar;
      }

      case "UnaryExpression": {
        const operand = generateExpression(node.argument);
        const tempVar = generateTempVar();

        switch (node.operator) {
          case "-":
            emit("NEG", operand, null, tempVar);
            break;
          case "!":
            emit("NOT", operand, null, tempVar);
            break;
          case "++":
            if (node.prefix) {
              emit("ADD", operand, "1", operand);
              return operand;
            } else {
              emit("ASSIGN", operand, null, tempVar);
              emit("ADD", operand, "1", operand);
              return tempVar;
            }
          case "--":
            if (node.prefix) {
              emit("SUB", operand, "1", operand);
              return operand;
            } else {
              emit("ASSIGN", operand, null, tempVar);
              emit("SUB", operand, "1", operand);
              return tempVar;
            }
          case "&":
            emit("ADDR", operand, null, tempVar);
            break;
          case "*":
            emit("DEREF", operand, null, tempVar);
            break;
          default:
            errors.push({
              message: `Unsupported unary operator: ${node.operator}`,
              type: "codegen",
            });
            return null;
        }

        return tempVar;
      }

      case "AssignmentExpression": {
        const rightOperand = generateExpression(node.right);
        const leftOperand = node.left.name;

        emit("ASSIGN", rightOperand, null, leftOperand);
        return leftOperand;
      }

      case "CallExpression": {
        const funcName = node.callee?.name;
        const args = [];

        // Generate code for arguments in order
        if (node.arguments) {
          node.arguments.forEach((arg, index) => {
            const argResult = generateExpression(arg);
            emit("PARAM", argResult, null, `param${index}`);
            args.push(argResult);
          });
        }

        // Generate function call
        const tempVar = generateTempVar();
        emit("CALL", funcName, args.length, tempVar);

        return tempVar;
      }

      default:
        return null;
    }
  };

  /**
   * Generate code for statements with improved control flow
   */
  const generateStatement = (node) => {
    if (!node) return;

    switch (node.type) {
      case "ExpressionStatement":
        if (node.expression) {
          generateExpression(node.expression);
        }
        break;

      case "ReturnStatement": {
        if (node.argument) {
          const returnValue = generateExpression(node.argument);
          emit("RETURN", returnValue, null, null);
        } else {
          emit("RETURN", null, null, null);
        }
        break;
      }

      case "IfStatement": {
        const condition = generateExpression(node.test);
        const elseLabel = generateLabel("ELSE");
        const endLabel = generateLabel("END_IF");

        emit("IF_FALSE", condition, null, elseLabel);

        generateStatement(node.consequent);

        if (node.alternate) {
          emit("GOTO", null, null, endLabel);
          emitLabel(elseLabel);
          generateStatement(node.alternate);
          emitLabel(endLabel);
        } else {
          emitLabel(elseLabel);
        }

        break;
      }

      case "WhileStatement": {
        const startLabel = generateLabel("WHILE_START");
        const endLabel = generateLabel("WHILE_END");

        context.loopStack.push({
          startLabel,
          continueLabel: startLabel,
          endLabel,
        });

        emitLabel(startLabel);
        const condition = generateExpression(node.test);
        emit("IF_FALSE", condition, null, endLabel);

        generateStatement(node.body);

        emit("GOTO", null, null, startLabel);
        emitLabel(endLabel);

        context.loopStack.pop();
        break;
      }

      case "ForStatement": {
        // CORRECTED FOR LOOP GENERATION
        const startLabel = generateLabel("FOR_START");
        const continueLabel = generateLabel("FOR_CONTINUE");
        const endLabel = generateLabel("FOR_END");

        context.loopStack.push({
          startLabel,
          continueLabel,
          endLabel,
        });

        // Initialization
        if (node.init) {
          if (node.init.type === "VariableDeclaration") {
            generateVariableDeclaration(node.init);
          } else {
            generateExpression(node.init);
          }
        }

        // Start of loop - condition check
        emitLabel(startLabel);

        // Condition check
        if (node.test) {
          const condition = generateExpression(node.test);
          emit("IF_FALSE", condition, null, endLabel);
        }

        // Loop body
        generateStatement(node.body);

        // Continue label for continue statements
        emitLabel(continueLabel);

        // Update expression (increment)
        if (node.update) {
          generateExpression(node.update);
        }

        // Jump back to condition check
        emit("GOTO", null, null, startLabel);

        // End label
        emitLabel(endLabel);

        context.loopStack.pop();
        break;
      }

      case "BlockStatement": {
        context.scopeLevel++;

        if (node.body) {
          const statements = Array.isArray(node.body) ? node.body : [node.body];
          statements.forEach((stmt) => {
            if (stmt.type === "VariableDeclaration") {
              generateVariableDeclaration(stmt);
            } else {
              generateStatement(stmt);
            }
          });
        }

        context.scopeLevel--;
        break;
      }

      case "BreakStatement": {
        const currentLoop = context.loopStack[context.loopStack.length - 1];
        if (currentLoop) {
          emit("GOTO", null, null, currentLoop.endLabel);
        } else {
          errors.push({
            message: "Break statement outside of loop",
            type: "codegen",
          });
        }
        break;
      }

      case "ContinueStatement": {
        const currentLoop = context.loopStack[context.loopStack.length - 1];
        if (currentLoop) {
          emit("GOTO", null, null, currentLoop.continueLabel);
        } else {
          errors.push({
            message: "Continue statement outside of loop",
            type: "codegen",
          });
        }
        break;
      }

      default:
        break;
    }
  };

  /**
   * Generate code for variable declarations
   */
  const generateVariableDeclaration = (node) => {
    if (!node.declarations) return;

    node.declarations.forEach((declarator) => {
      const varName = declarator.id?.name;
      if (!varName) return;

      emit("DECLARE", varName, null, null);

      if (declarator.initializer) {
        const initValue = generateExpression(declarator.initializer);
        emit("ASSIGN", initValue, null, varName);
      }
    });
  };

  /**
   * Generate code for function declarations
   */
  const generateFunctionDeclaration = (node) => {
    const funcName = node.id?.name;
    if (!funcName) return;

    context.currentFunction = funcName;

    emitLabel(funcName);
    emit("FUNCTION_START", funcName, null, null);

    if (node.params) {
      node.params.forEach((param) => {
        emit("PARAM_DECL", param.name, null, null);
      });
    }

    if (node.body) {
      generateStatement(node.body);
    }

    emit("FUNCTION_END", funcName, null, null);
    context.currentFunction = null;
  };

  /**
   * Enhanced optimization with multiple passes
   */
  const optimizeCode = () => {
    let optimized = [...intermediateCode];
    let changed = true;
    let passes = 0;
    const maxPasses = 5;

    while (changed && passes < maxPasses) {
      changed = false;
      passes++;
      const newOptimized = [];

      for (let i = 0; i < optimized.length; i++) {
        const current = optimized[i];
        const next = optimized[i + 1];
        const prev = optimized[i - 1];

        // Dead code elimination
        if (
          current.operation === "ASSIGN" &&
          next &&
          next.operation === "ASSIGN" &&
          current.result === next.result
        ) {
          changed = true;
          continue;
        }

        // Constant folding
        if (
          current.operation === "ADD" &&
          !isNaN(current.arg1) &&
          !isNaN(current.arg2)
        ) {
          const result = parseFloat(current.arg1) + parseFloat(current.arg2);
          newOptimized.push({
            ...current,
            operation: "ASSIGN",
            arg1: result.toString(),
            arg2: null,
          });
          changed = true;
          continue;
        }

        if (
          current.operation === "SUB" &&
          !isNaN(current.arg1) &&
          !isNaN(current.arg2)
        ) {
          const result = parseFloat(current.arg1) - parseFloat(current.arg2);
          newOptimized.push({
            ...current,
            operation: "ASSIGN",
            arg1: result.toString(),
            arg2: null,
          });
          changed = true;
          continue;
        }

        if (
          current.operation === "MUL" &&
          !isNaN(current.arg1) &&
          !isNaN(current.arg2)
        ) {
          const result = parseFloat(current.arg1) * parseFloat(current.arg2);
          newOptimized.push({
            ...current,
            operation: "ASSIGN",
            arg1: result.toString(),
            arg2: null,
          });
          changed = true;
          continue;
        }

        // Algebraic simplifications
        if (current.operation === "ADD" && current.arg2 === "0") {
          newOptimized.push({
            ...current,
            operation: "ASSIGN",
            arg2: null,
          });
          changed = true;
          continue;
        }

        if (
          current.operation === "MUL" &&
          (current.arg2 === "1" || current.arg1 === "1")
        ) {
          const nonOneArg = current.arg2 === "1" ? current.arg1 : current.arg2;
          newOptimized.push({
            ...current,
            operation: "ASSIGN",
            arg1: nonOneArg,
            arg2: null,
          });
          changed = true;
          continue;
        }

        if (
          current.operation === "MUL" &&
          (current.arg2 === "0" || current.arg1 === "0")
        ) {
          newOptimized.push({
            ...current,
            operation: "ASSIGN",
            arg1: "0",
            arg2: null,
          });
          changed = true;
          continue;
        }

        newOptimized.push(current);
      }

      optimized = newOptimized;
    }

    return optimized;
  };

  /**
   * Enhanced assembly generation with better x86-64 support
   */
  const generateAssembly = (code = intermediateCode) => {
    const assembly = [];

    // Data section for string literals
    if (context.stringLiterals.size > 0) {
      assembly.push(".section .data");
      context.stringLiterals.forEach((value, label) => {
        assembly.push(`${label}: .string ${value}`);
      });
      assembly.push("");
    }

    // Text section
    assembly.push(".section .text");
    assembly.push(".globl _start");
    assembly.push("");

    // Main program entry
    const hasMain = code.some(
      (instr) => instr.operation === "LABEL" && instr.label === "main"
    );

    if (hasMain) {
      assembly.push("_start:");
      assembly.push("    call main");
      assembly.push("    movq %rax, %rdi");
      assembly.push("    movq $60, %rax");
      assembly.push("    syscall");
      assembly.push("");
    }

    code.forEach((instruction) => {
      switch (instruction.operation) {
        case "INCLUDE":
          assembly.push(`    # #include <${instruction.arg1}>`);
          break;

        case "LABEL":
          assembly.push(`${instruction.label}:`);
          break;

        case "FUNCTION_START":
          assembly.push("    pushq %rbp");
          assembly.push("    movq %rsp, %rbp");
          break;

        case "FUNCTION_END":
          assembly.push("    popq %rbp");
          assembly.push("    ret");
          break;

        case "DECLARE":
          assembly.push(`    # declare ${instruction.arg1}`);
          break;

        case "ASSIGN":
          assembly.push(`    movq ${instruction.arg1}, ${instruction.result}`);
          break;

        case "ADD":
          assembly.push(`    movq ${instruction.arg1}, %rax`);
          assembly.push(`    addq ${instruction.arg2}, %rax`);
          assembly.push(`    movq %rax, ${instruction.result}`);
          break;

        case "SUB":
          assembly.push(`    movq ${instruction.arg1}, %rax`);
          assembly.push(`    subq ${instruction.arg2}, %rax`);
          assembly.push(`    movq %rax, ${instruction.result}`);
          break;

        case "MUL":
          assembly.push(`    movq ${instruction.arg1}, %rax`);
          assembly.push(`    imulq ${instruction.arg2}, %rax`);
          assembly.push(`    movq %rax, ${instruction.result}`);
          break;

        case "DIV":
          assembly.push(`    movq ${instruction.arg1}, %rax`);
          assembly.push(`    cqo`);
          assembly.push(`    idivq ${instruction.arg2}`);
          assembly.push(`    movq %rax, ${instruction.result}`);
          break;

        case "LT":
          assembly.push(`    movq ${instruction.arg1}, %rax`);
          assembly.push(`    cmpq ${instruction.arg2}, %rax`);
          assembly.push(`    setl %al`);
          assembly.push(`    movzbq %al, %rax`);
          assembly.push(`    movq %rax, ${instruction.result}`);
          break;

        case "IF_FALSE":
          assembly.push(`    cmpq $0, ${instruction.arg1}`);
          assembly.push(`    je ${instruction.result}`);
          break;

        case "GOTO":
          assembly.push(`    jmp ${instruction.result}`);
          break;

        case "PARAM":
          assembly.push(`    # param ${instruction.arg1}`);
          break;

        case "CALL":
          assembly.push(`    call ${instruction.arg1}`);
          if (instruction.result) {
            assembly.push(`    movq %rax, ${instruction.result}`);
          }
          break;

        case "RETURN":
          if (instruction.arg1) {
            assembly.push(`    movq ${instruction.arg1}, %rax`);
          }
          assembly.push("    popq %rbp");
          assembly.push("    ret");
          break;

        default:
          assembly.push(
            `    # ${instruction.operation} ${instruction.arg1 || ""} ${
              instruction.arg2 || ""
            } ${instruction.result || ""}`
          );
      }
    });

    return assembly;
  };

  /**
   * Generate basic machine code (simplified)
   */
  const generateMachineCode = (assemblyCode) => {
    const machineInstructions = [];

    // This is a simplified machine code generator
    // In reality, this would need a full assembler
    const opcodes = {
      movq: "0x48 0x89",
      addq: "0x48 0x01",
      subq: "0x48 0x29",
      imulq: "0x48 0x0F 0xAF",
      cmpq: "0x48 0x39",
      je: "0x74",
      jmp: "0xEB",
      call: "0xE8",
      ret: "0xC3",
      pushq: "0x50",
      popq: "0x58",
    };

    assemblyCode.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "" || trimmed.endsWith(":")) {
        return;
      }

      const parts = trimmed.split(/\s+/);
      const instruction = parts[0];

      if (opcodes[instruction]) {
        machineInstructions.push({
          address: `0x${(index * 4).toString(16).padStart(8, "0")}`,
          bytes: opcodes[instruction],
          assembly: trimmed,
        });
      } else {
        machineInstructions.push({
          address: `0x${(index * 4).toString(16).padStart(8, "0")}`,
          bytes: "0x00 0x00 0x00 0x00",
          assembly: trimmed,
        });
      }
    });

    return machineInstructions;
  };

  /**
   * Format intermediate code for display
   */
  const formatIntermediateCode = (code = intermediateCode) => {
    return code
      .map((instruction, index) => {
        if (instruction.operation === "LABEL") {
          return `${instruction.label}:`;
        }

        const parts = [instruction.operation];
        if (instruction.arg1 !== null) parts.push(instruction.arg1);
        if (instruction.arg2 !== null) parts.push(instruction.arg2);
        if (instruction.result !== null) parts.push(`-> ${instruction.result}`);

        return `${index.toString().padStart(3, " ")}: ${parts.join(" ")}`;
      })
      .join("\n");
  };

  /**
   * Main code generation function
   */
  const generateCode = (node) => {
    if (!node) return;

    switch (node.type) {
      case "Program":
        if (node.body) {
          const statements = Array.isArray(node.body) ? node.body : [node.body];
          statements.forEach((stmt) => {
            if (stmt.type === "FunctionDeclaration") {
              generateFunctionDeclaration(stmt);
            } else if (stmt.type === "VariableDeclaration") {
              generateVariableDeclaration(stmt);
            } else {
              generateStatement(stmt);
            }
          });
        }
        break;

      default:
        generateStatement(node);
    }
  };

  // Execute code generation
  try {
    // Add stdio.h include if detected
    if (context.hasStdio || (ast && JSON.stringify(ast).includes("stdio.h"))) {
      emit("INCLUDE", "stdio.h", null, null);
      context.hasStdio = true;
    }

    generateCode(ast);

    // Generate optimized version
    const optimizedCode = optimizeCode();

    // Generate assembly
    const assembly = generateAssembly();
    const optimizedAssembly = generateAssembly(optimizedCode);

    // Generate machine code
    const machineCodeInstructions = generateMachineCode(assembly);

    return {
      intermediateCode: formatIntermediateCode(),
      optimizedCode: formatIntermediateCode(optimizedCode),
      assemblyCode: assembly.join("\n"),
      optimizedAssemblyCode: optimizedAssembly.join("\n"),
      machineCode: machineCodeInstructions
        .map(
          (instr) =>
            `${instr.address}: ${instr.bytes.padEnd(20)} ; ${instr.assembly}`
        )
        .join("\n"),
      stringLiterals: Object.fromEntries(context.stringLiterals),
      statistics: {
        instructionCount: intermediateCode.length,
        optimizedInstructionCount: optimizedCode.length,
        tempVariables: tempVarCounter,
        labels: labelCounter,
        optimizationPasses: 5,
        includedHeaders: {
          stdio: context.hasStdio,
          stdlib: context.hasStdlib,
          string: context.hasString,
        },
      },
      errors,
    };
  } catch (err) {
    console.error("Code generation error:", err);
    errors.push({
      message: `Code generation failed: ${err.message}`,
      type: "codegen",
    });

    return {
      intermediateCode: "",
      optimizedCode: "",
      assemblyCode: "",
      optimizedAssemblyCode: "",
      machineCode: "",
      stringLiterals: {},
      statistics: {},
      errors,
    };
  }
};

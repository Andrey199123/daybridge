# OpenClaw Gemma 4 Command Execution Bugfix Design

## Overview

The OpenClaw Telegram bot fails to execute shell commands when using Gemma 4 due to configuration validation errors. The current configuration uses an invalid format for the `commands` section (`{"native": true, "nativeSkills": "auto"}`), which causes OpenClaw's config validator to reject the settings. This prevents the shell tool from being registered and made available to Gemma 4, even though Gemma 4 itself supports function calling and Ollama has native support for tool invocation.

The fix involves correcting the OpenClaw configuration format to pass validation, ensuring native command tools are properly registered, and verifying that Gemma 4 can successfully invoke shell commands through the Telegram interface.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when OpenClaw configuration uses invalid format for `commands.native` or `agents.defaults.tools` keys
- **Property (P)**: The desired behavior when configuration is corrected - OpenClaw validates successfully, registers shell tools, and Gemma 4 can execute commands
- **Preservation**: Existing non-command functionality (text generation, other models, Telegram features) that must remain unchanged by the fix
- **OpenClaw**: The Telegram bot framework that manages model interactions and tool registration
- **Gemma 4**: The primary AI model (`ollama/gemma2:27b-instruct-q4_K_M`) with native function calling support
- **Native Command Tools**: Shell execution capabilities that should be available to the AI model
- **Config Validation**: OpenClaw's startup process that validates configuration schema before initializing services

## Bug Details

### Bug Condition

The bug manifests when OpenClaw attempts to start with a configuration that uses invalid keys or formats for command tool registration. The configuration validator is rejecting `commands.native` and `agents.defaults.tools` keys, preventing the shell tool from being registered and made available to Gemma 4.

**Formal Specification:**
```
FUNCTION isBugCondition(config)
  INPUT: config of type OpenClawConfiguration
  OUTPUT: boolean
  
  RETURN (config.commands.native EXISTS AND config.commands.native IS NOT VALID_FORMAT)
         OR (config.agents.defaults.tools EXISTS AND "tools" IS NOT RECOGNIZED_KEY)
         AND shellToolNotRegistered()
         AND commandExecutionFails()
END FUNCTION
```

### Examples

- **Example 1**: User sends "Run the command: uname -a" via Telegram
  - **Expected**: Shell tool executes `uname -a` and returns system information
  - **Actual**: Gemma 4 understands intent but cannot invoke shell tool, no command execution occurs

- **Example 2**: OpenClaw starts with `"commands": {"native": true, "nativeSkills": "auto"}`
  - **Expected**: Configuration validates successfully and shell tools are registered
  - **Actual**: Logs show "Config validation failed: commands.native: Invalid input"

- **Example 3**: Configuration includes `"agents": {"defaults": {"tools": [...]}}`
  - **Expected**: Default tools are registered for all agents
  - **Actual**: Logs show "Config validation failed: agents.defaults: Unrecognized key: 'tools'"

- **Edge Case**: User requests command execution during gateway initialization with stability bundles
  - **Expected**: Startup completes successfully with tools available
  - **Actual**: Startup failures occur due to configuration validation errors

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Non-command text generation must continue to work exactly as before
- Fallback models (e.g., "ollama/gpt-oss:latest") must continue to function as configured
- Other Telegram features (message sending, channel management) must remain operational
- Requests that don't require tools must continue to generate responses normally

**Scope:**
All inputs that do NOT involve shell command execution should be completely unaffected by this fix. This includes:
- Standard conversational queries (e.g., "What's the weather?")
- Text generation requests
- Model interactions that don't require tool invocation
- Other OpenClaw configuration settings (gateway, channels, models)

## Hypothesized Root Cause

Based on the bug description and validation errors, the most likely issues are:

1. **Invalid Configuration Schema**: The `commands.native` format is not recognized by OpenClaw's config validator
   - Current format: `{"native": true, "nativeSkills": "auto"}`
   - OpenClaw may expect a different structure (e.g., array of tool names, boolean flag, or different nesting)

2. **Unrecognized Configuration Key**: The `agents.defaults.tools` key is not part of OpenClaw's valid schema
   - The validator explicitly rejects "tools" as an unrecognized key under `agents.defaults`
   - Tools may need to be registered at a different level or with a different key name

3. **Missing Tool Registration Step**: Even if Gemma 4 supports function calling, OpenClaw may require explicit tool registration
   - The shell tool may need to be registered through a different configuration mechanism
   - There may be a separate tools configuration section that's not being used

4. **Version Mismatch**: The configuration format may be from an older or newer version of OpenClaw
   - The schema may have changed between versions
   - Documentation may not match the actual validator implementation

## Correctness Properties

Property 1: Bug Condition - Command Execution Works

_For any_ configuration where the bug condition holds (invalid `commands.native` or `agents.defaults.tools` format), the fixed configuration SHALL pass OpenClaw validation, register shell tools successfully, and enable Gemma 4 to execute shell commands when requested by users via Telegram.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Non-Command Functionality Unchanged

_For any_ user request that does NOT involve shell command execution (standard text queries, non-tool interactions), the fixed configuration SHALL produce exactly the same behavior as the original configuration, preserving all existing conversational and Telegram functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: OpenClaw configuration file (likely `config.json`, `config.yaml`, or similar in OpenClaw directory)

**Function**: Configuration schema for command tools and agent defaults

**Specific Changes**:

1. **Correct `commands` Configuration Format**: Replace invalid `commands.native` structure with valid OpenClaw format
   - Remove: `"commands": {"native": true, "nativeSkills": "auto"}`
   - Add: Correct format based on OpenClaw schema (e.g., `"commands": ["shell"]` or `"enableNativeCommands": true`)
   - Verify format against OpenClaw documentation or source code

2. **Remove or Relocate `agents.defaults.tools`**: Eliminate unrecognized key from configuration
   - Remove: `"agents": {"defaults": {"tools": [...]}}`
   - If tools need to be specified, use correct configuration location (e.g., top-level `tools` section or per-agent configuration)

3. **Add Explicit Shell Tool Registration**: Ensure shell tool is properly registered for Gemma 4
   - Add shell tool to the correct configuration section
   - Verify tool name matches OpenClaw's expected format (e.g., "shell", "execute", "command")

4. **Verify Model Configuration**: Ensure Gemma 4 model configuration supports tool invocation
   - Confirm model identifier is correct: `ollama/gemma2:27b-instruct-q4_K_M`
   - Verify any model-specific settings for function calling are enabled

5. **Test Configuration Validation**: Run OpenClaw with corrected configuration to verify validation passes
   - Check logs for successful startup without validation errors
   - Verify shell tool appears in registered tools list
   - Confirm Gemma 4 can see and invoke the shell tool

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed configuration, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Attempt to start OpenClaw with the current invalid configuration and observe validation errors. Send command execution requests via Telegram and observe failures. Document the exact error messages and behavior.

**Test Cases**:
1. **Config Validation Test**: Start OpenClaw with current config (will fail on unfixed config)
   - Expected error: "Config validation failed: commands.native: Invalid input"
   - Expected error: "Config validation failed: agents.defaults: Unrecognized key: 'tools'"

2. **Command Execution Test**: Send "Run the command: uname -a" via Telegram (will fail on unfixed config)
   - Expected behavior: Gemma 4 understands intent but cannot invoke shell tool
   - Expected result: No command execution, no output returned

3. **Tool Registration Test**: Check OpenClaw logs for registered tools (will fail on unfixed config)
   - Expected behavior: Shell tool is not listed in registered tools
   - Expected result: Tool invocation fails when Gemma 4 attempts to use it

4. **Gateway Initialization Test**: Start gateway with stability bundles (may fail on unfixed config)
   - Expected behavior: Startup failures due to configuration validation errors
   - Expected result: Gateway does not initialize properly

**Expected Counterexamples**:
- Configuration validation fails with specific error messages about invalid keys
- Possible causes: incorrect schema format, unrecognized keys, missing tool registration mechanism

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed configuration produces the expected behavior.

**Pseudocode:**
```
FOR ALL config WHERE isBugCondition(config) DO
  config_fixed := applyConfigurationFix(config)
  ASSERT configValidationPasses(config_fixed)
  ASSERT shellToolRegistered(config_fixed)
  ASSERT commandExecutionWorks(config_fixed)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed configuration produces the same result as the original configuration.

**Pseudocode:**
```
FOR ALL request WHERE NOT requiresCommandExecution(request) DO
  ASSERT processRequest_original(request) = processRequest_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-command requests

**Test Plan**: Observe behavior on UNFIXED config first for non-command requests, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Text Generation Preservation**: Observe that standard queries work correctly on unfixed config, then verify this continues after fix
   - Test query: "What's the weather?"
   - Expected: Same response generation behavior before and after fix

2. **Fallback Model Preservation**: Observe that fallback models work correctly on unfixed config, then verify this continues after fix
   - Test with: "ollama/gpt-oss:latest" model
   - Expected: Model continues to function as configured

3. **Telegram Features Preservation**: Observe that message sending and channel management work correctly on unfixed config, then verify this continues after fix
   - Test: Send messages, manage channels
   - Expected: All Telegram features continue to operate normally

4. **Non-Tool Requests Preservation**: Observe that requests not requiring tools work correctly on unfixed config, then verify this continues after fix
   - Test: Various conversational queries
   - Expected: Standard text generation continues without attempting tool invocation

### Unit Tests

- Test configuration validation with corrected format
- Test shell tool registration with valid configuration
- Test command execution through Telegram interface
- Test edge cases (invalid commands, permission errors, timeout scenarios)

### Property-Based Tests

- Generate random non-command queries and verify preservation of text generation behavior
- Generate random configuration variations and verify validation passes for valid formats
- Test that all non-tool interactions continue to work across many scenarios

### Integration Tests

- Test full flow: Telegram message → Gemma 4 → shell tool → command execution → response
- Test switching between command and non-command requests
- Test that visual feedback occurs in Telegram when commands are executed
- Test error handling when commands fail or are invalid

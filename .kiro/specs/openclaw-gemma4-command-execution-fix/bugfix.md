# Bugfix Requirements Document

## Introduction

OpenClaw Telegram bot fails to execute shell commands when using Gemma 4 as the primary model. When users request command execution (e.g., "Run the command: uname -a"), the bot understands the intent but cannot invoke the shell tool to actually execute the command. This prevents users from performing system operations through the Telegram interface.

Investigation revealed that while Gemma 4 supports function calling and Ollama has native support for Gemma 4's tool invocation, OpenClaw's configuration validation is rejecting the current setup. Specifically, the configuration shows errors for `commands.native` and `agents.defaults.tools` keys, preventing proper tool registration and invocation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user sends a command execution request via Telegram (e.g., "Run the command: uname -a") THEN the system fails to invoke the shell tool and does not execute the command

1.2 WHEN OpenClaw starts with the current configuration THEN the system logs "Config validation failed: commands.native: Invalid input"

1.3 WHEN OpenClaw starts with the current configuration THEN the system logs "Config validation failed: agents.defaults: Unrecognized key: 'tools'"

1.4 WHEN Gemma 4 receives a user request requiring shell execution THEN the model understands the intent but cannot access the shell tool to fulfill the request

1.5 WHEN the gateway attempts to initialize with stability bundles THEN startup failures occur due to configuration validation errors

### Expected Behavior (Correct)

2.1 WHEN a user sends a command execution request via Telegram (e.g., "Run the command: uname -a") THEN the system SHALL invoke the shell tool and execute the command, returning the output to the user

2.2 WHEN OpenClaw starts with a corrected configuration THEN the system SHALL successfully validate the configuration without errors related to `commands.native` or `agents.defaults`

2.3 WHEN OpenClaw starts with a corrected configuration THEN the system SHALL properly register native command tools for Gemma 4 to use

2.4 WHEN Gemma 4 receives a user request requiring shell execution THEN the model SHALL successfully invoke the shell tool using its function calling capability

2.5 WHEN the gateway initializes with stability bundles THEN startup SHALL complete successfully with all tools properly registered and available

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user sends a non-command request via Telegram (e.g., "What's the weather?") THEN the system SHALL CONTINUE TO process the request normally without attempting shell execution

3.2 WHEN Gemma 4 processes requests that don't require tools THEN the system SHALL CONTINUE TO generate responses using standard text generation

3.3 WHEN OpenClaw uses fallback models (e.g., "ollama/gpt-oss:latest") THEN the system SHALL CONTINUE TO function with those models as configured

3.4 WHEN users interact with other OpenClaw features (message sending, channel management, etc.) THEN the system SHALL CONTINUE TO operate normally

3.5 WHEN the configuration includes other valid settings (gateway, channels, models) THEN the system SHALL CONTINUE TO respect and apply those settings correctly

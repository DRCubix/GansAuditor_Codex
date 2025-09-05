# GansAuditor_Codex Product Overview

GansAuditor_Codex is an MCP (Model Context Protocol) server that provides integrated GAN-style adversarial code auditing with Codex CLI analysis for comprehensive code review and quality assessment.

## Core Purpose

The tool combines thoughtful problem-solving with automated code quality assessment, featuring both asynchronous and synchronous audit workflows for iterative code improvement.

## Key Features

- **GAN-style Adversarial Auditing**: Multiple judge perspectives for comprehensive code review
- **Sequential Thinking Process**: Dynamic, reflective problem-solving with revision capabilities
- **Synchronous Workflow**: Immediate feedback with iterative improvement cycles
- **Session Management**: Persistent audit sessions across multiple interactions
- **Automatic Code Detection**: Identifies code blocks, diffs, and programming content
- **Configurable Audit Scope**: Supports diff, paths, or workspace-level auditing
- **Inline Configuration**: Custom audit parameters via gan-config blocks

## Target Use Cases

- Comprehensive code quality auditing with multiple perspectives
- Automated code review using adversarial analysis
- Continuous audit sessions with state management
- Iterative code improvement with structured feedback
- Integration with development workflows through MCP protocol

## Architecture Philosophy

The system follows a modular, extensible architecture with clear separation of concerns:
- Auditor layer for GAN-style analysis
- Session management for continuity
- Context packing for repository analysis
- Response building for structured output
- Configuration management for flexibility
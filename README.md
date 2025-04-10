# Project Analysis for Cursor

This directory contains tools for analyzing your project architecture and code cleanliness using Cursor's Model Context Protocol (MCP).

## Overview

The Project Analysis tool provides two main functionalities:
1. **Analyze Architecture**: Analyzes your project structure and suggests architecture improvements
2. **Unused Report**: Identifies unused files, dependencies, and exports in your codebase

## Required CLI Tools

To use the Project Analysis tools effectively, you need the following CLI tools installed on your system:

- **tree**: Directory structure visualization 
  - macOS: `brew install tree`
  - Linux: `apt-get install tree` or equivalent for your distribution
  - Windows: Install via Chocolatey with `choco install tree` or use Git Bash

- **ripgrep (rg)**: Fast code search tool
  - macOS: `brew install ripgrep`
  - Linux: `apt-get install ripgrep` or equivalent 
  - Windows: `choco install ripgrep` or download from GitHub releases

- **repomix**: Code concatenation tool (installed via npx when needed)
  - This will be automatically installed via npx when used

- **knip**: Finds unused dependencies and exports (installed via npx when needed)
  - This will be automatically installed via npx when used

## Setup

1. Ensure you have Node.js installed (version 16 or later)
2. Install the required CLI tools listed above
3. Set your OpenAI API key in your environment:
   ```
   export OPENAI_API_KEY=your_api_key_here
   ```

## Usage

The Project Analysis tools are integrated with Cursor's MCP system and can be used through Cursor's interface.

### Analyze Architecture

This tool helps you analyze your project's architecture for a specific task:

1. Set up a task description
2. The tool will:
   - Use `tree` to analyze your directory structure
   - Generate and run a `ripgrep` command to find relevant code
   - Use `repomix` to gather code context
   - Provide architecture recommendations

### Unused Report

This tool analyzes your codebase for unused files, dependencies, and exports:

1. The tool will:
   - Run `knip` analysis on your project
   - Generate a report of unused code elements
   - Suggest cleanup options

## Debugging

If you encounter issues, you can enable debug mode by setting:

```
export DEBUG=1
```

This will output detailed logs to help diagnose problems.

## Directory Structure

```
.cursor/mcp/project-analysis/
├── README.md - This documentation
├── package.json - Project dependencies
├── tsconfig.json - TypeScript configuration
├── src/ - Source code
│   ├── index.ts - Main server implementation
│   └── tools/ - Tool implementations
│       ├── architectSolutionTool.ts - Architecture analysis
│       ├── codeCleanlinessTool.ts - Code cleanliness analysis
│       └── utils.ts - Shared utilities
└── build/ - Compiled JavaScript
```

## Contributing

To modify or extend these tools:

1. Make your changes to the TypeScript source in the `src/` directory
2. Rebuild with `npm run build`
3. Test your changes within Cursor

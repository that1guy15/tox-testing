# Tox Testing MCP Server

An MCP server that executes tox commands to run python tests within a project using pytest. This server provides a convenient way to run and manage python tests through the Model Context Protocol (MCP).

## Features

### Tools
- `run_tox_tests` - Execute tox tests with various modes and options
  - Supports different execution modes:
    - `all`: Run all tests or tests from a specific group
    - `file`: Run tests from a specific file
    - `case`: Run a specific test case
    - `directory`: Run all tests in a specified directory
  - Test groups supported:
    - `clients`: Client-related tests
    - `api`: API endpoint tests
    - `auth`: Authentication tests
    - `uploads`: Upload functionality tests
    - `routes`: Route handler tests

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with VSCode, add the server config to your MCP settings file at:
`~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "tox-testing": {
      "command": "node",
      "args": ["/path/to/tox-testing/build/index.js"],
      "env": {
        "TOX_APP_DIR": "/path/to/your/python/project",
        "TOX_TIMEOUT": "600"
      }
    }
  }
}
```

### Configuration Options

- `env.TOX_TIMEOUT`: (Optional) Maximum time in seconds to wait for test execution to complete. If a test run takes longer than this timeout, it will be terminated. Default is 600 seconds (10 minutes)
- `env.TOX_APP_DIR`: (Required) Directory containing the tox.ini file. This is where tox commands will be executed from. The path should point to the root of your Python project where tox.ini is located.

The timeout is particularly important for:
- Preventing hung test processes
- Managing long-running integration tests
- Ensuring CI/CD pipelines don't get stuck

## Usage

The server provides a single tool `run_tox_tests` that can be used in different modes:

### Tool Arguments

```typescript
// Run all tests
{
  "mode": "all"
}

// Run tests from a specific group
{
  "mode": "all",
  "group": "api"
}

// Run tests from a specific file
{
  "mode": "file",
  "testFile": "tests/test_api.py"
}

// Run a specific test case
{
  "mode": "case",
  "testFile": "tests/test_api.py",
  "testCase": "test_endpoint_response"
}

// Run tests from a specific directory
{
  "mode": "directory",
  "directory": "tests/api/"
}
```

### Using with Cline

When using this MCP with Cline, you can configure Cline's Custom Instructions to handle test execution efficiently. Here's a recommended workflow:

```
If asked to run tests on the project, use the tox-testing MCP. Follow these steps:
1. Run all tests across the project unless you are given instructions to run a specific test file or test case. 
2. Review and rerun each failed test case individually as you troubleshoot and fix the issue from its output.
3. Repeat step 2 until the testcase passes.
4. Once all failed test cases from step 1 are passing rerun all tests again and repeat all steps until all tests pass.
```

This workflow ensures:
- Comprehensive test coverage by running all tests first
- Focused debugging by isolating failed test cases
- Verification of fixes by retesting individual cases
- Final validation by running all tests again

Example interactions with Cline:

```
You: Run the tests for this project
Cline: I'll use the tox-testing MCP to run all tests:
{
  "mode": "all"
}

You: Fix the failing test in test_api.py
Cline: I'll first run the specific test file:
{
  "mode": "file",
  "testFile": "tests/test_api.py"
}
Then address each failing test case individually:
{
  "mode": "case",
  "testFile": "tests/test_api.py",
  "testCase": "test_endpoint_response"
}
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

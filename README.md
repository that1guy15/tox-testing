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

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

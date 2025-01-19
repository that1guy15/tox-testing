#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { join } from 'path';

// Get app directory from environment variable - this must point to where tox.ini is located
const APP_DIR = process.env.TOX_APP_DIR;
if (!APP_DIR) {
  throw new Error('TOX_APP_DIR environment variable is required. It must point to the directory containing tox.ini');
}

type TestGroup = 'clients' | 'api' | 'auth' | 'uploads' | 'routes';

interface ToxArgs {
  mode: 'all' | 'file' | 'case' | 'directory';
  testFile?: string;
  testCase?: string;
  directory?: string;
  group?: TestGroup;
}

const isToxArgs = (args: any): args is ToxArgs =>
  typeof args === 'object' &&
  args !== null &&
  ['all', 'file', 'case', 'directory'].includes(args.mode) &&
  (args.mode === 'all' ||
    (args.mode === 'file' && typeof args.testFile === 'string') ||
    (args.mode === 'case' &&
      typeof args.testFile === 'string' &&
      typeof args.testCase === 'string') ||
    (args.mode === 'directory' && typeof args.directory === 'string'));

class ToxTestingServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'tox-testing-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        }
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_tox_tests',
          description: 'Run tox tests with different modes and options',
          inputSchema: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                enum: ['all', 'file', 'case', 'directory'],
                description: 'Test execution mode',
              },
              directory: {
                type: 'string',
                description: 'Directory containing tests to run (required for directory mode)',
              },
              group: {
                type: 'string',
                enum: ['clients', 'api', 'auth', 'uploads', 'routes'],
                description: 'Test group to run in all mode (defaults to clients)',
              },
              testFile: {
                type: 'string',
                description: 'Specific test file to run (required for file and case modes)',
              },
              testCase: {
                type: 'string',
                description: 'Specific test case to run (required for case mode)',
              },
            },
            required: ['mode'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'run_tox_tests') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isToxArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid tox test arguments'
        );
      }

      try {
        let command: string;
        switch (request.params.arguments.mode) {
          case 'all':
            const testGroups: Record<TestGroup, string> = {
              clients: 'tests/test_bluesky_client.py tests/test_reddit_client.py tests/test_reddit_analytics.py',
              api: 'tests/test_admin_platforms_api.py tests/test_user_platforms_api.py tests/test_uploads_api.py',
              auth: 'tests/test_oauth_routes.py tests/test_users_api.py tests/test_uploads_auth.py',
              uploads: 'tests/test_upload_workflow.py tests/test_uploads_media.py',
              routes: 'tests/test_routes.py tests/test_feedback_routes.py'
            };
            
            // If group is specified, run only that group's tests
            // Otherwise run all tests in the tests directory
            const group = request.params.arguments.group;
            if (group) {
              if (!Object.keys(testGroups).includes(group)) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Invalid test group: ${group}. Valid groups are: ${Object.keys(testGroups).join(', ')}`
                );
              }
              command = `tox -- ${testGroups[group as TestGroup]} --tb=no -ra`;
            } else {
              command = `tox -- tests/ --tb=no -ra`;
            }
            break;
          case 'directory':
            if (!request.params.arguments.directory) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'directory is required for directory mode'
              );
            }
            command = `tox -- ${request.params.arguments.directory} --tb=no -ra`;
            break;
          case 'file':
            if (!request.params.arguments.testFile) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'testFile is required for file mode'
              );
            }
            command = `tox -- ${request.params.arguments.testFile} --tb=line -ra`;
            break;
          case 'case':
            if (!request.params.arguments.testFile || !request.params.arguments.testCase) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'testFile and testCase are required for case mode'
              );
            }
            command = `tox -- ${request.params.arguments.testFile}::${request.params.arguments.testCase}`;
            break;
          default:
            throw new McpError(
              ErrorCode.InvalidParams,
              'Invalid test mode'
            );
        }

        console.error(`Executing command: ${command} in directory: ${APP_DIR}`);
        let output: string;
        try {
          const { stdout, stderr } = await execAsync(command, {
            shell: '/bin/bash',
            cwd: APP_DIR,
            // Convert timeout from seconds to milliseconds, default to 600 seconds (10 minutes)
            timeout: (process.env.TOX_TIMEOUT ? parseInt(process.env.TOX_TIMEOUT) : 600) * 1000,
            // Set maxBuffer to handle large test output (50MB)
            maxBuffer: 50 * 1024 * 1024
          });
          output = stdout;
          if (stderr) {
            output += '\n' + stderr;
          }
          console.error('Command executed successfully');
        } catch (execError: any) {
          console.error('Command execution failed:', execError);
          // For tox/pytest failures, we still want to capture the output
          output = execError.stdout || '';
          if (execError.stderr) {
            output += '\n' + execError.stderr;
          }
          if (!output) {
            output = `Error running tests: ${execError.message}`;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
          isError: output.includes('FAILED') || output.includes('ERROR:'),
        };
      } catch (error) {
        console.error('Error details:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error running tox tests: ${error instanceof Error ? error.message : String(error)}${error instanceof Error && error.stack ? '\n' + error.stack : ''}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tox Testing MCP server running on stdio');
  }
}

const server = new ToxTestingServer();
server.run().catch(console.error);

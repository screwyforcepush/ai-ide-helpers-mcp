#!/usr/bin/env node
/**
 * Project Analysis MCP Server
 *
 * This server provides tools for analyzing code architecture and code cleanliness.
 * - analyze-architecture: Analyzes project structure and recommends architecture improvements
 * - analyze-code: Analyzes codebase for unused code and suggests cleanup
 * - query-codebase: Gathers relevant code from the codebase based on a query
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Import tool implementations
import { analyzeArchitecture } from "./tools/architectSolutionTool.js";
import { analyzeCode } from "./tools/codeCleanlinessTool.js";
import { queryCodebase } from "./tools/queryCodebaseTool.js";
// Debug logger
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
function logDebug(...args) {
    if (DEBUG) {
        console.error('[DEBUG]', ...args);
    }
}
// Get the current directory
const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
logDebug('Current script directory:', currentDir);
logDebug('Current working directory:', process.cwd());
// Helper function to change working directory to the project root
function ensureProjectRoot() {
    // Calculate project root assuming this file is in "src/"
    const projectRoot = join(currentDir, '..', '..', '..', '..');
    try {
        process.chdir(projectRoot);
        logDebug('Changed working directory to:', process.cwd());
    }
    catch (err) {
        logDebug('Failed to change working directory:', err);
    }
}
// Create MCP server
const server = new McpServer({
    name: "project-analysis",
    version: "1.0.0",
    description: "Get advice on project architecture and code cleanliness"
});
// Register the architecture analysis tool
// Note: following the SDK documentation format
server.tool("solution-design", "Generate a step-by-step implementation checklist for a development task. Creates implementation-plan.md file at root directory. Use this file to track progress by checking off completed steps.", { task: z.string().describe("Description of the task. \n\nInclude context provided by the user including desigred outcome, requirements, constraints, technical specificities, etc...\nProvide implementation attempts, test results, and other highly specific and relevant detail when possible.") }, async ({ task }) => {
    // ensureProjectRoot();
    try {
        const result = await analyzeArchitecture(task);
        // Make sure content items have the correct type
        return {
            content: result.content.map(item => ({
                type: "text",
                text: item.text
            }))
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logDebug('Error in analyze-architecture tool:', errorMessage);
        return {
            content: [{
                    type: "text",
                    text: `Architecture analysis failed: ${errorMessage}`
                }]
        };
    }
});
// Register the code cleanliness tool
server.tool("unused-report", "Get report of unused files, dependencies and exports", {}, // No parameters needed now
async () => {
    // ensureProjectRoot();
    try {
        const result = await analyzeCode();
        // Convert the result to the format expected by the SDK
        return {
            content: result.content.map(item => ({
                type: "text",
                text: item.text
            }))
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logDebug('Error in analyze-code tool:', errorMessage);
        return {
            content: [{
                    type: "text",
                    text: `Code cleanliness analysis failed: ${errorMessage}`
                }]
        };
    }
});
// Register the query codebase tool
server.tool("query-codebase", "Gathers relevant code from the codebase based on a query, returning the raw code dump output. Can handle multiple queries in a single tool call.", { query: z.string().describe("Provide specific details about what code you're looking for to help narrow down the search. Include all queries and objective in natural language.") }, async ({ query }) => {
    try {
        const result = await queryCodebase(query);
        // Convert the result to the format expected by the SDK
        return {
            content: result.content.map(item => ({
                type: "text",
                text: item.text
            }))
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logDebug('Error in query-codebase tool:', errorMessage);
        return {
            content: [{
                    type: "text",
                    text: `Codebase query failed: ${errorMessage}`
                }]
        };
    }
});
// Start the server with stdio transport
const transport = new StdioServerTransport();
async function main() {
    try {
        logDebug('Starting project-analysis MCP server...');
        await server.connect(transport);
        logDebug('MCP server running on stdio');
        // Handle ctrl+c gracefully
        process.on('SIGINT', async () => {
            logDebug('Shutting down...');
            await server.close();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}
main();

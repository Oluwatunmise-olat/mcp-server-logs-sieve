# CP Logs MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to efficiently filter and analyze Cloud Platform logs by specific prefixes and patterns.

## Overview

This MCP server provides seamless integration between AI assistants and Cloud Logging, allowing you to quickly sieve through massive log datasets to find relevant information. Whether you're debugging applications, monitoring system health, or investigating security incidents, this tool streamlines log analysis workflows.

## Features

- 🔍 **Prefix-based filtering** - Filter logs by specific text prefixes
- 📊 **Multiple log sources**
- ⏰ **Time range queries** - Filter logs within specific time windows
- 📈 **Log aggregation** - Summarize and count matching log entries
- 🛡️ **Secure authentication** - Uses service account credentials

## Examples

### Basic Log Filtering

"Show me all logs with prefix 'user-service:' from the last hour"

### Error Investigation

"Find all ERROR level logs containing 'database connection' from the past 24 hours"

### Performance Monitoring

"Aggregate logs with prefix 'response_time:' and group by service name"

### Security Analysis

"Search for logs matching pattern 'failed login._IP: 192.168._' in the last week"

## Support

- 📧 Email: theoluwatunmiseolatunbosun@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Oluwatunmise-olat/mcp-server-logs-sieve/discussions)

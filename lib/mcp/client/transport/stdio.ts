/**
 * MCP Stdio Transport
 * For communication with local MCP servers via stdin/stdout
 * 
 * Note: This transport is primarily used in Node.js environments
 * For browser-based Y-CRM, this is used when running the standalone MCP server
 */

import { BaseTransport, StdioTransportConfig } from "./base";
import { JSONRPCMessage } from "../../protocol/types";

/**
 * Stdio Transport for MCP Client (Node.js only)
 * 
 * Spawns a child process and communicates via stdin/stdout
 * Each message is a JSON object followed by newline
 */
export class StdioTransport extends BaseTransport {
  private config: StdioTransportConfig;
  private process: ChildProcessLike | null = null;
  private buffer: string = "";

  constructor(config: StdioTransportConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    // Check if we're in Node.js environment
    if (typeof window !== "undefined") {
      throw new Error("Stdio transport is only available in Node.js environment");
    }

    this.setState("connecting");

    try {
      // Dynamic import for Node.js child_process
      const { spawn } = await import("child_process");

      this.process = spawn(this.config.command, this.config.args || [], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...this.config.env },
        cwd: this.config.cwd,
      }) as unknown as ChildProcessLike;

      // Handle stdout (messages from server)
      this.process.stdout?.on("data", (data: Buffer) => {
        this.handleData(data.toString());
      });

      // Handle stderr (for debugging)
      this.process.stderr?.on("data", (data: Buffer) => {
        console.error("[Stdio Transport] stderr:", data.toString());
      });

      // Handle process exit
      this.process.on("exit", (code: number | null) => {
        console.log("[Stdio Transport] Process exited with code:", code);
        this.handleClose();
      });

      // Handle errors
      this.process.on("error", (error: Error) => {
        console.error("[Stdio Transport] Process error:", error);
        this.emit("error", error);
        this.setState("error");
      });

      this.setState("connected");
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  private handleData(data: string): void {
    this.buffer += data;

    // Process complete messages (newline-delimited JSON)
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as JSONRPCMessage;
          this.emit("message", message);
        } catch (error) {
          console.error("[Stdio Transport] Failed to parse message:", error, line);
        }
      }
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.state !== "connected" || !this.process?.stdin) {
      throw new Error("Transport not connected");
    }

    const data = JSON.stringify(message) + "\n";
    
    return new Promise((resolve, reject) => {
      this.process!.stdin!.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.handleClose();
  }

  private handleClose(): void {
    this.process = null;
    this.setState("disconnected");
    this.emit("close");
  }
}

/**
 * Stdio Server Transport (Node.js only)
 * Used when Y-CRM runs as a standalone MCP server
 * Reads from stdin, writes to stdout
 */
export class StdioServerTransport extends BaseTransport {
  private buffer: string = "";
  private stdin: NodeJS.ReadStream | null = null;
  private stdout: NodeJS.WriteStream | null = null;

  async start(): Promise<void> {
    if (typeof window !== "undefined") {
      throw new Error("Stdio server transport is only available in Node.js");
    }

    this.stdin = process.stdin;
    this.stdout = process.stdout;

    this.stdin.setEncoding("utf8");
    this.stdin.on("data", (data: string) => {
      this.handleData(data);
    });

    this.stdin.on("end", () => {
      this.handleClose();
    });

    this.setState("connected");
  }

  private handleData(data: string): void {
    this.buffer += data;

    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as JSONRPCMessage;
          this.emit("message", message);
        } catch (error) {
          console.error("[Stdio Server] Failed to parse:", error);
        }
      }
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.stdout || this.state !== "connected") {
      throw new Error("Transport not connected");
    }

    const data = JSON.stringify(message) + "\n";
    this.stdout.write(data);
  }

  async close(): Promise<void> {
    this.handleClose();
  }

  private handleClose(): void {
    this.stdin = null;
    this.stdout = null;
    this.setState("disconnected");
    this.emit("close");
  }
}

// Type for child process (to avoid importing node types in browser)
interface ChildProcessLike {
  stdin: {
    write: (data: string, callback?: (error?: Error) => void) => boolean;
  } | null;
  stdout: {
    on: (event: "data", listener: (data: Buffer) => void) => void;
  } | null;
  stderr: {
    on: (event: "data", listener: (data: Buffer) => void) => void;
  } | null;
  on: (event: "exit" | "error", listener: (arg: unknown) => void) => void;
  kill: () => void;
}

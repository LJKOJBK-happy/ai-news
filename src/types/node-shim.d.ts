declare module 'node:fs/promises' {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
  export function readFile(path: string, encoding: string): Promise<string>;
}

declare module 'node:path' {
  const path: {
    resolve: (...segments: string[]) => string;
    join: (...segments: string[]) => string;
  };
  export default path;
}

declare module 'node:child_process' {
  export function execFile(
    file: string,
    args: string[],
    options: { timeout?: number },
    callback: (error: unknown, stdout: string, stderr: string) => void,
  ): void;
}

declare module 'node:test' {
  export default function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  const assert: {
    equal: (actual: unknown, expected: unknown) => void;
    ok: (value: unknown) => void;
  };
  export default assert;
}

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exitCode?: number;
};

declare const console: {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

declare function fetch(input: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }): Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

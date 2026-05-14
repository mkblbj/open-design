import type http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('static web fallback', () => {
  let server: http.Server;
  let baseUrl: string;
  let dataDir: string;
  let previousDataDir: string | undefined;

  beforeAll(async () => {
    previousDataDir = process.env.OD_DATA_DIR;
    dataDir = mkdtempSync(path.join(tmpdir(), 'od-static-web-fallback-'));
    process.env.OD_DATA_DIR = dataDir;

    const { startServer } = await import('../src/server.js');
    const started = (await startServer({ port: 0, returnServer: true })) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          if (previousDataDir === undefined) {
            delete process.env.OD_DATA_DIR;
          } else {
            process.env.OD_DATA_DIR = previousDataDir;
          }
          rmSync(dataDir, { recursive: true, force: true });
          resolve();
        });
      }),
  );

  it('serves the web app shell for project deep links', async () => {
    const res = await fetch(`${baseUrl}/projects/f8a78e49-eb8e-4a4c-9df9-e0db63d9a9a0`);
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(body).toContain('<title>Open Design</title>');
  });

  it('serves the web app shell for project file deep links', async () => {
    const res = await fetch(`${baseUrl}/projects/f8a78e49-eb8e-4a4c-9df9-e0db63d9a9a0/files/index.html`);
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(body).toContain('<title>Open Design</title>');
  });

  it('does not serve the web app shell for missing API routes', async () => {
    const res = await fetch(`${baseUrl}/api/not-a-real-route`);
    const body = await res.text();

    expect(res.status).toBe(404);
    expect(body).not.toContain('<title>Open Design</title>');
  });
});

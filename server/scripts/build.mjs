// Builds the folder `build/` that is uploaded to the university web hosting (`httpdocs`):
//   build/app.js            the whole server in ONE file (ws is bundled, no node_modules needed)
//   build/public/demo.html  the test page
//   build/tmp/restart.txt   a changed file tells Passenger hostings to restart the app
import { build } from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

await rm('build', { recursive: true, force: true });

await build({
  entryPoints: ['src/app.ts'],
  outfile: 'build/app.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  // Optional speed-ups of `ws`. It falls back to plain JavaScript when they are missing.
  external: ['bufferutil', 'utf-8-validate'],
  legalComments: 'none',
});

await cp('public', 'build/public', { recursive: true });
await mkdir('build/tmp', { recursive: true });
await writeFile('build/tmp/restart.txt', `${new Date().toISOString()}\n`);

process.stdout.write('Built build/app.js\n');

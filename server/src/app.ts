import path from 'node:path';
import { startServer } from './index.js';

// Start on the university web hosting. `npm run build` bundles this file into `build/app.js`,
// which is the file the hosting looks for (`httpdocs/app.js`). The bundle is a plain CommonJS
// file, so `__dirname` is the folder the hosting copied it to (the test page lies next to it).
// The hosting decides the port (PORT) and may hook into `listen`, so nothing else is set here.
void startServer({
  port: Number(process.env.PORT ?? 3000),
  teacherSecret: process.env.TEACHER_SECRET,
  publicDir: path.join(__dirname, 'public'),
});

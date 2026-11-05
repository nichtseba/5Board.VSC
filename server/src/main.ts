import { startServer } from './index.js';

// Start on your own computer: `npm start` (the settings come from environment variables).
const port = Number(process.env.PORT ?? 3000);
const server = await startServer({ port, teacherSecret: process.env.TEACHER_SECRET });
process.stdout.write(`5Board server running: http://localhost:${server.port}/demo\n`);

const stop = () => void server.close().then(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

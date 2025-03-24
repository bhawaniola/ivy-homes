import http from 'http';
import express from 'express';
import cors from 'cors';
import { startWorkers } from './workers.js';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000; // Use a single port for both servers

// Middleware
app.use(cors());

// Routes
app.get('/', (req, res) => {
  res.send('Hello! Server is Live.');
});

app.get('/start-workers', async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'workers.log');
    fs.writeFileSync(logFilePath, '', 'utf8');
    console.log('Cleared workers.log');

    startWorkers()
      .then(() => console.log('Workers completed successfully'))
      .catch((error) => console.error('Workers failed:', error.message));

    res.status(200).json({ message: 'Workers started successfully' });
  } catch (error) {
    console.error('Error starting workers:', error.message);
    res.status(500).json({ error: 'Failed to start workers' });
  }
});

app.get('/logs', async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'workers.log');

    if (!fs.existsSync(logFilePath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const logs = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logs.split('\n').filter(line => line.trim() !== '');

    res.status(200).json({ logs: logLines });
  } catch (error) {
    console.error('Error reading logs:', error.message);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
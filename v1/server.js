const express = require('express');
const cors = require('cors');
const { startWorkers } = require('./workers');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());

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
  

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});
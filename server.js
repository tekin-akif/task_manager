const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors()); // Allow frontend requests
app.use(express.json()); // Parse JSON bodies

// Generic handler creator
const createDataHandler = (filePath, entityName) => {
  return {
    getHandler: async (req, res) => {
      try {
        // Auto-create file if missing (for GET)
        try { await fs.access(filePath); } 
        catch { await fs.writeFile(filePath, '[]'); }

        const data = await fs.readFile(filePath, 'utf8');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json(JSON.parse(data));
      } catch (error) {
        res.status(500).json({ error: `Failed to load ${entityName}` });
      }
    },

    postHandler: async (req, res) => {
      try {
        if (!Array.isArray(req.body)) {
          return res.status(400).json({ error: `Expected array of ${entityName}` });
        }
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: `Failed to save ${entityName}: ${error.message}` });
      }
    }
  };
};

// Usage for tasks
const tasksHandler = createDataHandler(
//  path.join(__dirname, 'data', 'developer-tasks.json'), //activate this line for development
  path.join(__dirname, 'data', 'personal-tasks.json'),    // activate this line for personal use
  'tasks'
);
app.get('/tasks', tasksHandler.getHandler);
app.post('/tasks', tasksHandler.postHandler);

// Usage for diary entries
const diaryHandler = createDataHandler(
  path.join(__dirname, 'data', 'diary-entries.json'),
  'diary entries'
);
app.get('/diary-entries', diaryHandler.getHandler);
app.post('/diary-entries', diaryHandler.postHandler);

// Serve static files (HTML/CSS/JS)
app.use(express.static(path.join(__dirname)));

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
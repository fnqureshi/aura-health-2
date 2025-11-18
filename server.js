const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serves static files like CSS and JS from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));

// --- Page Routing ---

// Route for the landing page.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Route for the main application.
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// --- API Endpoints ---

app.get('/api/embed-url', (req, res) => {
  const embedUrl = process.env.EMBED_URL;
  if (embedUrl) {
    res.json({ url: embedUrl });
  } else {
    res.status(500).json({ error: 'Embed URL is not configured on the server.' });
  }
});

app.get('/api/clerk-key', (req, res) => {
  const clerkKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (clerkKey) {
    res.json({ key: clerkKey });
  } else {
    res.status(500).json({ error: 'Clerk key is not configured on the server.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

async function initializeClerk() {
    try {
        const response = await fetch('/api/clerk-key');
        if (!response.ok) throw new Error('Could not fetch Clerk configuration.');
        const data = await response.json();
        const CLERK_PUBLISHABLE_KEY = data.key;
        
        const clerkScript = document.createElement('script');
        clerkScript.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
        clerkScript.async = true;
        clerkScript.src = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
        clerkScript.crossOrigin = "anonymous";
        clerkScript.addEventListener('load', onClerkLoaded);
        document.head.appendChild(clerkScript);
    } catch (error) {
        console.error("Failed to initialize Clerk:", error);
    }
}

async function onClerkLoaded() {
    await window.Clerk.load();

    // UI Elements
    const userButtonDiv = document.getElementById('user-button');
    const appContent = document.getElementById('app-content');
    const signInContainer = document.getElementById('sign-in-container');
    
    // Chat Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // Tracker Elements
    const painLevelSlider = document.getElementById('pain-level');
    const symptomTagsContainer = document.getElementById('symptom-tags');
    const notesTextarea = document.getElementById('notes');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const logHistoryContainer = document.getElementById('log-history');

    // State
    const LOG_STORAGE_KEY = 'auraScribeLog';
    let logEntries = [];
    let chatHistory = []; // Stores conversation for Gemini context

    // --- Tracker Functions ---
    function loadEntries() {
        const stored = localStorage.getItem(LOG_STORAGE_KEY);
        logEntries = stored ? JSON.parse(stored) : [];
        renderLog();
    }

    function renderLog() {
        logHistoryContainer.innerHTML = '';
        if (logEntries.length === 0) {
            logHistoryContainer.innerHTML = '<p class="empty-state">No entries yet.</p>';
            return;
        }
        logEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `<strong>${entry.date}</strong> - Pain: ${entry.pain}/10<br><small>${entry.symptoms.join(', ')}</small>`;
            logHistoryContainer.prepend(div);
        });
    }

    function addEntry() {
        const symptoms = Array.from(symptomTagsContainer.querySelectorAll('.selected')).map(t => t.dataset.symptom);
        const entry = {
            date: new Date().toLocaleDateString(),
            pain: painLevelSlider.value,
            symptoms,
            notes: notesTextarea.value.trim()
        };
        logEntries.push(entry);
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logEntries));
        renderLog();
        
        // Reset UI
        notesTextarea.value = '';
        symptomTagsContainer.querySelectorAll('.selected').forEach(t => t.classList.remove('selected'));
        painLevelSlider.value = 5;
    }

    // --- Chat Functions ---
    function appendMessage(text, isUser) {
        const div = document.createElement('div');
        div.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        // Use 'marked' library to parse Markdown from AI
        div.innerHTML = isUser ? text : marked.parse(text);
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage(text, true);
        userInput.value = '';

        // Prepare context from logs (last 5 entries)
        const recentLogs = logEntries.slice(-5).map(e => 
            `Date: ${e.date}, Pain: ${e.pain}/10, Symptoms: ${e.symptoms.join(', ')}, Notes: ${e.notes}`
        ).join('\n');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: chatHistory,
                    context: recentLogs // Sending logs to AI!
                })
            });

            const data = await response.json();
            if (data.response) {
                appendMessage(data.response, false);
                // Update history
                chatHistory.push({ role: "user", parts: [{ text }] });
                chatHistory.push({ role: "model", parts: [{ text: data.response }] });
            }
        } catch (error) {
            console.error(error);
            appendMessage("Error: Could not connect to Aura Scribe.", false);
        }
    }

    // --- Event Listeners ---
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    
    addEntryBtn.addEventListener('click', addEntry);
    symptomTagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('symptom-tag')) e.target.classList.toggle('selected');
    });

    // Quick Actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            userInput.value = btn.dataset.prompt;
            sendMessage(); // Auto-send for quick actions
            // Close mobile menu if open
            document.getElementById('actions-panel').classList.remove('is-open');
            document.getElementById('overlay').classList.remove('is-visible');
        });
    });

    // Mobile Menu
    document.getElementById('menu-toggle-btn').addEventListener('click', () => {
        document.getElementById('actions-panel').classList.add('is-open');
        document.getElementById('overlay').classList.add('is-visible');
    });
    document.getElementById('close-panel-btn').addEventListener('click', () => {
        document.getElementById('actions-panel').classList.remove('is-open');
        document.getElementById('overlay').classList.remove('is-visible');
    });

    // --- Clerk Init ---
    window.Clerk.mountUserButton(userButtonDiv);
    window.Clerk.addListener(({ user }) => {
        if (user) {
            signInContainer.style.display = 'none';
            appContent.style.display = 'flex'; // Flex for layout
            loadEntries();
        } else {
            appContent.style.display = 'none';
            signInContainer.style.display = 'block';
            window.Clerk.mountSignIn(signInContainer);
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeClerk);

async function initializeClerk() {
    try {
        const response = await fetch('/api/clerk-key');
        if (!response.ok) throw new Error('Could not fetch Clerk configuration.');
        const data = await response.json();
        const CLERK_PUBLISHABLE_KEY = data.key;
        if (!CLERK_PUBLISHABLE_KEY) throw new Error("Missing Clerk Publishable Key from server.");

        const clerkScript = document.createElement('script');
        clerkScript.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
        clerkScript.async = true;
        clerkScript.src = `https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
        clerkScript.crossOrigin = "anonymous";
        clerkScript.addEventListener('load', onClerkLoaded);
        document.head.appendChild(clerkScript);
    } catch (error) {
        console.error("Failed to initialize Clerk:", error);
        document.body.innerHTML = '<p style="color: red; text-align: center;">Error: Application could not be initialized.</p>';
    }
}

async function onClerkLoaded() {
    await window.Clerk.load();

    // --- Element Selectors ---
    const userButtonDiv = document.getElementById('user-button');
    const appContent = document.getElementById('app-content');
    const signInContainer = document.getElementById('sign-in-container');
    const iframeContainer = document.getElementById('iframe-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorContainer = document.getElementById('error-container');
    
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const actionsPanel = document.getElementById('actions-panel');
    const overlay = document.getElementById('overlay');

    const painLevelSlider = document.getElementById('pain-level');
    const symptomTagsContainer = document.getElementById('symptom-tags');
    const notesTextarea = document.getElementById('notes');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const logHistoryContainer = document.getElementById('log-history');
    const copyLogBtn = document.getElementById('copy-log-btn');

    const LOG_STORAGE_KEY = 'auraScribeLog';
    let logEntries = [];

    // --- Tracker Logic ---
    function saveEntries() {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logEntries));
    }

    function loadEntries() {
        const storedEntries = localStorage.getItem(LOG_STORAGE_KEY);
        logEntries = storedEntries ? JSON.parse(storedEntries) : [];
    }

    function renderLog() {
        logHistoryContainer.innerHTML = '';
        if (logEntries.length === 0) {
            logHistoryContainer.innerHTML = '<p>Your daily entries will appear here.</p>';
            return;
        }
        logEntries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'log-entry';
            entryDiv.innerHTML = `
                <strong>${entry.date}</strong><br>
                Pain: ${entry.pain}/10<br>
                Symptoms: ${entry.symptoms.join(', ') || 'None'}<br>
                Notes: ${entry.notes || 'N/A'}
            `;
            logHistoryContainer.prepend(entryDiv); // Show newest first
        });
    }

    function addEntry() {
        const selectedSymptoms = Array.from(symptomTagsContainer.querySelectorAll('.symptom-tag.selected'))
            .map(tag => tag.dataset.symptom);

        const newEntry = {
            date: new Date().toLocaleDateString(),
            pain: painLevelSlider.value,
            symptoms: selectedSymptoms,
            notes: notesTextarea.value.trim()
        };

        logEntries.push(newEntry);
        saveEntries();
        renderLog();
        
        // Reset form for next entry
        notesTextarea.value = '';
        symptomTagsContainer.querySelectorAll('.selected').forEach(tag => tag.classList.remove('selected'));
        painLevelSlider.value = 5;
    }

    function copyLogForAI() {
        if (logEntries.length === 0) {
            alert("No log entries to copy.");
            return;
        }
        const formattedLog = logEntries.map(entry => {
            return `
Date: ${entry.date}
- Pain Level: ${entry.pain}/10
- Symptoms: ${entry.symptoms.join(', ') || 'None'}
- Notes: ${entry.notes || 'N/A'}
            `.trim();
        }).join('\n\n---\n\n');

        const fullPrompt = `Please analyze the following medical log entries for patterns related to endometriosis. Summarize the key findings in a clinical format suitable for a doctor, highlighting trends in pain and symptoms.\n\n--- LOG DATA ---\n\n${formattedLog}`;

        navigator.clipboard.writeText(fullPrompt).then(() => {
            alert('Log and analysis prompt copied to clipboard! Please paste it into the AI chat.');
        });
    }

    // --- Clerk Authentication Logic ---
    window.Clerk.mountUserButton(userButtonDiv);
    window.Clerk.addListener(({ user }) => {
        if (user) {
            signInContainer.style.display = 'none';
            appContent.style.display = 'block';
            loadEmbed(user.id);
            loadEntries();
            renderLog();
        } else {
            appContent.style.display = 'none';
            signInContainer.style.display = 'block';
            window.Clerk.mountSignIn(signInContainer);
        }
    });

    // --- Mobile Menu Toggle Logic ---
    function openMenu() {
        actionsPanel.classList.add('is-open');
        overlay.classList.add('is-visible');
    }

    function closeMenu() {
        actionsPanel.classList.remove('is-open');
        overlay.classList.remove('is-visible');
    }

    menuToggleBtn.addEventListener('click', openMenu);
    closePanelBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // --- Quick Actions Logic ---
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const prompt = button.getAttribute('data-prompt');
            if (prompt) {
                navigator.clipboard.writeText(prompt).then(() => {
                    alert('Prompt copied to clipboard! Please paste it into the chat.');
                    if (window.innerWidth < 769) {
                        closeMenu();
                    }
                });
            }
        });
    });
    
    // --- Tracker Event Listeners ---
    symptomTagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('symptom-tag')) {
            e.target.classList.toggle('selected');
        }
    });
    addEntryBtn.addEventListener('click', addEntry);
    copyLogBtn.addEventListener('click', copyLogForAI);

    // --- Iframe Loading Logic ---
    async function loadEmbed(userId) {
        loadingSpinner.style.display = 'block';
        errorContainer.style.display = 'none';
        iframeContainer.innerHTML = '';
        try {
            const response = await fetch('/api/embed-url');
            if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
            const data = await response.json();
            if (data.url) {
                const personalizedUrl = `${data.url}&conversation_id=${userId}`;
                const iframe = document.createElement('iframe');
iframe.src = personalizedUrl;
                loadingSpinner.style.display = 'none';
                iframeContainer.appendChild(iframe);
            } else {
                throw new Error('Embed URL was not provided by the server.');
            }
        } catch (error) {
            console.error('Error:', error);
            loadingSpinner.style.display = 'none';
            errorContainer.style.display = 'block';
            errorContainer.innerHTML = `<p>Error: Could not load the conversation.</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeClerk);


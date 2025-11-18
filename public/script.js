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
    const userButtonDiv = document.getElementById('user-button');
    const appContent = document.getElementById('app-content');
    const signInContainer = document.getElementById('sign-in-container');
    const iframeContainer = document.getElementById('iframe-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorContainer = document.getElementById('error-container');

    window.Clerk.mountUserButton(userButtonDiv);
    window.Clerk.addListener(({ user }) => {
        if (user) {
            signInContainer.style.display = 'none';
            appContent.style.display = 'block';
            loadEmbed(user.id);
        } else {
            appContent.style.display = 'none';
            signInContainer.style.display = 'block';
            window.Clerk.mountSignIn(signInContainer);
        }
    });

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

// ... (keep all the existing code from initializeClerk and onClerkLoaded)

// THIS IS THE NEW PART TO ADD INSIDE onClerkLoaded, after Clerk listeners are set up.

    // --- Quick Actions Logic ---
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const prompt = button.getAttribute('data-prompt');
            if (prompt) {
                // Copy the prompt to the clipboard
                navigator.clipboard.writeText(prompt).then(() => {
                    // Notify the user
                    alert('Prompt copied to clipboard! Please paste it into the chat.');
                }).catch(err => {
                    console.error('Failed to copy prompt: ', err);
                    alert('Could not copy prompt. Please copy it manually.');
                });
            }
        });
    });

// ... (keep the rest of the existing code)

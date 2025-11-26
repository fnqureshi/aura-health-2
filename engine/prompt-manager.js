const axios = require('axios');

const SOUL_REPO_OWNER = 'fnqureshi';
const SOUL_REPO_NAME = 'aura-citadel-soul';
const PROMPT_PATH = 'personas/sovereign_scribe_endo.md';

async function getScribePersona() {
    const token = process.env.SOUL_REPO_TOKEN;
    if (!token) {
        console.error("CRITICAL: SOUL_REPO_TOKEN is missing. The Scribe has no voice.");
        throw new Error("Missing Royal Key (SOUL_REPO_TOKEN).");
    }

    try {
        const url = `https://api.github.com/repos/${SOUL_REPO_OWNER}/${SOUL_REPO_NAME}/contents/${PROMPT_PATH}`;
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch the Scribe's Doctrine:", error.message);
        throw new Error("The Soul Repository is unreachable.");
    }
}

module.exports = { getScribePersona };
# TheXYZgroup Chatbot - Netlify Ready

## Deployment Steps:
1. Extract or push these files to a GitHub repository:
   - `index.html`
   - `netlify.toml`
   - `requirements.txt`
   - `netlify/functions/chat.py`

2. Go to **Netlify** -> **Add new site** -> **Import an existing project** from GitHub.
3. Once deployed, go to **Site configuration** -> **Environment variables**.
4. Add variable:
   - Key: `GEMINI_API_KEY`
   - Value: `your_actual_api_key_here`
5. Trigger a redeploy under the **Deploys** tab.

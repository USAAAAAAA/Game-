OpenAI proxy for local development

What this does

- Adds a small Express proxy (`server.js`) that forwards test-generation requests to OpenAI (Chat Completions API).
- Keeps your OpenAI API key server-side (read from environment), so it is not embedded in client JavaScript.

Setup (Windows PowerShell)

1. Install dependencies:

```powershell
cd "c:\Users\User\Desktop\My game - Copy"
npm install
```

2. Create a `.env` file based on the example and put your real OpenAI key there (do NOT commit this file):

```powershell
copy .env.example .env
# then open .env in an editor and replace YOUR_OPENAI_API_KEY_HERE with your real key
```

3. Start the proxy server:

```powershell
npm start
```

The proxy listens on port 3000 by default. The client (your `index.html`/`main.js`) will call the endpoint `/generate-test` on the same origin. If you serve `index.html` over a file:// URL, you should instead host the static files (or open `index.html` using a local static server) so the browser can reach `http://localhost:3000/generate-test` without CORS issues.

If you run the frontend from a different origin (for example `http://localhost:8080`), the proxy now allows cross-origin requests. The client requests the proxy at `http://localhost:3000/generate-test` by default. If your proxy runs on a different host/port, set `window.PROXY_BASE_URL` in the browser console before using the UI, for example:

```javascript
window.PROXY_BASE_URL = 'http://localhost:3000'
```

Notes and security

- Never commit real API keys to source control. Use `.env` or a secret manager.
- For production use, secure the proxy (auth, rate limits, logging controls).

Alternative: run a single server for both frontend and proxy

The proxy can also serve the frontend static files so you can run one command and open everything at http://localhost:3000.

Run (no npm required if dependencies are installed):

```powershell
node server.js
```

Then open:

http://localhost:3000/index.html

This avoids CORS and makes the UI call `/generate-test` on the same origin.

If you want, I can also:
- Add a small static file server so you can open everything via http://localhost:3000,
- Add CORS configuration if you plan to serve the frontend from a different origin,
- Or implement server-side caching/validation of responses.

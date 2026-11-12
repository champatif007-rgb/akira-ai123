# Akira AI — deploy like the public demo (no visitor sign-in)

Visitors never paste an API key. The modern Netlify chat function uses AI Gateway's automatically injected Gemini credentials.

## Deploy on Netlify
This is a static site with no build step. Leave the build command empty and use `public` as the publish directory, as configured in `netlify.toml`. The page lives at `public/index.html`; server functions live in `netlify/functions`. Netlify installs the Gemini SDK from `package.json`.

Push this folder to GitHub and connect the repository to Netlify. AI Gateway must be enabled and a production deployment must exist for automatic credentials to be available. No manually configured provider key is required.

## 3. Open your site
Ask a question. Answers come from `/api/chat` (server holds the key).

Optional: set `GEMINI_MODEL` (default `gemini-3.8-flash`).

## Local note
Opening `public/index.html` as a file will not hit `/api/chat`. Use the Netlify URL after deploy.

# Akira AI — deploy like the public demo (no visitor sign-in)

Visitors never paste an API key. The key stays in Netlify.

## 1. Get a free Gemini key
https://aistudio.google.com/app/apikey  
(No credit card.)

## 2. Deploy on Netlify
1. Push this folder to GitHub, or drag the whole folder into Netlify’s “Deploy manually”.
2. Site settings → **Environment variables** → add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** your Gemini key
3. Redeploy if the first deploy finished before the variable was set.

## 3. Open your site
Ask a question. Answers come from `/api/chat` (server holds the key).

Optional: set `GEMINI_MODEL` (default `gemini-3.8-flash`).

## Local note
Opening `public/index.html` as a file will not hit `/api/chat`. Use the Netlify URL after deploy.

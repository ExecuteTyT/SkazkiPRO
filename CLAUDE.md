# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

СказкиПро (SkazkiPro) — AI-powered personalized fairy tale platform for children. Freemium model: parents upload a child's photo + name, get a free 30-second demo (face-swap image + TTS narration), then can order the full 3-minute fairy tale.

The project is in Russian. All user-facing text, stories, and documentation are in Russian.

## Architecture

Two-part system: static frontend + Vercel serverless backend.

**Frontend** (root):
- `index.html` — Main landing page. Self-contained: all CSS and JS are inline. Freemium demo flow (photo upload → generation → result with paywall) + order form + FAQ.
- `skazki-pro.html` — Legacy alternative landing (waitlist-focused, not actively used)
- `files/skazki-pro-interactive.html` — Legacy interactive demo with voice recording
- `css/style.css` / `js/main.js` — Legacy files, still referenced by `privacy.html`

**Backend** (`api/`):
- `api/generate-demo.js` — Demo generation. Accepts JSON `{ name, gender, photo }`. Runs ElevenLabs TTS + Akool face-swap in parallel. Returns `{ audio, image, paragraphs, name }`. Rate limited: 3 per IP per 30 min.
- `api/generate-voice.js` — Voice cloning + TTS via ElevenLabs API (premium feature, separate from demo)
- `api/collect-email.js` — Email collection endpoint (used for "coming soon" voice feature notifications)
- `api/collect-phone.js` — Phone/contact collection (used for order form submissions)

## Development Commands

```bash
npm install
vercel dev

# Deploy
vercel
vercel env add ELEVENLABS_API_KEY
vercel env add ELEVENLABS_VOICE_ID
vercel env add AKOOL_API_KEY
vercel env add TEMPLATE_SCENE_URL
```

No build step for frontend — vanilla HTML/CSS/JS served as static files.

## Key Configuration Points

- **Demo story text**: Hardcoded in `api/generate-demo.js` function `generateStoryText()`. Generates "Хранитель Снов" demo with child's name and gender-correct pronouns.
- **Voice clone stories**: Hardcoded in `api/generate-voice.js` as `STORIES` object (keys: `dragon`, `moon`).
- **Face-swap template**: A pre-generated cartoon scene image hosted at `TEMPLATE_SCENE_URL`. Used as the base for face-swap; child's photo face is swapped onto the cartoon character.
- **Email integrations**: Uncomment desired option in `api/collect-email.js` (Google Sheets webhook, Telegram bot, or custom).

## Environment Variables

- `ELEVENLABS_API_KEY` — Required. ElevenLabs API key.
- `ELEVENLABS_VOICE_ID` — Required for demo. Pre-made narrator voice ID (not a clone).
- `AKOOL_API_KEY` — Optional. Akool face-swap API. Falls back to template image if not set.
- `AKOOL_CLIENT_ID` — Optional. Akool client ID for auth.
- `TEMPLATE_SCENE_URL` — URL of the cartoon template scene for face-swap.
- `GOOGLE_SHEETS_WEBHOOK` — Optional. Apps Script webhook URL.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — Optional. For signup notifications.

## Tech Stack

- Frontend: Vanilla HTML/CSS/JS (all inline in index.html), Google Fonts (Nunito)
- Backend: Node.js serverless on Vercel, `formidable` for multipart parsing (generate-voice only)
- External APIs: ElevenLabs v1 (TTS), Akool (face-swap)

## Design System

Font: Nunito (weights 400-900). CTA buttons use coral gradient (`linear-gradient(135deg, #FF6B6B, #FF8E53)`), never purple. Body background: `#FFF8F0` (cream). Footer: dark `#1A1040`. SVG waves between sections. Mobile breakpoint at 768px.

Color variables: `--bg-cream`, `--bg-lavender`, `--bg-mint`, `--bg-night`, `--coral`, `--orange`, `--purple`, `--purple-soft`, `--gold`. Card accents: `--card-sleep`, `--card-garden`, `--card-emotions`, `--card-friends`, `--card-fears`.

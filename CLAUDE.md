# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

СказкиПро (SkazkiPro) — AI-powered fairy tale generation platform for children. Users record their voice, select a story, and receive an AI-narrated fairy tale in a cloned version of their voice using ElevenLabs.

The project is in Russian. All user-facing text, stories, and documentation are in Russian.

## Architecture

Two-part system: static frontend + Vercel serverless backend.

**Frontend** (root + `files/`):
- `skazki-pro.html` — Landing page with email signup, scroll animations, waitlist counter
- `files/skazki-pro-interactive.html` — Interactive demo with voice recording (MediaRecorder API), story selection, and audio playback

**Backend** (`files/skazki-pro-backend.tar/skazki-pro-backend/`):
- `api/generate-voice.js` — Voice cloning + TTS via ElevenLabs API. Accepts multipart form (audio file + story ID), creates instant voice clone, generates speech, cleans up temporary voice, returns MP3
- `api/collect-email.js` — Email collection endpoint. Logs to Vercel console by default; has commented-out integrations for Google Sheets and Telegram

## Development Commands

```bash
# Backend local development (from skazki-pro-backend/)
npm install
vercel dev

# Deploy backend
vercel
vercel env add ELEVENLABS_API_KEY
```

No build step for frontend — vanilla HTML/CSS/JS served as static files.

## Key Configuration Points

- **Backend URL**: Set `window.SKAZKI_API_BASE` in `skazki-pro-interactive.html` (line ~662). When empty, the demo runs in offline mode with simulated 3-second delays.
- **Stories**: Hardcoded in `api/generate-voice.js` as the `STORIES` object (keys: `dragon`, `moon`). Add new stories there and update the frontend story selector.
- **Voice settings**: `api/generate-voice.js` — stability (0.6), similarity_boost (0.85), style (0.3), speaker_boost (true). Model: `eleven_multilingual_v2`.
- **Email integrations**: Uncomment desired option in `api/collect-email.js` (Google Sheets webhook, Telegram bot, or custom).

## Environment Variables (Backend)

- `ELEVENLABS_API_KEY` — Required. Needs Creator plan ($22/mo) for voice cloning access.
- `GOOGLE_SHEETS_WEBHOOK` — Optional. Apps Script webhook URL.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — Optional. For signup notifications.

## Tech Stack

- Frontend: Vanilla HTML/CSS/JS, Google Fonts (Nunito + Comfortaa)
- Backend: Node.js serverless on Vercel, `formidable` for multipart parsing
- External API: ElevenLabs v1 (voice cloning + TTS)

## Design System

Fonts: Comfortaa (headings), Nunito (body). Color palette uses CSS custom properties: lavender/purple primary gradient, cream backgrounds (#FFFBF0), with honey/mint/rose/sky accents. Mobile breakpoint at 768px.

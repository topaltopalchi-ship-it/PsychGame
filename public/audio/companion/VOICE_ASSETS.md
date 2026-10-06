# Companion voice assets

The game now supports real companion voice files with browser TTS as a fallback.

Place the final Persian voice recordings in this folder with these names:

- intro.mp3 — «خب... بریم ببینیم راه خروج کجاست.»
- room_key_found.mp3 — key found reaction
- exit_blocked.mp3 — exit blocked reaction
- confined_entry.mp3 — entering the confined-space challenge
- confined_tense.mp3 — tension escalation
- confined_escape.mp3 — alternative route / escape
- calm_hint.mp3 — calm clue guidance
- stress_hint.mp3 — pressure / hesitation guidance
- final_choice.mp3 — final-room synthesis

Recommended format:
- MP3, 44.1 kHz
- mono voice
- 96–128 kbps
- clean recording, no long silence at the beginning
- consistent speaker and microphone

The runtime loads files from `/audio/companion/`. If a file is missing or playback is blocked, Companion automatically falls back to browser speech synthesis.

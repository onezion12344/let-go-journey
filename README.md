# 🕊️ Let Go Journey — 30 Days to Overcome Love Addiction

An interactive CBT-based game that helps you heal from heartbreak in 30 days. Built on *Letting Go of Your Ex* by Cortney Soderlind Warren, PhD.

> **每天 10 分鐘，用科學方法走出愛上癮**
> *10 minutes a day. Evidence-based. Private.*

## ✨ Features

| | |
|---|---|
| 🎮 **30-day interactive game** | 10 stages × 3 days each — reading, reflection, action, mood tracking |
| 🌐 **Bilingual** | Full Chinese + English support, switch anytime |
| 🎵 **Ambient music** | 3 generated soundtracks (piano, pad, rain) via Web Audio API |
| 📊 **Mood chart** | Track your emotional journey with interactive line chart |
| 🏆 **Badge system** | 30 unique badges — one for each day completed |
| 📱 **Android widget** | Native homescreen widget showing daily task + progress |
| 🔒 **Private** | All progress stored locally on your own server |
| 🆓 **Free & open source** | MIT License |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/onezion12344/let-go-journey.git
cd let-go-journey

# Install dependencies
pip install -r requirements.txt

# Start server
bash start.sh

# Open in browser
open http://localhost:5099
```

### Android Widget

The widget APK is at `widget/exaholic-widget.apk`. Install it on your phone and add a 2×4 widget to your homescreen. It auto-refreshes every 30 minutes.

## 🎮 Game Structure

```
Tower of Awakening      (Days 1-3)  — Acknowledge the addiction
Withdrawal Trials       (Days 4-6)  — Break the exaholic cycle
Map Navigation          (Days 7-9)  — Identify triggers & boundaries
Mind Maze              (Days 10-12) — Cognitive restructuring
Mirror of Truth        (Days 13-15) — Honest self-reflection
Forest of Origins      (Days 16-18) — Understand attachment patterns
Spring of Forgiveness  (Days 19-21) — Let go of resentment
Star Compass           (Days 22-24) — Rediscover your values
Runway to Takeoff      (Days 25-27) — Build new habits
Crystal of Legacy      (Days 28-30) — Integrate & move forward
```

## 🧠 Based On

This game is an interactive adaptation of **CBT principles** from clinical research:
- **Langeslag & van Strien (2016)** — Regulating romantic love through reappraisal
- **Tennov (1979)** — Limerence theory
- **Skinner (1957)** — Intermittent reinforcement and addiction cycles
- **Rusbult (1998)** — Investment model of relationships

## 🏗️ Tech Stack

```
Backend:  Python + Flask
Frontend: Vanilla JS + CSS (zero dependencies)
Audio:    Web Audio API (generative, no files needed)
Widget:   Native Android (Kotlin)
Deploy:   Cloudflare Tunnel (optional for public access)
```

## 📸 Screenshots

| Splash | Map | Reading | Mood Chart |
|--------|-----|---------|------------|
| ![splash](assets/splash.png) | ![map](assets/map.png) | ![reading](assets/reading.png) | ![mood](assets/mood.png) |

## 🌐 Public Access

The game can be exposed via Cloudflare Tunnel for mobile access:
```bash
cloudflared tunnel --url http://localhost:5099
```

## 📄 License

MIT — use freely, contribute back.

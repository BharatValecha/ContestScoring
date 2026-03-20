# 🎯 AI-Powered Contest Scoring System

An interactive web-based contest scoring platform where admins manage events, judges score participants, and results are revealed through an engaging, animated presentation experience.

---

## 🚀 Features

### 👤 Authentication
- **Admin Login**
  - Single admin account to manage the platform
- **Judge Authentication**
  - Judges can **sign up** and **log in**
  - No manual credential creation by admin

---

### 🗂️ Event Management (Admin)
- Create events with:
  - Name
  - Description
  - Dates
- ✏️ Edit event details anytime
- Add judges from existing registered users
- Add participants **per event** (no global participant list)

---

### 👥 Participants (Per Event)
- Participants are **event-specific**
- Easily:
  - Add participants inside an event
  - Remove or update them

---

### ⚖️ Scoring System (Judges)
- Judges score participants using:
  - 🧮 **Numeric text input**
- Built-in validation:
  - Max score limits enforced
  - Simple and clean UI

---

## 🎬 Results Presentation (Core Highlight)

A fully animated, presentation-ready scoring reveal system.

### 🔄 Modes
- **Auto Mode**
  - Adjustable speed (Slow / Normal / Fast)
- **Manual Mode**
  - Step-by-step control (Next / Back)

---

### 🎭 Reveal Flow (Per Participant)
1. Participants are presented **from last to first**
2. For each participant:
   - Name appears
   - Judges’ scores reveal **one-by-one**
     - 💥 Pop/boom animation
     - 🥁 Drumroll sound effect
   - Final total:
     - ✨ Glowing animation
     - 🎺 Fanfare sound

---

### 🏆 Leaderboard Animation
- Final leaderboard is structured **1st → Last**
- Names are revealed **from last place to first**
- Animation flow:
  - Empty rank slots shown initially
  - Names fill in **bottom-up**
  - Each entry slides in with blur-to-sharp effect

🎉 Final moment:
- Winner (1st place) appears last
- Confetti + victory fanfare triggered

---

## 🔊 Sound Effects (Web Audio API)
- 🥁 Drumroll → during judge score reveal  
- 🎺 Fanfare → when total score appears  
- 🎉 Victory sound → final winner reveal  

(No external libraries used)

---

## 🧠 Tech Highlights
- Interactive frontend-focused system
- Web Audio API for real-time sound synthesis
- Smooth animation flows for presentation UX
- Event-based modular data structure

---

## 📍 Pages Overview

| Route | Description |
|------|------------|
| `/login` | Login for admin & judges |
| `/signup` | Judge registration |
| `/events` | Admin event management |
| `/event/:id` | Event details, participants, judges |
| `/judge` | Judge scoring interface |
| `/presentation` | Animated results reveal |

---

## 🎯 Use Cases
- Hackathons  
- Talent shows  
- College competitions  
- Startup pitch events  
- Any judged contest  

---

## 💡 Future Improvements
- Live scoring (real-time updates)
- Audience voting integration
- Export results (PDF/CSV)
- Multi-admin support
- Cloud/database integration

---

## ⚡ Setup

```bash
# Clone the repo
git clone https://github.com/BharatValecha/ContestScoring/

# Install dependencies
npm install

# Run the app
npm run dev

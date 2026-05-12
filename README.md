# 🔴 WashU Pointswap
**The unofficial, high-aesthetic marketplace for Washington University in St. Louis meal point swaps.**

WashU Pointswap solves the "end-of-semester balance" problem by providing a secure, real-time platform for students to buy and sell meal points. Built by a Washington University BuCS student and CSE 2407 TA, this project focuses on clean architecture and a premium user experience.

## ✨ Features
*   **Magic Link Authentication:** Secure, passwordless login using Supabase Auth and `@wustl.edu` email verification.
*   **Live Marketplace:** Real-time feed of active meal point offers with instant contact options.
*   **Dynamic Profiles:** User profile management to store contact info (GroupMe/Email) for seamless transactions.
*   **Pinterest-Inspired UI:** A premium interface utilizing Glassmorphism and a sophisticated Geist Sans & Lora Serif font pairing.
*   **Optimizer Logic:** Internal spending goal calculations based on remaining point balances and academic calendar end dates.

## 📸 Visuals
![Marketplace Desktop View](<img width="1617" height="958" alt="Screenshot 2026-05-11 at 11 27 14 PM" src="https://github.com/user-attachments/assets/6dbddb4e-949f-4016-a6b4-4c177cc82fdb" />)
![How it Works](<img width="489" height="778" alt="Screenshot 2026-05-11 at 11 27 59 PM" src="https://github.com/user-attachments/assets/745d5e3c-3a44-4165-a843-5f6d6d6709fb" />)
![Only Wustl Emails](<img width="428" height="222" alt="Screenshot 2026-05-11 at 11 26 33 PM" src="https://github.com/user-attachments/assets/bd0a03e6-d530-4f52-9ab6-453afadb49a8" />
)

## 🛠️ Tech Stack
### **Frontend**
*   **Framework:** Next.js (App Router)
*   **Styling:** Tailwind CSS
*   **Typography:** Geist Sans & Lora Serif
*   **Deployment:** Vercel

### **Backend**
*   **Framework:** FastAPI (Python)
*   **Database:** Supabase (PostgreSQL)
*   **Deployment:** Railway

## 🏗️ Architecture & Design Decisions
This project prioritizes a decoupled architecture to balance performance with a high-end aesthetic.

*   **Relational Joins:** The marketplace feed utilizes PostgreSQL joins via Supabase to link `offers` with `profiles`, reducing API latency and ensuring data integrity.
*   **Type Safety:** The FastAPI backend enforces strict type checking (e.g., UUID validation) to ensure secure and valid data transactions.
*   **Responsive Grid:** A custom 12-column grid that seamlessly adapts from a high-density desktop view to a focused mobile experience.

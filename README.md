# WashU Pointswap
**The unofficial, high-aesthetic marketplace for Washington University in St. Louis meal point swaps.**

WashU Pointswap solves the "end-of-semester balance" problem by providing a secure, real-time platform for students to buy and sell meal points. This project focuses on clean architecture and a premium user experience.

## Features
* **Google OAuth Integration:** Secure, one-tap login restricted to `@wustl.edu` email addresses via Supabase Auth.
* **Live Marketplace:** A real-time feed of active meal point offers with instant contact options and a sleek card-flip interface.
* **Burn Rate Calculator:** Integrated optimizer logic that calculates daily spending goals based on remaining balances and the academic calendar.
* **Pinterest-Inspired UI:** A premium interface utilizing Glassmorphism and a sophisticated Geist Sans & Lora Serif font pairing.
* **Dynamic Profiles:** User-managed contact info (GroupMe/Email) linked directly to marketplace listings.

## 📸 Visuals
| Marketplace View | How it Works | Auth Constraints |
| :---: | :---: | :---: |
| <img src="https://github.com/user-attachments/assets/6dbddb4e-949f-4016-a6b4-4c177cc82fdb" width="100%"> | <img src="https://github.com/user-attachments/assets/745d5e3c-3a44-4165-a843-5f6d6d6709fb" width="100%"> | <img src="https://github.com/user-attachments/assets/bd0a03e6-d530-4f52-9ab6-453afadb49a8" width="100%"> |

## 🛠️ Tech Stack
### **Frontend**
* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Typography:** Geist Sans & Lora Serif
* **Deployment:** [Vercel](https://vercel.com/)

### **Backend**
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
* **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
* **Deployment:** [Railway](https://railway.app/)

## Architecture & Design Decisions
This project prioritizes a decoupled architecture to balance performance with a high-end aesthetic.

* **Relational Joins:** The marketplace feed utilizes PostgreSQL joins via Supabase to link `offers` with `profiles`, reducing API latency and ensuring data integrity.
* **Type Safety:** The FastAPI backend enforces strict type checking (e.g., UUID validation) to ensure secure and valid data transactions.
* **Responsive Grid:** A custom 12-column grid that seamlessly adapts from a high-density desktop view to a focused mobile experience.

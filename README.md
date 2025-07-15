# AI Resume Analyzer 🧠📄

An AI-powered tool that analyzes your resume against a job description and gives you:

- ✅ A match score
- 🛠 Suggestions to improve your resume
- 🔍 Missing keywords you should include

Built with **Next.js**, **Zustand**, **Tailwind CSS**, and **PDF.js**.

---

## ✨ Features

- Upload your resume (PDF)
- Paste a job description
- Get instant AI-powered analysis (mocked in demo mode)
- Fully responsive, clean UI

---

## 📸 Demo

![screenshot](public/demo.png) <!-- Replace with your own screenshot or Loom video -->

🔗 Live demo: [resume-analyzer.vercel.app](https://resume-analyzer.vercel.app)

---

## 🛠 Tech Stack

- [Next.js 15 (App Router)](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [OpenAI API](https://platform.openai.com) *(optional / mocked)*
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

## 💡 How It Works

1. User uploads a resume (PDF is parsed in browser)
2. User pastes a job listing
3. App sends both to an API route
4. (In real mode) OpenAI GPT analyzes and returns a score + feedback
5. (In demo mode) Returns a fake but realistic response

---

## 🚀 Deployment

This app is live and deployed on [Vercel](https://vercel.com):

> 🔗 [resume-analyzer.vercel.app](https://resume-analyzer.vercel.app)

---

## 🔒 Note on AI Integration

This version runs in **mock mode** to avoid API usage costs.  
To use real GPT-4 or GPT-3.5:

1. Add your OpenAI key to `.env.local`
2. Uncomment the OpenAI call in `app/api/analyze/route.ts`

---

## 📬 Contact

Made with ❤️ by [Dylan Caballero](https://www.linkedin.com/in/dcaba024/)


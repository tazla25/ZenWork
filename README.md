# ZenWork 🧘

AI-powered focus and self-tracking companion for developers. Built with **Next.js 14, Tailwind CSS, Supabase Cloud, and Manifest V3 Chrome Extension**.

> 💡 **The ZenWork Philosophy:** *"Focus and Trust."*
> ZenWork is built on autonomy. Instead of spying on developers with screenshots or keyloggers, it allows them to track their own focus levels locally. Managers only receive aggregated, anonymous team health trends and burnout warnings.

---

## 📁 Project Structure

```text
zenwork-app/
├── chrome-extension/   # Manifest V3 Chrome Extension (Kiwi Browser compatible)
│   ├── manifest.json   # Extension configuration
│   ├── src/
│   │   ├── background.js # Passive tab tracking, idle detection, Pomodoro state, sync queue
│   │   ├── content.js    # Distraction blocker overlay & automatic token syncing script
│   │   ├── popup.html    # Popup UI (score progress, preset buttons, top domains)
│   │   ├── popup.js      # Controller logic for popup
│   │   └── popup.css     # Sleek dark theme popup styling
│   └── icons/            # ZenWork branding logos (16, 32, 48, 128)
├── web-dashboard/      # Next.js 14 Application (Tailwind + Recharts)
│   ├── app/
│   │   ├── api/
│   │   │   ├── sync/        # POST /api/sync endpoint for extension data uploads
│   │   │   └── team-health/ # POST /api/team-health endpoint for manager metrics
│   │   ├── dashboard/       # Employee panel showing score, pomodoros, simulator
│   │   │   └── settings/    # Domain categorization, GDPR data export & delete controls
│   │   ├── team/            # Manager panel (burnout alerts, team aggregates, invites)
│   │   ├── login/           # Auth login page (email/password, Google OAuth)
│   │   ├── layout.tsx
│   │   └── page.tsx         # Modern SaaS landing page
│   ├── components/          # Recharts components (ProductivityChart, TeamHealthChart)
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client adapter & server-side initialization
│   │   ├── razorpay.ts      # Subscription creations & webhook verification helpers
│   │   └── utils.ts         # Formatting utilities
│   ├── package.json
│   └── tailwind.config.js
└── supabase/
    └── schema.sql       # Postgres tables, RLS policies, trigger handlers, RPC analytics
```

---

## 🚀 Cloud Setup Guide (Zero Local Setup)

### 1. Database Setup (Supabase)
1. Register/Log in to [Supabase](https://supabase.com/).
2. Create a new project.
3. Open the **SQL Editor** tab.
4. Copy and paste the contents of [supabase/schema.sql](./supabase/schema.sql) and click **Run**.
5. Keep your Supabase URL, Anon Key, and Service Role Key handy.

### 2. Frontend & Backend Deployment (Vercel)
1. Push this `zenwork-app` repository to your GitHub.
2. Sign in to [Vercel](https://vercel.com/) with GitHub.
3. Click **Add New** -> **Project** and import your repository.
4. In Project Settings:
   - **Root Directory**: Set this to **`web-dashboard`** (since the Next.js app is inside this subfolder).
   - **Environment Variables**: Add these variables:
     - `NEXT_PUBLIC_SUPABASE_URL` = (your Supabase URL)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your Supabase Anon Key)
     - `SUPABASE_URL` = (your Supabase URL)
     - `SUPABASE_SERVICE_ROLE_KEY` = (your Supabase Service Role Key)
     - `RAZORPAY_KEY_ID` = (your Razorpay key if utilizing payments, or mock text)
     - `RAZORPAY_KEY_SECRET` = (your Razorpay secret)
5. Click **Deploy**. Vercel will build and launch your site.

### 3. Load the Chrome Extension (Mobile/PC)
1. **On Mobile (Kiwi Browser)**:
   - Install Kiwi Browser from Play Store.
   - Go to `kiwi://extensions` and enable **Developer Mode**.
   - Click **+ (Load)** and select the `chrome-extension/` directory from your storage.
2. **On PC (Chrome)**:
   - Go to `chrome://extensions` and enable **Developer Mode**.
   - Click **Load unpacked** and select the `chrome-extension/` directory.
3. Open the extension popup, go to settings, and set the server URL to your live Vercel domain (e.g., `https://your-project.vercel.app`).
4. Logging into your Vercel website will automatically sync your session token to the extension!


# Deployment Guide for EquipTrack

This guide will help you deploy the EquipTrack contractor equipment management application to Vercel with Supabase backend.

## Prerequisites

- Node.js 18+ installed
- Git installed
- Accounts on:
  - [Vercel](https://vercel.com)
  - [Supabase](https://supabase.com)
  - [Resend](https://resend.com) (for email functionality)

## Step 1: Set Up Supabase

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a project name, database password, and region
3. Wait for the project to be created (2-3 minutes)

### Get Your Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project ID** (the part before `.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

### Deploy Edge Functions

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project (replace `your-project-ref` with your project ID):
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the server function:
   ```bash
   supabase functions deploy server
   ```

### Configure Supabase Secrets

1. Go to your Supabase dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add the following secrets:
   - `RESEND_API_KEY`: Your Resend API key (get from [resend.com](https://resend.com))

## Step 2: Prepare Your Code

### Create Environment Variables File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PROJECT_ID=your-project-id
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Test Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` and test the application

## Step 3: Deploy to Vercel

### Option A: Deploy via Git (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/equiptrack.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **"Import Git Repository"**
   - Select your repository
   - Click **"Import"**

3. **Configure Build Settings:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables:**
   Click **"Environment Variables"** and add:
   ```
   VITE_SUPABASE_URL = https://your-project-id.supabase.co
   VITE_SUPABASE_PROJECT_ID = your-project-id
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```

5. **Deploy:**
   - Click **"Deploy"**
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Add Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_PROJECT_ID
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

## Step 4: Post-Deployment Configuration

### Update Email Recipient

Currently, the email recipient is hardcoded in the server functions. To change it:

1. Edit `/supabase/functions/server/index.tsx`
2. Find the email sections and update the recipient email
3. Redeploy: `supabase functions deploy server`

### Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain and follow DNS instructions

## Troubleshooting

### Build Fails on Vercel

- Make sure all environment variables are set correctly
- Check the build logs for specific error messages
- Ensure `package.json` has all required dependencies

### Edge Functions Not Working

- Verify you deployed the functions: `supabase functions list`
- Check function logs: `supabase functions logs server`
- Ensure RESEND_API_KEY is set in Supabase secrets

### Forms Not Submitting

- Check browser console for errors
- Verify CORS is enabled in Edge Functions (already configured)
- Ensure Supabase URL and keys are correct

### Email Not Sending

- Verify your Resend API key is valid
- Check Resend dashboard for delivery logs
- Ensure the sender email is verified in Resend

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID | `abcd1234` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGc...` |

## Supabase Secrets (Set in Supabase Dashboard)

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Your Resend API key for sending emails |
| `SUPABASE_URL` | Auto-set by Supabase |
| `SUPABASE_ANON_KEY` | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set by Supabase |
| `SUPABASE_DB_URL` | Auto-set by Supabase |

## Support

For issues with:
- **Vercel deployment**: [Vercel Support](https://vercel.com/support)
- **Supabase**: [Supabase Support](https://supabase.com/support)
- **Resend**: [Resend Support](https://resend.com/support)

## Quick Deploy Checklist

- [ ] Supabase project created
- [ ] Supabase credentials copied
- [ ] Edge functions deployed (`supabase functions deploy server`)
- [ ] RESEND_API_KEY added to Supabase secrets
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables added to Vercel
- [ ] Application deployed and tested
- [ ] Email functionality verified

## Next Steps

After successful deployment:

1. **Test all forms** to ensure they submit correctly
2. **Verify email delivery** by submitting a test form
3. **Add projects** in the Projects management tab
4. **Add equipment types** in the Equipment management tab
5. **Share the URL** with your team!

Your EquipTrack application is now live! 🎉

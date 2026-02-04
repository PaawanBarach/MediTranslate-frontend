# Complete Setup Guide

## Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **Git**
- Free accounts on:
  - [Groq](https://console.groq.com) (AI API)
  - [Supabase](https://supabase.com) (Database + Storage)

---

## Step 1: Get API Keys (5 minutes)

### Groq API Key
1. Go to https://console.groq.com
2. Sign up with Google/GitHub
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_`)

### Supabase Setup
1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Choose a name, password, region
4. Wait 2 minutes for provisioning
5. Go to **Settings** → **API**
6. Copy:
   - Project URL (`https://xxx.supabase.co`)
   - `anon` `public` key

---

## Step 2: Setup Database (3 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste and run:

```sql
-- Create tables
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  doctor_lang TEXT DEFAULT 'English',
  patient_lang TEXT DEFAULT 'Spanish',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('doctor', 'patient')),
  original_text TEXT NOT NULL,
  original_lang TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  translated_lang TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (required by Supabase)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for development)
CREATE POLICY "Allow all on conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-recordings', 'audio-recordings', true);

-- Allow public access to audio files
CREATE POLICY "Public audio access" ON storage.objects FOR ALL USING (bucket_id = 'audio-recordings');
Click Run (should show "Success. No rows returned")

Step 3: Backend Setup (5 minutes)
bash
# Clone backend repo
git clone https://github.com/yourusername/meditranslate-backend.git
cd meditranslate-backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
GROQ_API_KEY=gsk_your_groq_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
EOF

# Edit .env with your actual keys
nano .env  # or use any text editor

# Run server
uvicorn main:app --reload
Test it works:
Open http://localhost:8000/docs - you should see the API documentation.

Step 4: Frontend Setup (5 minutes)
bash
# Clone frontend repo (in a new terminal)
git clone https://github.com/yourusername/meditranslate-frontend.git
cd meditranslate-frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF

# Edit .env with your actual values
nano .env

# Run dev server
npm run dev
Test it works:
Open http://localhost:5173 - you should see the app.

Step 5: Test the App (2 minutes)
Click "Start New Conversation"

Enter patient name: "Test Patient"

Select languages (keep English → Spanish)

Click Create

Try sending a text message: "Hello, how are you feeling today?"

Click the 🎤 microphone icon and say something

Check that translation appears

Troubleshooting
"Microphone not working"
Local dev: Must use localhost (not 127.0.0.1 or IP address)

Production: Must be on HTTPS

Browser: Check permissions in chrome://settings/content/microphone

"Backend timeout"
Groq Whisper can take 30-40 seconds for audio

Check your GROQ_API_KEY is valid at https://console.groq.com

"CORS error"
Ensure backend is running on port 8000

Check VITE_API_URL in frontend .env matches backend URL

"Database connection failed"
Verify SUPABASE_URL and SUPABASE_KEY are correct

Check Supabase project is active (not paused)

"Audio upload failed"
Ensure storage bucket audio-recordings exists in Supabase

Check RLS policy allows public access


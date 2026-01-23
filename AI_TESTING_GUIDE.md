# Complete AI Features Testing Guide

## Overview
Your application has a **fully voice-enabled AI Chat Assistant** powered by Groq. This guide walks you through testing all its functionality.

---

## 🎯 Pre-Testing Checklist

### 1. **Get Your Groq API Key** (5 minutes)
```bash
# Go to: https://console.groq.com/
# Sign up (free)
# Create an API key
# Copy the key
```

### 2. **Set the API Key in Supabase**
```bash
# Use Supabase CLI:
supabase secrets set GROQ_API_KEY=your_key_here

# Verify it's set:
supabase secrets list

# You should see GROQ_API_KEY listed
```

### 3. **Run Database Migration**
```bash
# Apply the chat system schema
supabase db push

# This creates tables for:
# - chat_messages (stores all messages)
# - chat_history (stores analytics)
```

### 4. **Start the Dev Server**
```bash
npm run dev

# App will start at: http://localhost:5173/
```

### 5. **Login to the App**
- Use your test account credentials
- You should see the floating chat button in the bottom-right corner

---

## ✅ Testing Phases

### Phase 1: Basic UI & Text Features (10 minutes)

#### 1.1 Chat Button Visibility
- [ ] Floating chat button appears in bottom-right corner
- [ ] Button stays visible when scrolling
- [ ] Button appears on **all pages** (dashboard, CRM, documents, admin, etc.)

#### 1.2 Open/Close Chat
- [ ] Click the chat button → Chat window opens
- [ ] Window is fullscreen or modal-sized
- [ ] Chat history is visible from previous sessions
- [ ] Close button (X) works to close window
- [ ] Can open/close multiple times without issues

#### 1.3 Text Input & Messages
- [ ] Type a simple message: `"Hello"`
- [ ] Press Enter → Message appears in chat
- [ ] Message shows your name on left side
- [ ] Loading indicator appears while processing
- [ ] AI response appears after ~1-2 seconds
- [ ] Response shows on right side with "Assistant" label
- [ ] Can type multiple messages in sequence

#### 1.4 Message History
- [ ] Close chat window and reopen
- [ ] Previous messages are still there
- [ ] Timestamps are shown on messages
- [ ] Messages load correctly after page refresh
- [ ] History persists across browser sessions

---

### Phase 2: Navigation Testing (15 minutes)

**Test the AI's ability to understand navigation requests:**

#### 2.1 Dashboard Navigation
```
Type: "Show me the dashboard"
Expected: 
  ✓ Message appears
  ✓ Loading spinner shows
  ✓ AI responds with confirmation
  ✓ Page navigates to /dashboard
  ✓ Dashboard loads with your data
```

#### 2.2 CRM Navigation
```
Type: "Take me to requirements"
Expected:
  ✓ Navigates to /crm?view=requirements
  ✓ Requirements page loads
  ✓ AI responds: "I've taken you to Requirements"

Type: "Show me consultants"
Expected:
  ✓ Navigates to /crm?view=consultants
  ✓ Consultants list appears

Type: "Go to interviews"
Expected:
  ✓ Navigates to /crm?view=interviews
  ✓ Interviews list appears
```

#### 2.3 Documents Navigation
```
Type: "Take me to documents"
Expected:
  ✓ Navigates to /documents
  ✓ Document list/upload area shows
```

#### 2.4 Admin Navigation (if admin user)
```
Type: "Take me to admin"
Expected:
  ✓ Navigates to /admin
  ✓ Admin panel loads

Type: "Go to admin" (if NOT admin)
Expected:
  ✓ AI responds with permission error
  ✓ Does NOT navigate to /admin
```

---

### Phase 3: Search & Filter Testing (10 minutes)

#### 3.1 Skill-Based Search
```
Type: "Find consultants with React skills"
Expected:
  ✓ Navigates to /crm?view=consultants
  ✓ Results filtered to show React developers
  ✓ AI responds: "I've found React developers for you"
```

#### 3.2 Status Filtering
```
Type: "Show me pending interviews"
Expected:
  ✓ Navigates to /crm?view=interviews
  ✓ Filtered to only Pending status
  ✓ AI confirms: "Here are your pending interviews"

Type: "List active requirements"
Expected:
  ✓ Navigates to /crm?view=requirements
  ✓ Shows only Active requirements
```

#### 3.3 Data Analysis
```
Type: "How many consultants do we have?"
Expected:
  ✓ AI navigates to consultants
  ✓ AI counts and responds with number
  ✓ Shows list of consultants

Type: "What's the interview status?"
Expected:
  ✓ AI analyzes interview data
  ✓ Provides breakdown (pending, scheduled, completed, etc.)
```

---

### Phase 4: Voice Input Testing (15 minutes)

#### 4.1 Microphone Setup
- [ ] Check system microphone works (test in other app first)
- [ ] Browser asks for microphone permission on first use
- [ ] Grant permission when prompted
- [ ] Microphone icon appears in chat interface

#### 4.2 Basic Voice Input
```
Steps:
1. Click the microphone icon (usually next to text input)
2. Wait for visual indicator (usually red recording dot)
3. Speak clearly: "Show me the dashboard"
4. Pause for 2 seconds
5. Wait for transcription to appear
6. AI processes and responds

Expected:
  ✓ Real-time transcription appears as you speak
  ✓ Text matches what you said
  ✓ AI processes the transcribed text
  ✓ AI responds with action
```

#### 4.3 Navigation via Voice
```
Test each by speaking into microphone:

"Take me to requirements"
✓ Transcription appears
✓ Page navigates to /crm?view=requirements

"Show consultants"
✓ Transcription shows
✓ Navigate to consultants list

"Go to dashboard"
✓ Speaks clearly
✓ Navigates home
```

#### 4.4 Search via Voice
```
"Find React developers"
✓ Transcription appears
✓ Navigates to consultants with React filter

"Show pending interviews"
✓ Transcription shows
✓ Filters interviews to Pending
```

#### 4.5 Voice Error Handling
```
Test no microphone:
1. Disable microphone in browser settings
2. Click voice button
Expected:
  ✓ Error message: "Microphone not available"
  ✓ Chat still works with text input

Test poor audio:
1. Speak very quietly or with background noise
2. Try again clearly
Expected:
  ✓ Eventually captures correct transcription
  ✓ AI still processes partial matches

Test long pause:
1. Click mic, speak one word, pause 3 seconds
Expected:
  ✓ Recording stops automatically
  ✓ Transcription appears
  ✓ AI responds to partial input
```

---

### Phase 5: Voice Output Testing (10 minutes)

#### 5.1 Auto-Play Responses
```
Steps:
1. In chat settings (if available), enable "Speak responses"
2. Send a message: "Hello"
3. Listen for AI response to be spoken aloud

Expected:
  ✓ After AI responds with text
  ✓ Browser automatically speaks the response
  ✓ Audio plays through system speakers
  ✓ Volume level is reasonable (not too quiet or loud)
```

#### 5.2 Speaker Controls
```
Steps:
1. Look for speaker icon in chat interface
2. Send a message that gets a long response
3. Click speaker icon while response plays

Expected (depending on implementation):
  ✓ Play/Pause button works
  ✓ Can stop response mid-way
  ✓ Can resume from pause
  ✓ Can cancel and speak next response
```

#### 5.3 Voice Settings Adjustment (if available)
```
Look for voice settings and test:
  ✓ Speed adjustment (normal, slow, fast)
  ✓ Pitch adjustment
  ✓ Volume adjustment
  ✓ Voice selection (different voices)
```

#### 5.4 Voice Output Error Handling
```
Test no speakers:
1. Mute system volume
2. Send a message
Expected:
  ✓ Text response still appears
  ✓ No audio but no error

Test unsupported browser:
1. Try in Firefox (limited voice support)
Expected:
  ✓ Text input/output works
  ✓ Voice features degrade gracefully
```

---

### Phase 6: Advanced Conversational Features (10 minutes)

#### 6.1 Context Awareness
```
Type: "Show me active requirements"
AI: [Navigates to /crm?view=requirements&status=Active]

Type: "How many are there?"
Expected:
  ✓ AI remembers conversation context
  ✓ Counts the requirements on screen
  ✓ Responds with number based on current context
```

#### 6.2 Multi-Turn Conversation
```
Turn 1: "What page am I on?"
Expected: AI identifies current page

Turn 2: "Show me requirements"
Expected: AI navigates to requirements

Turn 3: "Create a new one"
Expected: AI suggests or opens creation form
```

#### 6.3 Clarifying Questions
```
Type: "Show me consultants"
Possible AI Response: "Would you like all consultants or filter by specific skills?"

Type: "Just all of them"
Expected:
  ✓ AI understands "all"
  ✓ Shows full consultant list
```

#### 6.4 Suggestions
```
After navigating to a page, AI might suggest:
- "Would you like to create a new requirement?"
- "Try filtering by status"
- "I can help you search for specific skills"

Expected:
  ✓ Suggestions are relevant to current page
  ✓ Can click/type to act on suggestions
  ✓ Suggestions don't interfere with main chat
```

---

### Phase 7: Error Handling & Edge Cases (10 minutes)

#### 7.1 Unclear Commands
```
Type: "xyz abc 123"
Expected:
  ✓ AI doesn't crash
  ✓ Friendly error: "I'm not sure I understand..."
  ✓ AI suggests: "Did you mean..."
  ✓ Can continue chatting
```

#### 7.2 Nonsensical Input
```
Type: "Create a purple elephant"
Expected:
  ✓ AI understands it's not a valid command
  ✓ Responds appropriately (not with error, but clarity)
  ✓ Suggests valid options
```

#### 7.3 Permission Errors (Non-Admin User)
```
Type: "Show me admin settings"
Expected:
  ✓ AI responds: "That requires admin permissions"
  ✓ Does NOT navigate to /admin
  ✓ No error in console
```

#### 7.4 Network Errors
```
Steps:
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" option
4. Send a chat message
Expected:
  ✓ Clear error message: "Unable to connect..."
  ✓ Option to retry
  ✓ Go back online and retry works
```

#### 7.5 Rapid Messages
```
Type multiple messages quickly without waiting:
"Show dashboard"
"Show consultants"
"Show interviews"

Expected:
  ✓ All messages are processed
  ✓ Responses come in order
  ✓ No messages are lost
```

---

### Phase 8: Browser Compatibility Testing (5 minutes)

Test in multiple browsers:

| Browser | Text | Voice Input | Voice Output | Notes |
|---------|------|-------------|--------------|-------|
| Chrome  | ✓    | ✓           | ✓            | Full support |
| Edge    | ✓    | ✓           | ✓            | Full support |
| Safari  | ✓    | ✓           | ✓            | Full support |
| Firefox | ✓    | Limited     | Limited      | Basic support |

---

## 📊 Testing Results Template

Use this to track your testing:

```
Date: ___________
Tester: _________
Browser: ________
OS: ____________

Phase 1: Basic UI & Text
  [ ] Chat button visible: ✓ / ✗ / Notes: ___________
  [ ] Open/close works: ✓ / ✗ / Notes: ___________
  [ ] Text input works: ✓ / ✗ / Notes: ___________
  [ ] Message history persists: ✓ / ✗ / Notes: ___________

Phase 2: Navigation
  [ ] Dashboard navigation: ✓ / ✗ / Notes: ___________
  [ ] CRM navigation: ✓ / ✗ / Notes: ___________
  [ ] Documents navigation: ✓ / ✗ / Notes: ___________
  [ ] Admin navigation (if applicable): ✓ / ✗ / Notes: ___________

Phase 3: Search & Filters
  [ ] Skill-based search: ✓ / ✗ / Notes: ___________
  [ ] Status filtering: ✓ / ✗ / Notes: ___________
  [ ] Data analysis: ✓ / ✗ / Notes: ___________

Phase 4: Voice Input
  [ ] Microphone detection: ✓ / ✗ / Notes: ___________
  [ ] Basic transcription: ✓ / ✗ / Notes: ___________
  [ ] Navigation via voice: ✓ / ✗ / Notes: ___________
  [ ] Search via voice: ✓ / ✗ / Notes: ___________
  [ ] Error handling: ✓ / ✗ / Notes: ___________

Phase 5: Voice Output
  [ ] Auto-play responses: ✓ / ✗ / Notes: ___________
  [ ] Speaker controls: ✓ / ✗ / Notes: ___________
  [ ] Voice settings: ✓ / ✗ / Notes: ___________

Phase 6: Advanced Features
  [ ] Context awareness: ✓ / ✗ / Notes: ___________
  [ ] Multi-turn conversation: ✓ / ✗ / Notes: ___________
  [ ] Clarifying questions: ✓ / ✗ / Notes: ___________
  [ ] Suggestions: ✓ / ✗ / Notes: ___________

Phase 7: Error Handling
  [ ] Unclear commands: ✓ / ✗ / Notes: ___________
  [ ] Nonsensical input: ✓ / ✗ / Notes: ___________
  [ ] Permission errors: ✓ / ✗ / Notes: ___________
  [ ] Network errors: ✓ / ✗ / Notes: ___________
  [ ] Rapid messages: ✓ / ✗ / Notes: ___________

Overall Status: ✓ PASS / ✗ NEEDS WORK
```

---

## 🔍 Debugging Commands

If something doesn't work, try these in browser console (F12):

```javascript
// Check if chat context is available
window.__chatContext

// Check recent messages
console.log(JSON.parse(localStorage.getItem('chatMessages')))

// Check last error
console.log(localStorage.getItem('lastChatError'))

// Check voice support
console.log('Speech Recognition:', window.webkitSpeechRecognition || window.SpeechRecognition)
console.log('Speech Synthesis:', window.speechSynthesis)
```

---

## 🚨 Common Issues & Fixes

### Issue: Chat button doesn't appear
```
✓ Check: Is app running? (npm run dev)
✓ Check: Are you logged in?
✓ Check: Is FloatingChat component in App.tsx?
✓ Check: No console errors? (F12 → Console)
```

### Issue: Voice input not working
```
✓ Check: Microphone permission granted?
✓ Check: Browser supports Web Speech API? (Chrome, Edge, Safari yes)
✓ Check: Microphone is on and not muted?
✓ Check: Check browser console for errors
```

### Issue: AI responses are slow
```
✓ Check: Network connection is good?
✓ Check: Is GROQ_API_KEY set in Supabase?
✓ Check: Supabase Edge Function deployed?
✓ Response time is typically 1-2 seconds - normal
```

### Issue: Navigation actions don't work
```
✓ Check: User has permission for page?
✓ Check: Page path is correct?
✓ Check: React Router is configured?
✓ Check console for navigation errors
```

### Issue: Message history not saving
```
✓ Check: Database migrations ran? (supabase db push)
✓ Check: User is authenticated?
✓ Check: LocalStorage not full?
✓ Check: Supabase connection working?
```

---

## ✨ Success Criteria

Your AI features are working great when:

- ✅ Chat button appears and is functional
- ✅ Text messages send and receive AI responses
- ✅ Message history persists across sessions
- ✅ Navigation commands work (dashboard, CRM, documents, etc.)
- ✅ Search commands filter results correctly
- ✅ Voice input transcribes speech accurately
- ✅ Voice output speaks responses aloud
- ✅ Multi-turn conversations work (AI remembers context)
- ✅ Permission errors handled gracefully
- ✅ Network errors show helpful messages
- ✅ Works across Chrome, Edge, Safari
- ✅ Performance is responsive (<2 sec per response)

---

## 📞 Support & Resources

- **Groq API Docs**: https://console.groq.com/docs
- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **Supabase Docs**: https://supabase.com/docs
- **Check logs**: Look at browser console (F12) and Supabase logs

---

## 🎉 Next Steps After Testing

Once all tests pass:

1. **Deploy to production** (run `npm run build`)
2. **Monitor usage** in Supabase (chat_history table)
3. **Gather user feedback**
4. **Iterate on features** (customize system prompt, add new commands)
5. **Scale up** with production Groq API plan


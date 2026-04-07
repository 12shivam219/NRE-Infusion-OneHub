# Testing JSZip File Size Optimization

## Quick Test Steps

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open the app** in your browser (typically http://localhost:5173)

3. **Open DevTools Console** (F12 → Console tab)

4. **Upload or open a document** (preferably a .docx file)

5. **Edit the document** (make any small changes)

6. **Click "Save All Documents"** button

7. **Check console for logs** - Look for:
   - `Saving [filename]...` - Before optimization
   - `✓ Optimized: Xmb → Ymb (Z% reduction)` - Optimization successful
   - `✓ Saved [filename]` - Save complete

## What to Expect

### Success Case:
```
Saving test.docx (3000000 bytes)...
✓ Optimized: 3.00MB → 0.45MB (85.0% reduction)
✓ Saved test.docx
```

### If No Document Needed Optimization:
```
Saving test.docx (450000 bytes)...
✓ Saved test.docx
(No optimization log = already optimized)
```

### If JSZip Fails (Falls back to original):
```
Saving test.docx (3000000 bytes)...
⚠️ DOCX optimization failed, using original: [error message]
✓ Saved test.docx
```

## Verification Steps

1. Open browser DevTools → Network tab (F12)
2. Filter for POST requests to `/rest/v1/documents`
3. Check the file being uploaded - it should be smaller than before
4. Compare file sizes in console output

## Expected Results

✅ File saved successfully with optimized size shown in logs
✅ Size reduction percentage displayed (typically 50-90% for bloated exports)
✅ No errors or warnings in console
✅ File stored in Supabase at optimized size

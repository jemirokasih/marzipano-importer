# Quick Start Guide

Get started with the Marzipano Tour Importer in just a few minutes.

## 1. Prerequisites

Make sure you have:
- ✅ A modern web browser (Chrome, Firefox, Safari, or Edge)
- ✅ An exported Marzipano tour (ZIP file)
- ✅ The Marzipano Tool installed (in the adjacent directory)

## 2. Directory Setup

Ensure your directory structure looks like this:

```
your-workspace/
├── marzipano-importer/    ← You are here
│   ├── index.html
│   ├── scripts/
│   ├── styles/
│   └── README.md
└── marzipano-tool/         ← Tool should be here
    └── index.html
```

## 3. Opening the Importer

**Option A: Direct File Access**
```bash
# Navigate to the importer directory
cd /path/to/marzipano-importer

# Open in browser (macOS)
open index.html

# Open in browser (Linux)
xdg-open index.html

# Open in browser (Windows)
start index.html
```

**Option B: Local Server (Recommended)**
```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server -p 8000
```

Then open: `http://localhost:8000`

## 4. Import Your First Tour

### Step-by-Step:

1. **Open the Importer**
   - You should see the upload screen with a blue dashed border

2. **Select Your Tour**
   - Click "Browse Files" button
   - Navigate to your exported tour ZIP file
   - Click "Open"
   
   *OR*
   
   - Drag your ZIP file and drop it on the upload area

3. **Wait for Processing**
   - The tool will extract and validate your tour
   - This usually takes 5-30 seconds depending on tour size

4. **Preview Your Tour**
   - Review the tour details displayed:
     - Tour name
     - Number of scenes
     - Settings configuration
     - List of all scenes with hotspot counts
   
5. **Modify if Needed**
   - Click on the tour name field to rename your tour
   - Review scene information

6. **Import the Tour**
   - Click the blue "Import Tour" button
   - Wait for confirmation

7. **Success!**
   - You'll see a success message with a checkmark
   - Your tour is now ready to edit

8. **Open in Tool**
   - Click "Open in Marzipano Tool" button
   - The tool will open in a new tab with your tour loaded

## 5. Troubleshooting Quick Fixes

### Import Button is Grayed Out
- Make sure you've completed the preview step
- Check that your ZIP file is valid

### "Failed to Extract" Error
- Verify your file is actually a ZIP archive
- Try re-exporting from the original tool
- Check the file isn't corrupted

### Can't Open in Tool
- Verify the marzipano-tool directory exists
- Check that index.html is present in marzipano-tool
- Make sure pop-ups aren't blocked in your browser

### Tour Loads But Scenes Are Missing
- Check that all scenes have valid data
- Verify the ZIP contains the tiles/ directory
- Look for any console errors (F12 in browser)

## 6. What's Next?

### Edit Your Tour
Once imported and opened in the Marzipano Tool, you can:
- Modify existing scenes
- Add new hotspots
- Change tour settings
- Add or remove scenes
- Adjust initial view parameters

### Export Again
After making changes:
1. Use the tool's export function
2. Save the new ZIP file
3. Import it again later if needed

### Share Your Tour
The exported tour can be:
- Hosted on a web server
- Shared via cloud storage
- Embedded in websites
- Distributed as standalone files

## 7. Common Workflows

### Workflow 1: Backup and Restore
```
1. Create tour in Marzipano Tool
2. Export as ZIP (backup)
3. Store safely
4. Later: Import with this tool
5. Continue editing
```

### Workflow 2: Tour Migration
```
1. Export from old computer
2. Transfer ZIP file
3. Import on new computer
4. Resume work
```

### Workflow 3: Version Control
```
1. Export tour as v1.0.zip
2. Make changes
3. Export as v1.1.zip
4. Keep both versions
5. Import either version when needed
```

## 8. Best Practices

### ✅ Do:
- Keep backups of your tour ZIPs
- Name tours descriptively
- Test imports before deleting originals
- Use version numbers in filenames
- Document your changes

### ❌ Don't:
- Delete source files immediately after import
- Import corrupted or incomplete ZIPs
- Skip the preview step
- Ignore error messages
- Exceed browser storage limits

## 9. Keyboard Shortcuts

While using the importer:
- `Ctrl+V` / `Cmd+V`: Paste file path (in some browsers)
- `F5`: Refresh page (if something goes wrong)
- `F12`: Open developer console (for debugging)

## 10. Getting Help

If you encounter issues:

1. **Check the README**
   - Comprehensive documentation available
   - See README.md in this directory

2. **Review Export Format**
   - See EXPORT_FORMAT.md for technical details
   - Validate your tour structure

3. **Browser Console**
   - Press F12 to open developer tools
   - Check Console tab for error messages
   - Copy error messages for support

4. **Test with Sample Data**
   - Try importing a known-good tour
   - Verify the tool is working correctly

## Example Session

Here's a complete example session:

```
1. Open index.html in browser
2. Drag "my-virtual-tour.zip" onto upload area
3. Wait 10 seconds for extraction
4. See preview: "My Virtual Tour" with 5 scenes
5. Click "Import Tour"
6. See success message
7. Click "Open in Marzipano Tool"
8. Start editing in new tab
```

**Time required**: ~2 minutes

## Tips for Large Tours

If your tour has many high-resolution scenes:

1. **Be Patient**
   - Extraction may take longer (up to 2 minutes)
   - Don't refresh the page during import

2. **Check Browser Storage**
   - Large tours need more space
   - Clear old imports if needed

3. **Consider Splitting**
   - Split very large tours into sections
   - Import and work on sections separately

4. **Use a Local Server**
   - Better performance than file:// protocol
   - Recommended for tours over 100MB

## Quick Reference

| Action | Method |
|--------|--------|
| Import Tour | Drag & drop ZIP or click Browse |
| Cancel Import | Click Cancel button in preview |
| Rename Tour | Click tour name in preview |
| Open in Tool | Click button in success screen |
| Import Another | Click Import Another button |
| Reset | Refresh page (F5) |

## Video Tutorial

*Coming soon: Step-by-step video guide*

---

**Ready to start?** Open `index.html` and import your first tour!

For detailed information, see [README.md](README.md)


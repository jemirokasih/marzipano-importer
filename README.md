# Marzipano Tour Editor

A complete, standalone web-based tool for creating, editing, and managing virtual tours using Marzipano.

## Features

### 🎯 Core Functionality

- **Create New Tours**: Build virtual tours from scratch
- **Import Existing Tours**: Import and edit previously exported tours from ZIP files
- **Add Panoramas**: Upload multiple panorama images at once
- **Manage Scenes**: Edit, reorder, and delete scenes
- **Add Hotspots**: Create info and link hotspots
- **Set Initial Views**: Configure starting camera position for each scene
- **Export Tours**: Download complete tours as ZIP files

### 🎨 User Interface

- **Modern Design**: Clean, professional interface matching Marzipano Tool
- **Drag & Drop**: Upload files by dragging and dropping
- **Real-time Preview**: See changes immediately in the viewer
- **Responsive Layout**: Works on desktop and tablet devices

### ⚙️ Settings

- **Mouse View Mode**: Choose between Drag and QTVR modes
- **Autorotate**: Enable/disable automatic scene rotation
- **View Controls**: Toggle view control buttons
- **Fullscreen**: Enable/disable fullscreen button

## Quick Start

### 1. Open the Tool

Simply open `index.html` in a modern web browser:

```bash
# Using Python
cd marzipano-importer
python3 -m http.server 8000
# Then open http://localhost:8000

# Or just open the file directly
open index.html  # macOS
start index.html # Windows
```

### 2. Create Your First Tour

**Option A: Start from Scratch**

1. Click "Add more panoramas" button
2. Select your panorama images (JPG or PNG)
3. Click on a panorama to view it
4. Add hotspots and configure settings
5. Click "Export" to download your tour

**Option B: Import Existing Tour**

1. Click "Import" button in header
2. Drag and drop your tour ZIP file (or click Browse)
3. Edit your tour as needed
4. Click "Export" to save changes

### 3. Add Hotspots

**Info Hotspots:**

1. Select a panorama
2. Move camera to desired position
3. Click "Info hotspot" button
4. Enter title and description
5. Click "Add Hotspot"

**Link Hotspots:**

1. Ensure you have at least 2 scenes
2. Select a panorama
3. Move camera to desired position
4. Click "Link hotspot" button
5. Select target scene
6. Click "Add Hotspot"

## Usage Guide

### Adding Panoramas

1. **Click "Add more panoramas"** in the Panorama List section
2. **Select one or more images** from your computer
3. **Wait for processing** - images will appear in the list
4. **Click on a panorama** to view and edit it

### Editing Scene Properties

- **Rename**: Click the edit icon (pencil) next to scene name
- **Delete**: Click the trash icon to remove a scene
- **Reorder**: Drag scenes using the handle icon (coming soon)

### Setting Initial View

1. **Select a scene** from the panorama list
2. **Move the camera** to your desired starting position
3. **Click "Set initial view"** button
4. **Wait 3 seconds** while adjusting the view
5. The view will be saved automatically

### Managing Hotspots

**Info Hotspots:**

- Display information when clicked
- Contain title and description text
- Positioned at specific yaw/pitch coordinates

**Link Hotspots:**

- Navigate between scenes
- Connect different panoramas
- Create a tour flow

### Project Settings

Access settings in the sidebar:

- **Drag/QTVR**: Mouse interaction mode

  - Drag: Click and drag to look around (recommended)
  - QTVR: QTVR-style mouse movement

- **Autorotate**: Automatically rotate the view
- **View Control Buttons**: Show +/- zoom buttons
- **Fullscreen Button**: Show fullscreen toggle button

### Exporting Tours

1. **Click "Export"** button in header
2. **Wait for processing** - ZIP file will be generated
3. **Download automatically** starts
4. **Share or backup** the ZIP file

The exported ZIP contains:

- `data.js`: Tour configuration and scene data
- Image files (if applicable)
- Complete tour structure

### Importing Tours

1. **Click "Import"** button
2. **Drag & drop ZIP file** or click Browse
3. **Wait for extraction** and processing
4. **Tour loads automatically** - ready to edit

Supported formats:

- ZIP files from previous exports
- Standard Marzipano Tool exports
- Custom tours with `data.js` or `app-data.json`

## Keyboard Shortcuts

Currently supported:

- `F5`: Refresh page
- `F12`: Open developer console (for debugging)

Coming soon:

- `Ctrl/Cmd + S`: Quick save
- `Ctrl/Cmd + E`: Export
- `Ctrl/Cmd + I`: Import
- Arrow keys: Navigate scenes

## Technical Details

### Technologies Used

- **Marzipano**: 0.10.2 - Core panorama viewer
- **JSZip**: 3.10.1 - ZIP file handling
- **Pure JavaScript**: No frameworks required
- **CSS3**: Modern styling with flexbox
- **HTML5**: Semantic markup

### Browser Support

Tested and working on:

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Requires:

- WebGL support
- FileReader API
- LocalStorage (optional)
- ES6+ JavaScript

### File Structure

```
marzipano-importer/
├── index.html              # Main application
├── scripts/
│   └── app.js             # Application logic
├── styles/
│   └── app.css            # Styling
├── examples/              # Sample data
├── README.md              # This file
└── LICENSE                # MIT License
```

### Data Format

Tours are stored in JSON format:

```javascript
{
  "name": "Tour Name",
  "scenes": [
    {
      "id": "scene-1",
      "name": "Scene Name",
      "levels": [...],
      "faceSize": 2048,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [...],
      "infoHotspots": [...]
    }
  ],
  "settings": {
    "mouseViewMode": "drag",
    "autorotateEnabled": false,
    "fullscreenButton": true,
    "viewControlButtons": true
  }
}
```

## Troubleshooting

### Panorama doesn't display

**Problem**: Black screen when selecting panorama

- **Solution**: Ensure image format is supported (JPG/PNG)
- Check browser console for errors (F12)
- Try with a smaller image file

### Export button grayed out

**Problem**: Cannot click Export button

- **Solution**: Add at least one panorama first
- Check that scenes have been processed
- Refresh page if issue persists

### Import fails

**Problem**: "Failed to import tour"

- **Solution**: Verify ZIP file is valid
- Check that data.js or app-data.json exists
- Ensure ZIP is from Marzipano Tool or this editor

### Hotspots not appearing

**Problem**: Added hotspots don't show

- **Solution**: Hotspots are saved in tour data
- They will appear when tour is properly exported and viewed
- Current version focuses on data management

### Performance issues

**Problem**: Slow or laggy interface

- **Solution**: Use smaller image files
- Limit number of scenes (recommend < 20)
- Close other browser tabs
- Use a modern browser

## Best Practices

### Image Preparation

1. **Resolution**: 4096x2048 for equirectangular
2. **Format**: JPEG for smaller files, PNG for quality
3. **Compression**: 80-90% quality recommended
4. **Color space**: sRGB for web compatibility

### Tour Organization

1. **Naming**: Use descriptive scene names
2. **Structure**: Plan scene connections before building
3. **Hotspots**: Add clear, concise descriptions
4. **Testing**: Test navigation flow before exporting

### Project Management

1. **Regular exports**: Save work frequently
2. **Version control**: Name exports with version numbers
3. **Backup**: Keep copies of source images
4. **Documentation**: Note any special configurations

## FAQ

**Q: Can I use this offline?**
A: Yes, but Marzipano library is loaded from CDN. Download it locally for full offline use.

**Q: What's the maximum number of scenes?**
A: No hard limit, but performance may degrade beyond 50-100 scenes.

**Q: Can I add custom hotspot icons?**
A: Not in the current version. Feature planned for future release.

**Q: Is this compatible with original Marzipano Tool exports?**
A: Yes, imports from original tool are supported.

**Q: Can I host the exported tour?**
A: Yes! The exported ZIP contains a complete, standalone tour.

**Q: Does this work on mobile?**
A: Editor is optimized for desktop. Exported tours work on mobile.

## Roadmap

### Version 1.1 (Coming Soon)

- [ ] Hotspot visualization in editor
- [ ] Scene thumbnail generation
- [ ] Drag to reorder scenes
- [ ] Undo/Redo functionality
- [ ] Custom hotspot icons

### Version 1.2

- [ ] Multi-language support
- [ ] Tour templates
- [ ] Batch image processing
- [ ] Advanced settings panel
- [ ] Tour statistics

### Version 2.0

- [ ] Real-time collaboration
- [ ] Cloud storage integration
- [ ] Video panorama support
- [ ] 3D model integration
- [ ] Analytics dashboard

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details.

## Credits

- **Marzipano**: Google Inc. (Apache 2.0)
- **JSZip**: Stuart Knightley (MIT)
- **Icons**: Material Design Icons

## Support

For issues, questions, or feature requests:

- Check the Troubleshooting section
- Review the FAQ
- Open an issue on GitHub
- Check Marzipano documentation

---

**Note**: This is a standalone tool inspired by Marzipano Tool. It provides a complete solution for creating and managing virtual tours without requiring any external dependencies beyond the included libraries.

Built with ❤️ for the virtual tour community.

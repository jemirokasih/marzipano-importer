# Changelog

All notable changes to the Marzipano Tour Importer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-08-20

### Fixed & Revised

- **Active Button Color Setting (`themeActiveBgColor`)**: Added Active Color picker to UI/UX customization settings for highlighting active scene items, hovered buttons, and active controls.
- **Live Theme Customization Sync**: Fixed live updates for font size (`--theme-font-size`), border radius (`--theme-border-radius`), padding (`--theme-padding`), and active color across all viewer controls and sidebar overlays.
- **Panorama List Scene Visibility Checklist**: Fixed JS event delegation for the "Tampilkan di Scene List" checkbox in the Panorama list sidebar, ensuring live updates of the floating scene list menu.
- **Link Hotspot Modal Cleanup**: Removed redundant "Show Target Scene in SceneList" checkbox from Add/Edit Link Hotspot modal as requested.

## [1.3.0] - 2026-08-20

### Added

- **UI / UX Style Customization Panel**:
  - Color Pickers: Background Color (`themeBgColor`) & Font Color (`themeFontColor`).
  - Font Size (`themeFontSize`), Padding (`themePadding`), & Border Radius (`themeBorderRadius`) controls.
  - Control Overlay Positioning (`themeControlPos`: Bottom Right, Bottom Left, Top Right, Top Left).
- **Header & Scene Title Visibility Toggles**:
  - `Show Header` toggle: Show/hide brand logo and title bar.
  - `Show Scene Title` toggle: Show/hide current panorama scene name.
- **Link Hotspot SceneList Visibility Checkbox**:
  - Added `Show Target Scene in SceneList` checkbox inside the "Add/Edit Link Hotspot" modal window.
  - Toggling this checkbox dynamically sets whether the target scene appears in the sidebar list.

## [1.2.0] - 2026-08-20

### Added & Fixed (100% Editor to Webserver Export Parity)

- **Hotspot Styling & Backgrounds**: Added circular translucent backdrops, borders, drop shadows, and hover animations for `.link-hotspot` and `.info-hotspot` in exported tours (`style.css`).
- **Interactive Export View Controls**: Implemented mouse, touch, and click continuous camera movement & multi-step zooming for exported tour D-Pad controls (`#btnUp`, `#btnDown`, `#btnLeft`, `#btnRight`, `#btnZoomIn`, `#btnZoomOut`).
- **Collapsible Scene List Sidebar**: Integrated a floating `#sceneListOverlay` with `#toggleSceneListBtn` to expand/collapse sidebar in both editor and exported packages.
- **Scene List Visibility Control (`showInSceneList`)**: Added a checkbox to show/hide individual scenes from the sidebar list.
- **Info Hotspot Hyperlink Support (`linkUrl`)**: Added URL input in Info Hotspot modal (`https://...`) rendering a styled `<a href="..." target="_blank">Buka Tautan ↗</a>` button.
- **Custom Brand Logo Upload**: Added brand logo upload support in settings panel, rendering `app-files/logo.png` overlay in viewer and exported tours.
- **Footer Version Tag & Release Workflow**: Added version badge (`v1.2.0`) in footer and automated GitHub Release creation workflow upon approval to push/merge to `main`.

## [1.0.0] - 2025-11-07

### Added

- Initial release of Marzipano Tour Importer
- ZIP file import functionality with drag & drop support
- Tour preview interface showing:
  - Tour name (editable)
  - Scene count
  - Tour settings
  - Detailed scene information with hotspot counts
- Progress tracking during import process
- Success and error handling with user-friendly messages
- LocalStorage integration for tour data persistence
- Integration with Marzipano Tool via "Open in Tool" button
- Responsive design for mobile and desktop devices
- Support for multiple tour data formats:
  - JavaScript format (data.js)
  - JSON format (app-data.json)
- Comprehensive documentation:
  - README with installation and usage guide
  - QUICKSTART for rapid onboarding
  - EXPORT_FORMAT technical specification
  - Sample tour data for testing
- Modern, gradient-based UI design
- Animated transitions between sections
- Browser compatibility checks
- File validation and error reporting

### Features

- **Import from ZIP**: Complete tour package import including panoramas and metadata
- **Preview Before Import**: Review and validate tour data before committing
- **Drag & Drop**: Intuitive file upload via drag and drop
- **Tour Editing**: Modify tour name before finalizing import
- **Data Validation**: Automatic validation of tour structure
- **Error Handling**: Detailed error messages for troubleshooting
- **Cross-browser**: Works on Chrome, Firefox, Safari, and Edge

### Technical Details

- **Dependencies**: JSZip 3.10.1 for ZIP file handling
- **Storage**: LocalStorage API for persistent data
- **Format Support**: JavaScript and JSON data formats
- **File Handling**: FileReader API for client-side processing
- **No Backend Required**: Fully client-side application

### Documentation

- Complete README with setup instructions
- Quick start guide for rapid deployment
- Export format specification document
- Sample tour data for testing
- MIT License for open-source use
- .gitignore for version control
- Inline code comments for developers

### Browser Support

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

### Known Limitations

- LocalStorage size limits (typically 5-10MB)
- Large tours (>500MB) may have performance issues
- Pop-up blockers may prevent "Open in Tool" functionality
- Requires Marzipano Tool to be installed in adjacent directory

### Security

- Client-side only processing (no data sent to servers)
- Domain-specific LocalStorage (data isolation)
- No external dependencies beyond JSZip CDN

## [Unreleased]

### Planned Features

- [ ] Support for TAR and 7Z archives
- [ ] Direct folder import (drag & drop directories)
- [ ] Tour comparison before/after import
- [ ] Batch import for multiple tours
- [ ] Export modifications back to ZIP
- [ ] Cloud storage integration (Google Drive, Dropbox)
- [ ] Tour merging capabilities
- [ ] Visual scene preview thumbnails
- [ ] Hotspot visualization
- [ ] Data migration wizard
- [ ] Tour statistics and analytics
- [ ] Advanced search and filter
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Offline mode with service workers

### Under Consideration

- Integration with other panorama formats (Pannellum, Photo Sphere)
- Built-in panorama viewer for preview
- Tour metadata editor
- Automated backup system
- Version control for tours
- Collaborative editing features

## Version History

### [1.0.0] - 2025-11-07

First stable release with core functionality

---

## Release Notes

### What's New in 1.0.0

This is the first public release of the Marzipano Tour Importer. The tool provides a complete solution for importing previously exported Marzipano virtual tours, enabling users to:

1. **Restore Previous Work**: Import and continue editing tours created with Marzipano Tool
2. **Migrate Tours**: Move tours between computers or setups
3. **Version Control**: Keep multiple versions of tours and switch between them
4. **Backup Recovery**: Restore tours from backup ZIP files

### Getting Started

1. Download or clone the repository
2. Open `index.html` in a modern browser
3. Drag and drop your tour ZIP file
4. Preview and import
5. Open in Marzipano Tool to continue editing

### Feedback and Contributions

We welcome feedback and contributions! Please refer to the README for more information.

---

**Note**: This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format and uses [Semantic Versioning](https://semver.org/).

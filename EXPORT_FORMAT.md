# Marzipano Export Format Documentation

This document describes the expected format for Marzipano tour exports that can be imported using the Marzipano Importer tool.

## Archive Structure

The exported tour should be a ZIP archive with the following structure:

```
tour-export.zip
├── data.js (or app-data.json)
├── index.html (optional)
├── tiles/
│   ├── scene-1/
│   │   ├── l1/
│   │   │   ├── u/
│   │   │   ├── d/
│   │   │   ├── f/
│   │   │   ├── b/
│   │   │   ├── l/
│   │   │   └── r/
│   │   └── l2/
│   │       └── ...
│   └── scene-2/
│       └── ...
└── img/ (optional - for UI assets)
```

## Data File Formats

### JavaScript Format (data.js)

```javascript
var data = {
  name: "Sample Tour",
  scenes: [
    {
      id: "scene-identifier",
      name: "Scene Display Name",
      levels: [
        {
          tileSize: 256,
          size: 256,
          fallbackOnly: true,
        },
        {
          tileSize: 512,
          size: 512,
        },
        {
          tileSize: 512,
          size: 1024,
        },
        {
          tileSize: 512,
          size: 2048,
        },
      ],
      faceSize: 2048,
      initialViewParameters: {
        pitch: 0,
        yaw: 0,
        fov: 1.5707963267948966,
      },
      linkHotspots: [],
      infoHotspots: [],
    },
  ],
  settings: {
    mouseViewMode: "drag",
    autorotateEnabled: false,
    fullscreenButton: true,
    viewControlButtons: true,
  },
};
```

### JSON Format (app-data.json)

```json
{
  "name": "Sample Tour",
  "scenes": [...],
  "settings": {...}
}
```

## Scene Object Structure

### Required Fields

- **id** (string): Unique identifier for the scene
- **name** (string): Display name for the scene
- **levels** (array): Array of level objects defining the multi-resolution structure
- **faceSize** (number): Size of cube faces (e.g., 512, 1024, 2048, 4096)
- **initialViewParameters** (object): Initial camera position

### Optional Fields

- **linkHotspots** (array): Hotspots that link to other scenes
- **infoHotspots** (array): Information hotspots

## Level Object Structure

```javascript
{
  "tileSize": 512,        // Size of each tile in pixels
  "size": 1024,           // Total size of this level
  "fallbackOnly": false   // Optional: use only as fallback
}
```

**Common Configurations:**

- **Fallback Level**: `{ "tileSize": 256, "size": 256, "fallbackOnly": true }`
- **Low Resolution**: `{ "tileSize": 512, "size": 512 }`
- **Medium Resolution**: `{ "tileSize": 512, "size": 1024 }`
- **High Resolution**: `{ "tileSize": 512, "size": 2048 }`
- **Ultra Resolution**: `{ "tileSize": 512, "size": 4096 }`

## Initial View Parameters

```javascript
{
  "pitch": 0,                      // Vertical angle in radians (-π/2 to π/2)
  "yaw": 0,                        // Horizontal angle in radians
  "fov": 1.5707963267948966       // Field of view in radians (typically π/2)
}
```

**Common Values:**

- `fov: 1.5707963267948966` = 90 degrees (π/2 radians)
- `pitch: 0` = Looking straight ahead
- `yaw: 0` = Facing forward

## Link Hotspot Structure

```javascript
{
  "yaw": 3.141592653589793,        // Horizontal position in radians
  "pitch": 0.0,                    // Vertical position in radians
  "rotation": 0,                   // Hotspot icon rotation
  "target": "target-scene-id"      // ID of the scene to link to
}
```

**Position Guidelines:**

- `yaw`: 0 = front, π/2 = right, π = back, -π/2 = left
- `pitch`: 0 = horizon, π/2 = up, -π/2 = down
- `rotation`: Visual rotation of the hotspot icon (radians)

## Info Hotspot Structure

```javascript
{
  "yaw": 0.0,                      // Horizontal position
  "pitch": 0.0,                    // Vertical position
  "title": "Hotspot Title",        // Title displayed in popup
  "text": "Description text..."    // Detailed description
}
```

**Best Practices:**

- Keep titles short (under 50 characters)
- Use HTML in text for formatting (if supported)
- Position away from link hotspots

## Settings Object

```javascript
{
  "mouseViewMode": "drag",         // Mouse interaction mode
  "autorotateEnabled": true,       // Auto-rotation feature
  "fullscreenButton": true,        // Show fullscreen button
  "viewControlButtons": true       // Show view control buttons
}
```

### Mouse View Modes

- **drag**: Click and drag to look around (recommended)
- **qtvr**: QTVR-style mouse movement

### Settings Options

| Setting            | Type    | Default | Description                     |
| ------------------ | ------- | ------- | ------------------------------- |
| mouseViewMode      | string  | "drag"  | Mouse interaction mode          |
| autorotateEnabled  | boolean | false   | Enable auto-rotation            |
| autorotateSpeed    | number  | 0.5     | Rotation speed (radians/second) |
| fullscreenButton   | boolean | true    | Show fullscreen button          |
| viewControlButtons | boolean | true    | Show view control buttons       |

## Tile Directory Structure

For cube panoramas, tiles are organized by:

- **Scene ID**: Root directory for each scene
- **Level**: Multi-resolution levels (l1, l2, l3, etc.)
- **Face**: Cube faces (u, d, f, b, l, r)
- **Tile**: Individual tiles (0_0.jpg, 0_1.jpg, etc.)

### Example Structure

```
tiles/
└── my-scene/
    ├── l1/              # Level 1 (512x512)
    │   ├── u/           # Up face
    │   │   └── 0/
    │   │       └── 0_0.jpg
    │   ├── d/           # Down face
    │   ├── f/           # Front face
    │   ├── b/           # Back face
    │   ├── l/           # Left face
    │   └── r/           # Right face
    └── l2/              # Level 2 (1024x1024)
        └── ...
```

### Face Naming Convention

- **u**: Up (top of cube)
- **d**: Down (bottom of cube)
- **f**: Front
- **b**: Back
- **l**: Left
- **r**: Right

### Tile Naming Convention

Format: `{row}_{column}.jpg`

- **row**: Tile row number (0-based)
- **column**: Tile column number (0-based)

Example for 1024x1024 with 512px tiles:

```
0_0.jpg  0_1.jpg
1_0.jpg  1_1.jpg
```

## Validation Rules

### Required Validations

1. **Tour must have a name**

   - Can be modified during import

2. **Scenes array must exist**

   - At least one scene required

3. **Each scene must have:**

   - Unique ID
   - Name
   - Levels array (at least one level)
   - Face size
   - Initial view parameters

4. **Level sizes must be powers of 2**

   - Valid: 256, 512, 1024, 2048, 4096, 8192
   - Tile sizes typically 256 or 512

5. **Link hotspot targets must reference existing scenes**

### Optional Validations

- Check for orphaned scenes (no links to them)
- Verify tile files exist in the archive
- Validate yaw/pitch values are within valid ranges

## File Size Considerations

### Recommended Limits

- **Individual tiles**: 200KB or less
- **Scene (all tiles)**: 50MB or less
- **Complete tour**: 500MB or less for web delivery

### Optimization Tips

1. **Use appropriate resolution**

   - Mobile: Up to 2048 face size
   - Desktop: Up to 4096 face size

2. **JPEG quality**

   - 75-85% for good balance
   - 90%+ for high quality scenes

3. **Progressive JPEG**
   - Better for web loading
   - Supported by most browsers

## Common Issues and Solutions

### Issue: Tour doesn't load

**Possible causes:**

- Missing data.js or app-data.json
- Invalid JSON syntax
- Missing required fields

**Solution:** Validate data structure against this format

### Issue: Scenes appear black

**Possible causes:**

- Missing tile files
- Incorrect tile path
- Corrupted images

**Solution:** Verify tile directory structure

### Issue: Hotspots don't work

**Possible causes:**

- Invalid target scene ID
- Missing scene in tour data
- Incorrect position values

**Solution:** Check hotspot configuration

## Example: Minimal Valid Tour

```javascript
var data = {
  name: "Minimal Tour",
  scenes: [
    {
      id: "scene1",
      name: "First Scene",
      levels: [
        {
          tileSize: 256,
          size: 256,
          fallbackOnly: true,
        },
      ],
      faceSize: 256,
      initialViewParameters: {
        pitch: 0,
        yaw: 0,
        fov: 1.5707963267948966,
      },
      linkHotspots: [],
      infoHotspots: [],
    },
  ],
  settings: {
    mouseViewMode: "drag",
  },
};
```

## Creating Compliant Exports

To ensure your exports are compatible:

1. **Use the Marzipano Tool export feature**

   - Automatically creates correct structure
   - Includes all necessary files

2. **Validate before zipping**

   - Check data.js syntax
   - Verify all scenes have required fields
   - Ensure tile directories exist

3. **Test the archive**
   - Import with this tool
   - Verify all scenes load
   - Check hotspots work

## Additional Resources

- [Marzipano Documentation](https://www.marzipano.net/docs.html)
- [Marzipano Tool Guide](https://www.marzipano.net/tool/)
- [JSZip Documentation](https://stuk.github.io/jszip/)

---

This format documentation is based on the Marzipano framework structure and designed to ensure maximum compatibility with the importer tool.

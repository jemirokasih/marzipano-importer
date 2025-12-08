/**
 * Sample Marzipano Tour Data
 * 
 * This is an example of a valid tour data structure that can be imported.
 * Use this as a reference when creating or debugging your own tours.
 */

var data = {
  "name": "Sample Virtual Tour",
  "scenes": [
    {
      "id": "entrance-hall",
      "name": "Entrance Hall",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": 1.5707963267948966,
          "pitch": 0.0,
          "rotation": 0,
          "target": "main-room"
        }
      ],
      "infoHotspots": [
        {
          "yaw": 0.0,
          "pitch": 0.1,
          "title": "Welcome",
          "text": "Welcome to the virtual tour! Click the arrow to explore more rooms."
        }
      ]
    },
    {
      "id": "main-room",
      "name": "Main Room",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "pitch": 0.05,
        "yaw": 3.141592653589793,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": -1.5707963267948966,
          "pitch": 0.0,
          "rotation": 3.141592653589793,
          "target": "entrance-hall"
        },
        {
          "yaw": 1.5707963267948966,
          "pitch": 0.0,
          "rotation": 0,
          "target": "gallery"
        }
      ],
      "infoHotspots": [
        {
          "yaw": 0.5,
          "pitch": 0.2,
          "title": "Main Feature",
          "text": "This is the main room with beautiful architecture and natural lighting."
        },
        {
          "yaw": -0.5,
          "pitch": -0.1,
          "title": "Floor Details",
          "text": "Notice the intricate floor patterns and materials used throughout."
        }
      ]
    },
    {
      "id": "gallery",
      "name": "Gallery",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        },
        {
          "tileSize": 512,
          "size": 4096
        }
      ],
      "faceSize": 4096,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": 3.141592653589793,
          "pitch": 0.0,
          "rotation": 0,
          "target": "main-room"
        }
      ],
      "infoHotspots": [
        {
          "yaw": 0.0,
          "pitch": 0.0,
          "title": "Gallery Space",
          "text": "This gallery showcases various artworks and exhibitions. The high ceilings and natural light create an ideal viewing environment."
        },
        {
          "yaw": 1.57,
          "pitch": 0.3,
          "title": "Skylight",
          "text": "Natural light floods in through the skylight, providing excellent illumination."
        },
        {
          "yaw": -1.57,
          "pitch": 0.0,
          "title": "Exhibition Wall",
          "text": "Rotating exhibitions are displayed along this wall throughout the year."
        }
      ]
    }
  ],
  "settings": {
    "mouseViewMode": "drag",
    "autorotateEnabled": true,
    "autorotateSpeed": 0.2,
    "autorotatePeriod": 5000,
    "fullscreenButton": true,
    "viewControlButtons": true,
    "sceneListButton": true
  }
};

/**
 * Notes:
 * 
 * 1. Scene IDs must be unique
 * 2. Link hotspot targets must match existing scene IDs
 * 3. Yaw/pitch values are in radians
 * 4. FOV (field of view) is typically π/2 (90 degrees)
 * 5. Face sizes must be powers of 2 (512, 1024, 2048, 4096, etc.)
 * 6. Tile sizes are typically 256 or 512 pixels
 * 7. The fallbackOnly level provides a quick preview while loading
 * 
 * Common Yaw Values:
 * - 0: Front
 * - π/2 (1.5707963267948966): Right
 * - π (3.141592653589793): Back
 * - -π/2 (-1.5707963267948966): Left
 * 
 * Common Pitch Values:
 * - 0: Horizon
 * - π/2 (1.5707963267948966): Up
 * - -π/2 (-1.5707963267948966): Down
 */


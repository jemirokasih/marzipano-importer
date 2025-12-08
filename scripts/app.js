/**
 * Marzipano Tour Editor
 * A complete tool for creating, editing, and exporting virtual tours
 */

(function () {
  "use strict";

  // Global State
  const state = {
    tourData: {
      name: "Untitled Project",
      scenes: [],
      settings: {
        mouseViewMode: "drag",
        autorotateEnabled: false,
        fullscreenButton: true,
        viewControlButtons: true,
      },
    },
    currentScene: null,
    currentSceneIndex: -1,
    viewer: null,
    scene: null,
    pendingHotspot: null,
    sceneImages: {}, // Store images for scenes
    addingHotspot: null, // "info", "link", or "initialView"
    hasUnsavedChanges: false, // Track if there are unsaved changes
  };

  // DOM Elements
  const elements = {
    // Header
    importButton: document.getElementById("importButton"),
    exportButton: document.getElementById("exportButton"),
    helpButton: document.getElementById("helpButton"),

    // Sidebar
    projectName: document.getElementById("projectName"),
    panoramaList: document.getElementById("panoramaList"),
    addPanoramasInput: document.getElementById("addPanoramasInput"),

    // Settings
    mouseViewModeDrag: document.querySelector(
      'input[name="mouseViewMode"][value="drag"]'
    ),
    mouseViewModeQtvr: document.querySelector(
      'input[name="mouseViewMode"][value="qtvr"]'
    ),
    autorotateEnabled: document.getElementById("autorotateEnabled"),
    viewControlButtons: document.getElementById("viewControlButtons"),
    fullscreenButton: document.getElementById("fullscreenButton"),

    // Workspace
    preview: document.getElementById("preview"),
    help: document.getElementById("help"),
    panoramaName: document.getElementById("panoramaName"),
    pano: document.getElementById("pano"),
    initialViewHint: document.getElementById("initialViewHint"),
    infoHotspotButton: document.getElementById("infoHotspotButton"),
    linkHotspotButton: document.getElementById("linkHotspotButton"),
    setInitialViewButton: document.getElementById("setInitialViewButton"),

    // Modals
    importModal: document.getElementById("importModal"),
    uploadArea: document.getElementById("uploadArea"),
    importFileInput: document.getElementById("importFileInput"),
    browseImportButton: document.getElementById("browseImportButton"),

    infoHotspotModal: document.getElementById("infoHotspotModal"),
    infoHotspotTitle: document.getElementById("infoHotspotTitle"),
    infoHotspotText: document.getElementById("infoHotspotText"),
    saveInfoHotspotButton: document.getElementById("saveInfoHotspotButton"),
    cancelInfoHotspotButton: document.getElementById("cancelInfoHotspotButton"),

    linkHotspotModal: document.getElementById("linkHotspotModal"),
    linkHotspotTarget: document.getElementById("linkHotspotTarget"),
    saveLinkHotspotButton: document.getElementById("saveLinkHotspotButton"),
    cancelLinkHotspotButton: document.getElementById("cancelLinkHotspotButton"),

    exportModal: document.getElementById("exportModal"),
    exportProgress: document.getElementById("exportProgress"),
    exportStatus: document.getElementById("exportStatus"),
  };

  // Initialize
  function init() {
    setupEventListeners();
    initMarzipanoViewer();
    updateUI();
    setupBeforeUnload();

    // Show help by default
    elements.help.classList.remove("hidden");
  }

  // Setup Before Unload Warning
  function setupBeforeUnload() {
    // Handle browser close/refresh
    window.addEventListener("beforeunload", function (e) {
      if (state.hasUnsavedChanges) {
        // Standard way to show confirmation dialog
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = "";
        return "";
      }
    });

    // Handle browser back button
    window.addEventListener("popstate", function (e) {
      if (state.hasUnsavedChanges) {
        const confirmed = confirm(
          "Are you sure you want to quit? You have unsaved changes."
        );
        if (!confirmed) {
          // Push state back to prevent navigation
          history.pushState(null, null, window.location.href);
        } else {
          state.hasUnsavedChanges = false;
        }
      }
    });

    // Push initial state to enable popstate detection
    history.pushState(null, null, window.location.href);
  }

  // Mark as changed
  function markAsChanged() {
    state.hasUnsavedChanges = true;
  }

  // Mark as saved
  function markAsSaved() {
    state.hasUnsavedChanges = false;
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Header buttons
    elements.importButton.addEventListener("click", () =>
      showModal("importModal")
    );
    elements.exportButton.addEventListener("click", exportTour);
    elements.helpButton.addEventListener("click", toggleHelp);

    // Project name
    elements.projectName.addEventListener("input", (e) => {
      state.tourData.name = e.target.value;
      markAsChanged();
    });

    // Settings
    elements.mouseViewModeDrag.addEventListener("change", updateSettings);
    elements.mouseViewModeQtvr.addEventListener("change", updateSettings);
    elements.autorotateEnabled.addEventListener("change", updateSettings);
    elements.viewControlButtons.addEventListener("change", updateSettings);
    elements.fullscreenButton.addEventListener("change", updateSettings);

    // Add panoramas
    elements.addPanoramasInput.addEventListener("change", handleAddPanoramas);

    // Panorama list drag and drop container handlers
    setupPanoramaListDragHandlers();

    // Panorama settings buttons
    elements.infoHotspotButton.addEventListener("click", startAddInfoHotspot);
    elements.linkHotspotButton.addEventListener("click", startAddLinkHotspot);
    elements.setInitialViewButton.addEventListener("click", setInitialView);

    // Import modal
    elements.browseImportButton.addEventListener("click", () =>
      elements.importFileInput.click()
    );
    elements.importFileInput.addEventListener("change", handleImportFile);
    elements.uploadArea.addEventListener("dragover", handleDragOver);
    elements.uploadArea.addEventListener("dragleave", handleDragLeave);
    elements.uploadArea.addEventListener("drop", handleDrop);

    // Info hotspot modal
    elements.saveInfoHotspotButton.addEventListener("click", saveInfoHotspot);
    elements.cancelInfoHotspotButton.addEventListener("click", () =>
      hideModal("infoHotspotModal")
    );

    // Link hotspot modal
    elements.saveLinkHotspotButton.addEventListener("click", saveLinkHotspot);
    elements.cancelLinkHotspotButton.addEventListener("click", () =>
      hideModal("linkHotspotModal")
    );

    // Accordion toggles
    document.querySelectorAll(".accordion-name").forEach((accordion) => {
      accordion.addEventListener("click", function () {
        this.parentElement.classList.toggle("expand");
      });
    });

    // Close modals on background click
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });
    });
  }

  // Initialize Marzipano Viewer
  function initMarzipanoViewer() {
    state.viewer = new Marzipano.Viewer(elements.pano);
  }

  // Update UI
  function updateUI() {
    // Update project name
    elements.projectName.value = state.tourData.name;

    // Update panorama list
    renderPanoramaList();

    // Update preview
    if (state.currentScene) {
      elements.panoramaName.textContent = state.currentScene.name;
      elements.preview.classList.add("visible");
      elements.help.classList.add("hidden");
    } else {
      elements.preview.classList.remove("visible");
    }
  }

  // Render Panorama List
  function renderPanoramaList() {
    elements.panoramaList.innerHTML = "";

    state.tourData.scenes.forEach((scene, index) => {
      const panoramaEl = document.createElement("div");
      panoramaEl.className =
        "panorama" + (index === state.currentSceneIndex ? " selected" : "");
      panoramaEl.setAttribute("data-index", index);
      panoramaEl.onclick = () => selectScene(index);

      panoramaEl.innerHTML = `
        <div class="handle">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/>
          </svg>
        </div>
        <div class="info">
          <div class="properties">
            <div class="name">${scene.name}</div>
            <div class="action" onclick="event.stopPropagation(); editSceneName(${index})">
              <svg class="icon" viewBox="0 0 24 24">
                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
              </svg>
            </div>
            <div class="action" onclick="event.stopPropagation(); deleteScene(${index})">
              <svg class="icon" viewBox="0 0 24 24">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
              </svg>
            </div>
          </div>
          <div class="status">
            <div class="state">
              <svg class="icon" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
              </svg>
              <div class="message">Successfully processed</div>
            </div>
          </div>
        </div>
      `;

      // Setup drag and drop
      setupPanoramaDrag(panoramaEl, index);

      elements.panoramaList.appendChild(panoramaEl);
    });
  }

  // Setup Drag and Drop for Panorama List
  let draggedPanoramaIndex = null;

  function setupPanoramaDrag(panoramaEl, index) {
    const handle = panoramaEl.querySelector(".handle");

    if (!handle) return;

    // Prevent click on handle from selecting scene
    handle.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Make handle draggable - must be set before adding listeners
    handle.setAttribute("draggable", "true");
    handle.style.cursor = "grab";

    // Start drag
    handle.addEventListener("dragstart", (e) => {
      draggedPanoramaIndex = index;
      panoramaEl.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
      // Set a drag image
      e.dataTransfer.setDragImage(panoramaEl, 0, 0);
      handle.style.cursor = "grabbing";
      e.stopPropagation();
    });

    // End drag
    handle.addEventListener("dragend", (e) => {
      panoramaEl.classList.remove("dragging");
      handle.style.cursor = "grab";
      // Remove drag-over class from all panoramas
      document.querySelectorAll(".panorama").forEach((el) => {
        el.classList.remove("drag-over");
      });
      draggedPanoramaIndex = null;
    });

    // Drag over
    panoramaEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedPanoramaIndex === null || draggedPanoramaIndex === index) {
        return;
      }

      e.dataTransfer.dropEffect = "move";
      panoramaEl.classList.add("drag-over");
    });

    // Drag leave
    panoramaEl.addEventListener("dragleave", (e) => {
      panoramaEl.classList.remove("drag-over");
    });

    // Drop
    panoramaEl.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      panoramaEl.classList.remove("drag-over");

      if (draggedPanoramaIndex !== null && draggedPanoramaIndex !== index) {
        // Calculate the actual drop position
        const rect = panoramaEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dropIndex = e.clientY < midY ? index : index + 1;

        reorderScenes(draggedPanoramaIndex, dropIndex);
      }
    });
  }

  // Reorder Scenes
  function reorderScenes(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    const scenes = state.tourData.scenes;
    const [movedScene] = scenes.splice(fromIndex, 1);

    // Adjust toIndex if we're moving forward (element was removed before target)
    const adjustedToIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
    scenes.splice(adjustedToIndex, 0, movedScene);

    // Update current scene index if needed
    if (state.currentSceneIndex === fromIndex) {
      state.currentSceneIndex = adjustedToIndex;
    } else if (
      state.currentSceneIndex > fromIndex &&
      state.currentSceneIndex <= adjustedToIndex
    ) {
      state.currentSceneIndex--;
    } else if (
      state.currentSceneIndex < fromIndex &&
      state.currentSceneIndex >= adjustedToIndex
    ) {
      state.currentSceneIndex++;
    }

    // Re-render the list
    renderPanoramaList();

    // Re-render current scene if it changed
    if (state.currentScene) {
      renderScene(state.currentScene);
    }

    state.hasUnsavedChanges = true;
  }

  // Setup drag handlers for panorama list container
  function setupPanoramaListDragHandlers() {
    elements.panoramaList.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedPanoramaIndex === null) {
        return;
      }

      e.dataTransfer.dropEffect = "move";
    });

    elements.panoramaList.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedPanoramaIndex === null) {
        return;
      }

      // Remove all drag-over classes
      document.querySelectorAll(".panorama").forEach((el) => {
        el.classList.remove("drag-over");
      });

      // Find drop position
      const panoramas = Array.from(
        elements.panoramaList.querySelectorAll(".panorama:not(.dragging)")
      );
      let dropIndex = panoramas.length;

      for (let i = 0; i < panoramas.length; i++) {
        const rect = panoramas[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          dropIndex = parseInt(panoramas[i].getAttribute("data-index"));
          break;
        }
      }

      // If dropped after last element
      if (dropIndex === panoramas.length) {
        dropIndex = state.tourData.scenes.length;
      }

      if (draggedPanoramaIndex !== dropIndex) {
        reorderScenes(draggedPanoramaIndex, dropIndex);
      }
    });
  }

  // Select Scene
  function selectScene(index) {
    state.currentSceneIndex = index;
    state.currentScene = state.tourData.scenes[index];
    renderScene(state.currentScene);
    updateUI();
  }

  // Render Scene in Marzipano Viewer
  function renderScene(sceneData) {
    if (!sceneData || !state.viewer) return;

    let source;
    let geometry;

    // Check if we have tile-based source or single image
    const imageData = state.sceneImages[sceneData.id];

    if (!imageData) {
      console.error("No image found for scene:", sceneData.id);
      console.log("Available scenes:", Object.keys(state.sceneImages));
      return;
    }

    console.log("Rendering scene:", sceneData.name, "ID:", sceneData.id);
    console.log("Image data type:", typeof imageData);

    if (typeof imageData === "string") {
      // Single image (uploaded) - use EquirectGeometry
      console.log("Using Equirectangular geometry");
      source = Marzipano.ImageUrlSource.fromString(imageData);
      geometry = new Marzipano.EquirectGeometry(sceneData.levels);
    } else if (imageData.tiles) {
      // Tile-based (imported) - use CubeGeometry
      console.log(
        "Using Cube geometry, tiles count:",
        Object.keys(imageData.tiles).length
      );
      console.log(
        "Sample tile keys:",
        Object.keys(imageData.tiles).slice(0, 5)
      );

      source = new Marzipano.ImageUrlSource(function (tile) {
        const f = tile.face;
        const z = tile.z; // Level index in Marzipano (0-based)
        const x = tile.x;
        const y = tile.y;

        // Marzipano's z index: z:0 = level 0 (fallbackOnly, no tiles)
        // z:1 = level 1 (folder 1), z:2 = level 2 (folder 2)
        // So levelFolder = z (not z+1)
        const levelFolder = z;

        // Get tile data from stored tiles
        const tileKey = `${levelFolder}/${f}/${y}/${x}`;
        const tileUrl = imageData.tiles[tileKey];

        if (!tileUrl) {
          // If tile not found, try fallback for level 0, or use imageData.fallback
          if (z === 0) {
            // Level 0 is fallbackOnly, use the fallback image
            return { url: imageData.fallback };
          }
          console.warn(
            `Tile not found: ${tileKey}, z:${z}, face:${f}, x:${x}, y:${y}`
          );
          return { url: imageData.fallback };
        }

        // ImageUrlSource callback must return { url, rect } object, not just a string
        return { url: tileUrl };
      });
      geometry = new Marzipano.CubeGeometry(sceneData.levels);
    } else {
      console.error("Invalid image data format for scene:", sceneData.id);
      return;
    }

    // Create view
    const limiter = Marzipano.RectilinearView.limit.traditional(
      sceneData.faceSize || 4096,
      (100 * Math.PI) / 180
    );
    const view = new Marzipano.RectilinearView(
      sceneData.initialViewParameters,
      limiter
    );

    // Create scene
    state.scene = state.viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true,
    });

    // Switch to scene
    state.scene.switchTo();

    // Render hotspots
    renderHotspots(sceneData);

    // Update panorama name
    elements.panoramaName.textContent = sceneData.name;
  }

  // Setup Drag and Drop for Hotspot
  function setupHotspotDrag(wrapper, hotspotType, hotspotIndex, hotspot) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    const DRAG_THRESHOLD = 3; // pixels

    const handleMouseDown = function (e) {
      // Don't start drag if clicking on menu or menu items
      if (
        e.target.closest(".hotspot-menu") ||
        e.target.closest(".hotspot-menu-item")
      ) {
        return;
      }

      // Don't start drag if clicking on info hotspot popup
      if (e.target.closest(".info-hotspot-text")) {
        return;
      }

      isDragging = false;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      // Prevent default to avoid text selection and other behaviors
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Stop Marzipano movement immediately
      if (state.viewer) {
        state.viewer.stopMovement();
      }

      // Create overlay immediately to block Marzipano events - use fixed position on body
      if (!document.querySelector(".hotspot-drag-overlay")) {
        const overlay = document.createElement("div");
        overlay.className = "hotspot-drag-overlay";
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999999;
          pointer-events: auto;
          cursor: grab;
          background: transparent;
        `;
        // Add to body to ensure it's on top of everything
        document.body.appendChild(overlay);
        wrapper._dragOverlay = overlay;
      }

      // Focus the wrapper to ensure events are captured
      wrapper.focus();
    };

    const handleMouseMove = function (e) {
      if (!state.scene || !state.currentScene) return;

      // Check if mouse has moved enough to start dragging
      if (!hasMoved && (startX !== 0 || startY !== 0)) {
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isDragging = true;
          hasMoved = true;
          wrapper.style.cursor = "grabbing";
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
          // Prevent Marzipano from handling the drag
          wrapper._isDraggingHotspot = true;

          // Update overlay cursor if it exists
          if (wrapper._dragOverlay) {
            wrapper._dragOverlay.style.cursor = "grabbing";
          }
        }
      }

      if (!isDragging) return;

      // Prevent Marzipano view movement when dragging hotspot
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Ensure overlay is still blocking
      if (
        !wrapper._dragOverlay ||
        !document.body.contains(wrapper._dragOverlay)
      ) {
        const overlay = document.createElement("div");
        overlay.className = "hotspot-drag-overlay";
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999999;
          pointer-events: auto;
          cursor: grabbing;
          background: transparent;
        `;
        document.body.appendChild(overlay);
        wrapper._dragOverlay = overlay;
      }

      const panoElement = document.getElementById("pano");
      if (!panoElement) return;

      const rect = panoElement.getBoundingClientRect();
      const screenCoords = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const view = state.scene.view();
      const coords = view.screenToCoordinates(screenCoords);

      // Update hotspot position
      if (hotspotType === "link" && state.currentScene.linkHotspots) {
        if (state.currentScene.linkHotspots[hotspotIndex]) {
          state.currentScene.linkHotspots[hotspotIndex].yaw = coords.yaw;
          state.currentScene.linkHotspots[hotspotIndex].pitch = coords.pitch;
        }
      } else if (hotspotType === "info" && state.currentScene.infoHotspots) {
        if (state.currentScene.infoHotspots[hotspotIndex]) {
          state.currentScene.infoHotspots[hotspotIndex].yaw = coords.yaw;
          state.currentScene.infoHotspots[hotspotIndex].pitch = coords.pitch;
        }
      }

      // Update hotspot position directly using stored Marzipano hotspot reference
      if (wrapper._marzipanoHotspot) {
        wrapper._marzipanoHotspot.setPosition({
          yaw: coords.yaw,
          pitch: coords.pitch,
        });
      }

      // Also update data
      if (hotspotType === "link" && state.currentScene.linkHotspots) {
        if (state.currentScene.linkHotspots[hotspotIndex]) {
          state.currentScene.linkHotspots[hotspotIndex].yaw = coords.yaw;
          state.currentScene.linkHotspots[hotspotIndex].pitch = coords.pitch;
        }
      } else if (hotspotType === "info" && state.currentScene.infoHotspots) {
        if (state.currentScene.infoHotspots[hotspotIndex]) {
          state.currentScene.infoHotspots[hotspotIndex].yaw = coords.yaw;
          state.currentScene.infoHotspots[hotspotIndex].pitch = coords.pitch;
        }
      }

      markAsChanged();
    };

    const handleMouseUp = function (e) {
      if (isDragging) {
        isDragging = false;
        hasMoved = false;
        wrapper.style.cursor = "grab";
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        wrapper._wasDragging = true;
        wrapper._isDraggingHotspot = false;

        // Remove overlay to restore Marzipano events
        if (wrapper._dragOverlay) {
          if (wrapper._dragOverlay.parentNode) {
            wrapper._dragOverlay.parentNode.removeChild(wrapper._dragOverlay);
          }
          wrapper._dragOverlay = null;
        }

        // Prevent click event if we were dragging
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Reset flag after a short delay
        setTimeout(() => {
          wrapper._wasDragging = false;
        }, 100);
      } else {
        hasMoved = false;
        startX = 0;
        startY = 0;
        wrapper._isDraggingHotspot = false;

        // Remove overlay if we didn't actually drag
        if (wrapper._dragOverlay) {
          if (wrapper._dragOverlay.parentNode) {
            wrapper._dragOverlay.parentNode.removeChild(wrapper._dragOverlay);
          }
          wrapper._dragOverlay = null;
        }
      }
    };

    // Add drag handlers to icon/iconWrapper
    const dragTarget =
      hotspotType === "link"
        ? wrapper.querySelector(".link-hotspot-icon")
        : wrapper.querySelector(".info-hotspot-icon-wrapper");

    if (dragTarget) {
      dragTarget.addEventListener("mousedown", handleMouseDown, true); // Use capture phase
      dragTarget.style.cursor = "grab";
      dragTarget.style.userSelect = "none";
      dragTarget.style.webkitUserSelect = "none";
      dragTarget.style.mozUserSelect = "none";
      dragTarget.style.msUserSelect = "none";
    } else {
      console.warn(
        "Drag target not found for hotspot:",
        hotspotType,
        hotspotIndex
      );
    }

    // Add global mouse move and up handlers
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Store cleanup function
    wrapper._cleanupDrag = function () {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // Reset drag state
      wrapper._isDraggingHotspot = false;
      wrapper._wasDragging = false;

      // Remove overlay if still exists
      if (wrapper._dragOverlay) {
        if (wrapper._dragOverlay.parentNode) {
          wrapper._dragOverlay.parentNode.removeChild(wrapper._dragOverlay);
        }
        wrapper._dragOverlay = null;
      }
    };
  }

  // Create Link Hotspot Element
  function createLinkHotspotElement(hotspot, hotspotIndex) {
    const wrapper = document.createElement("div");
    wrapper.className = "hotspot link-hotspot";
    wrapper.dataset.hotspotIndex = hotspotIndex;
    wrapper.dataset.hotspotType = "link";

    // Create SVG arrow icon with rotation
    const icon = document.createElement("div");
    icon.className = "link-hotspot-icon";
    const rotation = hotspot.rotation || 0;
    // Base rotation -90deg (pointing up) + hotspot rotation
    const totalRotation = -90 + (rotation * 180) / Math.PI; // Convert rad to deg
    icon.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${totalRotation}deg);">
        <path d="M16 4 L28 16 L16 28 M28 16 L4 16" 
              stroke="white" 
              stroke-width="3" 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              fill="none"/>
      </svg>
    `;

    // Create hover menu
    const menu = document.createElement("div");
    menu.className = "hotspot-menu";
    menu.innerHTML = `
      <button class="hotspot-menu-item" data-action="navigate" title="Go to this point">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
        </svg>
      </button>
      <button class="hotspot-menu-item" data-action="rotate" title="Rotate 45°">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
        </svg>
      </button>
      <button class="hotspot-menu-item" data-action="edit" title="Edit target">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
        </svg>
      </button>
      <button class="hotspot-menu-item" data-action="delete" title="Delete hotspot">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
        </svg>
      </button>
    `;

    // Add menu event handlers
    menu.querySelectorAll(".hotspot-menu-item").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const action = this.dataset.action;
        handleHotspotAction(action, "link", hotspotIndex, hotspot);
      });
    });

    // Create invisible bridge between hotspot and menu
    const bridge = document.createElement("div");
    bridge.className = "hotspot-menu-bridge";
    bridge.style.display = "none";

    // Show/hide menu and bridge on hover
    let hideTimeout = null;
    wrapper.addEventListener("mouseenter", function () {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      menu.style.display = "flex";
      bridge.style.display = "block";
    });

    wrapper.addEventListener("mouseleave", function () {
      hideTimeout = setTimeout(() => {
        menu.style.display = "none";
        bridge.style.display = "none";
      }, 100);
    });

    menu.addEventListener("mouseenter", function () {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      menu.style.display = "flex";
      bridge.style.display = "block";
    });

    menu.addEventListener("mouseleave", function () {
      hideTimeout = setTimeout(() => {
        menu.style.display = "none";
        bridge.style.display = "none";
      }, 100);
    });

    bridge.addEventListener("mouseenter", function () {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      menu.style.display = "flex";
      bridge.style.display = "block";
    });

    bridge.addEventListener("mouseleave", function () {
      hideTimeout = setTimeout(() => {
        menu.style.display = "none";
        bridge.style.display = "none";
      }, 100);
    });

    // Remove click handler to navigate - only use "go to this point" button
    // Click on hotspot no longer navigates to scene

    // Create circular outline
    const circle = document.createElement("div");
    circle.className = "hotspot-circle";

    // Create tooltip (fade in from right)
    const tooltip = document.createElement("div");
    tooltip.className = "hotspot-tooltip link-hotspot-tooltip";
    const targetScene = state.tourData.scenes.find(
      (s) => s.id === hotspot.target
    );
    tooltip.textContent = targetScene ? targetScene.name : hotspot.target;

    wrapper.appendChild(circle);
    wrapper.appendChild(icon);
    wrapper.appendChild(bridge);
    wrapper.appendChild(menu);
    wrapper.appendChild(tooltip);

    // Setup drag and drop
    setupHotspotDrag(wrapper, "link", hotspotIndex, hotspot);

    return wrapper;
  }

  // Create Info Hotspot Element
  function createInfoHotspotElement(hotspot, hotspotIndex) {
    const wrapper = document.createElement("div");
    wrapper.className = "hotspot info-hotspot";
    wrapper.dataset.hotspotIndex = hotspotIndex;
    wrapper.dataset.hotspotType = "info";

    // Create icon wrapper with SVG "i" icon
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "info-hotspot-icon-wrapper";
    const icon = document.createElement("div");
    icon.className = "info-hotspot-icon";
    icon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" 
                stroke="white" 
                stroke-width="2" 
                fill="none"/>
        <line x1="12" y1="8" x2="12" y2="12" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round"/>
        <line x1="12" y1="16" x2="12" y2="16" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round"/>
      </svg>
    `;
    iconWrapper.appendChild(icon);

    // Create hover menu
    const menu = document.createElement("div");
    menu.className = "hotspot-menu";
    menu.innerHTML = `
      <button class="hotspot-menu-item" data-action="navigate" title="Go to this point">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
        </svg>
      </button>
      <button class="hotspot-menu-item" data-action="rotate" title="Rotate 45°">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
        </svg>
      </button>
      <button class="hotspot-menu-item" data-action="edit" title="Edit hotspot">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
        </svg>
      </button>
      <button class="hotspot-menu-item" data-action="delete" title="Delete hotspot">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
        </svg>
      </button>
    `;

    // Add menu event handlers
    menu.querySelectorAll(".hotspot-menu-item").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const action = this.dataset.action;
        handleHotspotAction(action, "info", hotspotIndex, hotspot);
      });
    });

    // Create invisible bridge between hotspot and menu
    const bridge = document.createElement("div");
    bridge.className = "hotspot-menu-bridge";
    bridge.style.display = "none";

    // Show/hide menu and bridge on hover
    let hideTimeout = null;
    wrapper.addEventListener("mouseenter", function () {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      menu.style.display = "flex";
      bridge.style.display = "block";
    });

    wrapper.addEventListener("mouseleave", function () {
      hideTimeout = setTimeout(() => {
        menu.style.display = "none";
        bridge.style.display = "none";
      }, 100);
    });

    menu.addEventListener("mouseenter", function () {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      menu.style.display = "flex";
      bridge.style.display = "block";
    });

    menu.addEventListener("mouseleave", function () {
      hideTimeout = setTimeout(() => {
        menu.style.display = "none";
        bridge.style.display = "none";
      }, 100);
    });

    bridge.addEventListener("mouseenter", function () {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      menu.style.display = "flex";
      bridge.style.display = "block";
    });

    bridge.addEventListener("mouseleave", function () {
      hideTimeout = setTimeout(() => {
        menu.style.display = "none";
        bridge.style.display = "none";
      }, 100);
    });

    // Create popup content
    const text = document.createElement("div");
    text.className = "info-hotspot-text";

    // Create header inside popup
    const header = document.createElement("div");
    header.className = "info-hotspot-header";

    // Create title (editable)
    const titleWrapper = document.createElement("div");
    titleWrapper.className = "info-hotspot-title-wrapper";
    const title = document.createElement("input");
    title.type = "text";
    title.className = "info-hotspot-title";
    title.value = hotspot.title;
    title.readOnly = true;
    titleWrapper.appendChild(title);

    // Make title editable on double-click
    title.addEventListener("dblclick", function (e) {
      e.stopPropagation();
      this.readOnly = false;
      this.focus();
      this.select();
    });

    title.addEventListener("blur", function () {
      this.readOnly = true;
      if (hotspot.title !== this.value) {
        hotspot.title = this.value;
        markAsChanged();
      }
    });

    title.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.blur();
      }
    });

    // Create close button
    const closeWrapper = document.createElement("div");
    closeWrapper.className = "info-hotspot-close-wrapper";
    const closeIcon = document.createElement("div");
    closeIcon.className = "info-hotspot-close-icon";
    closeIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <line x1="4" y1="4" x2="12" y2="12" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round"/>
        <line x1="12" y1="4" x2="4" y2="12" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round"/>
      </svg>
    `;
    closeWrapper.appendChild(closeIcon);

    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text content (editable)
    const textContent = document.createElement("textarea");
    textContent.className = "info-hotspot-text-content";
    textContent.value = hotspot.text;
    textContent.readOnly = true;
    textContent.rows = 3;

    // Make text editable on double-click
    textContent.addEventListener("dblclick", function (e) {
      e.stopPropagation();
      this.readOnly = false;
      this.focus();
    });

    textContent.addEventListener("blur", function () {
      this.readOnly = true;
      if (hotspot.text !== this.value) {
        hotspot.text = this.value;
        markAsChanged();
      }
    });

    text.appendChild(header);
    text.appendChild(textContent);

    wrapper.appendChild(iconWrapper);
    wrapper.appendChild(bridge);
    wrapper.appendChild(menu);
    wrapper.appendChild(text);

    // Toggle visibility on click
    const toggle = function () {
      wrapper.classList.toggle("visible");
    };

    iconWrapper.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle();
    });

    closeWrapper.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle();
    });

    // Prevent event propagation
    wrapper.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    // Setup drag and drop
    setupHotspotDrag(wrapper, "info", hotspotIndex, hotspot);

    return wrapper;
  }

  // Render Hotspots
  function renderHotspots(sceneData) {
    if (!state.scene || !sceneData) return;

    const hotspotContainer = state.scene.hotspotContainer();

    // Clear existing hotspots (if any)
    const existingHotspots = hotspotContainer.listHotspots();
    existingHotspots.forEach((hotspot) => {
      // Cleanup drag handlers if they exist
      const element = hotspot.element();
      if (element && element._cleanupDrag) {
        element._cleanupDrag();
      }
      hotspotContainer.destroyHotspot(hotspot);
    });

    // Render link hotspots
    if (sceneData.linkHotspots && Array.isArray(sceneData.linkHotspots)) {
      sceneData.linkHotspots.forEach((hotspot, index) => {
        const element = createLinkHotspotElement(hotspot, index);
        const marzipanoHotspot = hotspotContainer.createHotspot(element, {
          yaw: hotspot.yaw,
          pitch: hotspot.pitch,
        });
        // Store Marzipano hotspot reference in element for drag updates
        element._marzipanoHotspot = marzipanoHotspot;
      });
    }

    // Render info hotspots
    if (sceneData.infoHotspots && Array.isArray(sceneData.infoHotspots)) {
      sceneData.infoHotspots.forEach((hotspot, index) => {
        const element = createInfoHotspotElement(hotspot, index);
        const marzipanoHotspot = hotspotContainer.createHotspot(element, {
          yaw: hotspot.yaw,
          pitch: hotspot.pitch,
        });
        // Store Marzipano hotspot reference in element for drag updates
        element._marzipanoHotspot = marzipanoHotspot;
      });
    }
  }

  // Handle Hotspot Actions
  function handleHotspotAction(action, type, index, hotspot) {
    if (!state.currentScene || !state.scene) return;

    switch (action) {
      case "navigate":
        if (type === "link") {
          // For link hotspots, navigate to target scene
          const targetScene = state.tourData.scenes.find(
            (s) => s.id === hotspot.target
          );
          if (targetScene) {
            const targetIndex = state.tourData.scenes.findIndex(
              (s) => s.id === hotspot.target
            );
            selectScene(targetIndex);
          }
        } else {
          // For info hotspots, navigate to hotspot position in current scene
          state.scene.lookTo(
            {
              yaw: hotspot.yaw,
              pitch: hotspot.pitch,
            },
            {
              transitionDuration: 1000,
            }
          );
        }
        break;

      case "rotate":
        // Rotate arrow icon 45 degrees (not the view)
        if (type === "link") {
          // Update rotation in hotspot data
          if (!hotspot.rotation) {
            hotspot.rotation = 0;
          }
          hotspot.rotation += Math.PI / 4; // 45 degrees
          // Normalize to 0-2π
          hotspot.rotation = hotspot.rotation % (2 * Math.PI);

          // Update in scene data
          state.currentScene.linkHotspots[index] = hotspot;
          markAsChanged();

          // Re-render to apply rotation
          renderHotspots(state.currentScene);
        }
        break;

      case "edit":
        // Edit hotspot
        if (type === "link") {
          editLinkHotspot(index, hotspot);
        } else {
          editInfoHotspot(index, hotspot);
        }
        break;

      case "delete":
        // Delete hotspot
        if (confirm("Are you sure you want to delete this hotspot?")) {
          if (type === "link") {
            state.currentScene.linkHotspots.splice(index, 1);
          } else {
            state.currentScene.infoHotspots.splice(index, 1);
          }
          markAsChanged();
          renderHotspots(state.currentScene);
        }
        break;
    }
  }

  // Edit Link Hotspot
  function editLinkHotspot(index, hotspot) {
    state.pendingHotspot = {
      type: "link",
      index: index,
      hotspot: hotspot,
    };

    // Populate target dropdown
    elements.linkHotspotTarget.innerHTML =
      '<option value="">Select a scene...</option>';
    state.tourData.scenes.forEach((scene) => {
      if (scene.id !== state.currentScene.id) {
        const option = document.createElement("option");
        option.value = scene.id;
        option.textContent = scene.name;
        if (scene.id === hotspot.target) {
          option.selected = true;
        }
        elements.linkHotspotTarget.appendChild(option);
      }
    });

    // Update modal title
    const modalTitle = document.querySelector("#linkHotspotModal h2");
    if (modalTitle) {
      modalTitle.textContent = "Edit Link Hotspot";
    }

    showModal("linkHotspotModal");
  }

  // Edit Info Hotspot
  function editInfoHotspot(index, hotspot) {
    state.pendingHotspot = {
      type: "info",
      index: index,
      hotspot: hotspot,
    };

    // Populate form
    elements.infoHotspotTitle.value = hotspot.title || "";
    elements.infoHotspotText.value = hotspot.text || "";

    // Update modal title
    const modalTitle = document.querySelector("#infoHotspotModal h2");
    if (modalTitle) {
      modalTitle.textContent = "Edit Info Hotspot";
    }

    showModal("infoHotspotModal");
  }

  // Add Panoramas
  function handleAddPanoramas(e) {
    const files = Array.from(e.target.files);

    files.forEach((file, index) => {
      const reader = new FileReader();

      reader.onload = function (event) {
        const imageUrl = event.target.result;
        const sceneId = `scene-${Date.now()}-${index}`;

        // Store image
        state.sceneImages[sceneId] = imageUrl;

        // Create scene data (for equirectangular)
        const scene = {
          id: sceneId,
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          levels: [
            { width: 512, height: 256 },
            { width: 1024, height: 512 },
            { width: 2048, height: 1024 },
            { width: 4096, height: 2048 },
          ],
          faceSize: 2048,
          initialViewParameters: {
            pitch: 0,
            yaw: 0,
            fov: 1.5707963267948966,
          },
          linkHotspots: [],
          infoHotspots: [],
        };

        state.tourData.scenes.push(scene);
        markAsChanged();
        updateUI();

        // Auto-select first scene
        if (state.tourData.scenes.length === 1) {
          selectScene(0);
        }
      };

      reader.readAsDataURL(file);
    });

    // Clear input
    e.target.value = "";
  }

  // Edit Scene Name
  window.editSceneName = function (index) {
    const scene = state.tourData.scenes[index];
    const newName = prompt("Enter new name:", scene.name);
    if (newName && newName.trim()) {
      scene.name = newName.trim();
      markAsChanged();
      updateUI();
    }
  };

  // Delete Scene
  window.deleteScene = function (index) {
    if (confirm("Are you sure you want to delete this scene?")) {
      const scene = state.tourData.scenes[index];
      delete state.sceneImages[scene.id];
      state.tourData.scenes.splice(index, 1);

      if (state.currentSceneIndex === index) {
        state.currentSceneIndex = -1;
        state.currentScene = null;
      } else if (state.currentSceneIndex > index) {
        state.currentSceneIndex--;
      }

      markAsChanged();
      updateUI();
    }
  };

  // Update Settings
  function updateSettings() {
    state.tourData.settings = {
      mouseViewMode: elements.mouseViewModeDrag.checked ? "drag" : "qtvr",
      autorotateEnabled: elements.autorotateEnabled.checked,
      fullscreenButton: elements.fullscreenButton.checked,
      viewControlButtons: elements.viewControlButtons.checked,
    };
    markAsChanged();
  }

  // Start Add Info Hotspot
  function startAddInfoHotspot() {
    if (!state.currentScene) {
      alert("Please select a scene first");
      return;
    }

    // Show hint
    showHotspotHint("Click on the panorama to place an info hotspot");

    // Set mode
    state.addingHotspot = "info";

    // Add click listener to panorama
    const panoElement = document.getElementById("pano");
    const clickHandler = function (e) {
      if (state.addingHotspot === "info") {
        // Check if scene is available
        if (!state.scene) {
          alert("Scene is not ready. Please wait for the scene to load.");
          return;
        }
        // Get click position and convert to coordinates
        const view = state.scene.view();
        const rect = panoElement.getBoundingClientRect();
        const screenCoords = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const coords = view.screenToCoordinates(screenCoords);

        state.pendingHotspot = {
          type: "info",
          yaw: coords.yaw,
          pitch: coords.pitch,
        };

        // Remove click handler
        panoElement.removeEventListener("click", clickHandler);
        state.addingHotspot = null;
        hideHotspotHint();

        showModal("infoHotspotModal");
      }
    };
    panoElement.addEventListener("click", clickHandler);
  }

  // Save Info Hotspot
  function saveInfoHotspot() {
    const title = elements.infoHotspotTitle.value.trim();
    const text = elements.infoHotspotText.value.trim();

    if (!title) {
      alert("Please enter a title");
      return;
    }

    // Check if editing existing hotspot
    if (state.pendingHotspot.index !== undefined) {
      // Update existing hotspot - preserve yaw, pitch
      const existingHotspot =
        state.currentScene.infoHotspots[state.pendingHotspot.index];
      if (existingHotspot.title !== title || existingHotspot.text !== text) {
        existingHotspot.title = title;
        existingHotspot.text = text;
        markAsChanged();
      }
    } else {
      // Create new hotspot
      const hotspot = {
        yaw: state.pendingHotspot.yaw,
        pitch: state.pendingHotspot.pitch,
        title: title,
        text: text,
      };
      state.currentScene.infoHotspots.push(hotspot);
      markAsChanged();
    }

    // Clear form and reset pending hotspot
    elements.infoHotspotTitle.value = "";
    elements.infoHotspotText.value = "";
    state.pendingHotspot = null;

    // Reset modal title
    const modalTitle = document.querySelector("#infoHotspotModal h2");
    if (modalTitle) {
      modalTitle.textContent = "Add Info Hotspot";
    }

    hideModal("infoHotspotModal");

    // Re-render hotspots
    renderHotspots(state.currentScene);
  }

  // Start Add Link Hotspot
  function startAddLinkHotspot() {
    if (!state.currentScene) {
      alert("Please select a scene first");
      return;
    }

    if (state.tourData.scenes.length < 2) {
      alert("You need at least 2 scenes to create a link hotspot");
      return;
    }

    // Show hint
    showHotspotHint("Click on the panorama to place a link hotspot");

    // Set mode
    state.addingHotspot = "link";

    // Add click listener to panorama
    const panoElement = document.getElementById("pano");
    const clickHandler = function (e) {
      if (state.addingHotspot === "link") {
        // Check if scene is available
        if (!state.scene) {
          alert("Scene is not ready. Please wait for the scene to load.");
          return;
        }
        // Get click position and convert to coordinates
        const view = state.scene.view();
        const rect = panoElement.getBoundingClientRect();
        const screenCoords = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const coords = view.screenToCoordinates(screenCoords);

        state.pendingHotspot = {
          type: "link",
          yaw: coords.yaw,
          pitch: coords.pitch,
        };

        // Remove click handler
        panoElement.removeEventListener("click", clickHandler);
        state.addingHotspot = null;
        hideHotspotHint();

        // Populate target dropdown
        elements.linkHotspotTarget.innerHTML =
          '<option value="">Select a scene...</option>';
        state.tourData.scenes.forEach((scene) => {
          if (scene.id !== state.currentScene.id) {
            const option = document.createElement("option");
            option.value = scene.id;
            option.textContent = scene.name;
            elements.linkHotspotTarget.appendChild(option);
          }
        });

        // Reset modal title
        const modalTitle = document.querySelector("#linkHotspotModal h2");
        if (modalTitle) {
          modalTitle.textContent = "Add Link Hotspot";
        }

        showModal("linkHotspotModal");
      }
    };
    panoElement.addEventListener("click", clickHandler);
  }

  // Save Link Hotspot
  function saveLinkHotspot() {
    const target = elements.linkHotspotTarget.value;

    if (!target) {
      alert("Please select a target scene");
      return;
    }

    // Check if editing existing hotspot
    if (state.pendingHotspot.index !== undefined) {
      // Update existing hotspot - preserve yaw, pitch, rotation
      const existingHotspot =
        state.currentScene.linkHotspots[state.pendingHotspot.index];
      if (existingHotspot.target !== target) {
        existingHotspot.target = target;
        markAsChanged();
      }
      // Keep existing rotation if it exists
      if (!existingHotspot.rotation) {
        existingHotspot.rotation = 0;
      }
    } else {
      // Create new hotspot
      const hotspot = {
        yaw: state.pendingHotspot.yaw,
        pitch: state.pendingHotspot.pitch,
        rotation: 0,
        target: target,
      };
      state.currentScene.linkHotspots.push(hotspot);
      markAsChanged();
    }

    // Reset pending hotspot
    state.pendingHotspot = null;

    // Reset modal title
    const modalTitle = document.querySelector("#linkHotspotModal h2");
    if (modalTitle) {
      modalTitle.textContent = "Add Link Hotspot";
    }

    hideModal("linkHotspotModal");

    // Re-render hotspots
    renderHotspots(state.currentScene);
  }

  // Set Initial View
  function setInitialView() {
    if (!state.currentScene || !state.scene) {
      alert("Please select a scene first");
      return;
    }

    // Show hint
    showHotspotHint(
      "Move the camera to set the initial view, then click to confirm"
    );

    // Set mode
    state.addingHotspot = "initialView";

    // Add click listener to panorama
    const panoElement = document.getElementById("pano");
    const clickHandler = function (e) {
      if (state.addingHotspot === "initialView") {
        // Check if scene is available
        if (!state.scene) {
          alert("Scene is not ready. Please wait for the scene to load.");
          return;
        }
        // Get current view parameters
        const view = state.scene.view();
        const params = view.parameters();

        // Save to scene data
        state.currentScene.initialViewParameters = {
          pitch: params.pitch,
          yaw: params.yaw,
          fov: params.fov,
        };
        markAsChanged();

        // Remove click handler
        panoElement.removeEventListener("click", clickHandler);
        state.addingHotspot = null;
        hideHotspotHint();

        // Show indicator
        showInitialViewIndicator();
      }
    };
    panoElement.addEventListener("click", clickHandler);
  }

  // Show Hotspot Hint
  function showHotspotHint(message) {
    // Remove existing hint if any
    const existing = document.querySelector(".hotspot-hint");
    if (existing) {
      existing.remove();
    }

    const hint = document.createElement("div");
    hint.className = "hotspot-hint";
    hint.textContent = message;

    const previewArea = document.querySelector(".preview-area");
    if (previewArea) {
      previewArea.appendChild(hint);
    }
  }

  // Hide Hotspot Hint
  function hideHotspotHint() {
    const hint = document.querySelector(".hotspot-hint");
    if (hint) {
      hint.remove();
    }
  }

  // Show Initial View Indicator
  function showInitialViewIndicator() {
    // Remove existing indicator if any
    const existing = document.querySelector(".initial-view-indicator");
    if (existing) {
      existing.remove();
    }

    // Create indicator
    const indicator = document.createElement("div");
    indicator.className = "initial-view-indicator";
    indicator.innerHTML = `
      <div class="icon">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" fill="white"/>
        </svg>
      </div>
      <div class="text">Initial view set</div>
    `;

    // Add to preview area
    const previewArea = document.querySelector(".preview-area");
    if (previewArea) {
      previewArea.appendChild(indicator);
    }

    // Remove after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.classList.add("fade-out");
        setTimeout(() => {
          indicator.remove();
        }, 300);
      }
    }, 3000);
  }

  // Import Tour
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    hideModal("importModal");
    showModal("exportModal");
    elements.exportProgress.style.width = "0%";
    elements.exportStatus.textContent = "Extracting files...";

    const reader = new FileReader();

    reader.onload = function (event) {
      JSZip.loadAsync(event.target.result)
        .then(function (zip) {
          elements.exportProgress.style.width = "30%";
          elements.exportStatus.textContent = "Processing tour data...";

          return processTourZip(zip);
        })
        .then(function () {
          elements.exportProgress.style.width = "100%";
          elements.exportStatus.textContent = "Import complete!";

          setTimeout(() => {
            hideModal("exportModal");
            updateUI();
            if (state.tourData.scenes.length > 0) {
              selectScene(0);
            }
          }, 1000);
        })
        .catch(function (error) {
          console.error("Import error:", error);
          alert("Failed to import tour: " + error.message);
          hideModal("exportModal");
        });
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  // Process Tour ZIP
  async function processTourZip(zip) {
    // Find and parse tour data first
    let tourData = null;
    let dataContent = null;

    // Look for data.js (could be in root or app-files/)
    let dataFile = zip.file(/app-files\/data\.js$/i)[0];
    if (!dataFile) {
      dataFile = zip.file(/data\.js$/i)[0];
    }

    if (dataFile) {
      dataContent = await dataFile.async("string");
      const match = dataContent.match(/var\s+\w+\s*=\s*({[\s\S]*});?\s*$/);
      if (match) {
        try {
          let objString = match[1].trim();

          // Remove BOM and other invisible characters at the start
          objString = objString.replace(/^\uFEFF/, "");

          // Ensure it starts with { and ends with }
          if (!objString.startsWith("{")) {
            throw new Error("Object string does not start with {");
          }

          // Try to parse as JavaScript object literal (not JSON)
          // This handles unquoted property names which are valid in JS but not JSON
          // We use Function constructor which is safer than eval()
          try {
            // First try JSON.parse (in case it's valid JSON)
            tourData = JSON.parse(objString);
            console.log("=== DEBUG: Parsed as valid JSON ===");
          } catch (jsonError) {
            // If JSON.parse fails, try parsing as JavaScript object literal
            console.log(
              "=== DEBUG: JSON.parse failed, trying JS object literal parse ==="
            );

            // Clean up: remove trailing commas before } or ]
            let cleanedObjString = objString.replace(/,(\s*[}\]])/g, "$1");

            // Use Function constructor to safely evaluate the object literal
            // This returns the object by wrapping it in a return statement
            const func = new Function("return " + cleanedObjString);
            tourData = func();
            console.log("=== DEBUG: Parsed as JavaScript object literal ===");
          }

          if (!tourData || typeof tourData !== "object") {
            throw new Error("Parsed result is not a valid object");
          }
        } catch (error) {
          console.error("Error parsing tour data:", error);
          console.error(
            "Data content preview (first 500 chars):",
            match[1].substring(0, 500)
          );
          throw new Error(
            `Failed to parse tour data: ${error.message}. Please ensure the data.js file contains valid JavaScript object syntax.`
          );
        }
      } else {
        // Try alternative patterns
        const altMatch1 = dataContent.match(/=\s*({[\s\S]*});/);
        const altMatch2 = dataContent.match(/({[\s\S]*});/);
        if (altMatch1 || altMatch2) {
          const altMatch = altMatch1 || altMatch2;
          try {
            let objString = altMatch[1].trim().replace(/^\uFEFF/, "");
            let cleanedObjString = objString.replace(/,(\s*[}\]])/g, "$1");
            const func = new Function("return " + cleanedObjString);
            tourData = func();
          } catch (error) {
            console.error("Error parsing with alternative pattern:", error);
            throw new Error("Tour data not found or invalid in ZIP file");
          }
        } else {
          throw new Error("Tour data not found in ZIP file");
        }
      }
    }

    if (!tourData) {
      throw new Error("Tour data not found in ZIP file");
    }

    console.log("Found tour data with", tourData.scenes.length, "scenes");

    // Load all tile images
    const tilePromises = [];
    const tileData = {};

    // Iterate through all files and find tile images
    // Tiles can be in app-files/tiles/sceneId/level/face/y/x.jpg or tiles/sceneId/level/face/y/x.jpg
    console.log("Scanning ZIP for tile images...");

    zip.forEach(function (relativePath, file) {
      // Skip directories
      if (file.dir) {
        return;
      }

      // Check if this is a tile image (jpg/png in tiles folder)
      const isTileImage =
        relativePath.match(/\.(jpg|jpeg|png)$/i) &&
        (relativePath.startsWith("app-files/tiles/") ||
          relativePath.startsWith("tiles/"));

      if (!isTileImage) {
        return;
      }

      // Skip preview.jpg files
      if (relativePath.includes("preview.jpg")) {
        return;
      }

      const promise = file.async("base64").then(function (base64) {
        const ext = relativePath.split(".").pop().toLowerCase();
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${base64}`;

        // Parse path: app-files/tiles/sceneId/level/face/y/x.jpg or tiles/sceneId/level/face/y/x.jpg
        // Remove the prefix to get: sceneId/level/face/y/x.jpg
        let pathWithoutPrefix = relativePath;
        if (pathWithoutPrefix.startsWith("app-files/tiles/")) {
          pathWithoutPrefix = pathWithoutPrefix.replace("app-files/tiles/", "");
        } else if (pathWithoutPrefix.startsWith("tiles/")) {
          pathWithoutPrefix = pathWithoutPrefix.replace("tiles/", "");
        }

        const pathParts = pathWithoutPrefix.split("/");
        if (pathParts.length >= 5) {
          const sceneId = pathParts[0];
          const level = pathParts[1];
          const face = pathParts[2];
          const y = pathParts[3];
          const x = pathParts[4].replace(/\.(jpg|jpeg|png)$/i, "");

          if (!tileData[sceneId]) {
            tileData[sceneId] = {};
          }

          const tileKey = `${level}/${face}/${y}/${x}`;
          tileData[sceneId][tileKey] = dataUrl;

          return { sceneId, level, face, y, x, dataUrl };
        } else {
          console.warn(
            "Unexpected tile path format:",
            relativePath,
            "->",
            pathWithoutPrefix,
            "parts:",
            pathParts.length
          );
        }
      });
      tilePromises.push(promise);
    });

    console.log("Found", tilePromises.length, "tile files to process");
    await Promise.all(tilePromises);

    console.log("Loaded tiles for scenes:", Object.keys(tileData));
    console.log(
      "Total tiles loaded:",
      Object.values(tileData).reduce(
        (sum, scene) => sum + Object.keys(scene).length,
        0
      )
    );

    // Map tiles to scenes
    tourData.scenes.forEach((scene) => {
      if (tileData[scene.id]) {
        console.log(
          `Scene ${scene.id}: ${Object.keys(tileData[scene.id]).length} tiles`
        );
        state.sceneImages[scene.id] = {
          tiles: tileData[scene.id],
          fallback:
            Object.values(tileData[scene.id])[0] ||
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        };
      } else {
        console.warn(`No tiles found for scene: ${scene.id}`);
        console.log("Available scene IDs in tileData:", Object.keys(tileData));
      }
    });

    // Update state
    state.tourData = tourData;
    elements.projectName.value = tourData.name || "Imported Project";
    markAsSaved(); // Import resets unsaved changes

    console.log("Import complete. Total scenes:", tourData.scenes.length);
  }

  // Export Tour
  function exportTour() {
    if (state.tourData.scenes.length === 0) {
      alert("Please add at least one panorama before exporting");
      return;
    }

    showModal("exportModal");
    elements.exportProgress.style.width = "0%";
    elements.exportStatus.textContent = "Preparing export...";

    setTimeout(() => {
      elements.exportProgress.style.width = "50%";
      elements.exportStatus.textContent = "Generating data file...";

      // Create tour data as JavaScript file
      const dataContent = `var APP_DATA = ${JSON.stringify(
        state.tourData,
        null,
        2
      )};`;

      setTimeout(() => {
        elements.exportProgress.style.width = "100%";
        elements.exportStatus.textContent = "Download starting...";

        // Create blob and download
        const blob = new Blob([dataContent], {
          type: "application/javascript",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "data.js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        markAsSaved(); // Export resets unsaved changes
        setTimeout(() => {
          hideModal("exportModal");
        }, 1000);
      }, 300);
    }, 300);
  }

  // Toggle Help
  function toggleHelp() {
    elements.help.classList.toggle("hidden");
  }

  // Show Modal
  function showModal(modalId) {
    elements[modalId].classList.remove("hidden");
  }

  // Hide Modal
  function hideModal(modalId) {
    elements[modalId].classList.add("hidden");
  }

  // Drag and Drop for Import
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove("drag-over");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith(".zip")) {
      elements.importFileInput.files = files;
      handleImportFile({ target: elements.importFileInput });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

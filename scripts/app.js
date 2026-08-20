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
    importedArchive: null, // Preserve non-tour files from imported archives
    addingHotspot: null, // "info", "link", or "initialView"
    hasUnsavedChanges: false, // Track if there are unsaved changes
  };

  // DOM Elements
  const elements = {
    // Header
    saveStatus: document.getElementById("saveStatus"),
    resetProjectButton: document.getElementById("resetProjectButton"),
    saveProjectButton: document.getElementById("saveProjectButton"),
    saveToFileButton: document.getElementById("saveToFileButton"),
    loadFileButton: document.getElementById("loadFileButton"),
    loadFileInput: document.getElementById("loadFileInput"),
    loadProjectButton: document.getElementById("loadProjectButton"),
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
    infoHotspotLinkUrl: document.getElementById("infoHotspotLinkUrl"),
    saveInfoHotspotButton: document.getElementById("saveInfoHotspotButton"),
    cancelInfoHotspotButton: document.getElementById("cancelInfoHotspotButton"),

    linkHotspotModal: document.getElementById("linkHotspotModal"),
    linkHotspotTarget: document.getElementById("linkHotspotTarget"),
    linkHotspotShowInSceneList: document.getElementById("linkHotspotShowInSceneList"),
    captureTargetViewBtn: document.getElementById("captureTargetViewBtn"),
    resetTargetViewBtn: document.getElementById("resetTargetViewBtn"),
    targetViewYawInput: document.getElementById("targetViewYawInput"),
    targetViewPitchInput: document.getElementById("targetViewPitchInput"),
    targetViewFovInput: document.getElementById("targetViewFovInput"),
    targetViewStatus: document.getElementById("targetViewStatus"),
    saveLinkHotspotButton: document.getElementById("saveLinkHotspotButton"),
    cancelLinkHotspotButton: document.getElementById("cancelLinkHotspotButton"),

    logoFileInput: document.getElementById("logoFileInput"),
    uploadLogoBtn: document.getElementById("uploadLogoBtn"),
    removeLogoBtn: document.getElementById("removeLogoBtn"),
    brandLogoOverlay: document.getElementById("brandLogoOverlay"),
    brandLogoImg: document.getElementById("brandLogoImg"),

    showHeaderToggle: document.getElementById("showHeaderToggle"),
    showSceneTitleToggle: document.getElementById("showSceneTitleToggle"),
    themeBgColor: document.getElementById("themeBgColor"),
    themeFontColor: document.getElementById("themeFontColor"),
    themeFontSize: document.getElementById("themeFontSize"),
    themeBorderRadius: document.getElementById("themeBorderRadius"),
    themePadding: document.getElementById("themePadding"),
    themeControlPos: document.getElementById("themeControlPos"),

    toggleSceneListBtn: document.getElementById("toggleSceneListBtn"),
    sceneListPreviewContainer: document.getElementById("sceneListPreviewContainer"),
    sceneListPreviewUl: document.getElementById("sceneListPreviewUl"),

    exportModal: document.getElementById("exportModal"),
    exportProgress: document.getElementById("exportProgress"),
    exportStatus: document.getElementById("exportStatus"),
  };

  // IndexedDB Storage Engine
  const DB_NAME = "MarzipanoTourEditorDB";
  const DB_VERSION = 1;
  const STORE_NAME = "projects";
  const PROJECT_KEY = "current_project";

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  let autoSaveTimeout = null;

  function triggerAutoSave() {
    updateSaveStatus("saving", "⏳ Saving...");
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveProjectToDB()
        .then(() => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          updateSaveStatus("saved", `💾 Saved ${timeStr}`);
        })
        .catch((err) => {
          console.error("Auto-save failed:", err);
          updateSaveStatus("error", "⚠️ Save failed");
        });
    }, 1000);
  }

  function updateSaveStatus(type, text) {
    if (!elements.saveStatus) return;
    elements.saveStatus.textContent = text;
    elements.saveStatus.className = `save-status ${type === "saving" ? "saving" : type === "error" ? "error" : ""}`;
  }

  async function saveProjectToDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const dataToSave = {
        tourData: state.tourData,
        sceneImages: state.sceneImages,
        importedArchive: state.importedArchive,
        currentSceneIndex: state.currentSceneIndex,
        savedAt: Date.now()
      };
      const req = store.put(dataToSave, PROJECT_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function loadProjectFromDB() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(PROJECT_KEY);
        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn("Failed to open DB for load:", err);
      return null;
    }
  }

  async function handleManualSave() {
    updateSaveStatus("saving", "⏳ Saving...");
    try {
      await saveProjectToDB();
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      updateSaveStatus("saved", `💾 Saved ${timeStr}`);
      alert(`Project "${state.tourData.name}" saved successfully to browser storage!`);
    } catch (err) {
      alert("Failed to save project to browser storage: " + err.message);
      updateSaveStatus("error", "⚠️ Save failed");
    }
  }

  async function handleManualLoad() {
    const saved = await loadProjectFromDB();
    if (!saved || !saved.tourData || !saved.tourData.scenes || saved.tourData.scenes.length === 0) {
      alert("No saved project found in browser storage.");
      return;
    }
    if (confirm(`Load saved project "${saved.tourData.name}" from browser storage? Unsaved changes in current view will be replaced.`)) {
      state.tourData = saved.tourData;
      state.sceneImages = saved.sceneImages || {};
      state.importedArchive = saved.importedArchive || null;
      elements.projectName.value = state.tourData.name || "Untitled Project";
      const selectIdx = (saved.currentSceneIndex >= 0 && saved.currentSceneIndex < state.tourData.scenes.length) ? saved.currentSceneIndex : 0;
      selectScene(selectIdx);
      const savedTime = saved.savedAt ? new Date(saved.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
      updateSaveStatus("saved", `💾 Loaded ${savedTime}`);
    }
  }

  // Reset Project State
  async function resetProjectState() {
    if (confirm("Are you sure you want to reset the editor and start a new project? All unsaved changes and browser cache will be cleared.")) {
      state.tourData = {
        name: "Untitled Project",
        scenes: [],
        settings: {
          mouseViewMode: "drag",
          autorotateEnabled: false,
          fullscreenButton: true,
          viewControlButtons: true,
        },
      };
      state.sceneImages = {};
      state.importedArchive = null;
      state.currentScene = null;
      state.currentSceneIndex = -1;

      await clearProjectFromDB();

      elements.projectName.value = "Untitled Project";
      if (elements.panoramaName) {
        elements.panoramaName.textContent = "Select a scene to preview";
      }

      if (elements.pano) {
        elements.pano.innerHTML = "";
      }
      state.scene = null;

      updateUI();
      if (elements.help) elements.help.classList.remove("hidden");
      if (elements.preview) elements.preview.classList.add("hidden");
      updateSaveStatus("saved", "💾 Reset completed");
      markAsSaved();
    }
  }

  // Save Project to File (.json)
  function saveProjectToFile() {
    if (!state.tourData.scenes || state.tourData.scenes.length === 0) {
      alert("No scenes to save. Please add at least one scene to the project.");
      return;
    }
    const projectContent = {
      version: "1.0",
      type: "marzipano-project",
      savedAt: new Date().toISOString(),
      tourData: state.tourData,
      sceneImages: state.sceneImages,
      importedArchive: state.importedArchive
    };
    const jsonString = JSON.stringify(projectContent, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (state.tourData.name || "tour-project")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    a.href = url;
    a.download = `${safeName}.marzipano.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Load Project from File (.json)
  function handleLoadProjectFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = JSON.parse(event.target.result);
        const tourData = parsed.tourData || (parsed.scenes ? parsed : null);
        if (tourData && Array.isArray(tourData.scenes)) {
          saveHistoryState();
          state.tourData = tourData;
          state.sceneImages = parsed.sceneImages || {};
          state.importedArchive = parsed.importedArchive || null;
          elements.projectName.value = state.tourData.name || "Loaded Project";
          markAsChanged();
          updateSaveStatus("saved", "💾 Loaded from File");
          if (state.tourData.scenes.length > 0) {
            selectScene(0);
          } else {
            updateUI();
          }
          alert(`Project "${state.tourData.name}" loaded successfully from file!`);
        } else {
          alert("Selected file does not contain valid Marzipano project data.");
        }
      } catch (err) {
        alert("Failed to parse project JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Clear DB Helper
  async function clearProjectFromDB() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(PROJECT_KEY);
    } catch (e) {
      console.warn("Failed to clear DB:", e);
    }
  }

  // Initialize
  async function init() {
    setupEventListeners();
    initMarzipanoViewer();
    setupBeforeUnload();

    // Check for saved project in IndexedDB
    const saved = await loadProjectFromDB();
    if (saved && saved.tourData && saved.tourData.scenes && saved.tourData.scenes.length > 0) {
      state.tourData = saved.tourData;
      state.sceneImages = saved.sceneImages || {};
      state.importedArchive = saved.importedArchive || null;
      elements.projectName.value = state.tourData.name || "Untitled Project";

      const savedTime = saved.savedAt ? new Date(saved.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
      updateSaveStatus("saved", `💾 Restored ${savedTime}`);

      const selectIdx = (saved.currentSceneIndex >= 0 && saved.currentSceneIndex < state.tourData.scenes.length)
        ? saved.currentSceneIndex
        : 0;
      selectScene(selectIdx);
    } else {
      updateUI();
      // Show help by default if no saved project
      elements.help.classList.remove("hidden");
      updateSaveStatus("saved", "💾 Auto-save ready");
    }
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
    triggerAutoSave();
  }

  // Mark as saved
  function markAsSaved() {
    state.hasUnsavedChanges = false;
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Header buttons
    if (elements.resetProjectButton) elements.resetProjectButton.addEventListener("click", resetProjectState);
    if (elements.saveProjectButton) elements.saveProjectButton.addEventListener("click", handleManualSave);
    if (elements.saveToFileButton) elements.saveToFileButton.addEventListener("click", saveProjectToFile);
    if (elements.loadFileButton) elements.loadFileButton.addEventListener("click", () => elements.loadFileInput.click());
    if (elements.loadFileInput) elements.loadFileInput.addEventListener("change", handleLoadProjectFromFile);
    if (elements.loadProjectButton) elements.loadProjectButton.addEventListener("click", handleManualLoad);
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

    // UI/UX Styling Settings
    if (elements.showHeaderToggle) elements.showHeaderToggle.addEventListener("change", updateSettings);
    if (elements.showSceneTitleToggle) elements.showSceneTitleToggle.addEventListener("change", updateSettings);
    if (elements.themeBgColor) elements.themeBgColor.addEventListener("input", updateSettings);
    if (elements.themeFontColor) elements.themeFontColor.addEventListener("input", updateSettings);
    if (elements.themeFontSize) elements.themeFontSize.addEventListener("input", updateSettings);
    if (elements.themeBorderRadius) elements.themeBorderRadius.addEventListener("input", updateSettings);
    if (elements.themePadding) elements.themePadding.addEventListener("input", updateSettings);
    if (elements.themeControlPos) elements.themeControlPos.addEventListener("change", updateSettings);

    // Logo upload handlers
    if (elements.uploadLogoBtn) {
      elements.uploadLogoBtn.addEventListener("click", () => {
        if (elements.logoFileInput) elements.logoFileInput.click();
      });
    }
    if (elements.logoFileInput) {
      elements.logoFileInput.addEventListener("change", handleLogoUpload);
    }
    if (elements.removeLogoBtn) {
      elements.removeLogoBtn.addEventListener("click", handleRemoveLogo);
    }

    // Scene list sidebar toggle handler
    if (elements.toggleSceneListBtn) {
      elements.toggleSceneListBtn.addEventListener("click", () => {
        if (elements.sceneListPreviewContainer) {
          elements.sceneListPreviewContainer.classList.toggle("collapsed");
        }
      });
    }

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
    if (elements.saveInfoHotspotButton) elements.saveInfoHotspotButton.addEventListener("click", saveInfoHotspot);
    if (elements.cancelInfoHotspotButton)
      elements.cancelInfoHotspotButton.addEventListener("click", () => {
        removeTempHotspotMarker();
        hideModal("infoHotspotModal");
      });

    // Link hotspot modal
    if (elements.captureTargetViewBtn) {
      elements.captureTargetViewBtn.addEventListener("click", function () {
        if (!state.scene) {
          alert("No active 3D scene view to capture from.");
          return;
        }
        const currentParams = state.scene.view().parameters();
        state.pendingTargetView = {
          yaw: currentParams.yaw,
          pitch: currentParams.pitch,
          fov: currentParams.fov,
        };
        updateTargetViewStatusUI(state.pendingTargetView);
      });
    }

    if (elements.resetTargetViewBtn) {
      elements.resetTargetViewBtn.addEventListener("click", function () {
        state.pendingTargetView = null;
        updateTargetViewStatusUI(null);
      });
    }

    function handleManualTargetViewInput() {
      if (!elements.targetViewYawInput || !elements.targetViewPitchInput) return;
      const yawDeg = parseFloat(elements.targetViewYawInput.value);
      const pitchDeg = parseFloat(elements.targetViewPitchInput.value);
      const fovDeg = parseFloat(elements.targetViewFovInput.value);

      if (!isNaN(yawDeg) && !isNaN(pitchDeg)) {
        const yawRad = (yawDeg * Math.PI) / 180;
        const pitchRad = (pitchDeg * Math.PI) / 180;
        const fovRad = !isNaN(fovDeg) ? (fovDeg * Math.PI) / 180 : Math.PI / 2;

        state.pendingTargetView = {
          yaw: yawRad,
          pitch: pitchRad,
          fov: fovRad,
        };

        if (elements.targetViewStatus) {
          elements.targetViewStatus.textContent = `⚙️ Manual View: Yaw ${yawDeg.toFixed(1)}°, Pitch ${pitchDeg.toFixed(1)}°, FOV ${(!isNaN(fovDeg) ? fovDeg : 90).toFixed(1)}°`;
          elements.targetViewStatus.style.color = "#66be71";
        }
      } else {
        state.pendingTargetView = null;
        if (elements.targetViewStatus) {
          elements.targetViewStatus.textContent = "Default (Uses Target Scene's Initial View)";
          elements.targetViewStatus.style.color = "#888";
        }
      }
    }

    if (elements.targetViewYawInput) elements.targetViewYawInput.addEventListener("input", handleManualTargetViewInput);
    if (elements.targetViewPitchInput) elements.targetViewPitchInput.addEventListener("input", handleManualTargetViewInput);
    if (elements.targetViewFovInput) elements.targetViewFovInput.addEventListener("input", handleManualTargetViewInput);

    if (elements.saveLinkHotspotButton) elements.saveLinkHotspotButton.addEventListener("click", saveLinkHotspot);
    if (elements.cancelLinkHotspotButton)
      elements.cancelLinkHotspotButton.addEventListener("click", () => {
        removeTempHotspotMarker();
        hideModal("linkHotspotModal");
      });

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

    // View Controls and Fullscreen Overlay Action Handlers
    setupViewControlOverlay();
  }

  function setupViewControlOverlay() {
    let movementInterval = null;

    function stepControlMove(action) {
      if (!state.scene || !state.scene.view()) return;
      const view = state.scene.view();
      const currentYaw = view.yaw();
      const currentPitch = view.pitch();
      const currentFov = view.fov();

      switch (action) {
        case "up":
          view.setPitch(currentPitch + 0.05);
          break;
        case "down":
          view.setPitch(currentPitch - 0.05);
          break;
        case "left":
          view.setYaw(currentYaw - 0.06);
          break;
        case "right":
          view.setYaw(currentYaw + 0.06);
          break;
        case "zoomIn":
          view.setFov(currentFov * 0.85);
          break;
        case "zoomOut":
          view.setFov(currentFov * 1.18);
          break;
      }
    }

    function startControlMove(action) {
      stopControlMove();
      stepControlMove(action);
      movementInterval = setInterval(() => {
        stepControlMove(action);
      }, 50);
    }

    function stopControlMove() {
      if (movementInterval) {
        clearInterval(movementInterval);
        movementInterval = null;
      }
    }

    const btnUp = document.getElementById("viewBtnUp");
    const btnDown = document.getElementById("viewBtnDown");
    const btnLeft = document.getElementById("viewBtnLeft");
    const btnRight = document.getElementById("viewBtnRight");
    const btnZoomIn = document.getElementById("viewBtnZoomIn");
    const btnZoomOut = document.getElementById("viewBtnZoomOut");

    const controls = [
      { btn: btnUp, action: "up" },
      { btn: btnDown, action: "down" },
      { btn: btnLeft, action: "left" },
      { btn: btnRight, action: "right" },
      { btn: btnZoomIn, action: "zoomIn" },
      { btn: btnZoomOut, action: "zoomOut" },
    ];

    controls.forEach(({ btn, action }) => {
      if (!btn) return;
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startControlMove(action);
      });
      btn.addEventListener("mouseup", stopControlMove);
      btn.addEventListener("mouseleave", stopControlMove);
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        startControlMove(action);
      });
      btn.addEventListener("touchend", stopControlMove);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        stepControlMove(action);
      });
    });

    // Fullscreen Toggle
    const toggleFullscreenBtn = document.getElementById("toggleFullscreenBtn");
    if (toggleFullscreenBtn) {
      toggleFullscreenBtn.addEventListener("click", () => {
        const previewArea = document.getElementById("previewArea") || document.getElementById("pano") || document.documentElement;
        if (!document.fullscreenElement) {
          if (previewArea.requestFullscreen) {
            previewArea.requestFullscreen();
          } else if (previewArea.webkitRequestFullscreen) {
            previewArea.webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
        }
      });
    }
  }

  // Initialize Marzipano Viewer
  function initMarzipanoViewer() {
    state.viewer = new Marzipano.Viewer(elements.pano);
  }

  let autorotateMovement = null;

  // Apply settings (mouseViewMode, autorotate) to Marzipano Viewer
  function applySettingsToViewer() {
    if (!state.tourData || !state.tourData.settings) return;

    const settings = state.tourData.settings;
    const mode = settings.mouseViewMode || "drag";
    const autorotateEnabled = !!settings.autorotateEnabled;

    // Synchronize UI radio buttons and checkboxes
    if (elements.mouseViewModeDrag && elements.mouseViewModeQtvr) {
      elements.mouseViewModeDrag.checked = (mode === "drag");
      elements.mouseViewModeQtvr.checked = (mode === "qtvr");
    }
    if (elements.autorotateEnabled) {
      elements.autorotateEnabled.checked = autorotateEnabled;
    }
    if (elements.fullscreenButton) {
      elements.fullscreenButton.checked = !!settings.fullscreenButton;
    }
    if (elements.viewControlButtons) {
      elements.viewControlButtons.checked = !!settings.viewControlButtons;
    }

    if (!state.viewer) return;

    // 1. Mouse View Mode (drag vs qtvr)
    const controls = state.viewer.controls();
    if (controls) {
      if (mode === "qtvr") {
        try {
          controls.enableControlMethod("qtvr");
          controls.disableControlMethod("drag");
        } catch (e) {
          console.warn("QTVR mode enable notice:", e);
        }
      } else {
        try {
          controls.enableControlMethod("drag");
          controls.disableControlMethod("qtvr");
        } catch (e) {
          console.warn("Drag mode enable notice:", e);
        }
      }
    }

    // 2. Autorotate (rotate yaw only so manual pitch and zoom FOV are not reset)
    if (autorotateEnabled) {
      if (!autorotateMovement && typeof Marzipano !== "undefined" && Marzipano.autorotate) {
        autorotateMovement = Marzipano.autorotate({
          yawSpeed: 0.03, // approx 1.7 deg/sec
        });
      }
      if (autorotateMovement) {
        state.viewer.startMovement(autorotateMovement);
        state.viewer.setIdleMovement(3000, autorotateMovement);
      }
    } else {
      state.viewer.stopMovement();
      state.viewer.setIdleMovement(Infinity);
    }

    // 3. View Control Buttons Overlay
    const viewControlOverlay = document.getElementById("viewControlButtonsOverlay");
    if (viewControlOverlay) {
      viewControlOverlay.style.display = settings.viewControlButtons ? "flex" : "none";
      const pos = settings.themeControlPos || "bottom-right";
      viewControlOverlay.style.top = pos.includes("top") ? "20px" : "auto";
      viewControlOverlay.style.bottom = pos.includes("bottom") ? "20px" : "auto";
      viewControlOverlay.style.left = pos.includes("left") ? "20px" : "auto";
      viewControlOverlay.style.right = pos.includes("right") ? "20px" : "auto";
      viewControlOverlay.style.borderRadius = (settings.themeBorderRadius || 8) + "px";
      viewControlOverlay.style.padding = (settings.themePadding || 8) + "px";
      viewControlOverlay.style.backgroundColor = (settings.themeBgColor || "#000000") + "cc";
    }

    // 4. Header & Scene Title Visibility
    if (elements.panoramaName) {
      elements.panoramaName.style.display = settings.showSceneTitle !== false ? "block" : "none";
    }

    // 5. Brand Logo Overlay
    const logoUrl = settings.logoUrl;
    if (elements.brandLogoOverlay && elements.brandLogoImg) {
      if (logoUrl && settings.showHeader !== false) {
        elements.brandLogoImg.src = logoUrl;
        elements.brandLogoOverlay.style.display = "block";
        if (elements.removeLogoBtn) elements.removeLogoBtn.style.display = "inline-block";
      } else {
        elements.brandLogoOverlay.style.display = "none";
        if (elements.removeLogoBtn) elements.removeLogoBtn.style.display = logoUrl ? "inline-block" : "none";
      }
    }

    // 6. Scene List Container Styling
    if (elements.sceneListPreviewContainer) {
      elements.sceneListPreviewContainer.style.borderRadius = (settings.themeBorderRadius || 8) + "px";
      elements.sceneListPreviewContainer.style.padding = (settings.themePadding || 8) + "px";
      elements.sceneListPreviewContainer.style.backgroundColor = (settings.themeBgColor || "#000000") + "d9";
      elements.sceneListPreviewContainer.style.color = settings.themeFontColor || "#ffffff";
      elements.sceneListPreviewContainer.style.fontSize = (settings.themeFontSize || 14) + "px";
    }
  }

  function handleLogoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      const dataUrl = evt.target.result;
      if (!state.tourData.settings) state.tourData.settings = {};
      state.tourData.settings.logoUrl = dataUrl;
      applySettingsToViewer();
      saveHistoryState();
      markAsChanged();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleRemoveLogo() {
    if (state.tourData.settings) {
      delete state.tourData.settings.logoUrl;
    }
    applySettingsToViewer();
    saveHistoryState();
    markAsChanged();
  }

  // Update UI
  function updateUI() {
    // Update project name
    elements.projectName.value = state.tourData.name;

    // Update panorama list
    renderPanoramaList();

    // Update settings in UI and viewer
    applySettingsToViewer();

    // Update preview
    if (state.currentScene) {
      elements.panoramaName.textContent = state.currentScene.name;
      elements.preview.classList.add("visible");
      elements.help.classList.add("hidden");
    } else {
      elements.preview.classList.remove("visible");
    }
  }

  function toggleSceneListVisibility(index, isChecked) {
    if (state.tourData.scenes[index]) {
      state.tourData.scenes[index].showInSceneList = isChecked;
      renderPanoramaList();
      saveHistoryState();
      markAsChanged();
    }
  }

  // Render Panorama List
  function renderPanoramaList() {
    elements.panoramaList.innerHTML = "";

    state.tourData.scenes.forEach((scene, index) => {
      const showInList = scene.showInSceneList !== false;
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
          <div class="status" style="margin-top: 4px;">
            <label style="font-size: 11px; color: #aaa; display: flex; align-items: center; gap: 4px; cursor: pointer;" onclick="event.stopPropagation();">
              <input type="checkbox" ${showInList ? "checked" : ""} onchange="event.stopPropagation(); toggleSceneListVisibility(${index}, this.checked)" />
              <span>Tampilkan di Scene List</span>
            </label>
          </div>
        </div>
      `;

      // Setup drag and drop
      setupPanoramaDrag(panoramaEl, index);

      elements.panoramaList.appendChild(panoramaEl);
    });

    // Render Floating Scene List Preview Overlay
    if (elements.sceneListPreviewUl) {
      elements.sceneListPreviewUl.innerHTML = "";
      state.tourData.scenes.forEach((scene, index) => {
        if (scene.showInSceneList !== false) {
          const li = document.createElement("li");
          li.textContent = scene.name;
          if (index === state.currentSceneIndex) {
            li.classList.add("active");
          }
          li.onclick = (e) => {
            e.stopPropagation();
            selectScene(index);
          };
          elements.sceneListPreviewUl.appendChild(li);
        }
      });
    }
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
  function selectScene(index, overrideInitialView) {
    state.currentSceneIndex = index;
    state.currentScene = state.tourData.scenes[index];
    renderScene(state.currentScene, overrideInitialView);
    updateUI();
  }

  // Render Scene in Marzipano Viewer
  function renderScene(sceneData, overrideInitialView) {
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

    // Create view with target view if provided or default initial view parameters
    const initialView = overrideInitialView || sceneData.initialViewParameters;
    const limiter = Marzipano.RectilinearView.limit.traditional(
      sceneData.faceSize || 4096,
      (100 * Math.PI) / 180
    );
    const view = new Marzipano.RectilinearView(
      initialView,
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

    // Apply viewer settings (mouseViewMode, autorotate)
    applySettingsToViewer();

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
                fill="rgba(0,0,0,0.5)"/>
        <line x1="12" y1="10" x2="12" y2="17" 
              stroke="white" 
              stroke-width="2" 
              stroke-linecap="round"/>
        <circle cx="12" cy="7" r="1.5" fill="white"/>
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

    if (hotspot.linkUrl) {
      const linkEl = document.createElement("a");
      linkEl.href = hotspot.linkUrl;
      linkEl.target = "_blank";
      linkEl.className = "info-hotspot-link";
      linkEl.textContent = "Buka Tautan ↗";
      linkEl.onclick = (e) => e.stopPropagation();
      text.appendChild(linkEl);
    }

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

  let currentTempHotspot = null;

  function createTempHotspotMarker(type, yaw, pitch) {
    if (!state.scene) return;
    removeTempHotspotMarker();

    const dummyData = type === "link"
      ? { yaw, pitch, rotation: 0, target: "" }
      : { yaw, pitch, title: "New Hotspot", text: "" };

    const element = type === "link"
      ? createLinkHotspotElement(dummyData, -1)
      : createInfoHotspotElement(dummyData, -1);

    element.style.opacity = "0.85";
    element.style.animation = "pulse 1s infinite alternate";

    currentTempHotspot = state.scene.hotspotContainer().createHotspot(element, { yaw, pitch });

    // Force immediate render tick
    if (state.scene.view()) {
      const view = state.scene.view();
      view.setParameters(view.parameters());
    }
  }

  function removeTempHotspotMarker() {
    if (currentTempHotspot && state.scene) {
      try {
        state.scene.hotspotContainer().destroyHotspot(currentTempHotspot);
      } catch (e) {}
      currentTempHotspot = null;
    }
  }

  // Render Hotspots
  function renderHotspots(sceneData) {
    if (!state.scene || !sceneData) return;

    removeTempHotspotMarker();

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

    // Force Marzipano view render tick so newly created hotspots project and appear instantly
    if (state.scene && state.scene.view()) {
      const view = state.scene.view();
      view.setParameters(view.parameters());
      if (state.viewer && state.viewer.forceRender) {
        state.viewer.forceRender();
      }
    }
  }

  // Handle Hotspot Actions
  function handleHotspotAction(action, type, index, hotspot) {
    if (!state.currentScene || !state.scene) return;

    switch (action) {
      case "navigate":
        if (type === "link") {
          // For link hotspots, navigate to target scene with targetView if present
          const targetIndex = state.tourData.scenes.findIndex(
            (s) => s.id === hotspot.target
          );
          if (targetIndex !== -1) {
            selectScene(targetIndex, hotspot.targetView);
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

          // Instantly update active SVG rotation transform in DOM for instant visual feedback
          const activeWrappers = document.querySelectorAll(`.hotspot.link-hotspot[data-hotspot-index="${index}"]`);
          activeWrappers.forEach((wrapper) => {
            const svg = wrapper.querySelector(".link-hotspot-icon svg");
            if (svg) {
              const totalRotation = -90 + (hotspot.rotation * 180) / Math.PI;
              svg.style.transform = `rotate(${totalRotation}deg)`;
            }
          });

          // Re-render hotspots and sidebar list
          renderHotspots(state.currentScene);
          renderHotspotList();
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

  // Update Target View UI helper
  function updateTargetViewStatusUI(targetView) {
    if (!elements.targetViewStatus) return;
    if (targetView && targetView.yaw !== undefined) {
      const yawDeg = ((targetView.yaw * 180) / Math.PI).toFixed(1);
      const pitchDeg = ((targetView.pitch * 180) / Math.PI).toFixed(1);
      const fovDeg = targetView.fov !== undefined ? ((targetView.fov * 180) / Math.PI).toFixed(1) : "90.0";

      elements.targetViewStatus.textContent = `📷 Custom View: Yaw ${yawDeg}°, Pitch ${pitchDeg}°, FOV ${fovDeg}°`;
      elements.targetViewStatus.style.color = "#66be71";

      if (elements.targetViewYawInput) elements.targetViewYawInput.value = yawDeg;
      if (elements.targetViewPitchInput) elements.targetViewPitchInput.value = pitchDeg;
      if (elements.targetViewFovInput) elements.targetViewFovInput.value = fovDeg;
    } else {
      elements.targetViewStatus.textContent = "Default (Uses Target Scene's Initial View)";
      elements.targetViewStatus.style.color = "#888";

      if (elements.targetViewYawInput) elements.targetViewYawInput.value = "";
      if (elements.targetViewPitchInput) elements.targetViewPitchInput.value = "";
      if (elements.targetViewFovInput) elements.targetViewFovInput.value = "";
    }
  }

  // Edit Link Hotspot
  function editLinkHotspot(index, hotspot) {
    state.pendingHotspot = {
      type: "link",
      index: index,
      hotspot: hotspot,
    };

    state.pendingTargetView = hotspot.targetView
      ? { ...hotspot.targetView }
      : null;
    updateTargetViewStatusUI(state.pendingTargetView);

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
      ...state.tourData.settings,
      mouseViewMode: elements.mouseViewModeDrag.checked ? "drag" : "qtvr",
      autorotateEnabled: elements.autorotateEnabled.checked,
      fullscreenButton: elements.fullscreenButton.checked,
      viewControlButtons: elements.viewControlButtons.checked,
      showHeader: elements.showHeaderToggle ? elements.showHeaderToggle.checked : true,
      showSceneTitle: elements.showSceneTitleToggle ? elements.showSceneTitleToggle.checked : true,
      themeBgColor: elements.themeBgColor ? elements.themeBgColor.value : "#000000",
      themeFontColor: elements.themeFontColor ? elements.themeFontColor.value : "#ffffff",
      themeFontSize: elements.themeFontSize ? parseInt(elements.themeFontSize.value, 10) || 14 : 14,
      themeBorderRadius: elements.themeBorderRadius ? parseInt(elements.themeBorderRadius.value, 10) || 8 : 8,
      themePadding: elements.themePadding ? parseInt(elements.themePadding.value, 10) || 8 : 8,
      themeControlPos: elements.themeControlPos ? elements.themeControlPos.value : "bottom-right",
    };
    markAsChanged();
    applySettingsToViewer();
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

        // Instantly display temporary hotspot marker on panorama right where user clicked
        createTempHotspotMarker("info", coords.yaw, coords.pitch);

        // Remove click handler
        panoElement.removeEventListener("click", clickHandler);
        state.addingHotspot = null;
        hideHotspotHint();

        showModal("infoHotspotModal");
      }
    };
    panoElement.addEventListener("click", clickHandler);
  }

  // Refresh Active Scene in 3D Viewer live without page reload
  function refreshActiveScene() {
    if (!state.currentScene || !state.viewer) return;

    let savedViewParams = null;
    if (state.scene && state.scene.view()) {
      savedViewParams = state.scene.view().parameters();
    }

    renderScene(state.currentScene);

    if (savedViewParams && state.scene && state.scene.view()) {
      state.scene.view().setParameters(savedViewParams);
    }
  }

  // Save Info Hotspot
  function saveInfoHotspot() {
    const title = elements.infoHotspotTitle.value.trim();
    const text = elements.infoHotspotText.value.trim();
    const linkUrl = elements.infoHotspotLinkUrl ? elements.infoHotspotLinkUrl.value.trim() : "";

    if (!title) {
      alert("Please enter a title");
      return;
    }

    // Check if editing existing hotspot
    if (state.pendingHotspot.index !== undefined) {
      // Update existing hotspot - preserve yaw, pitch
      const existingHotspot =
        state.currentScene.infoHotspots[state.pendingHotspot.index];
      if (existingHotspot) {
        existingHotspot.title = title;
        existingHotspot.text = text;
        existingHotspot.linkUrl = linkUrl;
      }
      markAsChanged();
    } else {
      // Create new hotspot
      const hotspot = {
        yaw: state.pendingHotspot.yaw,
        pitch: state.pendingHotspot.pitch,
        title: title,
        text: text,
        linkUrl: linkUrl,
      };
      if (!state.currentScene.infoHotspots) {
        state.currentScene.infoHotspots = [];
      }
      state.currentScene.infoHotspots.push(hotspot);
      markAsChanged();
    }

    // Clear form and reset pending hotspot
    elements.infoHotspotTitle.value = "";
    elements.infoHotspotText.value = "";
    if (elements.infoHotspotLinkUrl) elements.infoHotspotLinkUrl.value = "";
    state.pendingHotspot = null;

    // Reset modal title
    const modalTitle = document.querySelector("#infoHotspotModal h2");
    if (modalTitle) {
      modalTitle.textContent = "Add Info Hotspot";
    }

    hideModal("infoHotspotModal");

    // Re-render scene and hotspots live
    refreshActiveScene();
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

        // Instantly display temporary hotspot marker on panorama right where user clicked
        createTempHotspotMarker("link", coords.yaw, coords.pitch);

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

        state.pendingTargetView = null;
        updateTargetViewStatusUI(null);

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

  // Save History State Helper
  function saveHistoryState() {
    // Safe placeholder for history/undo tracking
  }

  // Save Link Hotspot
  function saveLinkHotspot() {
    if (!state.pendingHotspot) {
      hideModal("linkHotspotModal");
      return;
    }

    const target = elements.linkHotspotTarget.value;

    if (!target) {
      alert("Please select a target scene");
      return;
    }

    saveHistoryState();

    // Check if editing existing hotspot
    if (state.pendingHotspot.index !== undefined) {
      // Update existing hotspot - preserve yaw, pitch, rotation
      const existingHotspot =
        state.currentScene.linkHotspots[state.pendingHotspot.index];
      if (existingHotspot) {
        existingHotspot.target = target;

        if (state.pendingTargetView) {
          existingHotspot.targetView = { ...state.pendingTargetView };
        } else {
          delete existingHotspot.targetView;
        }

        if (!existingHotspot.rotation) {
          existingHotspot.rotation = 0;
        }
      }
      markAsChanged();
    } else {
      // Create new hotspot
      const hotspot = {
        yaw: state.pendingHotspot.yaw,
        pitch: state.pendingHotspot.pitch,
        rotation: 0,
        target: target,
      };
      if (state.pendingTargetView) {
        hotspot.targetView = { ...state.pendingTargetView };
      }
      if (!state.currentScene.linkHotspots) {
        state.currentScene.linkHotspots = [];
      }
      state.currentScene.linkHotspots.push(hotspot);
      markAsChanged();
    }

    // Update target scene showInSceneList setting based on checkbox
    if (target && elements.linkHotspotShowInSceneList) {
      const targetSceneObj = state.tourData.scenes.find((s) => s.id === target);
      if (targetSceneObj) {
        targetSceneObj.showInSceneList = elements.linkHotspotShowInSceneList.checked;
      }
    }

    // Reset pending states
    state.pendingHotspot = null;
    state.pendingTargetView = null;

    // Reset modal title
    const modalTitle = document.querySelector("#linkHotspotModal h2");
    if (modalTitle) {
      modalTitle.textContent = "Add Link Hotspot";
    }

    hideModal("linkHotspotModal");

    // Re-render scene, panorama list, and hotspots live
    renderPanoramaList();
    refreshActiveScene();
    renderHotspotList();
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

    // Direct JSON Project File Import
    if (file.name.match(/\.json$/i)) {
      hideModal("importModal");
      const jsonReader = new FileReader();
      jsonReader.onload = function (event) {
        try {
          const parsed = JSON.parse(event.target.result);
          const tourData = parsed.tourData || (parsed.scenes ? parsed : null);
          if (tourData && Array.isArray(tourData.scenes)) {
            saveHistoryState();
            state.tourData = tourData;
            state.sceneImages = parsed.sceneImages || {};
            state.importedArchive = parsed.importedArchive || null;
            elements.projectName.value = state.tourData.name || "Imported Project";
            markAsChanged();
            updateSaveStatus("saved", "💾 Loaded from File");
            if (state.tourData.scenes.length > 0) {
              selectScene(0);
            } else {
              updateUI();
            }
          } else {
            alert("Selected JSON file does not contain valid Marzipano project data.");
          }
        } catch (err) {
          alert("Failed to parse project JSON file: " + err.message);
        }
      };
      jsonReader.readAsText(file);
      e.target.value = "";
      return;
    }

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
    state.importedArchive = null;

    // Find and parse tour data first
    let tourData = null;
    let dataContent = null;
    let dataFilePath = "data.js";
    let tilesPrefix = "tiles/";
    const preservedFiles = {};

    // Look for data.js (could be in root or app-files/)
    let dataFile = zip.file(/app-files\/data\.js$/i)[0];
    if (!dataFile) {
      dataFile = zip.file(/data\.js$/i)[0];
    }

    if (dataFile) {
      dataFilePath = dataFile.name;
      if (dataFilePath.startsWith("app-files/")) {
        tilesPrefix = "app-files/tiles/";
      }

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
    const preservedFilePromises = [];
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
          relativePath.startsWith("tiles/")) &&
        isStandardTilePath(relativePath);

      if (!isTileImage) {
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

      if (relativePath.startsWith("app-files/tiles/")) {
        tilesPrefix = "app-files/tiles/";
      }
    });

    zip.forEach(function (relativePath, file) {
      if (file.dir) {
        return;
      }

      const isTourDataFile =
        relativePath === dataFilePath || relativePath.match(/app-data\.json$/i);
      const isTileFile =
        (relativePath.startsWith("app-files/tiles/") ||
          relativePath.startsWith("tiles/")) &&
        isStandardTilePath(relativePath);

      if (isTourDataFile || isTileFile) {
        return;
      }

      preservedFilePromises.push(
        file.async("uint8array").then(function (content) {
          preservedFiles[relativePath] = content;
        })
      );
    });

    console.log("Found", tilePromises.length, "tile files to process");
    await Promise.all(tilePromises);
    await Promise.all(preservedFilePromises);

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
    state.importedArchive = {
      dataFilePath: dataFilePath,
      tilesPrefix: tilesPrefix,
      preservedFiles: preservedFiles,
    };
    elements.projectName.value = tourData.name || "Imported Project";
    markAsSaved(); // Import resets unsaved changes

    console.log("Import complete. Total scenes:", tourData.scenes.length);
  }

  function isStandardTilePath(relativePath) {
    return /^(app-files\/)?tiles\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+\.(jpg|jpeg|png)$/i.test(
      relativePath
    );
  }

  function buildSceneListHtml(scenes) {
    return scenes
      .map(
        (scene) => `
      <a href="javascript:void(0)" class="scene" data-id="${scene.id}">
        <li class="text">${scene.name}</li>
      </a>`
      )
      .join("\n");
  }

  async function fetchLocalMarzipanoJs() {
    try {
      const res = await fetch("scripts/marzipano-0.10.2/marzipano.js");
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      console.warn("Could not fetch local marzipano.js:", e);
    }
    return null;
  }

  function getDefaultExportIndexHtml(exportData) {
    const tourName = (exportData && exportData.name) || "Mikrotek Virtual Tour";
    return `<!DOCTYPE html>
<html lang="en">
<head>
<title>${tourName}</title>
<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width, shrink-to-fit=no">
<link rel="stylesheet" href="style.css">
</head>
<body class="multiple-scenes">

<div id="pano"></div>

<div id="brandLogoContainer" class="brand-logo-container">
  <img id="brandLogo" src="app-files/logo.png" style="display: none;" onerror="this.style.display='none'">
</div>

<div id="headerTitleBar" class="header-title-bar">
  <h1 id="exportedSceneTitle" class="scene-title"></h1>
</div>

<div id="sceneListOverlay" class="scene-list-overlay">
  <button type="button" id="toggleSceneListBtn" class="scene-list-toggle-btn" title="Toggle Scene List">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/></svg>
  </button>
  <div id="sceneListContainer" class="scene-list-container">
    <ul id="sceneListUl" class="scenes"></ul>
  </div>
</div>

<div id="viewControlOverlay" class="view-controls">
  <div class="dpad">
    <button id="btnUp" class="ctrl-btn" title="Look Up">▲</button>
    <button id="btnLeft" class="ctrl-btn" title="Look Left">◀</button>
    <button id="btnRight" class="ctrl-btn" title="Look Right">▶</button>
    <button id="btnDown" class="ctrl-btn" title="Look Down">▼</button>
  </div>
  <div class="zoom-pad">
    <button id="btnZoomIn" class="ctrl-btn" title="Zoom In">+</button>
    <button id="btnZoomOut" class="ctrl-btn" title="Zoom Out">-</button>
  </div>
</div>

<div id="fullscreenOverlay">
  <button id="btnFullscreen" class="ctrl-btn" title="Toggle Fullscreen">⛶</button>
</div>

<script src="vendor/marzipano.js"></script>
<script src="app-files/data.js"></script>
<script src="data.js"></script>
<script src="index.js"></script>

</body>
</html>`;
  }

  function getDefaultExportIndexJs() {
    return `(function () {
  "use strict";

  var Marzipano = window.Marzipano;
  var APP_DATA = window.APP_DATA;

  if (!APP_DATA || !APP_DATA.scenes || !APP_DATA.scenes.length) {
    console.error("No APP_DATA or scenes found");
    return;
  }

  var panoElement = document.querySelector("#pano");
  var settings = APP_DATA.settings || {};

  if (settings.logoUrl && settings.showHeader !== false) {
    var logoImg = document.getElementById("brandLogo");
    if (logoImg) logoImg.style.display = "block";
  }

  var headerBar = document.getElementById("headerTitleBar");
  if (headerBar) {
    headerBar.style.display = (settings.showHeader !== false && settings.showSceneTitle !== false) ? "block" : "none";
  }

  var viewerOpts = {
    controls: {
      mouseViewMode: settings.mouseViewMode || "drag"
    }
  };

  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);
  var activeSceneObj = null;

  var scenes = APP_DATA.scenes.map(function (data) {
    var urlPrefix = "tiles";
    var source = new Marzipano.ImageUrlSource(function (tile) {
      if (tile.z === 0) {
        return { url: urlPrefix + "/" + data.id + "/0/" + tile.face + "/0/0.jpg" };
      }
      return {
        url: urlPrefix + "/" + data.id + "/" + tile.z + "/" + tile.face + "/" + tile.y + "/" + tile.x + ".jpg"
      };
    });

    var limiter = Marzipano.RectilinearView.limit.traditional(
      data.faceSize || 4096,
      (100 * Math.PI) / 180,
      (120 * Math.PI) / 180
    );
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);
    var scene = viewer.createScene({
      source: source,
      geometry: new Marzipano.CubeGeometry(data.levels),
      view: view,
      pinFirstLevel: true
    });

    (data.linkHotspots || []).forEach(function (hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    (data.infoHotspots || []).forEach(function (hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return { data: data, scene: scene, view: view };
  });

  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement("div");
    wrapper.className = "hotspot link-hotspot";
    var rotation = hotspot.rotation || 0;
    var totalRotation = -90 + (rotation * 180) / Math.PI;
    wrapper.innerHTML = '<div class="link-icon" style="transform: rotate(' + totalRotation + 'deg);">' +
      '<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M16 4 L28 16 L16 28 M28 16 L4 16" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
      '</svg></div>';
    
    wrapper.addEventListener("click", function (e) {
      e.stopPropagation();
      var targetScene = findSceneById(hotspot.target);
      if (targetScene) {
        switchScene(targetScene, hotspot.targetView);
      }
    });
    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement("div");
    wrapper.className = "hotspot info-hotspot";
    var html = '<div class="info-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 12,22A10,10 0 0,0 12,22A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/></svg></div>' +
      '<div class="info-text"><h3>' + (hotspot.title || "") + '</h3><p>' + (hotspot.text || "") + '</p>';
    if (hotspot.linkUrl) {
      html += '<a href="' + hotspot.linkUrl + '" target="_blank" class="info-hotspot-link" onclick="event.stopPropagation();">Buka Tautan ↗</a>';
    }
    html += '</div>';
    wrapper.innerHTML = html;

    wrapper.addEventListener("click", function (e) {
      e.stopPropagation();
      wrapper.classList.toggle("visible");
    });
    return wrapper;
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) return scenes[i];
    }
    return null;
  }

  function switchScene(targetScene, overrideInitialView) {
    if (!targetScene) return;
    targetScene.scene.switchTo();
    if (overrideInitialView) {
      targetScene.view.setParameters(overrideInitialView);
    }
    activeSceneObj = targetScene;
    var titleEl = document.getElementById("exportedSceneTitle");
    if (titleEl) titleEl.textContent = targetScene.data.name;
    updateSceneListActiveUI(targetScene);
  }

  function updateSceneListActiveUI(targetScene) {
    var items = document.querySelectorAll("#sceneListUl li");
    items.forEach(function(li) {
      if (li.getAttribute("data-id") === targetScene.data.id) {
        li.classList.add("active");
      } else {
        li.classList.remove("active");
      }
    });
  }

  var sceneListEl = document.querySelector("#sceneListUl");
  if (sceneListEl) {
    scenes.forEach(function (s) {
      if (s.data.showInSceneList !== false) {
        var li = document.createElement("li");
        li.textContent = s.data.name;
        li.setAttribute("data-id", s.data.id);
        li.addEventListener("click", function (e) {
          e.stopPropagation();
          switchScene(s);
        });
        sceneListEl.appendChild(li);
      }
    });
  }

  var toggleSceneListBtn = document.getElementById("toggleSceneListBtn");
  var sceneListContainer = document.getElementById("sceneListContainer");
  if (toggleSceneListBtn && sceneListContainer) {
    toggleSceneListBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      sceneListContainer.classList.toggle("collapsed");
    });
  }

  var btnFullscreen = document.getElementById("btnFullscreen");
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function(){});
      } else {
        document.exitFullscreen().catch(function(){});
      }
    });
  }

  if (settings.autorotateEnabled) {
    var autorotate = Marzipano.autorotate({ yawSpeed: 0.03 });
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  setupExportViewControls();

  function setupExportViewControls() {
    var movementInterval = null;
    function stepMove(action) {
      if (!activeSceneObj || !activeSceneObj.view) return;
      var view = activeSceneObj.view;
      var yaw = view.yaw();
      var pitch = view.pitch();
      var fov = view.fov();

      switch (action) {
        case "up": view.setPitch(pitch + 0.05); break;
        case "down": view.setPitch(pitch - 0.05); break;
        case "left": view.setYaw(yaw - 0.06); break;
        case "right": view.setYaw(yaw + 0.06); break;
        case "zoomIn": view.setFov(fov * 0.85); break;
        case "zoomOut": view.setFov(fov * 1.18); break;
      }
    }

    function startMove(action) {
      stopMove();
      stepMove(action);
      movementInterval = setInterval(function() { stepMove(action); }, 50);
    }

    function stopMove() {
      if (movementInterval) { clearInterval(movementInterval); movementInterval = null; }
    }

    var controls = [
      { id: "btnUp", action: "up" },
      { id: "btnDown", action: "down" },
      { id: "btnLeft", action: "left" },
      { id: "btnRight", action: "right" },
      { id: "btnZoomIn", action: "zoomIn" },
      { id: "btnZoomOut", action: "zoomOut" }
    ];

    controls.forEach(function(item) {
      var btn = document.getElementById(item.id);
      if (!btn) return;
      btn.addEventListener("mousedown", function(e) { e.preventDefault(); startMove(item.action); });
      btn.addEventListener("mouseup", stopMove);
      btn.addEventListener("mouseleave", stopMove);
      btn.addEventListener("touchstart", function(e) { e.preventDefault(); startMove(item.action); });
      btn.addEventListener("touchend", stopMove);
      btn.addEventListener("click", function(e) { e.preventDefault(); stepMove(item.action); });
    });
  }

  var viewControlOverlay = document.getElementById("viewControlOverlay");
  if (viewControlOverlay) {
    viewControlOverlay.style.display = settings.viewControlButtons ? "flex" : "none";
    var pos = settings.themeControlPos || "bottom-right";
    viewControlOverlay.style.top = pos.indexOf("top") !== -1 ? "20px" : "auto";
    viewControlOverlay.style.bottom = pos.indexOf("bottom") !== -1 ? "20px" : "auto";
    viewControlOverlay.style.left = pos.indexOf("left") !== -1 ? "20px" : "auto";
    viewControlOverlay.style.right = pos.indexOf("right") !== -1 ? "20px" : "auto";
    if (settings.themeBorderRadius !== undefined) viewControlOverlay.style.borderRadius = settings.themeBorderRadius + "px";
    if (settings.themePadding !== undefined) viewControlOverlay.style.padding = settings.themePadding + "px";
    if (settings.themeBgColor) viewControlOverlay.style.backgroundColor = settings.themeBgColor + "cc";
  }

  if (sceneListContainer) {
    if (settings.themeBorderRadius !== undefined) sceneListContainer.style.borderRadius = settings.themeBorderRadius + "px";
    if (settings.themePadding !== undefined) sceneListContainer.style.padding = settings.themePadding + "px";
    if (settings.themeBgColor) sceneListContainer.style.backgroundColor = settings.themeBgColor + "d9";
    if (settings.themeFontColor) sceneListContainer.style.color = settings.themeFontColor;
    if (settings.themeFontSize !== undefined) sceneListContainer.style.fontSize = settings.themeFontSize + "px";
  }

  if (scenes.length > 0) {
    switchScene(scenes[0]);
  }
})();`;
  }

  function getDefaultExportStyleCss() {
    return `* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #000; color: #fff; }
#pano { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

.brand-logo-container { position: absolute; top: 16px; left: 16px; z-index: 100; max-width: 180px; max-height: 80px; }
.brand-logo-container img { max-width: 100%; max-height: 80px; object-fit: contain; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5)); }

.header-title-bar { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); padding: 8px 20px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); }
.header-title-bar .scene-title { font-size: 16px; font-weight: 600; color: #fff; margin: 0; text-align: center; }

.scene-list-overlay { position: absolute; top: 70px; left: 16px; z-index: 100; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.scene-list-toggle-btn { width: 36px; height: 36px; border: none; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); color: white; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); }
.scene-list-toggle-btn:hover { background: rgba(43, 169, 223, 0.85); transform: scale(1.05); }

.scene-list-container { background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px); padding: 8px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.2); max-height: 55vh; overflow-y: auto; min-width: 180px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4); transition: all 0.2s ease; }
.scene-list-container.collapsed { display: none; }
.scene-list-container ul { list-style: none; margin: 0; padding: 0; }
.scene-list-container li { padding: 8px 12px; cursor: pointer; border-radius: 6px; font-size: 13px; margin-bottom: 4px; background: rgba(255, 255, 255, 0.08); transition: background 0.15s ease; white-space: nowrap; }
.scene-list-container li:hover, .scene-list-container li.active { background: rgba(43, 169, 223, 0.8); }

.hotspot { position: absolute; cursor: pointer; }
.link-hotspot .link-icon { background: rgba(0, 0, 0, 0.55); border-radius: 50%; padding: 6px; border: 2px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; transition: transform 0.2s ease, background 0.2s ease; }
.link-hotspot:hover .link-icon { background: rgba(43, 169, 223, 0.85); transform: scale(1.1); }

.info-hotspot .info-icon { background: rgba(0, 0, 0, 0.55); border-radius: 50%; padding: 6px; border: 2px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transition: transform 0.2s ease, background 0.2s ease; }
.info-hotspot:hover .info-icon { background: rgba(43, 169, 223, 0.85); transform: scale(1.1); }
.info-hotspot .info-text { display: none; position: absolute; bottom: 45px; left: 50%; transform: translateX(-50%); width: 230px; background: rgba(0, 0, 0, 0.88); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2); padding: 12px; border-radius: 8px; color: white; z-index: 100; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
.info-hotspot:hover .info-text, .info-hotspot.visible .info-text { display: block; }
.info-hotspot .info-text h3 { font-size: 14px; margin-bottom: 6px; color: #2ba9df; }
.info-hotspot .info-text p { font-size: 12px; line-height: 1.4; color: #ddd; }
.info-hotspot-link { display: inline-block; margin-top: 8px; padding: 5px 10px; background: #2ba9df; color: #fff !important; text-decoration: none; font-size: 12px; font-weight: 500; border-radius: 4px; }
.info-hotspot-link:hover { background: #1e87b7; }

.ctrl-btn { width: 34px; height: 34px; border: none; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); color: white; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; user-select: none; }
.ctrl-btn:hover { background: rgba(43, 169, 223, 0.8); }
.ctrl-btn:active { background: #2ba9df; transform: scale(0.95); }
#fullscreenOverlay { position: absolute; top: 16px; right: 16px; z-index: 100; }
#viewControlOverlay { position: absolute; bottom: 20px; right: 20px; z-index: 100; display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(8px); padding: 8px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.2); }
.dpad { display: grid; grid-template-columns: repeat(3, 34px); grid-template-rows: repeat(3, 34px); gap: 4px; }
#btnUp { grid-column: 2; grid-row: 1; }
#btnLeft { grid-column: 1; grid-row: 2; }
#btnRight { grid-column: 3; grid-row: 2; }
#btnDown { grid-column: 2; grid-row: 3; }
.zoom-pad { display: flex; gap: 4px; margin-top: 4px; }
.zoom-pad button { flex: 1; }`;
  }

  function updateExportedIndexHtml(indexHtml, tourData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(indexHtml, "text/html");
    const title = doc.querySelector("title");
    const body = doc.body;
    const sceneList = doc.querySelector("#sceneList .scenes");

    if (title) {
      title.textContent = tourData.name || "Untitled Project";
    }

    if (body) {
      body.classList.toggle("multiple-scenes", tourData.scenes.length > 1);
      body.classList.toggle("single-scene", tourData.scenes.length <= 1);
    }

    if (sceneList) {
      sceneList.innerHTML = buildSceneListHtml(tourData.scenes);
    }

    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  function sanitizeFileName(name) {
    return (name || "tour")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const meta = parts[0].match(/data:([^;]+);base64/);
    const mimeType = meta ? meta[1] : "application/octet-stream";
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load panorama image"));
      image.src = src;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to encode tile image"));
          }
        },
        type,
        quality
      );
    });
  }

  function createExportLevels(faceSize) {
    const levels = [{ tileSize: 256, size: 256, fallbackOnly: true }];
    let size = 512;

    while (size < faceSize) {
      levels.push({ tileSize: 512, size: size });
      size *= 2;
    }

    levels.push({ tileSize: 512, size: faceSize });
    return levels;
  }

  function getFaceVector(face, nx, ny) {
    switch (face) {
      case "f":
        return [nx, -ny, 1];
      case "b":
        return [-nx, -ny, -1];
      case "l":
        return [-1, -ny, nx];
      case "r":
        return [1, -ny, -nx];
      case "u":
        return [nx, 1, ny];
      case "d":
        return [nx, -1, -ny];
      default:
        throw new Error(`Unknown cube face: ${face}`);
    }
  }

  function sampleBilinearPixel(source, width, height, x, y) {
    const wrappedX = ((x % width) + width) % width;
    const clampedY = Math.max(0, Math.min(height - 1, y));
    const x0 = Math.floor(wrappedX);
    const y0 = Math.floor(clampedY);
    const x1 = (x0 + 1) % width;
    const y1 = Math.min(y0 + 1, height - 1);
    const dx = wrappedX - x0;
    const dy = clampedY - y0;

    const i00 = (y0 * width + x0) * 4;
    const i10 = (y0 * width + x1) * 4;
    const i01 = (y1 * width + x0) * 4;
    const i11 = (y1 * width + x1) * 4;

    const pixel = [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) {
      const top = source[i00 + c] * (1 - dx) + source[i10 + c] * dx;
      const bottom = source[i01 + c] * (1 - dx) + source[i11 + c] * dx;
      pixel[c] = top * (1 - dy) + bottom * dy;
    }

    return pixel;
  }

  function renderCubeFace(sourceData, sourceWidth, sourceHeight, face, faceSize) {
    const canvas = document.createElement("canvas");
    canvas.width = faceSize;
    canvas.height = faceSize;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(faceSize, faceSize);
    const dest = imageData.data;

    for (let y = 0; y < faceSize; y++) {
      const ny = (2 * (y + 0.5)) / faceSize - 1;

      for (let x = 0; x < faceSize; x++) {
        const nx = (2 * (x + 0.5)) / faceSize - 1;
        const vector = getFaceVector(face, nx, ny);
        const length = Math.hypot(vector[0], vector[1], vector[2]);
        const dx = vector[0] / length;
        const dy = vector[1] / length;
        const dz = vector[2] / length;

        const longitude = Math.atan2(dx, dz);
        const latitude = Math.asin(dy);
        const sampleX =
          ((longitude / (2 * Math.PI) + 0.5) * sourceWidth) % sourceWidth;
        const sampleY = (0.5 - latitude / Math.PI) * sourceHeight;
        const pixel = sampleBilinearPixel(
          sourceData,
          sourceWidth,
          sourceHeight,
          sampleX,
          sampleY
        );

        const offset = (y * faceSize + x) * 4;
        dest[offset] = pixel[0];
        dest[offset + 1] = pixel[1];
        dest[offset + 2] = pixel[2];
        dest[offset + 3] = pixel[3];
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  async function addCanvasTilesToZip(
    zip,
    tilesPrefix,
    sceneId,
    levelIndex,
    face,
    faceCanvas
  ) {
    const tileSize = 512;
    const rows = Math.ceil(faceCanvas.height / tileSize);
    const cols = Math.ceil(faceCanvas.width / tileSize);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = tileSize;
        tileCanvas.height = tileSize;

        const tileCtx = tileCanvas.getContext("2d");
        tileCtx.fillStyle = "#000";
        tileCtx.fillRect(0, 0, tileSize, tileSize);
        tileCtx.drawImage(
          faceCanvas,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize,
          0,
          0,
          tileSize,
          tileSize
        );

        const tileBlob = await canvasToBlob(tileCanvas, "image/jpeg", 0.9);
        zip.file(
          `${tilesPrefix}${sceneId}/${levelIndex}/${face}/${y}/${x}.jpg`,
          tileBlob
        );
      }
    }
  }

  async function exportEquirectScene(zip, tilesPrefix, scene, imageUrl) {
    const image = await loadImage(imageUrl);
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;

    const sourceCtx = sourceCanvas.getContext("2d");
    sourceCtx.drawImage(image, 0, 0);

    const sourceImageData = sourceCtx.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height
    );
    const maxFaceSize = Math.max(
      512,
      Math.min(
        4096,
        Math.pow(
          2,
          Math.floor(Math.log2(Math.max(512, image.naturalWidth / 4)))
        )
      )
    );
    const exportLevels = createExportLevels(maxFaceSize);
    const faceOrder = ["f", "b", "l", "r", "u", "d"];

    for (let i = 0; i < exportLevels.length; i++) {
      const level = exportLevels[i];

      for (const face of faceOrder) {
        const faceCanvas = renderCubeFace(
          sourceImageData.data,
          sourceCanvas.width,
          sourceCanvas.height,
          face,
          level.size
        );
        await addCanvasTilesToZip(
          zip,
          tilesPrefix,
          scene.id,
          i,
          face,
          faceCanvas
        );
      }
    }

    return {
      id: scene.id,
      name: scene.name,
      levels: exportLevels,
      faceSize: maxFaceSize,
      initialViewParameters: scene.initialViewParameters,
      linkHotspots: scene.linkHotspots || [],
      infoHotspots: scene.infoHotspots || [],
    };
  }

  async function addExistingTilesToZip(zip, tilesPrefix, sceneId, imageData) {
    const tileEntries = Object.entries(imageData.tiles || {});

    for (const [tileKey, dataUrl] of tileEntries) {
      const parts = tileKey.split("/");
      if (parts.length !== 4) {
        continue;
      }

      const [level, face, y, x] = parts;
      zip.file(
        `${tilesPrefix}${sceneId}/${level}/${face}/${y}/${x}.jpg`,
        dataUrlToBlob(dataUrl)
      );
    }
  }

  async function buildExportArchive() {
    const zip = new JSZip();
    const exportedScenes = [];
    const archiveConfig = state.importedArchive || {
      dataFilePath: "data.js",
      tilesPrefix: "tiles/",
      preservedFiles: {},
    };

    Object.entries(archiveConfig.preservedFiles).forEach(([path, content]) => {
      zip.file(path, content);
    });

    for (const scene of state.tourData.scenes) {
      const imageData = state.sceneImages[scene.id];
      if (!imageData) {
        throw new Error(`Missing image data for scene "${scene.name}"`);
      }

      if (typeof imageData === "string") {
        exportedScenes.push(
          await exportEquirectScene(
            zip,
            archiveConfig.tilesPrefix,
            scene,
            imageData
          )
        );
      } else if (imageData.tiles) {
        await addExistingTilesToZip(
          zip,
          archiveConfig.tilesPrefix,
          scene.id,
          imageData
        );
        exportedScenes.push({
          id: scene.id,
          name: scene.name,
          levels: scene.levels,
          faceSize: scene.faceSize,
          initialViewParameters: scene.initialViewParameters,
          linkHotspots: scene.linkHotspots || [],
          infoHotspots: scene.infoHotspots || [],
        });
      } else {
        throw new Error(`Unsupported image data format for scene "${scene.name}"`);
      }
    }

    const exportData = {
      name: state.tourData.name,
      scenes: exportedScenes,
      settings: state.tourData.settings,
    };
    const dataContent = `var APP_DATA = ${JSON.stringify(exportData, null, 2)};`;
    const dataDirParts = archiveConfig.dataFilePath.split("/");
    dataDirParts.pop();
    const indexHtmlPath = dataDirParts.length
      ? `${dataDirParts.join("/")}/index.html`
      : "index.html";

    zip.file("data.js", dataContent);
    zip.file("app-files/data.js", dataContent);
    zip.file(archiveConfig.dataFilePath, dataContent);

    if (state.tourData.settings && state.tourData.settings.logoUrl) {
      try {
        const logoBlob = dataUrlToBlob(state.tourData.settings.logoUrl);
        zip.file("app-files/logo.png", logoBlob);
      } catch (e) {
        console.warn("Could not write logo blob to ZIP:", e);
      }
    }

    if (archiveConfig.preservedFiles && archiveConfig.preservedFiles[indexHtmlPath]) {
      const decoder = new TextDecoder();
      const sourceHtml = decoder.decode(archiveConfig.preservedFiles[indexHtmlPath]);
      zip.file(indexHtmlPath, updateExportedIndexHtml(sourceHtml, exportData));
    } else {
      // Standalone webserver ready default files
      const marzipanoJsCode = await fetchLocalMarzipanoJs();
      if (marzipanoJsCode) {
        zip.file("vendor/marzipano.js", marzipanoJsCode);
      }
      zip.file("index.html", getDefaultExportIndexHtml(exportData));
      zip.file("index.js", getDefaultExportIndexJs());
      zip.file("style.css", getDefaultExportStyleCss());
    }

    return zip.generateAsync({ type: "blob" });
  }

  // Export Tour
  async function exportTour() {
    if (state.tourData.scenes.length === 0) {
      alert("Please add at least one panorama before exporting");
      return;
    }

    showModal("exportModal");
    elements.exportProgress.style.width = "0%";
    elements.exportStatus.textContent = "Preparing export...";

    try {
      elements.exportProgress.style.width = "30%";
      elements.exportStatus.textContent = "Generating tiles and archive...";

      const blob = await buildExportArchive();

      elements.exportProgress.style.width = "100%";
      elements.exportStatus.textContent = "Download starting...";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFileName(state.tourData.name) || "tour"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      markAsSaved();
      setTimeout(() => {
        hideModal("exportModal");
      }, 1000);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export tour: " + error.message);
      hideModal("exportModal");
    }
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

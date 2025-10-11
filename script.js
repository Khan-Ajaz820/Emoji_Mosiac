// ---------------------------
// Emoji Mosaic Generator (WASM powered)
// ---------------------------

// === DOM elements ===
const fileInput = document.getElementById("imageUpload"); // <input type="file" id="imageUpload">
const inputCanvas = document.getElementById("inputCanvas"); // <canvas id="inputCanvas"></canvas>
const inputCtx = inputCanvas.getContext("2d");
const outputContainer = document.getElementById("mosaicContainer"); // <div id="mosaicContainer"></div>

// === Settings ===
const tileSize = 16; // adjust tile size if needed
let imageLoaded = false;

// === Step 1: initialize WASM and KD-tree ===
(async function initWasmAndTree() {
  try {
    console.log("⏳ Initializing WebAssembly + KD-tree...");
    await loadWasmModule("build/full_mosaic.wasm");
    await loadKDTreeIntoWasm("kd_tree.json");
    console.log("✅ WASM and KD-tree ready.");
  } catch (e) {
    console.error("❌ WASM init failed:", e);
  }
})();

// === Step 2: image upload handler ===
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = async () => {
    // Draw uploaded image to input canvas
    inputCanvas.width = img.width;
    inputCanvas.height = img.height;
    inputCtx.drawImage(img, 0, 0);
    imageLoaded = true;

    // Ensure WASM is ready
    if (!window.wasmReady) {
      console.log("WASM not ready yet, reloading...");
      await loadWasmModule("build/full_mosaic.wasm");
      await loadKDTreeIntoWasm("kd_tree.json");
    }

    console.log("🖼️ Image loaded, generating mosaic...");

    // === Step 3: compute tile colors ===
    const { colors, cols, rows } = calculateTileColorsFromCanvas(inputCanvas, tileSize);

    // === Step 4: run WASM matching ===
    console.time("🧩 Mosaic matching time");
    const results = runMatchingAndGetResults(colors);
    console.timeEnd("🧩 Mosaic matching time");

    // === Step 5: render fast SVG mosaic ===
    renderFromResults(results, cols, rows, tileSize);

    console.log("✅ Mosaic generated successfully!");
  };
});

// === Step 6: FAST SVG renderer ===
function renderFromResults(results, cols, rows, tileSize) {
  outputContainer.innerHTML = "";

  const width = cols * tileSize;
  const height = rows * tileSize;
  const xmlns = "http://www.w3.org/2000/svg";

  console.time("🎨 SVG render time");

  // Create SVG element
  const svg = document.createElementNS(xmlns, "svg");
  svg.setAttribute("xmlns", xmlns);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.display = "block";
  svg.style.margin = "auto";
  svg.style.background = "#fafafa";

  // Build tiles
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < results.length; i++) {
    const src = results[i] || "sprite/placeholder.svg";
    const x = (i % cols) * tileSize;
    const y = Math.floor(i / cols) * tileSize;

    const img = document.createElementNS(xmlns, "image");
    img.setAttributeNS(null, "href", src);
    img.setAttribute("x", x);
    img.setAttribute("y", y);
    img.setAttribute("width", tileSize);
    img.setAttribute("height", tileSize);
    fragment.appendChild(img);
  }

  svg.appendChild(fragment);
  outputContainer.appendChild(svg);

  console.timeEnd("🎨 SVG render time");
}

// === Optional: reset button ===
function resetMosaic() {
  outputContainer.innerHTML = "";
  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  fileInput.value = "";
  imageLoaded = false;
  console.log("🔁 Mosaic reset.");
}

// === Optional: export functions ===
function saveMosaicAsSVG() {
  const svg = outputContainer.querySelector("svg");
  if (!svg) return alert("Generate mosaic first!");
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mosaic.svg";
  a.click();
}

async function saveMosaicAsPNG() {
  const svg = outputContainer.querySelector("svg");
  if (!svg) return alert("Generate mosaic first!");
  const data = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.src = url;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = svg.viewBox.baseVal.width;
  canvas.height = svg.viewBox.baseVal.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  const a = document.createElement("a");
  a.download = "mosaic.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}
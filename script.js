// Elements
const cameraScreen = document.getElementById('camera-screen');
const loadingScreen = document.getElementById('loading-screen');
const resultScreen = document.getElementById('result-screen');
const errorScreen = document.getElementById('error-screen');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas-hidden');
const captureBtn = document.getElementById('capture-btn');
const newScanBtn = document.getElementById('new-scan-btn');
const retryBtn = document.getElementById('retry-btn');
const resultContent = document.getElementById('result-content');
const errorMessage = document.getElementById('error-message');
const fileInput = document.getElementById('file-input');

let stream = null;

// Screen management
function showScreen(screen) {
    [cameraScreen, loadingScreen, resultScreen, errorScreen].forEach(s => {
        s.classList.remove('active');
    });
    screen.classList.add('active');
}

// Camera initialization
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        video.srcObject = stream;
        captureBtn.disabled = false;
    } catch (err) {
        console.error('Camera error:', err);
        errorMessage.textContent = 'Kunne ikke få adgang til kameraet. Tjek venligst tilladelser.';
        showScreen(errorScreen);
    }
}

// Image enhancement for low light
function enhanceImage(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
        totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // If image is dark, enhance it
    if (avgBrightness < 100) {
        const brightnessBoost = 1.3 + (100 - avgBrightness) / 200;
        const contrastBoost = 1.1;

        for (let i = 0; i < data.length; i += 4) {
            // Brightness
            data[i] = Math.min(255, data[i] * brightnessBoost);
            data[i + 1] = Math.min(255, data[i + 1] * brightnessBoost);
            data[i + 2] = Math.min(255, data[i + 2] * brightnessBoost);

            // Contrast
            data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrastBoost) + 128));
            data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrastBoost) + 128));
            data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrastBoost) + 128));
        }

        ctx.putImageData(imageData, 0, 0);
    }
}

// Analyze image (shared by capture and upload)
async function analyzeImage(imageData) {
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });

        if (!response.ok) {
            throw new Error('Analysis failed');
        }

        const result = await response.json();
        renderResult(result);
        showScreen(resultScreen);
    } catch (err) {
        console.error('Analysis error:', err);
        errorMessage.textContent = 'Kunne ikke analysere billedet. Prøv igen.';
        showScreen(errorScreen);
    }
}

// Capture and process image
async function captureImage() {
    captureBtn.disabled = true;
    showScreen(loadingScreen);

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Enhance image for low light conditions
    enhanceImage(ctx, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    await analyzeImage(imageData);

    captureBtn.disabled = false;
}

// Render result
function renderResult(data) {
    const ingredients = data.ingredients_detected || [];
    const simple = data.recipes?.simple || {};
    const advanced = data.recipes?.advanced || {};
    const shoppingList = data.shopping_list || [];

    let html = '';

    // Ingredients
    if (ingredients.length > 0) {
        html += `
            <div class="result-section">
                <p class="section-label">Ingredienser fundet</p>
                <div class="ingredients-list">
                    ${ingredients.map(i => `<span class="ingredient-tag">${i}</span>`).join('')}
                </div>
            </div>
        `;
    }

    // Simple recipe
    if (simple.title) {
        html += `
            <div class="result-section">
                <p class="section-label">Simpel ret</p>
                <div class="recipe-card">
                    <p class="recipe-title">${simple.title}</p>
                    ${simple.missing && simple.missing.length > 0 
                        ? `<p class="recipe-missing">Mangler: ${simple.missing.join(', ')}</p>` 
                        : '<p class="recipe-missing">Alt på lager</p>'}
                </div>
            </div>
        `;
    }

    // Advanced recipe
    if (advanced.title) {
        html += `
            <div class="result-section">
                <p class="section-label">Avanceret ret</p>
                <div class="recipe-card">
                    <p class="recipe-title">${advanced.title}</p>
                    ${advanced.missing && advanced.missing.length > 0 
                        ? `<p class="recipe-missing">Mangler: ${advanced.missing.join(', ')}</p>` 
                        : '<p class="recipe-missing">Alt på lager</p>'}
                </div>
            </div>
        `;
    }

    // Shopping list
    if (shoppingList.length > 0) {
        html += `
            <div class="result-section">
                <p class="section-label">Indkøbsliste</p>
                <ul class="shopping-list">
                    ${shoppingList.map(item => `<li>${item}</li>`).join('')}
                </ul>
                <p class="store-note">Målrettet REMA 1000</p>
            </div>
        `;
    }

    resultContent.innerHTML = html;
}

// Event listeners
captureBtn.addEventListener('click', captureImage);
newScanBtn.addEventListener('click', () => showScreen(cameraScreen));
retryBtn.addEventListener('click', () => {
    showScreen(cameraScreen);
    if (!stream) initCamera();
});

// File upload handler
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showScreen(loadingScreen);

    const reader = new FileReader();
    reader.onload = async (event) => {
        const imageData = event.target.result;
        await analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
});

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// Initialize
initCamera();

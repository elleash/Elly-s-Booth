// 
const video = document.getElementById('livecam');
const captureBtn = document.getElementById('captureBtn');
const capturedFrames = document.getElementById('capturedFrames');
const statusText = document.getElementById('status');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');


const generateStripBtn = document.getElementById('generateStripBtn');
const generatedStripContainer = document.getElementById('generatedStripContainer');
const generatedStrip = document.getElementById('generatedStrip');

const timerDisplay = document.getElementById('timerDisplay');

let timer = null;
let countdown = 0;
let photoCount = 0;

// Set up webcam stream
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        statusText.textContent = 'Error accessing camera: ' + error.message;
    }
}

function clearCanvas(){
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  capturedFrames.innerHTML = ''; // Clear all captured images
  photoCount = 0; // Reset photo count
  generateStripBtn.disabled = true; // Disable the generate strip button
  generatedStripContainer.style.display = 'none'; // Hide the generated strip container
}

// Capture current frame to canvas and return blob
function captureFrame() {

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const img = document.createElement('img');
  img.src = dataUrl;
  capturedFrames.appendChild(img);
  photoCount++; // Increment the photo count

  generateStripBtn.disabled = capturedFrames.children.length < 2;
  generatedStripContainer.style.display = 'none';
}

function startTimer(seconds) {
    if (timer) {
      clearInterval(timer);
    }
    countdown = seconds;
    timerDisplay.textContent = countdown;
    timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        timerDisplay.textContent = '';
        captureFrame();
      } else {
        timerDisplay.textContent = countdown;
      }
    }, 1000);
  }

function generatePhotostrip() {

  const images = [...capturedFrames.querySelectorAll('img')];
  if (images.length === 0) {
    alert('No images to generate photostrip.');
    return;
  }

  const limitedImages = images.slice(0, 4)
  
  let maxWidth = 0;  // Initialize maxWidth
  let totalHeight = 0;  // Initialize totalHeight
  // Calculate maxWidth and totalHeight in one loop
  limitedImages.forEach(img => {
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    if (imgWidth > maxWidth) {
      maxWidth = imgWidth;  // Update maxWidth if current image width is greater
    }
    totalHeight += imgHeight;  // Accumulate totalHeight
  });

  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  // Draw each image in vertical strip
  let yOffset = 0;
  limitedImages.forEach(img => {
    ctx.drawImage(img, 0, yOffset, img.naturalWidth, img.naturalHeight);
    yOffset += img.naturalHeight;

  });

  // Export to data URL and show in img element
  const stripDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  generatedStrip.src = stripDataUrl;
  generatedStrip.alt = 'Generated Photostrip';
  generatedStripContainer.style.display = 'block';
}

// convert to blob so that images can be sent to backend
async function uploadImages() {
    const images = [...capturedFrames.querySelectorAll('img')];
    const formData = new FormData();

    for (let img of images) {
        const blob = await fetch(img.src).then(res => res.blob());
        formData.append('photos', blob, `photo${photoCount++}.jpg`);
    }

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('Photostrip uploaded successfully!');
            console.log(result); // Log the response for debugging
        } else {
            alert('Error uploading photostrip: ' + result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading photostrip.');
    }
}

// Function to download the generated photostrip
function downloadPhotostrip() {
    const generatedStrip = document.getElementById('generatedStrip');
    if (!generatedStrip.src) {
        alert('No photostrip available to download.');
        return;
    }
    // Create a link element
    const link = document.createElement('a');
    link.href = generatedStrip.src; // Set the href to the image source
    link.download = 'photostrip.jpg'; // Set the default file name
    // Programmatically click the link to trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // Clean up
}

// Call uploadImages after generating the photostrip
generateStripBtn.addEventListener('click', () => {
    generatePhotostrip();
    uploadImages(); // Upload images after generating the strip
});

downloadBtn.addEventListener('click', downloadPhotostrip);

captureBtn.addEventListener('click', () => {
  photoCount = 0; // Reset photo count when starting the timer
  startTimer(5);
});

clearBtn.addEventListener('click', clearCanvas);

// Start camera setup on load
setupCamera();

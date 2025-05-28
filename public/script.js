// get elements from the html file
const video = document.getElementById('livecam');
const captureBtn = document.getElementById('captureBtn');
const capturedFrames = document.getElementById('capturedFrames');
const statusText = document.getElementById('status');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const displayBtn = document.getElementById('displayBtn');

const generateStripBtn = document.getElementById('generateStripBtn');
const generatedStripContainer = document.getElementById('generatedStripContainer');
const generatedStrip = document.getElementById('generatedStrip');

const timerDisplay = document.getElementById('timerDisplay');

// function to setup the camera
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        statusText.textContent = 'Error accessing camera: ' + error.message;
    }
}

// function to clear the images
function clearCanvas(){
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  capturedFrames.innerHTML = ''; // clear the captured images
  photoCount = 0; // reset photo count
  // reset the btns to original
  generateStripBtn.disabled = true;
  generatedStripContainer.style.display = 'none';
}

// function to take photos and save as a blob
function captureFrame() {

  // create a canvas
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // return the canvas as an image
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const img = document.createElement('img');
  img.src = dataUrl;
  // append the captured images to the captured frames container
  capturedFrames.appendChild(img);
  photoCount++; // increment photo count

  // disable button if the captured image is less than two
  generateStripBtn.disabled = capturedFrames.children.length < 2;
  generatedStripContainer.style.display = 'none';
}

// set timer variables
let timer = null;
let countdown = 0;
let photoCount = 0;

// function for the timer
function startTimer(seconds) {
    if (timer) {
      clearInterval(timer);
    }
    countdown = seconds; // sets seconds parameter as 0
    timerDisplay.textContent = countdown; // displays the countdown
    timer = setInterval(() => {
      countdown--; // devrements the number
      // condition if the countdown hits 0, the captureFrame function is called
      if (countdown <= 0) {
        clearInterval(timer);
        timerDisplay.textContent = '';
        captureFrame();
      } else {
        timerDisplay.textContent = countdown;
      }
    }, 1000); // set delay as 1000 millisecond
  }

// function to display the photostrip
function generatePhotostrip() {

  // get the images from the capturedFrames function
  const images = [...capturedFrames.querySelectorAll('img')];
  if (images.length === 0) {
    alert('No images to generate photostrip.');
    return;
  }

  const limitedImages = images.slice(0, 4) // gets the first and last items in an array
  
  // initialize width and height
  let maxWidth = 0;
  let totalHeight = 0;
  
  // calculate width and height of each image
  limitedImages.forEach(img => {
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // calculate the width
    if (imgWidth > maxWidth) {
      maxWidth = imgWidth; 
    }
    // calculate the height
    totalHeight += imgHeight;
  });

  // create the photstrip canvas
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  // draw image vertically
  let yOffset = 0;
  limitedImages.forEach(img => {
    ctx.drawImage(img, 0, yOffset, img.naturalWidth, img.naturalHeight);
    yOffset += img.naturalHeight;

  });

  // return the strip as an image
  const stripDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  generatedStrip.src = stripDataUrl;
  generatedStrip.alt = 'Generated Photostrip';
  generatedStripContainer.style.display = 'block'; // display the strip 
}

async function uploadImages() {
    const images = [...capturedFrames.querySelectorAll('img')];
    const formData = new FormData();

    // convert the images to blob so that images can be sent to backend
    for (let img of images) {
        const blob = await fetch(img.src).then(res => res.blob());
        formData.append('photos', blob, `photo${photoCount++}.jpg`);
    }

    try {
        // call upload route
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            alert('Photostrip uploaded successfully!');
            console.log(result); // debug
        } else {
            alert('Error uploading photostrip: ' + result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading photostrip.');
    }
}

// function to download photostrip
function downloadPhotostrip() {
  // get the photostrip
    const generatedStrip = document.getElementById('generatedStrip');
    if (!generatedStrip.src) {
        alert('No photostrip available to download.');
        return;
    }
    // create an anchor tag that will act as link
    const link = document.createElement('a');
    link.href = generatedStrip.src; // set the link to the photostrip
    link.download = 'photostrip.jpg'; // Set the default file name
    // click the link to trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // Clean up
}

// function to display the saved images
async function dispImg() {
    try {
      // call images route
        const response = await fetch("/images");
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        const images = data.images || []; // store images in a variable
        capturedFrames.innerHTML = ""; // clear images in the frame
        // goes through each image in the array
        images.forEach((image) => {
            // creates a new div for each image and appends them to the original div
            const imgDiv = document.createElement('div');
            imgDiv.innerHTML = `<img src="${image}" alt="Image not found">`;
            capturedFrames.appendChild(imgDiv);
        });
          
    } catch (error) {
        console.error("Error loading images:", error);
    }
};

displayBtn.addEventListener('click', dispImg);

generateStripBtn.addEventListener('click', () => {
    generatePhotostrip();
    uploadImages(); // save image to db once the photstrip has been generated
});

downloadBtn.addEventListener('click', downloadPhotostrip);

captureBtn.addEventListener('click', () => {
  photoCount = 0; // reset photo count when starting the timer again
  startTimer(3); // set timer number
});

clearBtn.addEventListener('click', clearCanvas);

// start camera on load
setupCamera();

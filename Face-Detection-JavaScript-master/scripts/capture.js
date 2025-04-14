// scripts/capture.js
import { uploadImage } from './upload.js';

const video = document.getElementById('camera');
const captureButton = document.getElementById('capture-btn');
const status = document.getElementById('status');

// Start the camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        console.log("Camera started.");
    } catch (error) {
        console.error("Camera access denied:", error);
        alert("Please grant camera access!");
    }
}

captureButton.addEventListener('click', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to image blob
    canvas.toBlob(async (blob) => {
        const file = new File([blob], `captured_${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Upload the image
        status.textContent = "Uploading...";
        await uploadImage(file);
        status.textContent = "Upload complete!";
    }, 'image/jpeg');
});

// Start the camera when the page loads
startCamera();

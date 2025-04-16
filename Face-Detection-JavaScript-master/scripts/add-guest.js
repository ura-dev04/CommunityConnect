import { storage, database } from './firebase-config.js';
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";
import { ref as dbRef, push, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { ensureModelsLoaded } from './setup-models.js';

document.addEventListener('DOMContentLoaded', () => {
    const guestForm = document.getElementById('guest-form');
    const nameInput = document.getElementById('guest-name');
    const phoneInput = document.getElementById('guest-phone');
    const video = document.getElementById('camera');
    const captureBtn = document.getElementById('capture-btn');
    const captureCanvas = document.getElementById('capture-canvas');
    const capturedImage = document.getElementById('captured-image');
    const statusDiv = document.getElementById('status');
    
    // File upload elements
    const webcamToggle = document.getElementById('webcam-toggle');
    const fileToggle = document.getElementById('file-toggle');
    const webcamSection = document.getElementById('webcam-section');
    const fileSection = document.getElementById('file-section');
    const imageUpload = document.getElementById('image-upload');
    const uploadedImage = document.getElementById('uploaded-image');

    let capturedImageBlob = null;
    let uploadedImageBlob = null;
    let modelsLoaded = false;
    let inputMethod = 'webcam'; // 'webcam' or 'file'
    
    // Get the logged-in user's apartment from session storage
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
    const userApartment = loggedInUser.apartment || 'unknown';

    // Toggle between webcam and file upload
    webcamToggle.addEventListener('click', () => {
        inputMethod = 'webcam';
        webcamToggle.classList.add('active');
        fileToggle.classList.remove('active');
        webcamSection.style.display = 'block';
        fileSection.style.display = 'none';
        
        // Start camera if it was stopped
        if (!video.srcObject) {
            startCamera();
        }
    });
    
    fileToggle.addEventListener('click', () => {
        inputMethod = 'file';
        fileToggle.classList.add('active');
        webcamToggle.classList.remove('active');
        fileSection.style.display = 'block';
        webcamSection.style.display = 'none';
        
        // Stop camera to save resources
        stopCamera();
    });
    
    // Handle file selection
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Preview the selected image
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImage.src = e.target.result;
                uploadedImage.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // Store the file as blob for later use
            uploadedImageBlob = file;
        }
    });

    // Start the camera and load models
    async function initialize() {
        try {
            // Start camera
            await startCamera();
            statusDiv.textContent = "Camera ready. Loading face detection models...";

            // Load face detection models
            await ensureModelsLoaded();
            modelsLoaded = true;
            statusDiv.textContent = "Ready! Please capture a clear photo of the guest's face.";
        } catch (error) {
            console.error("Initialization error:", error);
            statusDiv.textContent = `Error: ${error.message}. Please refresh and try again.`;
        }
    }

    // Initialize when the page loads
    initialize();
    
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            return true;
        } catch (error) {
            console.error("Camera access error:", error);
            statusDiv.textContent = "Camera access denied. You can still upload an image file.";
            // Auto-switch to file upload mode if camera access fails
            fileToggle.click();
            return false;
        }
    }
    
    function stopCamera() {
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
    }

    // Capture image from camera
    captureBtn.addEventListener('click', () => {
        const context = captureCanvas.getContext('2d');
        
        // Set canvas dimensions to match video
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        
        // Display the captured image
        captureCanvas.toBlob(blob => {
            capturedImageBlob = blob;
            const imageUrl = URL.createObjectURL(blob);
            capturedImage.src = imageUrl;
            capturedImage.style.display = 'block';
            statusDiv.textContent = "Photo captured! You can retake if needed.";
        }, 'image/jpeg', 0.95);
    });

    // Form submission
    guestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate form
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (!name || !phone) {
            statusDiv.textContent = "Error: Please enter both name and phone number.";
            return;
        }
        
        // Check if we have an image (either captured or uploaded)
        let imageBlob;
        if (inputMethod === 'webcam') {
            imageBlob = capturedImageBlob;
            if (!imageBlob) {
                statusDiv.textContent = "Error: Please capture a photo first.";
                return;
            }
        } else {
            imageBlob = uploadedImageBlob;
            if (!imageBlob) {
                statusDiv.textContent = "Error: Please upload an image first.";
                return;
            }
        }

        if (!modelsLoaded) {
            statusDiv.textContent = "Error: Face detection models still loading. Please wait...";
            return;
        }
        
        // Show loading status
        statusDiv.textContent = "Processing face and saving guest data...";
        
        try {
            // 1. Upload the image to Firebase Storage
            const fileName = `guest_${Date.now()}.jpg`;
            const imageRef = storageRef(storage, `guests/${fileName}`);
            
            const uploadSnapshot = await uploadBytes(imageRef, imageBlob);
            const imageUrl = await getDownloadURL(uploadSnapshot.ref);
            
            // 2. Extract facial features for future comparison
            const faceFeatures = await extractFaceFeatures(imageBlob);
            
            if (!faceFeatures) {
                statusDiv.textContent = "Error: No face detected in the image. Please try again with a clearer photo.";
                return;
            }
            
            // 3. Store guest data in Firebase Realtime Database with apartment info
            const guestRef = push(dbRef(database, "guests"));
            await set(guestRef, {
                name,
                phone,
                imageUrl,
                faceDescriptor: Array.from(faceFeatures.descriptor), // Convert Float32Array to regular array for storage
                timestamp: new Date().toISOString(),
                apartment: userApartment // Add apartment information to track which flat added this guest
            });
            
            // Success message
            statusDiv.textContent = "Guest added successfully!";
            
            // Reset form and redirect
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
            
        } catch (error) {
            console.error("Error adding guest:", error);
            statusDiv.textContent = `Error: ${error.message}`;
        }
    });

    // Extract face features from an image
    async function extractFaceFeatures(imageBlob) {
        try {
            const img = await createImageFromBlob(imageBlob);
            
            // Detect single face with landmarks and descriptors
            const detections = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();
                
            if (!detections) {
                return null;
            }
            
            return {
                descriptor: detections.descriptor
            };
        } catch (error) {
            console.error("Face detection error:", error);
            throw new Error("Face detection failed. Please try again.");
        }
    }

    // Helper function to create an image element from blob
    function createImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }
});

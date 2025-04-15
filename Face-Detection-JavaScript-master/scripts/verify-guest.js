import { database } from './firebase-config.js';
import { ref, get, push, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { ensureModelsLoaded, compareDescriptors } from './setup-models.js';

document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('camera');
    const verifyBtn = document.getElementById('verify-btn');
    const resultContainer = document.getElementById('result-container');
    const statusDiv = document.getElementById('status');
    
    // Check if user is logged in
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
    const isLoggedIn = loggedInUser.apartment ? true : false;
    const userApartment = loggedInUser.apartment || null;
    
    // Add user context UI indicator
    const contextDisplay = document.createElement('div');
    contextDisplay.className = 'verification-context';
    
    if (isLoggedIn) {
        // Logged-in mode - only checking specific apartment's guests
        contextDisplay.textContent = `Verifying guests for apartment: ${userApartment}`;
        contextDisplay.classList.add('apartment-specific');
    } else {
        // Public mode - checking all guests
        contextDisplay.textContent = 'Public verification mode - All guests';
        contextDisplay.classList.add('public-mode');
        
        // Add a return to homepage link for public mode
        const homeLink = document.createElement('a');
        homeLink.href = '../homepage.html';
        homeLink.className = 'back-btn home-btn';
        homeLink.textContent = 'Return to Homepage';
        
        // Replace the existing back link to avoid confusion
        const backLink = document.querySelector('.back-btn');
        if (backLink && backLink.parentNode) {
            backLink.parentNode.replaceChild(homeLink, backLink);
        }
    }
    
    // Add the context display to the page
    const headerElement = document.querySelector('.guests-container h1');
    if (headerElement && headerElement.nextSibling) {
        headerElement.parentNode.insertBefore(contextDisplay, headerElement.nextSibling);
    }

    let modelsLoaded = false;

    // Initialize camera and models
    async function initialize() {
        try {
            // Start camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            statusDiv.textContent = "Camera ready. Loading face detection models...";

            // Load face detection models
            await ensureModelsLoaded();
            modelsLoaded = true;
            statusDiv.textContent = "Ready! Click 'Verify Face' when visitor is visible in the frame.";
        } catch (error) {
            console.error("Initialization error:", error);
            statusDiv.textContent = `Error: ${error.message}. Please refresh and try again.`;
        }
    }

    // Initialize on page load
    initialize();

    // Verify button click handler
    verifyBtn.addEventListener('click', async () => {
        if (!modelsLoaded) {
            statusDiv.textContent = "Face detection models still loading. Please wait...";
            return;
        }

        statusDiv.textContent = "Processing...";
        resultContainer.innerHTML = "";
        
        try {
            // Capture current frame from video
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Detect face in the current frame
            const detections = await faceapi.detectSingleFace(canvas)
                .withFaceLandmarks()
                .withFaceDescriptor();
                
            if (!detections) {
                showResult(false, "No face detected or face unclear. Please try again with better lighting.");
                return;
            }
            
            // Get all guests from database
            const guestsRef = ref(database, 'guests');
            const snapshot = await get(guestsRef);
            
            if (!snapshot.exists()) {
                showResult(false, "No registered guests found in the database.");
                return;
            }
            
            const guests = snapshot.val();
            let bestMatch = null;
            let bestMatchDistance = 1.0; // Lower is better, threshold is typically 0.6
            
            // Convert the current face descriptor to a FaceAPI FaceDescriptor
            const currentFaceDescriptor = detections.descriptor;
            
            // Compare with all registered guests
            Object.entries(guests).forEach(([id, guest]) => {
                // In logged-in mode, only check guests registered for this apartment
                // In public mode, check all guests
                if ((isLoggedIn && guest.apartment === userApartment) || !isLoggedIn) {
                    if (guest.faceDescriptor) {
                        // Convert stored descriptor back to Float32Array
                        const storedDescriptor = new Float32Array(guest.faceDescriptor);
                        const distance = compareDescriptors(currentFaceDescriptor, storedDescriptor);
                        
                        // Check if this is the best match so far
                        if (distance < bestMatchDistance) {
                            bestMatchDistance = distance;
                            bestMatch = {
                                id,
                                name: guest.name,
                                phone: guest.phone,
                                imageUrl: guest.imageUrl,
                                apartment: guest.apartment || 'Unknown',
                                distance
                            };
                        }
                    }
                }
            });
            
            // Check if we found a good match (threshold typically 0.6)
            // Lower threshold means more strict matching
            const MATCH_THRESHOLD = 0.6;
            if (bestMatch && bestMatchDistance < MATCH_THRESHOLD) {
                showResult(true, `Match found: ${bestMatch.name}`, bestMatch);
            } else {
                showResult(false, "No matching guest found. Please register this visitor.");
            }
            
        } catch (error) {
            console.error("Verification error:", error);
            statusDiv.textContent = `Error during verification: ${error.message}`;
        }
    });

    // Show verification result
    function showResult(success, message, matchData = null) {
        resultContainer.innerHTML = '';
        resultContainer.className = success ? 'result-container result-success' : 'result-container result-failure';
        
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        resultContainer.appendChild(messageElement);
        
        if (success && matchData) {
            const matchDetails = document.createElement('div');
            matchDetails.className = 'match-details';
            
            // In public mode, show apartment information
            const apartmentInfo = !isLoggedIn ? `<p>Apartment: ${matchData.apartment}</p>` : '';
            
            matchDetails.innerHTML = `
                <img src="${matchData.imageUrl}" alt="${matchData.name}" class="match-photo">
                <div class="match-info">
                    <p><strong>${matchData.name}</strong></p>
                    <p>Phone: ${matchData.phone}</p>
                    ${apartmentInfo}
                    <p>Confidence: ${Math.round((1 - matchData.distance) * 100)}%</p>
                </div>
            `;
            resultContainer.appendChild(matchDetails);
            
            // Only show the log entry button if logged in
            if (isLoggedIn) {
                // Log entry button
                const logButton = document.createElement('button');
                logButton.className = 'primary-btn';
                logButton.textContent = 'Log Entry';
                logButton.addEventListener('click', () => logGuestEntry(matchData.id, matchData.name));
                resultContainer.appendChild(logButton);
            }
        } else if (!success) {
            // Add a "Register New Guest" button when no match is found, but only if logged in
            if (isLoggedIn) {
                const registerButton = document.createElement('button');
                registerButton.className = 'primary-btn';
                registerButton.textContent = 'Register New Guest';
                registerButton.addEventListener('click', () => {
                    window.location.href = 'add-guest.html';
                });
                resultContainer.appendChild(registerButton);
            } else {
                // For public mode, just show a message about registration
                const registerInfo = document.createElement('p');
                registerInfo.textContent = 'Please contact your apartment owner to register as a guest.';
                registerInfo.className = 'register-info';
                resultContainer.appendChild(registerInfo);
            }
        }
        
        statusDiv.textContent = success ? "Verification complete!" : "Verification failed. Try again.";
    }

    // Log guest entry
    async function logGuestEntry(guestId, guestName) {
        try {
            const entryRef = push(ref(database, 'entries'));
            await set(entryRef, {
                guestId,
                guestName,
                apartment: userApartment, // Add apartment information to the entry log
                timestamp: new Date().toISOString(),
                type: 'entry'
            });
            
            showResult(true, `Entry logged successfully for ${guestName}! Guest can proceed.`);
        } catch (error) {
            console.error("Error logging entry:", error);
            statusDiv.textContent = `Error logging entry: ${error.message}`;
        }
    }
});

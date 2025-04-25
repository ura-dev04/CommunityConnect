import { getDatabasess, initializeFirebase } from './firebase-init.js';
import { ref, onValue, query, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Firebase
    const { database } = await initializeFirebase();
    
    const imageContainer = document.getElementById('captured-image-container');

    if (!imageContainer) {
        console.error("Error: 'captured-image-container' not found in the HTML.");
        return;
    }

    // Use query to get only the latest image
    const latestImageRef = query(ref(database, 'images'), orderByKey(), limitToLast(1));
    
    onValue(latestImageRef, (snapshot) => {
        const images = snapshot.val();

        if (!images) {
            console.log("No images found in database.");
            return;
        }

        // Get the latest image
        const latestImageKey = Object.keys(images)[0];
        const latestImage = images[latestImageKey];

        // Clear previous image and show only the latest one
        imageContainer.innerHTML = '';  

        const imgElement = document.createElement('img');
        // Use the correct property name - imageUrl instead of url
        imgElement.src = latestImage.imageUrl;  
        imgElement.alt = "Latest Captured Image";
        imgElement.style.width = "100%"; 
        imgElement.style.borderRadius = "8px";  

        imageContainer.appendChild(imgElement);
    });
});

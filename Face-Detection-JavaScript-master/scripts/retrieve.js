import { database } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
    const imageContainer = document.getElementById('captured-image-container');

    if (!imageContainer) {
        console.error("Error: 'captured-image-container' not found in the HTML.");
        return;
    }

    const imagesRef = ref(database, 'images');
    onValue(imagesRef, (snapshot) => {
        const images = snapshot.val();

        if (!images) {
            console.log("No images found in database.");
            return;
        }

        // Get the latest image
        const latestImageKey = Object.keys(images).pop();
        const latestImage = images[latestImageKey];

        // Clear previous image and show only the latest one
        imageContainer.innerHTML = '';  

        const imgElement = document.createElement('img');
        imgElement.src = latestImage.url;  
        imgElement.alt = "Latest Captured Image";
        imgElement.style.width = "100%"; 
        imgElement.style.borderRadius = "8px";  

        imageContainer.appendChild(imgElement);
    });
});

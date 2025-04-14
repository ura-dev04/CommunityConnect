// import { database } from './firebase-config.js';
// import { ref, onValue, query, orderByKey, limitToLast } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// const displayLatestImage = async () => {
//     const imagesContainer = document.getElementById('captured-image-container');

//     // ✅ Check if the element exists before modifying it
//     if (!imagesContainer) {
//         console.error("Error: 'captured-image-container' not found in the DOM.");
//         return;
//     }

//     // Get only the **latest** uploaded image
//     const latestImageRef = query(ref(database, 'images'), orderByKey(), limitToLast(1));

//     onValue(latestImageRef, (snapshot) => {
//         const images = snapshot.val();
//         imagesContainer.innerHTML = ''; // Clear previous image before updating

//         if (images) {
//             const lastImage = Object.values(images)[0]; // Get the most recent image

//             const imgElement = document.createElement('img');
//             imgElement.src = lastImage.url;
//             imgElement.alt = "Latest Captured Image";
//             imgElement.style.width = "200px"; // Adjust size as needed
//             imgElement.style.margin = "10px";

//             imagesContainer.appendChild(imgElement);
//         }
//     });
// };

// // Run the function after the page has fully loaded
// window.addEventListener("DOMContentLoaded", displayLatestImage);


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

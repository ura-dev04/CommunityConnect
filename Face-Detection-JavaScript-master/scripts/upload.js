import { storage, database } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";
import { ref as dbRef, push, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

export async function uploadImage(file) {
    if (!file) {
        alert("No image selected!");
        return;
    }

    const storageRef = ref(storage, `images/${file.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);  //  Get direct Firebase URL

        // ✅ Store the correct URL in Realtime Database
        const imageRef = push(dbRef(database, "images"));
        await set(imageRef, {
            name: file.name,
            imageUrl: url,  // 🔹 Fix: Store as `imageUrl` (matches retrieval)
            timestamp: new Date().toISOString()
        });

        alert("Image uploaded successfully!");
        console.log("Image URL:", url);

    } catch (error) {
        console.error("Error uploading image:", error);
    }
}

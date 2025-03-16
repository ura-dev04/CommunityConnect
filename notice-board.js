// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// import { getDatabase, ref, push, set, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// // Firebase Configuration
// const firebaseConfig = {
//     apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
//     authDomain: "societymanagement-df579.firebaseapp.com",
//     projectId: "societymanagement-df579",
//     storageBucket: "societymanagement-df579.firebasestorage.app",
//     messagingSenderId: "526280568230",
//     appId: "1:526280568230:web:c5c01cf4f30591be437367"
// };

// const app = initializeApp(firebaseConfig);
// const database = getDatabase(app);

// // Function to Load Notices
// function loadNotices() {
//     const noticesRef = ref(database, "notices");
//     onValue(noticesRef, (snapshot) => {
//         const noticesList = document.getElementById("noticesList");
//         const template = document.getElementById("noticeTemplate").content;

//         noticesList.innerHTML = ""; // Clear list before loading new notices

//         snapshot.forEach((childSnapshot) => {
//             const notice = childSnapshot.val();
//             const noticeKey = childSnapshot.key;

//             // Clone template
//             const noticeElement = template.cloneNode(true);
//             noticeElement.querySelector(".notice-title").textContent = notice.title;
//             noticeElement.querySelector(".notice-content").textContent = notice.content;
//             noticeElement.querySelector(".notice-timestamp").textContent = notice.timestamp;

//             // Find buttons and add event listeners
//             noticeElement.querySelector(".edit-btn").addEventListener("click", () => {
//                 editNotice(noticeKey, notice.title, notice.content);
//             });

//             noticeElement.querySelector(".delete-btn").addEventListener("click", () => {
//                 deleteNotice(noticeKey);
//             });

//             // Append to the list
//             noticesList.appendChild(noticeElement);
//         });
//     });
// }

// // Function to Save Notice (Add/Edit)
// noticeForm.addEventListener("submit", (e) => {
//     e.preventDefault();
//     const title = titleInput.value;
//     const content = contentInput.value;
//     const timestamp = new Date().toLocaleString();

//     if (noticeIdInput.value) {
//         // Edit Existing Notice
//         set(ref(database, "notices/" + noticeIdInput.value), {
//             title,
//             content,
//             timestamp
//         });
//     } else {
//         // Add New Notice
//         const newNoticeRef = push(ref(database, "notices"));
//         set(newNoticeRef, { title, content, timestamp });
//     }

//     noticeForm.reset();
//     noticeIdInput.value = ""; // Reset hidden field
// });

// // Function to Edit Notice
// window.editNotice = (id, title, content) => {
//     titleInput.value = title;
//     contentInput.value = content;
//     noticeIdInput.value = id; // Store ID for editing
// };

// // Function to Delete Notice
// window.deleteNotice = (id) => {
//     const noticeRef = ref(database, "notices/" + id);
//     remove(noticeRef)
//         .then(() => {
//             const messageElement = document.getElementById("noticeMessage");
//             messageElement.innerText = "Notice deleted successfully!";
//             messageElement.style.color = "green";

//             // Auto-hide after 3 seconds
//             setTimeout(() => {
//                 messageElement.innerText = "";
//             }, 3000);
//         })
//         .catch((error) => {
//             const messageElement = document.getElementById("noticeMessage");
//             messageElement.innerText = "Error deleting notice: " + error.message;
//             messageElement.style.color = "red";

//             // Auto-hide after 3 seconds
//             setTimeout(() => {
//                 messageElement.innerText = "";
//             }, 3000);
//         });
// };

// // Load Notices on Page Load
// loadNotices();
// 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAjWn47KqOzJ2cMM7t74EE86XxWvOA_OOA",
    authDomain: "societymanagement-df579.firebaseapp.com",
    projectId: "societymanagement-df579",
    storageBucket: "societymanagement-df579.firebasestorage.app",
    messagingSenderId: "526280568230",
    appId: "1:526280568230:web:c5c01cf4f30591be437367"
};

const app = initializeApp(firebaseConfig);

const database = getDatabase();


// 📌 Function to Submit or Edit Notice
document.getElementById("noticeForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const noticeId = document.getElementById("noticeId").value;
    const title = document.getElementById("noticeTitle").value.trim();
    const content = document.getElementById("noticeContent").value.trim();

    if (!title || !content) return alert("Please enter both title and content!");

    const noticesRef = ref(database, "notices");
    
    // If editing an existing notice
    if (noticeId) {
        set(ref(database, "notices/" + noticeId), { title, content, timestamp: new Date().toLocaleString() })
        .then(() => {
            alert("Notice updated successfully!");
            document.getElementById("noticeForm").reset();
            document.getElementById("noticeId").value = ""; // Clear hidden ID field
        })
        .catch((error) => console.error("Error updating notice:", error));
    } 
    // If creating a new notice
    else {
        const newNoticeRef = push(noticesRef);
        set(newNoticeRef, { title, content, timestamp: new Date().toLocaleString() })
        .then(() => {
            alert("Notice added successfully!");
            document.getElementById("noticeForm").reset();
        })
        .catch((error) => console.error("Error submitting notice:", error));
    }
});

// 📌 Function to Load Notices
function loadNotices() {
    const noticesRef = ref(database, "notices");
    const noticesList = document.getElementById("noticesList");
    const template = document.getElementById("noticeTemplate").content;

    onValue(noticesRef, (snapshot) => {
        noticesList.innerHTML = ""; // Clear list before loading new notices

        snapshot.forEach((childSnapshot) => {
            const notice = childSnapshot.val();
            const noticeKey = childSnapshot.key;

            // Clone template
            const noticeElement = template.cloneNode(true);
            noticeElement.querySelector(".notice-title").textContent = notice.title;
            noticeElement.querySelector(".notice-content").textContent = notice.content;
            noticeElement.querySelector(".notice-timestamp").textContent = notice.timestamp;

            // Edit Notice
            noticeElement.querySelector(".edit-btn").addEventListener("click", () => {
                document.getElementById("noticeId").value = noticeKey;
                document.getElementById("noticeTitle").value = notice.title;
                document.getElementById("noticeContent").value = notice.content;
            });

            // Delete Notice
            noticeElement.querySelector(".delete-btn").addEventListener("click", () => {
                if (confirm("Are you sure you want to delete this notice?")) {
                    remove(ref(database, "notices/" + noticeKey))
                        .then(() => alert("Notice deleted successfully!"))
                        .catch((error) => console.error("Error deleting notice:", error));
                }
            });

            // Append to the list
            noticesList.appendChild(noticeElement);
        });
    });
}

// 📌 Call function to load notices on page load
document.addEventListener("DOMContentLoaded", loadNotices);


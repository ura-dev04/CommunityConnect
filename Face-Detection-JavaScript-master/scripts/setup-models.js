/**
 * Face API Models Helper
 * Handles checking, loading and managing face-api.js models
 */

// Define the path to models based on the environment
const MODEL_URL = './models';

/**
 * Load all required face-api.js models
 * @returns {Promise} Resolves when all models are loaded
 */
export async function loadFaceDetectionModels() {
  try {
    console.log("Loading face-api.js models from:", MODEL_URL);
    
    const startTime = performance.now();
    
    // Load all necessary models sequentially to avoid race conditions
    await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
    console.log("✓ SSD Mobilenet model loaded");
    
    await faceapi.loadFaceLandmarkModel(MODEL_URL);
    console.log("✓ Face Landmark model loaded");
    
    await faceapi.loadFaceRecognitionModel(MODEL_URL);
    console.log("✓ Face Recognition model loaded");
    
    const endTime = performance.now();
    console.log(`Face models loaded successfully in ${Math.floor(endTime - startTime)}ms`);
    
    return true;
  } catch (error) {
    console.error("Error loading face-api.js models:", error);
    throw new Error("Could not load face detection models");
  }
}

/**
 * Check if the face-api models are already loaded
 * @returns {Boolean} True if models are loaded, false otherwise
 */
export function areModelsLoaded() {
  return (
    !!faceapi.nets.ssdMobilenetv1.params &&
    !!faceapi.nets.faceLandmark68Net.params &&
    !!faceapi.nets.faceRecognitionNet.params
  );
}

/**
 * Ensure face detection models are loaded
 * @returns {Promise} Resolves when models are loaded
 */
export async function ensureModelsLoaded() {
  if (!areModelsLoaded()) {
    return loadFaceDetectionModels();
  }
  console.log("Face models already loaded");
  return true;
}

/**
 * Compare two face descriptors and get the distance/similarity
 * @param {Float32Array} descriptor1 - First face descriptor
 * @param {Float32Array} descriptor2 - Second face descriptor
 * @returns {Number} Distance between the descriptors (lower is more similar)
 */
export function compareDescriptors(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) return 1.0;
  
  // Convert to FaceAPI descriptors if they are arrays
  const desc1 = Array.isArray(descriptor1) ? new Float32Array(descriptor1) : descriptor1;
  const desc2 = Array.isArray(descriptor2) ? new Float32Array(descriptor2) : descriptor2;
  
  return faceapi.euclideanDistance(desc1, desc2);
}

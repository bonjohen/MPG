/**
 * Motion Tracking functionality for Motion Powered Games
 * Uses MediaPipe and TensorFlow.js for pose estimation and hand tracking
 */

// Configuration options
const motionTrackingConfig = {
    // Enable/disable different tracking features
    enableHandTracking: true,
    enablePoseDetection: true,
    enableFaceMesh: true,
    
    // Performance settings
    videoWidth: 640,
    videoHeight: 480,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
    
    // Smoothing for more stable tracking
    smoothingFactor: 0.7,
    
    // Debug mode for visualization
    debugMode: false
};

// Global variables
let handPoseDetector = null;
let bodyPoseDetector = null;
let faceMeshDetector = null;
let lastHandPose = null;
let lastBodyPose = null;
let lastFaceMesh = null;
let isTracking = false;
let videoElement = null;
let canvasElement = null;
let canvasCtx = null;
let calibrationData = null;

/**
 * Initialize the motion tracking system
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - The initialized tracking system
 */
async function initMotionTracking(options = {}) {
    // Merge default config with provided options
    const config = { ...motionTrackingConfig, ...options };
    
    // Store references to video and canvas elements
    videoElement = document.getElementById(config.videoElementId || 'localVideo');
    canvasElement = document.getElementById(config.canvasElementId || 'motionCanvas');
    
    if (!videoElement) {
        throw new Error('Video element not found. Please provide a valid video element ID.');
    }
    
    // Create canvas if it doesn't exist
    if (!canvasElement && config.debugMode) {
        canvasElement = document.createElement('canvas');
        canvasElement.id = 'motionCanvas';
        canvasElement.width = config.videoWidth;
        canvasElement.height = config.videoHeight;
        canvasElement.style.position = 'absolute';
        canvasElement.style.top = '0';
        canvasElement.style.left = '0';
        canvasElement.style.pointerEvents = 'none';
        videoElement.parentNode.appendChild(canvasElement);
    }
    
    if (canvasElement) {
        canvasCtx = canvasElement.getContext('2d');
    }
    
    try {
        // Load MediaPipe models
        await loadModels(config);
        console.log('Motion tracking models loaded successfully');
        
        // Start tracking if autoStart is true
        if (config.autoStart) {
            startTracking();
        }
        
        // Return public API
        return {
            startTracking,
            stopTracking,
            getHandPose: () => lastHandPose,
            getBodyPose: () => lastBodyPose,
            getFaceMesh: () => lastFaceMesh,
            calibrate,
            isTracking: () => isTracking,
            setDebugMode: (debug) => {
                config.debugMode = debug;
                if (debug && !canvasElement) {
                    // Create canvas for debug visualization
                    canvasElement = document.createElement('canvas');
                    canvasElement.id = 'motionCanvas';
                    canvasElement.width = config.videoWidth;
                    canvasElement.height = config.videoHeight;
                    canvasElement.style.position = 'absolute';
                    canvasElement.style.top = '0';
                    canvasElement.style.left = '0';
                    canvasElement.style.pointerEvents = 'none';
                    videoElement.parentNode.appendChild(canvasElement);
                    canvasCtx = canvasElement.getContext('2d');
                } else if (!debug && canvasElement) {
                    // Remove canvas if debug mode is disabled
                    canvasElement.remove();
                    canvasElement = null;
                    canvasCtx = null;
                }
            }
        };
    } catch (error) {
        console.error('Failed to initialize motion tracking:', error);
        throw error;
    }
}

/**
 * Load MediaPipe and TensorFlow.js models
 * @param {Object} config - Configuration options
 * @returns {Promise<void>}
 */
async function loadModels(config) {
    try {
        // Load hand pose detection model
        if (config.enableHandTracking) {
            handPoseDetector = await createHandPoseDetector(config);
        }
        
        // Load body pose detection model
        if (config.enablePoseDetection) {
            bodyPoseDetector = await createBodyPoseDetector(config);
        }
        
        // Load face mesh detection model
        if (config.enableFaceMesh) {
            faceMeshDetector = await createFaceMeshDetector(config);
        }
    } catch (error) {
        console.error('Error loading models:', error);
        throw error;
    }
}

/**
 * Create hand pose detector
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} - The hand pose detector
 */
async function createHandPoseDetector(config) {
    // Check if MediaPipe Hands is available
    if (!window.handPoseDetection) {
        throw new Error('MediaPipe Hands not loaded. Please include the handpose detection script.');
    }
    
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'full',
        maxHands: 2,
        minDetectionConfidence: config.minDetectionConfidence,
        minTrackingConfidence: config.minTrackingConfidence
    };
    
    return handPoseDetection.createDetector(model, detectorConfig);
}

/**
 * Create body pose detector
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} - The body pose detector
 */
async function createBodyPoseDetector(config) {
    // Check if MediaPipe Pose is available
    if (!window.poseDetection) {
        throw new Error('MediaPipe Pose not loaded. Please include the pose detection script.');
    }
    
    const model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
        modelType: 'lite',
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: config.minDetectionConfidence,
        minTrackingConfidence: config.minTrackingConfidence
    };
    
    return poseDetection.createDetector(model, detectorConfig);
}

/**
 * Create face mesh detector
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} - The face mesh detector
 */
async function createFaceMeshDetector(config) {
    // Check if MediaPipe FaceMesh is available
    if (!window.faceLandmarksDetection) {
        throw new Error('MediaPipe FaceMesh not loaded. Please include the face landmarks detection script.');
    }
    
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        refineLandmarks: true,
        maxFaces: 1,
        minDetectionConfidence: config.minDetectionConfidence,
        minTrackingConfidence: config.minTrackingConfidence
    };
    
    return faceLandmarksDetection.createDetector(model, detectorConfig);
}

/**
 * Start the motion tracking process
 */
async function startTracking() {
    if (isTracking) return;
    
    isTracking = true;
    
    // Start the tracking loop
    requestAnimationFrame(trackMotion);
}

/**
 * Stop the motion tracking process
 */
function stopTracking() {
    isTracking = false;
}

/**
 * Main tracking loop
 */
async function trackMotion() {
    if (!isTracking) return;
    
    try {
        // Track hand poses
        if (handPoseDetector && videoElement.readyState === 4) {
            const hands = await handPoseDetector.estimateHands(videoElement);
            if (hands && hands.length > 0) {
                // Apply smoothing if we have previous data
                if (lastHandPose) {
                    lastHandPose = smoothPoseData(hands, lastHandPose, motionTrackingConfig.smoothingFactor);
                } else {
                    lastHandPose = hands;
                }
                
                // Draw hand landmarks if debug mode is enabled
                if (motionTrackingConfig.debugMode && canvasCtx) {
                    drawHandLandmarks(lastHandPose);
                }
                
                // Emit hand pose event
                window.dispatchEvent(new CustomEvent('handPoseUpdated', { detail: lastHandPose }));
            }
        }
        
        // Track body poses
        if (bodyPoseDetector && videoElement.readyState === 4) {
            const poses = await bodyPoseDetector.estimatePoses(videoElement);
            if (poses && poses.length > 0) {
                // Apply smoothing if we have previous data
                if (lastBodyPose) {
                    lastBodyPose = smoothPoseData(poses, lastBodyPose, motionTrackingConfig.smoothingFactor);
                } else {
                    lastBodyPose = poses;
                }
                
                // Draw body landmarks if debug mode is enabled
                if (motionTrackingConfig.debugMode && canvasCtx) {
                    drawBodyLandmarks(lastBodyPose);
                }
                
                // Emit body pose event
                window.dispatchEvent(new CustomEvent('bodyPoseUpdated', { detail: lastBodyPose }));
            }
        }
        
        // Track face mesh
        if (faceMeshDetector && videoElement.readyState === 4) {
            const faces = await faceMeshDetector.estimateFaces(videoElement);
            if (faces && faces.length > 0) {
                // Apply smoothing if we have previous data
                if (lastFaceMesh) {
                    lastFaceMesh = smoothPoseData(faces, lastFaceMesh, motionTrackingConfig.smoothingFactor);
                } else {
                    lastFaceMesh = faces;
                }
                
                // Draw face landmarks if debug mode is enabled
                if (motionTrackingConfig.debugMode && canvasCtx) {
                    drawFaceLandmarks(lastFaceMesh);
                }
                
                // Emit face mesh event
                window.dispatchEvent(new CustomEvent('faceMeshUpdated', { detail: lastFaceMesh }));
            }
        }
    } catch (error) {
        console.error('Error in motion tracking:', error);
    }
    
    // Continue the tracking loop
    if (isTracking) {
        requestAnimationFrame(trackMotion);
    }
}

/**
 * Smooth pose data to reduce jitter
 * @param {Array} newData - New pose data
 * @param {Array} oldData - Previous pose data
 * @param {number} factor - Smoothing factor (0-1)
 * @returns {Array} - Smoothed pose data
 */
function smoothPoseData(newData, oldData, factor) {
    if (!oldData || !newData || newData.length !== oldData.length) {
        return newData;
    }
    
    return newData.map((newItem, i) => {
        const oldItem = oldData[i];
        
        // Handle different data structures for different detectors
        if (newItem.keypoints && oldItem.keypoints) {
            // For pose and hand detection
            return {
                ...newItem,
                keypoints: newItem.keypoints.map((kp, j) => {
                    const oldKp = oldItem.keypoints[j];
                    return {
                        ...kp,
                        x: oldKp.x + (kp.x - oldKp.x) * (1 - factor),
                        y: oldKp.y + (kp.y - oldKp.y) * (1 - factor),
                        z: kp.z !== undefined && oldKp.z !== undefined ? 
                            oldKp.z + (kp.z - oldKp.z) * (1 - factor) : kp.z
                    };
                })
            };
        } else if (newItem.landmarks && oldItem.landmarks) {
            // For face mesh
            return {
                ...newItem,
                landmarks: newItem.landmarks.map((lm, j) => {
                    const oldLm = oldItem.landmarks[j];
                    return {
                        x: oldLm.x + (lm.x - oldLm.x) * (1 - factor),
                        y: oldLm.y + (lm.y - oldLm.y) * (1 - factor),
                        z: lm.z !== undefined && oldLm.z !== undefined ? 
                            oldLm.z + (lm.z - oldLm.z) * (1 - factor) : lm.z
                    };
                })
            };
        }
        
        return newItem;
    });
}

/**
 * Draw hand landmarks on the canvas for debugging
 * @param {Array} hands - Hand pose data
 */
function drawHandLandmarks(hands) {
    if (!canvasCtx || !hands || hands.length === 0) return;
    
    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Set drawing styles
    canvasCtx.fillStyle = 'red';
    canvasCtx.strokeStyle = 'white';
    canvasCtx.lineWidth = 2;
    
    // Draw each hand
    hands.forEach(hand => {
        const keypoints = hand.keypoints;
        
        // Draw keypoints
        for (let i = 0; i < keypoints.length; i++) {
            const keypoint = keypoints[i];
            canvasCtx.beginPath();
            canvasCtx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            canvasCtx.fill();
        }
        
        // Draw connections between keypoints (simplified)
        // Thumb
        drawConnection(keypoints, 0, 1);
        drawConnection(keypoints, 1, 2);
        drawConnection(keypoints, 2, 3);
        drawConnection(keypoints, 3, 4);
        
        // Index finger
        drawConnection(keypoints, 0, 5);
        drawConnection(keypoints, 5, 6);
        drawConnection(keypoints, 6, 7);
        drawConnection(keypoints, 7, 8);
        
        // Middle finger
        drawConnection(keypoints, 0, 9);
        drawConnection(keypoints, 9, 10);
        drawConnection(keypoints, 10, 11);
        drawConnection(keypoints, 11, 12);
        
        // Ring finger
        drawConnection(keypoints, 0, 13);
        drawConnection(keypoints, 13, 14);
        drawConnection(keypoints, 14, 15);
        drawConnection(keypoints, 15, 16);
        
        // Pinky
        drawConnection(keypoints, 0, 17);
        drawConnection(keypoints, 17, 18);
        drawConnection(keypoints, 18, 19);
        drawConnection(keypoints, 19, 20);
    });
    
    function drawConnection(keypoints, i1, i2) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(keypoints[i1].x, keypoints[i1].y);
        canvasCtx.lineTo(keypoints[i2].x, keypoints[i2].y);
        canvasCtx.stroke();
    }
}

/**
 * Draw body landmarks on the canvas for debugging
 * @param {Array} poses - Body pose data
 */
function drawBodyLandmarks(poses) {
    if (!canvasCtx || !poses || poses.length === 0) return;
    
    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Set drawing styles
    canvasCtx.fillStyle = 'blue';
    canvasCtx.strokeStyle = 'white';
    canvasCtx.lineWidth = 2;
    
    // Draw each pose
    poses.forEach(pose => {
        const keypoints = pose.keypoints;
        
        // Draw keypoints
        for (let i = 0; i < keypoints.length; i++) {
            const keypoint = keypoints[i];
            if (keypoint.score > 0.5) {
                canvasCtx.beginPath();
                canvasCtx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                canvasCtx.fill();
            }
        }
        
        // Draw connections (simplified)
        // Define connections as pairs of keypoint indices
        const connections = [
            // Torso
            [11, 12], [12, 24], [24, 23], [23, 11],
            // Right arm
            [12, 14], [14, 16],
            // Left arm
            [11, 13], [13, 15],
            // Right leg
            [24, 26], [26, 28],
            // Left leg
            [23, 25], [25, 27]
        ];
        
        // Draw each connection
        connections.forEach(([i1, i2]) => {
            const kp1 = keypoints[i1];
            const kp2 = keypoints[i2];
            
            if (kp1 && kp2 && kp1.score > 0.5 && kp2.score > 0.5) {
                canvasCtx.beginPath();
                canvasCtx.moveTo(kp1.x, kp1.y);
                canvasCtx.lineTo(kp2.x, kp2.y);
                canvasCtx.stroke();
            }
        });
    });
}

/**
 * Draw face landmarks on the canvas for debugging
 * @param {Array} faces - Face mesh data
 */
function drawFaceLandmarks(faces) {
    if (!canvasCtx || !faces || faces.length === 0) return;
    
    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Set drawing styles
    canvasCtx.fillStyle = 'green';
    canvasCtx.strokeStyle = 'white';
    canvasCtx.lineWidth = 1;
    
    // Draw each face
    faces.forEach(face => {
        const landmarks = face.landmarks;
        
        // Draw landmarks (just dots for simplicity)
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            canvasCtx.beginPath();
            canvasCtx.arc(landmark.x, landmark.y, 1, 0, 2 * Math.PI);
            canvasCtx.fill();
        }
        
        // Draw face contour
        canvasCtx.beginPath();
        // Simplified contour - just connecting some key points
        const contourIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
        
        canvasCtx.moveTo(landmarks[contourIndices[0]].x, landmarks[contourIndices[0]].y);
        for (let i = 1; i < contourIndices.length; i++) {
            canvasCtx.lineTo(landmarks[contourIndices[i]].x, landmarks[contourIndices[i]].y);
        }
        canvasCtx.stroke();
    });
}

/**
 * Calibrate the motion tracking system for the user's environment
 * @returns {Promise<Object>} - Calibration data
 */
async function calibrate() {
    if (!isTracking) {
        await startTracking();
    }
    
    // Wait for a few frames to get stable tracking data
    return new Promise((resolve) => {
        setTimeout(async () => {
            // Collect calibration data
            const data = {
                timestamp: Date.now(),
                handPose: lastHandPose,
                bodyPose: lastBodyPose,
                faceMesh: lastFaceMesh,
                environment: {
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight,
                    aspectRatio: videoElement.videoWidth / videoElement.videoHeight
                }
            };
            
            // Store calibration data
            calibrationData = data;
            
            // Emit calibration event
            window.dispatchEvent(new CustomEvent('motionTrackingCalibrated', { detail: calibrationData }));
            
            resolve(calibrationData);
        }, 2000); // Wait 2 seconds for stable data
    });
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initMotionTracking,
        startTracking,
        stopTracking,
        calibrate
    };
}

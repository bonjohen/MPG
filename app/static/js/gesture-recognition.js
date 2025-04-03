/**
 * Gesture Recognition for Motion Powered Games
 * Detects and classifies hand gestures based on motion tracking data
 */

// Configuration options
const gestureConfig = {
    // Confidence threshold for gesture detection
    confidenceThreshold: 0.8,
    
    // Cooldown between gesture detections (ms)
    gestureCooldown: 500,
    
    // How long a gesture must be held to be recognized (ms)
    gestureHoldTime: 200,
    
    // Distance thresholds for various gesture detections
    distanceThresholds: {
        pinch: 0.05,        // Distance between finger and thumb for pinch
        grab: 0.15,         // Average distance between fingers for grab
        point: 0.1,         // Distance between index and other fingers for point
        swipe: 0.3,         // Minimum distance for swipe detection
        punch: 0.4          // Minimum distance for punch detection
    },
    
    // Velocity thresholds for motion gestures (pixels/frame)
    velocityThresholds: {
        swipe: 15,          // Minimum velocity for swipe detection
        punch: 25,          // Minimum velocity for punch detection
        block: 10           // Minimum velocity for block detection
    }
};

// Global variables
let lastGestureTime = 0;
let gestureHistory = [];
let gestureState = {};
let isRecognizing = false;
let motionTracker = null;

/**
 * Initialize the gesture recognition system
 * @param {Object} options - Configuration options
 * @param {Object} tracker - Motion tracker instance
 * @returns {Object} - The gesture recognition API
 */
function initGestureRecognition(options = {}, tracker = null) {
    // Merge default config with provided options
    const config = { ...gestureConfig, ...options };
    
    // Store reference to motion tracker
    motionTracker = tracker;
    
    // Initialize gesture state
    resetGestureState();
    
    // Set up event listeners for motion tracking data
    window.addEventListener('handPoseUpdated', handleHandPoseUpdate);
    window.addEventListener('bodyPoseUpdated', handleBodyPoseUpdate);
    window.addEventListener('faceMeshUpdated', handleFaceMeshUpdate);
    
    // Start recognizing gestures
    isRecognizing = true;
    
    // Return public API
    return {
        detectGesture,
        getLastGesture: () => gestureHistory[0] || null,
        getGestureHistory: () => [...gestureHistory],
        isGestureActive,
        startRecognition: () => { isRecognizing = true; },
        stopRecognition: () => { isRecognizing = false; },
        resetGestureState,
        setConfig: (newConfig) => {
            Object.assign(config, newConfig);
        }
    };
}

/**
 * Reset the gesture state
 */
function resetGestureState() {
    gestureState = {
        hands: {
            left: {
                position: null,
                velocity: { x: 0, y: 0, z: 0 },
                previousPosition: null,
                gesture: null,
                gestureStartTime: 0,
                fingers: {
                    thumb: { extended: false, position: null },
                    index: { extended: false, position: null },
                    middle: { extended: false, position: null },
                    ring: { extended: false, position: null },
                    pinky: { extended: false, position: null }
                }
            },
            right: {
                position: null,
                velocity: { x: 0, y: 0, z: 0 },
                previousPosition: null,
                gesture: null,
                gestureStartTime: 0,
                fingers: {
                    thumb: { extended: false, position: null },
                    index: { extended: false, position: null },
                    middle: { extended: false, position: null },
                    ring: { extended: false, position: null },
                    pinky: { extended: false, position: null }
                }
            }
        },
        body: {
            position: null,
            velocity: { x: 0, y: 0, z: 0 },
            previousPosition: null,
            pose: null
        },
        face: {
            position: null,
            expression: null
        }
    };
}

/**
 * Handle hand pose updates from motion tracking
 * @param {CustomEvent} event - Hand pose update event
 */
function handleHandPoseUpdate(event) {
    if (!isRecognizing) return;
    
    const hands = event.detail;
    if (!hands || hands.length === 0) return;
    
    // Process each hand
    hands.forEach(hand => {
        const handedness = hand.handedness.toLowerCase();
        if (handedness !== 'left' && handedness !== 'right') return;
        
        const handState = gestureState.hands[handedness];
        
        // Update previous position
        handState.previousPosition = handState.position ? { ...handState.position } : null;
        
        // Update current position (wrist)
        const wrist = hand.keypoints.find(kp => kp.name === 'wrist');
        if (wrist) {
            handState.position = { x: wrist.x, y: wrist.y, z: wrist.z || 0 };
            
            // Calculate velocity if we have previous position
            if (handState.previousPosition) {
                handState.velocity = {
                    x: handState.position.x - handState.previousPosition.x,
                    y: handState.position.y - handState.previousPosition.y,
                    z: handState.position.z - handState.previousPosition.z
                };
            }
        }
        
        // Update finger states
        updateFingerStates(hand, handState);
        
        // Detect gestures for this hand
        const gesture = detectHandGesture(handState, gestureConfig);
        
        // If gesture is detected and it's different from the current one, update
        if (gesture && gesture !== handState.gesture) {
            // Check if we've held the gesture long enough
            const now = Date.now();
            if (!handState.gestureStartTime) {
                handState.gestureStartTime = now;
            } else if (now - handState.gestureStartTime >= gestureConfig.gestureHoldTime) {
                // Gesture held long enough, register it
                const previousGesture = handState.gesture;
                handState.gesture = gesture;
                
                // Add to gesture history if it's a new gesture
                if (gesture !== previousGesture && now - lastGestureTime >= gestureConfig.gestureCooldown) {
                    lastGestureTime = now;
                    gestureHistory.unshift({
                        type: gesture,
                        hand: handedness,
                        timestamp: now,
                        position: { ...handState.position },
                        velocity: { ...handState.velocity }
                    });
                    
                    // Limit history size
                    if (gestureHistory.length > 10) {
                        gestureHistory.pop();
                    }
                    
                    // Emit gesture event
                    window.dispatchEvent(new CustomEvent('gestureDetected', {
                        detail: {
                            gesture,
                            hand: handedness,
                            position: { ...handState.position },
                            velocity: { ...handState.velocity }
                        }
                    }));
                }
            }
        } else if (!gesture) {
            // Reset gesture start time if no gesture is detected
            handState.gestureStartTime = 0;
            handState.gesture = null;
        }
    });
}

/**
 * Update finger states based on hand pose data
 * @param {Object} hand - Hand pose data
 * @param {Object} handState - Hand state object to update
 */
function updateFingerStates(hand, handState) {
    const keypoints = hand.keypoints;
    const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    
    // Get wrist position
    const wrist = keypoints.find(kp => kp.name === 'wrist');
    if (!wrist) return;
    
    // Update each finger
    fingerNames.forEach((fingerName, index) => {
        // Get fingertip
        const tipName = `${fingerName}_tip`;
        const tip = keypoints.find(kp => kp.name === tipName);
        
        // Get finger base (MCP joint)
        const baseName = `${fingerName}_mcp`;
        const base = keypoints.find(kp => kp.name === baseName);
        
        if (tip && base) {
            // Store fingertip position
            handState.fingers[fingerName].position = { x: tip.x, y: tip.y, z: tip.z || 0 };
            
            // Calculate finger direction vector
            const dirX = tip.x - base.x;
            const dirY = tip.y - base.y;
            
            // Calculate finger length
            const fingerLength = Math.sqrt(dirX * dirX + dirY * dirY);
            
            // Calculate wrist to base vector
            const wristToBaseX = base.x - wrist.x;
            const wristToBaseY = base.y - wrist.y;
            
            // Calculate wrist to tip vector
            const wristToTipX = tip.x - wrist.x;
            const wristToTipY = tip.y - wrist.y;
            
            // Calculate dot product to determine finger extension
            const dotProduct = wristToBaseX * wristToTipX + wristToBaseY * wristToTipY;
            
            // Finger is extended if the dot product is positive and the finger length is sufficient
            handState.fingers[fingerName].extended = dotProduct > 0 && fingerLength > 30;
        }
    });
}

/**
 * Handle body pose updates from motion tracking
 * @param {CustomEvent} event - Body pose update event
 */
function handleBodyPoseUpdate(event) {
    if (!isRecognizing) return;
    
    const poses = event.detail;
    if (!poses || poses.length === 0) return;
    
    // Use the first detected pose
    const pose = poses[0];
    const bodyState = gestureState.body;
    
    // Update previous position
    bodyState.previousPosition = bodyState.position ? { ...bodyState.position } : null;
    
    // Update current position (mid-point between shoulders)
    const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
    
    if (leftShoulder && rightShoulder) {
        bodyState.position = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
            z: ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2
        };
        
        // Calculate velocity if we have previous position
        if (bodyState.previousPosition) {
            bodyState.velocity = {
                x: bodyState.position.x - bodyState.previousPosition.x,
                y: bodyState.position.y - bodyState.previousPosition.y,
                z: bodyState.position.z - bodyState.previousPosition.z
            };
        }
    }
    
    // Detect body pose
    bodyState.pose = detectBodyPose(pose, gestureConfig);
}

/**
 * Handle face mesh updates from motion tracking
 * @param {CustomEvent} event - Face mesh update event
 */
function handleFaceMeshUpdate(event) {
    if (!isRecognizing) return;
    
    const faces = event.detail;
    if (!faces || faces.length === 0) return;
    
    // Use the first detected face
    const face = faces[0];
    const faceState = gestureState.face;
    
    // Update face position (nose tip)
    const noseTip = face.keypoints.find(kp => kp.name === 'noseTip');
    if (noseTip) {
        faceState.position = { x: noseTip.x, y: noseTip.y, z: noseTip.z || 0 };
    }
    
    // Detect facial expression
    faceState.expression = detectFacialExpression(face, gestureConfig);
}

/**
 * Detect hand gestures based on finger positions and movement
 * @param {Object} handState - Current hand state
 * @param {Object} config - Gesture configuration
 * @returns {string|null} - Detected gesture or null
 */
function detectHandGesture(handState, config) {
    if (!handState.position) return null;
    
    const fingers = handState.fingers;
    const velocity = handState.velocity;
    
    // Check for fist (all fingers closed)
    const isFist = !fingers.thumb.extended && 
                  !fingers.index.extended && 
                  !fingers.middle.extended && 
                  !fingers.ring.extended && 
                  !fingers.pinky.extended;
    
    // Check for open hand (all fingers extended)
    const isOpenHand = fingers.thumb.extended && 
                      fingers.index.extended && 
                      fingers.middle.extended && 
                      fingers.ring.extended && 
                      fingers.pinky.extended;
    
    // Check for pointing (only index extended)
    const isPointing = !fingers.thumb.extended && 
                      fingers.index.extended && 
                      !fingers.middle.extended && 
                      !fingers.ring.extended && 
                      !fingers.pinky.extended;
    
    // Check for peace sign (index and middle extended)
    const isPeaceSign = !fingers.thumb.extended && 
                       fingers.index.extended && 
                       fingers.middle.extended && 
                       !fingers.ring.extended && 
                       !fingers.pinky.extended;
    
    // Check for pinch (thumb and index close together)
    let isPinch = false;
    if (fingers.thumb.position && fingers.index.position) {
        const thumbToIndexDistance = calculateDistance(
            fingers.thumb.position, 
            fingers.index.position
        );
        isPinch = thumbToIndexDistance < config.distanceThresholds.pinch;
    }
    
    // Calculate velocity magnitude for motion gestures
    const velocityMagnitude = Math.sqrt(
        velocity.x * velocity.x + 
        velocity.y * velocity.y + 
        velocity.z * velocity.z
    );
    
    // Detect punch (fist + forward motion)
    if (isFist && velocityMagnitude > config.velocityThresholds.punch && velocity.z < 0) {
        return 'punch';
    }
    
    // Detect block (open hand + upward motion)
    if (isOpenHand && velocityMagnitude > config.velocityThresholds.block && velocity.y < 0) {
        return 'block';
    }
    
    // Detect swipe (open hand + horizontal motion)
    if (isOpenHand && velocityMagnitude > config.velocityThresholds.swipe && 
        Math.abs(velocity.x) > Math.abs(velocity.y)) {
        return velocity.x > 0 ? 'swipe_right' : 'swipe_left';
    }
    
    // Static gestures
    if (isPinch) return 'pinch';
    if (isPointing) return 'point';
    if (isPeaceSign) return 'peace';
    if (isFist) return 'fist';
    if (isOpenHand) return 'open_hand';
    
    // No recognized gesture
    return null;
}

/**
 * Detect body poses based on keypoint positions
 * @param {Object} pose - Body pose data
 * @param {Object} config - Gesture configuration
 * @returns {string|null} - Detected pose or null
 */
function detectBodyPose(pose, config) {
    // This is a simplified implementation
    // In a real application, you would use more sophisticated pose detection
    
    // Get key body points
    const keypoints = pose.keypoints;
    const nose = keypoints.find(kp => kp.name === 'nose');
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftHip = keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = keypoints.find(kp => kp.name === 'right_hip');
    const leftKnee = keypoints.find(kp => kp.name === 'left_knee');
    const rightKnee = keypoints.find(kp => kp.name === 'right_knee');
    
    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
        return null;
    }
    
    // Calculate body angles and positions for pose detection
    // This is a very simplified implementation
    
    // Check if person is standing (shoulders above hips)
    const isStanding = (leftShoulder.y < leftHip.y) && (rightShoulder.y < rightHip.y);
    
    // Check if person is crouching (knees bent)
    const isCrouching = leftKnee && rightKnee && 
                       (leftKnee.y > leftHip.y + 50) && 
                       (rightKnee.y > rightHip.y + 50);
    
    // Check if person is leaning left or right
    const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const midHipX = (leftHip.x + rightHip.x) / 2;
    const horizontalLean = midShoulderX - midHipX;
    
    if (isCrouching) {
        return 'crouch';
    } else if (isStanding) {
        if (horizontalLean < -30) {
            return 'lean_left';
        } else if (horizontalLean > 30) {
            return 'lean_right';
        } else {
            return 'stand';
        }
    }
    
    return null;
}

/**
 * Detect facial expressions based on face landmarks
 * @param {Object} face - Face mesh data
 * @param {Object} config - Gesture configuration
 * @returns {string|null} - Detected expression or null
 */
function detectFacialExpression(face, config) {
    // This is a simplified implementation
    // In a real application, you would use more sophisticated expression detection
    
    // For now, just return null as we're not implementing facial expression detection yet
    return null;
}

/**
 * Calculate distance between two 3D points
 * @param {Object} point1 - First point {x, y, z}
 * @param {Object} point2 - Second point {x, y, z}
 * @returns {number} - Distance between points
 */
function calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = (point2.z || 0) - (point1.z || 0);
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if a specific gesture is currently active
 * @param {string} gestureName - Name of the gesture to check
 * @param {string} hand - Hand to check ('left', 'right', or null for either)
 * @returns {boolean} - Whether the gesture is active
 */
function isGestureActive(gestureName, hand = null) {
    if (hand) {
        return gestureState.hands[hand].gesture === gestureName;
    } else {
        return gestureState.hands.left.gesture === gestureName || 
               gestureState.hands.right.gesture === gestureName;
    }
}

/**
 * Detect a specific gesture or sequence of gestures
 * @param {string|Array} gesturePattern - Gesture name or array of gesture names to detect
 * @param {Object} options - Detection options
 * @returns {boolean} - Whether the gesture pattern was detected
 */
function detectGesture(gesturePattern, options = {}) {
    const defaultOptions = {
        hand: null,                 // 'left', 'right', or null for either
        maxTimeGap: 1000,           // Maximum time between gestures in a sequence (ms)
        requiredConfidence: 0.8     // Required confidence for detection
    };
    
    const config = { ...defaultOptions, ...options };
    
    // If gesturePattern is a string, check if it's currently active
    if (typeof gesturePattern === 'string') {
        return isGestureActive(gesturePattern, config.hand);
    }
    
    // If gesturePattern is an array, check for the sequence in history
    if (Array.isArray(gesturePattern) && gesturePattern.length > 0) {
        // Need at least as many gestures in history as in the pattern
        if (gestureHistory.length < gesturePattern.length) {
            return false;
        }
        
        // Check if the most recent gestures match the pattern
        for (let i = 0; i < gesturePattern.length; i++) {
            const historyGesture = gestureHistory[i];
            const patternGesture = gesturePattern[i];
            
            // Check if gesture type matches
            if (historyGesture.type !== patternGesture) {
                return false;
            }
            
            // Check hand if specified
            if (config.hand && historyGesture.hand !== config.hand) {
                return false;
            }
            
            // Check time gap between gestures
            if (i > 0) {
                const timeGap = historyGesture.timestamp - gestureHistory[i - 1].timestamp;
                if (timeGap > config.maxTimeGap) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    return false;
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initGestureRecognition,
        detectGesture,
        isGestureActive
    };
}

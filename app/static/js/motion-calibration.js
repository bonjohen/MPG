/**
 * Motion Calibration for Motion Powered Games
 * Helps users calibrate their camera and motion tracking settings
 */

// Configuration options
const calibrationConfig = {
    // Steps in the calibration process
    steps: [
        {
            id: 'intro',
            title: 'Calibration Setup',
            instructions: 'Position yourself in front of the camera with your full upper body visible.',
            requiredGestures: [],
            timeRequired: 3
        },
        {
            id: 'hand-visibility',
            title: 'Hand Visibility Check',
            instructions: 'Raise both hands in front of you with palms facing the camera.',
            requiredGestures: ['open_hand'],
            timeRequired: 5
        },
        {
            id: 'range-of-motion',
            title: 'Range of Motion',
            instructions: 'Move your hands from side to side, covering your full comfortable range of motion.',
            requiredGestures: ['swipe_left', 'swipe_right'],
            timeRequired: 5
        },
        {
            id: 'punch-calibration',
            title: 'Punch Calibration',
            instructions: 'Perform a few punching motions toward the camera.',
            requiredGestures: ['punch'],
            timeRequired: 5
        },
        {
            id: 'block-calibration',
            title: 'Block Calibration',
            instructions: 'Perform a few blocking motions with your open hands.',
            requiredGestures: ['block'],
            timeRequired: 5
        },
        {
            id: 'gesture-test',
            title: 'Gesture Test',
            instructions: 'Try making a fist, pointing, and pinching to test gesture recognition.',
            requiredGestures: ['fist', 'point', 'pinch'],
            timeRequired: 8
        },
        {
            id: 'completion',
            title: 'Calibration Complete',
            instructions: 'Great job! Your motion tracking is now calibrated.',
            requiredGestures: [],
            timeRequired: 3
        }
    ],
    
    // Minimum detection confidence for calibration
    minDetectionConfidence: 0.7,
    
    // Lighting recommendations
    lightingRecommendations: {
        tooLow: 'Your environment seems too dark. Try adding more light for better tracking.',
        tooHigh: 'There might be too much light or glare. Try reducing direct light on your face and hands.',
        good: 'Lighting conditions look good!'
    },
    
    // Position recommendations
    positionRecommendations: {
        tooClose: 'You appear to be too close to the camera. Please move back a bit.',
        tooFar: 'You appear to be too far from the camera. Please move closer.',
        good: 'Your position looks good!'
    }
};

// Global variables
let currentStepIndex = 0;
let calibrationData = {};
let detectedGestures = {};
let isCalibrating = false;
let motionTracker = null;
let gestureRecognizer = null;
let stepTimer = null;
let stepStartTime = 0;
let calibrationCallbacks = {
    onStepStart: null,
    onStepComplete: null,
    onCalibrationComplete: null,
    onCalibrationUpdate: null
};

/**
 * Initialize the calibration system
 * @param {Object} options - Configuration options
 * @param {Object} tracker - Motion tracker instance
 * @param {Object} recognizer - Gesture recognizer instance
 * @returns {Object} - The calibration API
 */
function initCalibration(options = {}, tracker = null, recognizer = null) {
    // Merge default config with provided options
    const config = { ...calibrationConfig, ...options };
    
    // Store references to tracker and recognizer
    motionTracker = tracker;
    gestureRecognizer = recognizer;
    
    // Reset calibration state
    resetCalibration();
    
    // Set up event listeners
    window.addEventListener('gestureDetected', handleGestureDetected);
    window.addEventListener('motionTrackingCalibrated', handleMotionCalibrated);
    
    // Return public API
    return {
        startCalibration,
        stopCalibration,
        getCurrentStep: () => config.steps[currentStepIndex],
        getCalibrationData: () => ({ ...calibrationData }),
        getProgress: () => ({
            currentStep: currentStepIndex + 1,
            totalSteps: config.steps.length,
            percentComplete: Math.round(((currentStepIndex + 1) / config.steps.length) * 100)
        }),
        setCallbacks: (callbacks) => {
            calibrationCallbacks = { ...calibrationCallbacks, ...callbacks };
        },
        getRecommendations
    };
}

/**
 * Reset the calibration state
 */
function resetCalibration() {
    currentStepIndex = 0;
    calibrationData = {
        timestamp: Date.now(),
        environment: {
            lighting: null,
            position: null,
            cameraResolution: null
        },
        gestures: {},
        motionRange: {
            hands: {
                left: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
                right: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
            },
            body: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
        },
        recommendations: []
    };
    detectedGestures = {};
    isCalibrating = false;
    
    if (stepTimer) {
        clearTimeout(stepTimer);
        stepTimer = null;
    }
}

/**
 * Start the calibration process
 * @returns {boolean} - Whether calibration was started successfully
 */
function startCalibration() {
    if (isCalibrating) return false;
    
    // Reset calibration state
    resetCalibration();
    
    // Start motion tracking if not already started
    if (motionTracker && typeof motionTracker.startTracking === 'function') {
        motionTracker.startTracking();
    }
    
    // Start gesture recognition if not already started
    if (gestureRecognizer && typeof gestureRecognizer.startRecognition === 'function') {
        gestureRecognizer.startRecognition();
    }
    
    // Start calibration
    isCalibrating = true;
    startCurrentStep();
    
    return true;
}

/**
 * Stop the calibration process
 */
function stopCalibration() {
    isCalibrating = false;
    
    if (stepTimer) {
        clearTimeout(stepTimer);
        stepTimer = null;
    }
}

/**
 * Start the current calibration step
 */
function startCurrentStep() {
    if (!isCalibrating) return;
    
    const currentStep = calibrationConfig.steps[currentStepIndex];
    stepStartTime = Date.now();
    
    // Reset detected gestures for this step
    detectedGestures = {};
    currentStep.requiredGestures.forEach(gesture => {
        detectedGestures[gesture] = false;
    });
    
    // Call step start callback
    if (calibrationCallbacks.onStepStart) {
        calibrationCallbacks.onStepStart(currentStep, currentStepIndex);
    }
    
    // Set timer for step completion
    stepTimer = setTimeout(() => {
        completeCurrentStep();
    }, currentStep.timeRequired * 1000);
}

/**
 * Complete the current calibration step
 */
function completeCurrentStep() {
    if (!isCalibrating) return;
    
    const currentStep = calibrationConfig.steps[currentStepIndex];
    
    // Check if all required gestures were detected
    const allGesturesDetected = currentStep.requiredGestures.every(gesture => detectedGestures[gesture]);
    
    // Store step data in calibration data
    calibrationData.gestures[currentStep.id] = {
        completed: true,
        allGesturesDetected,
        detectedGestures: { ...detectedGestures },
        duration: (Date.now() - stepStartTime) / 1000
    };
    
    // Call step complete callback
    if (calibrationCallbacks.onStepComplete) {
        calibrationCallbacks.onStepComplete(currentStep, currentStepIndex, allGesturesDetected);
    }
    
    // Move to next step or complete calibration
    currentStepIndex++;
    
    if (currentStepIndex < calibrationConfig.steps.length) {
        // Start next step
        startCurrentStep();
    } else {
        // Calibration complete
        finalizeCalibration();
    }
}

/**
 * Finalize the calibration process
 */
function finalizeCalibration() {
    isCalibrating = false;
    
    // Generate recommendations
    calibrationData.recommendations = generateRecommendations();
    
    // Call calibration complete callback
    if (calibrationCallbacks.onCalibrationComplete) {
        calibrationCallbacks.onCalibrationComplete(calibrationData);
    }
}

/**
 * Handle gesture detection during calibration
 * @param {CustomEvent} event - Gesture detection event
 */
function handleGestureDetected(event) {
    if (!isCalibrating) return;
    
    const gesture = event.detail;
    const currentStep = calibrationConfig.steps[currentStepIndex];
    
    // Check if this gesture is required for the current step
    if (currentStep.requiredGestures.includes(gesture.gesture)) {
        detectedGestures[gesture.gesture] = true;
        
        // Update motion range
        updateMotionRange(gesture);
        
        // Call calibration update callback
        if (calibrationCallbacks.onCalibrationUpdate) {
            calibrationCallbacks.onCalibrationUpdate({
                step: currentStep,
                stepIndex: currentStepIndex,
                detectedGestures,
                gesture
            });
        }
        
        // Check if all required gestures are detected
        const allGesturesDetected = currentStep.requiredGestures.every(g => detectedGestures[g]);
        
        // If all gestures detected and we're in the last second of the step, complete early
        const timeElapsed = (Date.now() - stepStartTime) / 1000;
        const timeRemaining = currentStep.timeRequired - timeElapsed;
        
        if (allGesturesDetected && timeRemaining <= 1 && stepTimer) {
            clearTimeout(stepTimer);
            completeCurrentStep();
        }
    }
}

/**
 * Handle motion tracking calibration event
 * @param {CustomEvent} event - Motion calibration event
 */
function handleMotionCalibrated(event) {
    if (!isCalibrating) return;
    
    const motionData = event.detail;
    
    // Store camera resolution
    if (motionData.environment) {
        calibrationData.environment.cameraResolution = {
            width: motionData.environment.videoWidth,
            height: motionData.environment.videoHeight,
            aspectRatio: motionData.environment.aspectRatio
        };
    }
    
    // Estimate lighting conditions based on face brightness (simplified)
    if (motionData.faceMesh && motionData.faceMesh.length > 0) {
        // This would require image data analysis which is not implemented here
        // In a real application, you would analyze pixel brightness around the face
        calibrationData.environment.lighting = 'normal';
    }
    
    // Estimate position based on face size (simplified)
    if (motionData.faceMesh && motionData.faceMesh.length > 0) {
        // This is a simplified approach
        // In a real application, you would use more sophisticated distance estimation
        calibrationData.environment.position = 'good';
    }
}

/**
 * Update the tracked motion range based on detected gestures
 * @param {Object} gesture - Detected gesture data
 */
function updateMotionRange(gesture) {
    if (!gesture || !gesture.position) return;
    
    const position = gesture.position;
    const hand = gesture.hand;
    
    if (hand === 'left' || hand === 'right') {
        const handRange = calibrationData.motionRange.hands[hand];
        
        // Update minimum values
        handRange.min.x = Math.min(handRange.min.x || position.x, position.x);
        handRange.min.y = Math.min(handRange.min.y || position.y, position.y);
        
        // Update maximum values
        handRange.max.x = Math.max(handRange.max.x || position.x, position.x);
        handRange.max.y = Math.max(handRange.max.y || position.y, position.y);
    }
}

/**
 * Generate recommendations based on calibration data
 * @returns {Array} - List of recommendations
 */
function generateRecommendations() {
    const recommendations = [];
    
    // Check lighting conditions
    if (calibrationData.environment.lighting === 'low') {
        recommendations.push({
            type: 'lighting',
            message: calibrationConfig.lightingRecommendations.tooLow,
            severity: 'warning'
        });
    } else if (calibrationData.environment.lighting === 'high') {
        recommendations.push({
            type: 'lighting',
            message: calibrationConfig.lightingRecommendations.tooHigh,
            severity: 'warning'
        });
    }
    
    // Check position
    if (calibrationData.environment.position === 'too_close') {
        recommendations.push({
            type: 'position',
            message: calibrationConfig.positionRecommendations.tooClose,
            severity: 'warning'
        });
    } else if (calibrationData.environment.position === 'too_far') {
        recommendations.push({
            type: 'position',
            message: calibrationConfig.positionRecommendations.tooFar,
            severity: 'warning'
        });
    }
    
    // Check gesture detection
    let missedGestures = [];
    
    Object.keys(calibrationData.gestures).forEach(stepId => {
        const stepData = calibrationData.gestures[stepId];
        if (!stepData.allGesturesDetected) {
            const step = calibrationConfig.steps.find(s => s.id === stepId);
            if (step) {
                step.requiredGestures.forEach(gesture => {
                    if (!stepData.detectedGestures[gesture]) {
                        missedGestures.push(gesture);
                    }
                });
            }
        }
    });
    
    if (missedGestures.length > 0) {
        recommendations.push({
            type: 'gesture_detection',
            message: `Some gestures were not detected properly: ${missedGestures.join(', ')}. Try adjusting your movements to be more pronounced.`,
            severity: 'warning',
            missedGestures
        });
    }
    
    // Add positive feedback if everything looks good
    if (recommendations.length === 0) {
        recommendations.push({
            type: 'success',
            message: 'Your setup looks great! You should have a good experience with motion tracking.',
            severity: 'info'
        });
    }
    
    return recommendations;
}

/**
 * Get recommendations based on current calibration data
 * @returns {Array} - List of recommendations
 */
function getRecommendations() {
    return generateRecommendations();
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initCalibration,
        startCalibration,
        stopCalibration
    };
}

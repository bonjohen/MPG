/**
 * Calibration Manager for Motion Powered Games
 * Handles the calibration process for motion tracking
 */

class CalibrationManager {
    constructor(options = {}) {
        // Configuration options with defaults
        this.config = {
            videoElementId: options.videoElementId || 'calibrationVideo',
            canvasElementId: options.canvasElementId || 'overlayCanvas',
            loadingIndicatorId: options.loadingIndicatorId || 'loading-indicator',
            handStatusId: options.handStatusId || 'hand-status',
            poseStatusId: options.poseStatusId || 'pose-status',
            faceStatusId: options.faceStatusId || 'face-status',
            gestureStatusId: options.gestureStatusId || 'gesture-status',
            handProgressId: options.handProgressId || 'hand-progress',
            poseProgressId: options.poseProgressId || 'pose-progress',
            faceProgressId: options.faceProgressId || 'face-progress',
            gestureFeedbackId: options.gestureFeedbackId || 'gesture-feedback',
            calibrationSteps: options.calibrationSteps || [
                {
                    id: 1,
                    name: 'Camera Setup',
                    description: 'Position yourself in front of the camera',
                    requiredTime: 3,
                    requiredGestures: []
                },
                {
                    id: 2,
                    name: 'Hand Detection',
                    description: 'Raise both hands and move them slowly',
                    requiredTime: 5,
                    requiredGestures: ['open_palm', 'closed_fist', 'pointing']
                },
                {
                    id: 3,
                    name: 'Body Pose',
                    description: 'Stand in a neutral position with arms at your sides',
                    requiredTime: 5,
                    requiredGestures: ['neutral_pose']
                },
                {
                    id: 4,
                    name: 'Face Tracking',
                    description: 'Look directly at the camera and make a few facial expressions',
                    requiredTime: 5,
                    requiredGestures: ['neutral_face', 'smile', 'surprise']
                },
                {
                    id: 5,
                    name: 'Test Movements',
                    description: 'Try the following movements to test your calibration',
                    requiredTime: 10,
                    requiredGestures: ['right_hand_raise', 'left_hand_raise', 'fist', 'point']
                }
            ]
        };
        
        // DOM elements
        this.videoElement = null;
        this.canvasElement = null;
        this.loadingIndicator = null;
        this.handStatus = null;
        this.poseStatus = null;
        this.faceStatus = null;
        this.gestureStatus = null;
        this.handProgress = null;
        this.poseProgress = null;
        this.faceProgress = null;
        this.gestureFeedback = null;
        
        // Motion tracking
        this.motionTracker = null;
        
        // Calibration state
        this.currentStep = 0;
        this.calibrationData = {
            handCalibration: {
                completed: false,
                detectedGestures: {},
                confidence: 0
            },
            poseCalibration: {
                completed: false,
                detectedPoses: {},
                confidence: 0
            },
            faceCalibration: {
                completed: false,
                detectedExpressions: {},
                confidence: 0
            },
            gestureCalibration: {
                completed: false,
                detectedGestures: {},
                confidence: 0
            },
            recommendations: []
        };
        
        // Timers
        this.stepTimer = null;
        this.stepStartTime = null;
        this.stepElapsedTime = 0;
        
        // Gesture detection counters
        this.detectedGestures = {};
        
        // Initialize the calibration manager
        this.initialize();
    }
    
    /**
     * Initialize the calibration manager
     */
    initialize() {
        // Get DOM elements
        this.videoElement = document.getElementById(this.config.videoElementId);
        this.canvasElement = document.getElementById(this.config.canvasElementId);
        this.loadingIndicator = document.getElementById(this.config.loadingIndicatorId);
        this.handStatus = document.getElementById(this.config.handStatusId);
        this.poseStatus = document.getElementById(this.config.poseStatusId);
        this.faceStatus = document.getElementById(this.config.faceStatusId);
        this.gestureStatus = document.getElementById(this.config.gestureStatusId);
        this.handProgress = document.getElementById(this.config.handProgressId);
        this.poseProgress = document.getElementById(this.config.poseProgressId);
        this.faceProgress = document.getElementById(this.config.faceProgressId);
        this.gestureFeedback = document.getElementById(this.config.gestureFeedbackId);
        
        // Check if all elements exist
        if (!this.videoElement || !this.canvasElement) {
            console.error('Required elements not found');
            return;
        }
        
        // Initialize motion tracking
        this.initializeMotionTracking();
    }
    
    /**
     * Initialize motion tracking
     */
    async initializeMotionTracking() {
        try {
            // Show loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'flex';
            }
            
            // Initialize camera
            await this.initializeCamera();
            
            // Create motion tracker
            this.motionTracker = new MotionTracker({
                videoElementId: this.config.videoElementId,
                canvasElementId: this.config.canvasElementId,
                debugMode: true,
                autoStart: false
            });
            
            // Set up callbacks
            this.motionTracker.setCallbacks({
                onHandUpdate: (handLandmarks) => this.handleHandUpdate(handLandmarks),
                onPoseUpdate: (poseLandmarks) => this.handlePoseUpdate(poseLandmarks),
                onFaceUpdate: (faceLandmarks) => this.handleFaceUpdate(faceLandmarks),
                onInitialized: () => this.handleTrackerInitialized(),
                onError: (error) => this.handleTrackerError(error)
            });
            
            // Hide loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
            
            // Update status indicators
            this.updateStatusIndicators('ready');
        } catch (error) {
            console.error('Error initializing motion tracking:', error);
            
            // Hide loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
            
            // Update status indicators
            this.updateStatusIndicators('error');
            
            // Show error message
            alert('Failed to initialize motion tracking. Please ensure you have granted camera permissions and try again.');
        }
    }
    
    /**
     * Initialize camera
     */
    async initializeCamera() {
        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            // Set video source
            this.videoElement.srcObject = stream;
            
            // Wait for video to be ready
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    // Update canvas dimensions to match video
                    this.canvasElement.width = this.videoElement.videoWidth;
                    this.canvasElement.height = this.videoElement.videoHeight;
                    resolve();
                };
            });
        } catch (error) {
            console.error('Error accessing camera:', error);
            throw new Error('Failed to access camera. Please ensure you have granted camera permissions.');
        }
    }
    
    /**
     * Start the calibration process
     */
    startCalibration() {
        // Reset calibration data
        this.resetCalibrationData();
        
        // Start motion tracking
        if (this.motionTracker) {
            this.motionTracker.startTracking();
        }
        
        // Start with the first step
        this.startStepCalibration(1);
    }
    
    /**
     * Start a specific calibration step
     */
    startStepCalibration(stepNumber) {
        // Find the step
        const step = this.config.calibrationSteps.find(step => step.id === stepNumber);
        
        if (!step) {
            console.error(`Step ${stepNumber} not found`);
            return;
        }
        
        // Set current step
        this.currentStep = stepNumber;
        
        // Reset step timer
        this.stepStartTime = Date.now();
        this.stepElapsedTime = 0;
        
        // Reset detected gestures for this step
        this.detectedGestures = {};
        step.requiredGestures.forEach(gesture => {
            this.detectedGestures[gesture] = false;
        });
        
        // Update status indicators
        this.updateStatusIndicators('calibrating', step);
        
        // Start step timer
        this.stepTimer = setInterval(() => {
            // Update elapsed time
            this.stepElapsedTime = (Date.now() - this.stepStartTime) / 1000;
            
            // Update progress
            this.updateStepProgress(step);
            
            // Check if step is complete
            if (this.stepElapsedTime >= step.requiredTime && this.areAllGesturesDetected(step)) {
                this.completeStep(step);
            }
        }, 100);
    }
    
    /**
     * Complete a calibration step
     */
    completeStep(step) {
        // Clear step timer
        clearInterval(this.stepTimer);
        
        // Update calibration data
        switch (step.id) {
            case 2: // Hand Detection
                this.calibrationData.handCalibration.completed = true;
                this.calibrationData.handCalibration.confidence = this.calculateConfidence(step);
                break;
                
            case 3: // Body Pose
                this.calibrationData.poseCalibration.completed = true;
                this.calibrationData.poseCalibration.confidence = this.calculateConfidence(step);
                break;
                
            case 4: // Face Tracking
                this.calibrationData.faceCalibration.completed = true;
                this.calibrationData.faceCalibration.confidence = this.calculateConfidence(step);
                break;
                
            case 5: // Test Movements
                this.calibrationData.gestureCalibration.completed = true;
                this.calibrationData.gestureCalibration.confidence = this.calculateConfidence(step);
                break;
        }
        
        // Update status indicators
        this.updateStatusIndicators('completed', step);
        
        // Dispatch event
        this.dispatchEvent('calibrationStepCompleted', { step: step.id });
        
        // Check if all steps are complete
        if (step.id === this.config.calibrationSteps.length) {
            this.completeCalibration();
        }
    }
    
    /**
     * Complete the calibration process
     */
    completeCalibration() {
        // Stop motion tracking
        if (this.motionTracker) {
            this.motionTracker.stopTracking();
        }
        
        // Generate recommendations
        this.generateRecommendations();
        
        // Save calibration data
        this.saveCalibrationData();
        
        // Dispatch event
        this.dispatchEvent('calibrationCompleted', { calibrationData: this.calibrationData });
    }
    
    /**
     * Generate recommendations based on calibration data
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Check hand calibration
        if (this.calibrationData.handCalibration.confidence < 0.7) {
            recommendations.push({
                type: 'hand',
                severity: 'warning',
                message: 'Hand tracking confidence is low. Try to ensure your hands are clearly visible and well-lit.'
            });
        }
        
        // Check pose calibration
        if (this.calibrationData.poseCalibration.confidence < 0.7) {
            recommendations.push({
                type: 'pose',
                severity: 'warning',
                message: 'Pose detection confidence is low. Try to ensure your full upper body is visible and well-lit.'
            });
        }
        
        // Check face calibration
        if (this.calibrationData.faceCalibration.confidence < 0.7) {
            recommendations.push({
                type: 'face',
                severity: 'warning',
                message: 'Face tracking confidence is low. Try to ensure your face is clearly visible and well-lit.'
            });
        }
        
        // Check gesture calibration
        if (this.calibrationData.gestureCalibration.confidence < 0.7) {
            recommendations.push({
                type: 'gesture',
                severity: 'warning',
                message: 'Gesture recognition confidence is low. Try to make more distinct gestures.'
            });
        }
        
        // Add general recommendations
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'general',
                severity: 'info',
                message: 'Calibration completed successfully! You are ready to play.'
            });
        } else {
            recommendations.push({
                type: 'general',
                severity: 'info',
                message: 'You can still play, but you may experience some tracking issues. Consider recalibrating in better conditions.'
            });
        }
        
        // Set recommendations
        this.calibrationData.recommendations = recommendations;
    }
    
    /**
     * Save calibration data to local storage
     */
    saveCalibrationData() {
        try {
            localStorage.setItem('motionCalibrationData', JSON.stringify(this.calibrationData));
        } catch (error) {
            console.error('Error saving calibration data:', error);
        }
    }
    
    /**
     * Load calibration data from local storage
     */
    loadCalibrationData() {
        try {
            const data = localStorage.getItem('motionCalibrationData');
            if (data) {
                this.calibrationData = JSON.parse(data);
                return true;
            }
        } catch (error) {
            console.error('Error loading calibration data:', error);
        }
        return false;
    }
    
    /**
     * Reset calibration data
     */
    resetCalibrationData() {
        this.calibrationData = {
            handCalibration: {
                completed: false,
                detectedGestures: {},
                confidence: 0
            },
            poseCalibration: {
                completed: false,
                detectedPoses: {},
                confidence: 0
            },
            faceCalibration: {
                completed: false,
                detectedExpressions: {},
                confidence: 0
            },
            gestureCalibration: {
                completed: false,
                detectedGestures: {},
                confidence: 0
            },
            recommendations: []
        };
    }
    
    /**
     * Handle hand update from motion tracker
     */
    handleHandUpdate(handLandmarks) {
        if (this.currentStep === 2) {
            // Detect hand gestures
            if (handLandmarks && handLandmarks.length > 0) {
                // Detect open palm
                if (this.isOpenPalm(handLandmarks[0])) {
                    this.detectedGestures['open_palm'] = true;
                }
                
                // Detect closed fist
                if (this.isClosedFist(handLandmarks[0])) {
                    this.detectedGestures['closed_fist'] = true;
                }
                
                // Detect pointing
                if (this.isPointing(handLandmarks[0])) {
                    this.detectedGestures['pointing'] = true;
                }
            }
            
            // Update progress
            this.updateGestureProgress();
        } else if (this.currentStep === 5) {
            // Detect test movements
            if (handLandmarks && handLandmarks.length > 0) {
                // Detect right hand raise
                if (this.isRightHandRaise(handLandmarks[0])) {
                    this.detectedGestures['right_hand_raise'] = true;
                    this.updateGestureFeedback('Right Hand Raised');
                }
                
                // Detect left hand raise
                if (this.isLeftHandRaise(handLandmarks[0])) {
                    this.detectedGestures['left_hand_raise'] = true;
                    this.updateGestureFeedback('Left Hand Raised');
                }
                
                // Detect fist
                if (this.isClosedFist(handLandmarks[0])) {
                    this.detectedGestures['fist'] = true;
                    this.updateGestureFeedback('Fist');
                }
                
                // Detect point
                if (this.isPointing(handLandmarks[0])) {
                    this.detectedGestures['point'] = true;
                    this.updateGestureFeedback('Pointing');
                }
            }
            
            // Update progress
            this.updateGestureProgress();
        }
    }
    
    /**
     * Handle pose update from motion tracker
     */
    handlePoseUpdate(poseLandmarks) {
        if (this.currentStep === 3) {
            // Detect body poses
            if (poseLandmarks) {
                // Detect neutral pose
                if (this.isNeutralPose(poseLandmarks)) {
                    this.detectedGestures['neutral_pose'] = true;
                }
            }
            
            // Update progress
            this.updateGestureProgress();
        }
    }
    
    /**
     * Handle face update from motion tracker
     */
    handleFaceUpdate(faceLandmarks) {
        if (this.currentStep === 4) {
            // Detect facial expressions
            if (faceLandmarks) {
                // Detect neutral face
                if (this.isNeutralFace(faceLandmarks)) {
                    this.detectedGestures['neutral_face'] = true;
                }
                
                // Detect smile
                if (this.isSmile(faceLandmarks)) {
                    this.detectedGestures['smile'] = true;
                }
                
                // Detect surprise
                if (this.isSurprise(faceLandmarks)) {
                    this.detectedGestures['surprise'] = true;
                }
            }
            
            // Update progress
            this.updateGestureProgress();
        }
    }
    
    /**
     * Handle tracker initialized event
     */
    handleTrackerInitialized() {
        console.log('Motion tracker initialized');
    }
    
    /**
     * Handle tracker error event
     */
    handleTrackerError(error) {
        console.error('Motion tracker error:', error);
    }
    
    /**
     * Update status indicators
     */
    updateStatusIndicators(status, step) {
        // Update status badges
        if (this.handStatus) {
            if (status === 'ready') {
                this.handStatus.textContent = 'Ready';
                this.handStatus.className = 'badge bg-info';
            } else if (status === 'calibrating' && step && step.id === 2) {
                this.handStatus.textContent = 'Calibrating';
                this.handStatus.className = 'badge bg-warning';
            } else if (status === 'completed' && step && step.id === 2) {
                this.handStatus.textContent = 'Completed';
                this.handStatus.className = 'badge bg-success';
            } else if (status === 'error') {
                this.handStatus.textContent = 'Error';
                this.handStatus.className = 'badge bg-danger';
            }
        }
        
        if (this.poseStatus) {
            if (status === 'ready') {
                this.poseStatus.textContent = 'Ready';
                this.poseStatus.className = 'badge bg-info';
            } else if (status === 'calibrating' && step && step.id === 3) {
                this.poseStatus.textContent = 'Calibrating';
                this.poseStatus.className = 'badge bg-warning';
            } else if (status === 'completed' && step && step.id === 3) {
                this.poseStatus.textContent = 'Completed';
                this.poseStatus.className = 'badge bg-success';
            } else if (status === 'error') {
                this.poseStatus.textContent = 'Error';
                this.poseStatus.className = 'badge bg-danger';
            }
        }
        
        if (this.faceStatus) {
            if (status === 'ready') {
                this.faceStatus.textContent = 'Ready';
                this.faceStatus.className = 'badge bg-info';
            } else if (status === 'calibrating' && step && step.id === 4) {
                this.faceStatus.textContent = 'Calibrating';
                this.faceStatus.className = 'badge bg-warning';
            } else if (status === 'completed' && step && step.id === 4) {
                this.faceStatus.textContent = 'Completed';
                this.faceStatus.className = 'badge bg-success';
            } else if (status === 'error') {
                this.faceStatus.textContent = 'Error';
                this.faceStatus.className = 'badge bg-danger';
            }
        }
        
        if (this.gestureStatus) {
            if (status === 'ready') {
                this.gestureStatus.textContent = 'Ready';
                this.gestureStatus.className = 'badge bg-info';
            } else if (status === 'calibrating' && step && step.id === 5) {
                this.gestureStatus.textContent = 'Calibrating';
                this.gestureStatus.className = 'badge bg-warning';
            } else if (status === 'completed' && step && step.id === 5) {
                this.gestureStatus.textContent = 'Completed';
                this.gestureStatus.className = 'badge bg-success';
            } else if (status === 'error') {
                this.gestureStatus.textContent = 'Error';
                this.gestureStatus.className = 'badge bg-danger';
            }
        }
    }
    
    /**
     * Update step progress
     */
    updateStepProgress(step) {
        // Calculate time progress
        const timeProgress = Math.min(this.stepElapsedTime / step.requiredTime, 1) * 100;
        
        // Calculate gesture progress
        const gestureProgress = this.calculateGestureProgress(step) * 100;
        
        // Calculate total progress (average of time and gesture progress)
        const totalProgress = (timeProgress + gestureProgress) / 2;
        
        // Update progress bars
        switch (step.id) {
            case 2: // Hand Detection
                if (this.handProgress) {
                    this.handProgress.style.width = `${totalProgress}%`;
                }
                break;
                
            case 3: // Body Pose
                if (this.poseProgress) {
                    this.poseProgress.style.width = `${totalProgress}%`;
                }
                break;
                
            case 4: // Face Tracking
                if (this.faceProgress) {
                    this.faceProgress.style.width = `${totalProgress}%`;
                }
                break;
        }
    }
    
    /**
     * Update gesture progress
     */
    updateGestureProgress() {
        // Get current step
        const step = this.config.calibrationSteps.find(step => step.id === this.currentStep);
        
        if (!step) return;
        
        // Calculate gesture progress
        const gestureProgress = this.calculateGestureProgress(step) * 100;
        
        // Dispatch event for each newly detected gesture
        Object.keys(this.detectedGestures).forEach(gesture => {
            if (this.detectedGestures[gesture]) {
                this.dispatchEvent('gestureDetected', { gesture });
                
                // Reset the gesture to avoid duplicate events
                this.detectedGestures[gesture] = false;
            }
        });
    }
    
    /**
     * Update gesture feedback
     */
    updateGestureFeedback(gesture) {
        if (this.gestureFeedback) {
            this.gestureFeedback.textContent = `Detected: ${gesture}`;
            this.gestureFeedback.className = 'alert alert-success';
            
            // Reset after 2 seconds
            setTimeout(() => {
                this.gestureFeedback.textContent = 'Waiting for gesture...';
                this.gestureFeedback.className = 'alert alert-info';
            }, 2000);
        }
    }
    
    /**
     * Calculate gesture progress
     */
    calculateGestureProgress(step) {
        if (!step.requiredGestures || step.requiredGestures.length === 0) {
            return 1; // No gestures required, progress is 100%
        }
        
        // Count detected gestures
        let detectedCount = 0;
        step.requiredGestures.forEach(gesture => {
            if (this.detectedGestures[gesture]) {
                detectedCount++;
            }
        });
        
        // Calculate progress
        return detectedCount / step.requiredGestures.length;
    }
    
    /**
     * Calculate confidence for a step
     */
    calculateConfidence(step) {
        // For now, just return a random value between 0.7 and 1.0
        // In a real application, this would be based on the quality of the tracking data
        return 0.7 + Math.random() * 0.3;
    }
    
    /**
     * Check if all required gestures for a step have been detected
     */
    areAllGesturesDetected(step) {
        if (!step.requiredGestures || step.requiredGestures.length === 0) {
            return true; // No gestures required
        }
        
        // Check if all required gestures have been detected
        return step.requiredGestures.every(gesture => this.detectedGestures[gesture]);
    }
    
    /**
     * Dispatch a custom event
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }
    
    /**
     * Gesture detection methods
     * These are simplified implementations for demonstration purposes
     * In a real application, these would use more sophisticated algorithms
     */
    
    isOpenPalm(hand) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isClosedFist(hand) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isPointing(hand) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isRightHandRaise(hand) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isLeftHandRaise(hand) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isNeutralPose(pose) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isNeutralFace(face) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isSmile(face) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
    
    isSurprise(face) {
        // Simplified implementation
        return Math.random() > 0.7;
    }
}

// Export the CalibrationManager class
window.CalibrationManager = CalibrationManager;

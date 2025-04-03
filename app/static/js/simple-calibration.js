/**
 * Simple Motion Calibration for Motion Powered Games
 * A simplified version that focuses on camera access and basic motion detection
 */

class SimpleCalibration {
    constructor(options = {}) {
        // Configuration options with defaults
        this.config = {
            videoElementId: options.videoElementId || 'video',
            canvasElementId: options.canvasElementId || 'canvas',
            loadingIndicatorId: options.loadingIndicatorId || 'loading-indicator',
            stepDuration: options.stepDuration || 5000, // Duration of each step in ms
            onStepComplete: options.onStepComplete || null,
            onCalibrationComplete: options.onCalibrationComplete || null
        };
        
        // DOM elements
        this.videoElement = document.getElementById(this.config.videoElementId);
        this.canvasElement = document.getElementById(this.config.canvasElementId);
        this.loadingIndicator = document.getElementById(this.config.loadingIndicatorId);
        
        // Canvas context
        this.ctx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        
        // Calibration state
        this.currentStep = 0;
        this.isCalibrating = false;
        this.stream = null;
        this.stepTimer = null;
        this.animationFrame = null;
        this.motionDetected = false;
        
        // Motion detection variables
        this.previousImageData = null;
        this.motionThreshold = 30; // Threshold for motion detection
        this.motionPixelCount = 0;
        
        // Initialize
        this.initialize();
    }
    
    /**
     * Initialize the calibration system
     */
    async initialize() {
        try {
            // Show loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.classList.remove('d-none');
            }
            
            // Initialize camera
            await this.initializeCamera();
            
            // Hide loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.classList.add('d-none');
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing calibration:', error);
            
            // Hide loading indicator
            if (this.loadingIndicator) {
                this.loadingIndicator.classList.add('d-none');
            }
            
            return false;
        }
    }
    
    /**
     * Initialize the camera
     */
    async initializeCamera() {
        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            // Set video source
            if (this.videoElement) {
                this.videoElement.srcObject = this.stream;
                
                // Wait for video to be ready
                await new Promise((resolve) => {
                    this.videoElement.onloadedmetadata = () => {
                        // Update canvas dimensions to match video
                        if (this.canvasElement) {
                            this.canvasElement.width = this.videoElement.videoWidth;
                            this.canvasElement.height = this.videoElement.videoHeight;
                        }
                        resolve();
                    };
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            throw new Error('Failed to access camera. Please ensure you have granted camera permissions.');
        }
    }
    
    /**
     * Start the calibration process
     */
    startCalibration() {
        if (this.isCalibrating) return;
        
        this.isCalibrating = true;
        this.currentStep = 0;
        
        // Start the first step
        this.startStep();
        
        // Start motion detection
        this.startMotionDetection();
    }
    
    /**
     * Start a calibration step
     */
    startStep() {
        // Clear previous timer
        if (this.stepTimer) {
            clearTimeout(this.stepTimer);
        }
        
        // Dispatch step start event
        this.dispatchEvent('calibrationStepStarted', { step: this.currentStep + 1 });
        
        // Set timer for step completion
        this.stepTimer = setTimeout(() => {
            this.completeStep();
        }, this.config.stepDuration);
    }
    
    /**
     * Complete a calibration step
     */
    completeStep() {
        // Call step complete callback
        if (typeof this.config.onStepComplete === 'function') {
            this.config.onStepComplete(this.currentStep + 1);
        }
        
        // Dispatch step complete event
        this.dispatchEvent('calibrationStepCompleted', { 
            step: this.currentStep + 1,
            motionDetected: this.motionDetected
        });
        
        // Move to next step
        this.currentStep++;
        
        // Check if calibration is complete
        if (this.currentStep >= 4) { // 4 steps total
            this.completeCalibration();
        } else {
            // Start next step
            this.startStep();
        }
    }
    
    /**
     * Complete the calibration process
     */
    completeCalibration() {
        this.isCalibrating = false;
        
        // Stop motion detection
        this.stopMotionDetection();
        
        // Call calibration complete callback
        if (typeof this.config.onCalibrationComplete === 'function') {
            this.config.onCalibrationComplete();
        }
        
        // Dispatch calibration complete event
        this.dispatchEvent('calibrationCompleted', {
            success: true,
            message: 'Calibration completed successfully'
        });
    }
    
    /**
     * Start motion detection
     */
    startMotionDetection() {
        // Reset motion detection variables
        this.previousImageData = null;
        this.motionDetected = false;
        
        // Start detection loop
        this.detectMotion();
    }
    
    /**
     * Stop motion detection
     */
    stopMotionDetection() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    /**
     * Detect motion in video feed
     */
    detectMotion() {
        if (!this.isCalibrating || !this.ctx || !this.videoElement) {
            return;
        }
        
        // Draw video frame to canvas
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
        const data = imageData.data;
        
        // If we have previous image data, compare to detect motion
        if (this.previousImageData) {
            const previousData = this.previousImageData.data;
            let motionPixels = 0;
            
            // Compare pixels (sample every 10th pixel for performance)
            for (let i = 0; i < data.length; i += 40) {
                // Calculate difference between current and previous frame
                const diff = Math.abs(data[i] - previousData[i]) + 
                             Math.abs(data[i+1] - previousData[i+1]) + 
                             Math.abs(data[i+2] - previousData[i+2]);
                
                // If difference is above threshold, count as motion
                if (diff > this.motionThreshold) {
                    motionPixels++;
                    
                    // Highlight motion pixels for visualization
                    if (this.currentStep === 1) { // Only in hand detection step
                        data[i] = 255;   // R
                        data[i+1] = 0;   // G
                        data[i+2] = 0;   // B
                    }
                }
            }
            
            // Update canvas with highlighted motion
            if (this.currentStep === 1) {
                this.ctx.putImageData(imageData, 0, 0);
            }
            
            // Calculate percentage of pixels with motion
            const motionPercentage = (motionPixels / (data.length / 40)) * 100;
            
            // If motion percentage is above threshold, consider motion detected
            if (motionPercentage > 0.5) {
                this.motionDetected = true;
                
                // Dispatch motion detected event
                this.dispatchEvent('motionDetected', {
                    percentage: motionPercentage
                });
            }
            
            // Store motion pixel count for progress calculation
            this.motionPixelCount = motionPixels;
        }
        
        // Store current frame for next comparison
        this.previousImageData = imageData;
        
        // Continue detection loop
        this.animationFrame = requestAnimationFrame(() => this.detectMotion());
    }
    
    /**
     * Get the current calibration progress
     */
    getProgress() {
        return {
            currentStep: this.currentStep + 1,
            totalSteps: 4,
            percentage: ((this.currentStep + 1) / 4) * 100,
            motionDetected: this.motionDetected,
            motionIntensity: this.motionPixelCount
        };
    }
    
    /**
     * Dispatch a custom event
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Stop calibration
        this.isCalibrating = false;
        
        // Stop motion detection
        this.stopMotionDetection();
        
        // Stop camera stream
        if (this.stream) {
            const tracks = this.stream.getTracks();
            tracks.forEach(track => track.stop());
            this.stream = null;
        }
        
        // Clear video source
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }
}

// Make the class available globally
window.SimpleCalibration = SimpleCalibration;

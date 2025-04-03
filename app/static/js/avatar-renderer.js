/**
 * Avatar Rendering System for Motion Powered Games
 * Uses Three.js for 3D avatar visualization and animation
 */

// Main avatar renderer class
class AvatarRenderer {
    constructor(options = {}) {
        // Configuration options with defaults
        this.config = {
            containerId: options.containerId || 'avatar-container',
            width: options.width || 400,
            height: options.height || 400,
            backgroundColor: options.backgroundColor || 0x000000,
            debugMode: options.debugMode || false,
            autoRotate: options.autoRotate || false,
            avatarPath: options.avatarPath || null,
            defaultAvatarColor: options.defaultAvatarColor || 0x3498db
        };
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = null;
        this.mixer = null;
        
        // Avatar model and skeleton
        this.avatar = null;
        this.skeleton = null;
        this.animations = {};
        
        // Animation state
        this.currentAnimation = null;
        this.animationSpeed = 1.0;
        
        // Mapping between body tracking points and avatar bones
        this.boneMapping = {};
        
        // Initialize the renderer
        this.initialize();
    }
    
    /**
     * Initialize the Three.js scene and renderer
     */
    initialize() {
        // Get the container element
        this.container = document.getElementById(this.config.containerId);
        if (!this.container) {
            console.error(`Container element with ID "${this.config.containerId}" not found.`);
            return;
        }
        
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);
        
        // Create the camera
        this.camera = new THREE.PerspectiveCamera(
            45, 
            this.config.width / this.config.height, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 1.5, 4);
        this.camera.lookAt(0, 1, 0);
        
        // Create the renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.config.width, this.config.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        // Add lighting
        this.setupLighting();
        
        // Add orbit controls for debugging
        if (this.config.debugMode) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.set(0, 1, 0);
            this.controls.update();
        }
        
        // Add a clock for animations
        this.clock = new THREE.Clock();
        
        // Add a grid helper for debugging
        if (this.config.debugMode) {
            const gridHelper = new THREE.GridHelper(10, 10);
            this.scene.add(gridHelper);
            
            const axesHelper = new THREE.AxesHelper(5);
            this.scene.add(axesHelper);
        }
        
        // Load the avatar model if specified
        if (this.config.avatarPath) {
            this.loadAvatarModel(this.config.avatarPath);
        } else {
            // Create a default avatar if no model is specified
            this.createDefaultAvatar();
        }
        
        // Start the animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    /**
     * Set up scene lighting
     */
    setupLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 2, 3);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Add a hemisphere light for more natural lighting
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        this.scene.add(hemisphereLight);
    }
    
    /**
     * Create a default avatar using basic Three.js geometries
     */
    createDefaultAvatar() {
        // Create a group to hold all avatar parts
        this.avatar = new THREE.Group();
        this.avatar.position.y = 0;
        this.scene.add(this.avatar);
        
        // Create materials
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.config.defaultAvatarColor,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // Create head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 32, 32),
            bodyMaterial
        );
        head.position.y = 1.7;
        head.castShadow = true;
        this.avatar.add(head);
        
        // Create torso
        const torso = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.15, 0.5, 32),
            bodyMaterial
        );
        torso.position.y = 1.25;
        torso.castShadow = true;
        this.avatar.add(torso);
        
        // Create lower body
        const lowerBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.1, 0.4, 32),
            bodyMaterial
        );
        lowerBody.position.y = 0.8;
        lowerBody.castShadow = true;
        this.avatar.add(lowerBody);
        
        // Create arms
        const leftArm = this.createLimb(bodyMaterial, 0.08, 0.5);
        leftArm.position.set(0.3, 1.3, 0);
        leftArm.rotation.z = -Math.PI / 4;
        this.avatar.add(leftArm);
        
        const rightArm = this.createLimb(bodyMaterial, 0.08, 0.5);
        rightArm.position.set(-0.3, 1.3, 0);
        rightArm.rotation.z = Math.PI / 4;
        this.avatar.add(rightArm);
        
        // Create legs
        const leftLeg = this.createLimb(bodyMaterial, 0.1, 0.7);
        leftLeg.position.set(0.1, 0.5, 0);
        this.avatar.add(leftLeg);
        
        const rightLeg = this.createLimb(bodyMaterial, 0.1, 0.7);
        rightLeg.position.set(-0.1, 0.5, 0);
        this.avatar.add(rightLeg);
        
        // Store references to body parts for animation
        this.avatarParts = {
            head: head,
            torso: torso,
            lowerBody: lowerBody,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLeg,
            rightLeg: rightLeg
        };
    }
    
    /**
     * Create a limb (arm or leg) for the default avatar
     */
    createLimb(material, radius, height) {
        const limb = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, height, 32),
            material
        );
        limb.castShadow = true;
        // Position the pivot point at the top of the cylinder
        limb.geometry.translate(0, -height/2, 0);
        return limb;
    }
    
    /**
     * Load a 3D model for the avatar
     * @param {string} modelPath - Path to the 3D model file (GLB/GLTF format)
     */
    loadAvatarModel(modelPath) {
        // Create a loader
        const loader = new THREE.GLTFLoader();
        
        // Load the model
        loader.load(
            modelPath,
            (gltf) => {
                // Success callback
                this.avatar = gltf.scene;
                this.scene.add(this.avatar);
                
                // Center and scale the model
                this.centerModel(this.avatar);
                
                // Get the animations
                if (gltf.animations && gltf.animations.length) {
                    this.mixer = new THREE.AnimationMixer(this.avatar);
                    
                    // Store all animations
                    gltf.animations.forEach((animation) => {
                        this.animations[animation.name] = animation;
                    });
                    
                    // Play the idle animation by default
                    if (this.animations['idle']) {
                        this.playAnimation('idle');
                    }
                }
                
                // Get the skeleton for motion mapping
                this.avatar.traverse((object) => {
                    if (object.isMesh) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                        
                        if (object.skeleton) {
                            this.skeleton = object.skeleton;
                        }
                    }
                });
                
                // Create bone mapping for motion capture
                if (this.skeleton) {
                    this.createBoneMapping();
                }
                
                // Emit event when avatar is loaded
                this.dispatchEvent('avatarLoaded', { avatar: this.avatar });
            },
            (xhr) => {
                // Progress callback
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                this.dispatchEvent('avatarLoadProgress', { progress: percentComplete });
            },
            (error) => {
                // Error callback
                console.error('Error loading avatar model:', error);
                this.dispatchEvent('avatarLoadError', { error: error });
                
                // Create a default avatar as fallback
                this.createDefaultAvatar();
            }
        );
    }
    
    /**
     * Center the loaded model in the scene
     */
    centerModel(model) {
        // Create a bounding box
        const boundingBox = new THREE.Box3().setFromObject(model);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        
        // Get the height of the model
        const height = size.y;
        
        // Calculate the scale to make the model a reasonable size
        const scale = 2 / height;
        model.scale.set(scale, scale, scale);
        
        // Center the model horizontally and place it on the ground
        model.position.x = -center.x * scale;
        model.position.y = -boundingBox.min.y * scale;
        model.position.z = -center.z * scale;
    }
    
    /**
     * Create mapping between body tracking points and avatar bones
     */
    createBoneMapping() {
        if (!this.skeleton) return;
        
        // Find bones by name
        const bones = this.skeleton.bones;
        
        // Create mapping object
        this.boneMapping = {
            // MediaPipe pose landmarks to bone indices
            hips: bones.findIndex(bone => /hip|pelvis|root/i.test(bone.name)),
            leftHip: bones.findIndex(bone => /left.*hip|left.*upLeg/i.test(bone.name)),
            rightHip: bones.findIndex(bone => /right.*hip|right.*upLeg/i.test(bone.name)),
            spine: bones.findIndex(bone => /spine|torso/i.test(bone.name)),
            leftShoulder: bones.findIndex(bone => /left.*shoulder|left.*clavicle/i.test(bone.name)),
            rightShoulder: bones.findIndex(bone => /right.*shoulder|right.*clavicle/i.test(bone.name)),
            leftElbow: bones.findIndex(bone => /left.*elbow|left.*forearm/i.test(bone.name)),
            rightElbow: bones.findIndex(bone => /right.*elbow|right.*forearm/i.test(bone.name)),
            leftWrist: bones.findIndex(bone => /left.*wrist|left.*hand/i.test(bone.name)),
            rightWrist: bones.findIndex(bone => /right.*wrist|right.*hand/i.test(bone.name)),
            neck: bones.findIndex(bone => /neck/i.test(bone.name)),
            head: bones.findIndex(bone => /head/i.test(bone.name)),
            leftKnee: bones.findIndex(bone => /left.*knee|left.*leg/i.test(bone.name)),
            rightKnee: bones.findIndex(bone => /right.*knee|right.*leg/i.test(bone.name)),
            leftAnkle: bones.findIndex(bone => /left.*ankle|left.*foot/i.test(bone.name)),
            rightAnkle: bones.findIndex(bone => /right.*ankle|right.*foot/i.test(bone.name))
        };
        
        // Filter out any unmapped bones (index -1)
        Object.keys(this.boneMapping).forEach(key => {
            if (this.boneMapping[key] === -1) {
                delete this.boneMapping[key];
            }
        });
        
        if (this.config.debugMode) {
            console.log('Bone mapping created:', this.boneMapping);
        }
    }
    
    /**
     * Play an animation by name
     * @param {string} animationName - Name of the animation to play
     * @param {boolean} loop - Whether to loop the animation
     */
    playAnimation(animationName, loop = true) {
        if (!this.mixer || !this.animations[animationName]) {
            console.warn(`Animation "${animationName}" not found.`);
            return;
        }
        
        // Stop any current animation
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }
        
        // Play the new animation
        this.currentAnimation = this.mixer.clipAction(this.animations[animationName]);
        this.currentAnimation.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
        this.currentAnimation.clampWhenFinished = !loop;
        this.currentAnimation.play();
        
        return this.currentAnimation;
    }
    
    /**
     * Update avatar pose based on motion tracking data
     * @param {Object} poseData - Motion tracking data from MediaPipe
     */
    updatePose(poseData) {
        if (!this.avatar) return;
        
        if (this.skeleton && this.boneMapping) {
            // Update skeleton bones based on pose data
            this.updateSkeletonPose(poseData);
        } else if (this.avatarParts) {
            // Update simple avatar parts based on pose data
            this.updateSimpleAvatarPose(poseData);
        }
    }
    
    /**
     * Update skeleton pose for rigged models
     * @param {Object} poseData - Motion tracking data from MediaPipe
     */
    updateSkeletonPose(poseData) {
        if (!poseData || !poseData.poseLandmarks || !this.skeleton) return;
        
        const landmarks = poseData.poseLandmarks;
        const bones = this.skeleton.bones;
        
        // Update each mapped bone
        Object.keys(this.boneMapping).forEach(landmarkName => {
            const boneIndex = this.boneMapping[landmarkName];
            const bone = bones[boneIndex];
            
            if (bone && landmarks[landmarkName]) {
                // Convert landmark position to bone rotation
                const rotation = this.calculateBoneRotation(landmarkName, landmarks);
                if (rotation) {
                    bone.rotation.set(rotation.x, rotation.y, rotation.z);
                }
            }
        });
    }
    
    /**
     * Update simple avatar pose for the default avatar
     * @param {Object} poseData - Motion tracking data from MediaPipe
     */
    updateSimpleAvatarPose(poseData) {
        if (!poseData || !poseData.poseLandmarks || !this.avatarParts) return;
        
        const landmarks = poseData.poseLandmarks;
        
        // Update head rotation
        if (landmarks[0] && this.avatarParts.head) {
            const head = landmarks[0];
            this.avatarParts.head.rotation.y = (head.x - 0.5) * 2;
            this.avatarParts.head.rotation.x = (head.y - 0.5) * 2;
        }
        
        // Update arms based on shoulder and elbow positions
        if (landmarks[11] && landmarks[13] && landmarks[15] && this.avatarParts.leftArm) {
            const shoulder = landmarks[11];
            const elbow = landmarks[13];
            const wrist = landmarks[15];
            
            // Calculate angle between shoulder and elbow
            const angle = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
            this.avatarParts.leftArm.rotation.z = angle;
        }
        
        if (landmarks[12] && landmarks[14] && landmarks[16] && this.avatarParts.rightArm) {
            const shoulder = landmarks[12];
            const elbow = landmarks[14];
            const wrist = landmarks[16];
            
            // Calculate angle between shoulder and elbow
            const angle = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
            this.avatarParts.rightArm.rotation.z = angle;
        }
        
        // Update legs based on hip and knee positions
        if (landmarks[23] && landmarks[25] && landmarks[27] && this.avatarParts.leftLeg) {
            const hip = landmarks[23];
            const knee = landmarks[25];
            const ankle = landmarks[27];
            
            // Calculate angle between hip and knee
            const angle = Math.atan2(knee.y - hip.y, knee.x - hip.x);
            this.avatarParts.leftLeg.rotation.z = angle;
        }
        
        if (landmarks[24] && landmarks[26] && landmarks[28] && this.avatarParts.rightLeg) {
            const hip = landmarks[24];
            const knee = landmarks[26];
            const ankle = landmarks[28];
            
            // Calculate angle between hip and knee
            const angle = Math.atan2(knee.y - hip.y, knee.x - hip.x);
            this.avatarParts.rightLeg.rotation.z = angle;
        }
    }
    
    /**
     * Calculate bone rotation based on landmark positions
     * @param {string} boneName - Name of the bone
     * @param {Object} landmarks - MediaPipe pose landmarks
     * @returns {Object} - Euler rotation angles
     */
    calculateBoneRotation(boneName, landmarks) {
        // This is a simplified version - in a real application, you would need
        // more complex inverse kinematics to calculate accurate bone rotations
        
        // Default rotation
        const rotation = { x: 0, y: 0, z: 0 };
        
        // Calculate rotations based on bone type
        switch (boneName) {
            case 'leftShoulder':
                if (landmarks[11] && landmarks[13]) {
                    const shoulder = landmarks[11];
                    const elbow = landmarks[13];
                    rotation.z = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
                }
                break;
                
            case 'rightShoulder':
                if (landmarks[12] && landmarks[14]) {
                    const shoulder = landmarks[12];
                    const elbow = landmarks[14];
                    rotation.z = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
                }
                break;
                
            case 'leftElbow':
                if (landmarks[13] && landmarks[15]) {
                    const elbow = landmarks[13];
                    const wrist = landmarks[15];
                    rotation.z = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
                }
                break;
                
            case 'rightElbow':
                if (landmarks[14] && landmarks[16]) {
                    const elbow = landmarks[14];
                    const wrist = landmarks[16];
                    rotation.z = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
                }
                break;
                
            case 'head':
                if (landmarks[0]) {
                    const head = landmarks[0];
                    rotation.y = (head.x - 0.5) * 2;
                    rotation.x = (head.y - 0.5) * 2;
                }
                break;
                
            // Add more cases for other bones as needed
        }
        
        return rotation;
    }
    
    /**
     * Change the avatar's color
     * @param {number} color - Hexadecimal color value
     */
    changeColor(color) {
        if (!this.avatar) return;
        
        if (this.avatarParts) {
            // Update color for simple avatar
            Object.values(this.avatarParts).forEach(part => {
                if (part.material) {
                    part.material.color.set(color);
                }
            });
        } else {
            // Update color for loaded model
            this.avatar.traverse(object => {
                if (object.isMesh && object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            material.color.set(color);
                        });
                    } else {
                        object.material.color.set(color);
                    }
                }
            });
        }
    }
    
    /**
     * Change the avatar's texture
     * @param {string} texturePath - Path to the texture image
     */
    changeTexture(texturePath) {
        if (!this.avatar) return;
        
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(texturePath);
        
        if (this.avatarParts) {
            // Update texture for simple avatar
            Object.values(this.avatarParts).forEach(part => {
                if (part.material) {
                    part.material.map = texture;
                    part.material.needsUpdate = true;
                }
            });
        } else {
            // Update texture for loaded model
            this.avatar.traverse(object => {
                if (object.isMesh && object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            material.map = texture;
                            material.needsUpdate = true;
                        });
                    } else {
                        object.material.map = texture;
                        object.material.needsUpdate = true;
                    }
                }
            });
        }
    }
    
    /**
     * Add an accessory to the avatar
     * @param {string} accessoryPath - Path to the accessory model
     * @param {string} attachmentPoint - Name of the bone to attach to
     */
    addAccessory(accessoryPath, attachmentPoint) {
        if (!this.avatar) return;
        
        const loader = new THREE.GLTFLoader();
        
        loader.load(accessoryPath, (gltf) => {
            const accessory = gltf.scene;
            
            if (this.skeleton && this.boneMapping) {
                // Attach to skeleton bone
                const boneIndex = this.boneMapping[attachmentPoint];
                if (boneIndex !== undefined) {
                    const bone = this.skeleton.bones[boneIndex];
                    bone.add(accessory);
                } else {
                    console.warn(`Attachment point "${attachmentPoint}" not found in bone mapping.`);
                    this.avatar.add(accessory);
                }
            } else if (this.avatarParts && this.avatarParts[attachmentPoint]) {
                // Attach to avatar part
                this.avatarParts[attachmentPoint].add(accessory);
            } else {
                // Just add to the avatar
                this.avatar.add(accessory);
            }
        });
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        // Get the new container size
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(width, height);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls if they exist
        if (this.controls) {
            this.controls.update();
        }
        
        // Update animation mixer if it exists
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta * this.animationSpeed);
        }
        
        // Auto-rotate the avatar if enabled
        if (this.config.autoRotate && this.avatar) {
            this.avatar.rotation.y += 0.01;
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Dispatch a custom event
     * @param {string} eventName - Name of the event
     * @param {Object} detail - Event details
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(`avatar:${eventName}`, { detail });
        window.dispatchEvent(event);
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Dispose of Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        
        // Remove the canvas from the DOM
        if (this.container && this.renderer) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// Export the AvatarRenderer class
window.AvatarRenderer = AvatarRenderer;

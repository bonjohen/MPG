/**
 * Avatar Customization Interface for Motion Powered Games
 * Provides UI controls for customizing avatars
 */

class AvatarCustomizer {
    constructor(options = {}) {
        // Configuration options with defaults
        this.config = {
            containerId: options.containerId || 'avatar-customizer',
            avatarRenderer: options.avatarRenderer || null,
            availableColors: options.availableColors || [
                { name: 'Blue', value: '#3498db' },
                { name: 'Red', value: '#e74c3c' },
                { name: 'Green', value: '#2ecc71' },
                { name: 'Purple', value: '#9b59b6' },
                { name: 'Orange', value: '#e67e22' },
                { name: 'Yellow', value: '#f1c40f' },
                { name: 'Teal', value: '#1abc9c' },
                { name: 'Pink', value: '#e84393' }
            ],
            availableAccessories: options.availableAccessories || [
                { name: 'None', value: null },
                { name: 'Hat', value: '/static/models/accessories/hat.glb', attachPoint: 'head' },
                { name: 'Glasses', value: '/static/models/accessories/glasses.glb', attachPoint: 'head' },
                { name: 'Sword', value: '/static/models/accessories/sword.glb', attachPoint: 'rightWrist' },
                { name: 'Shield', value: '/static/models/accessories/shield.glb', attachPoint: 'leftWrist' }
            ],
            availableAnimations: options.availableAnimations || [
                { name: 'Idle', value: 'idle' },
                { name: 'Walk', value: 'walk' },
                { name: 'Run', value: 'run' },
                { name: 'Jump', value: 'jump' },
                { name: 'Dance', value: 'dance' },
                { name: 'Attack', value: 'attack' },
                { name: 'Block', value: 'block' }
            ],
            onSave: options.onSave || null
        };
        
        // Reference to the avatar renderer
        this.avatarRenderer = this.config.avatarRenderer;
        
        // Current customization state
        this.currentState = {
            avatarId: null,
            color: this.config.availableColors[0].value,
            accessories: [],
            animation: 'idle'
        };
        
        // Initialize the customizer
        this.initialize();
    }
    
    /**
     * Initialize the customizer interface
     */
    initialize() {
        // Get the container element
        this.container = document.getElementById(this.config.containerId);
        if (!this.container) {
            console.error(`Container element with ID "${this.config.containerId}" not found.`);
            return;
        }
        
        // Create the UI
        this.createUI();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    /**
     * Create the customization UI
     */
    createUI() {
        // Clear the container
        this.container.innerHTML = '';
        
        // Create the main sections
        const colorSection = this.createColorSection();
        const accessoriesSection = this.createAccessoriesSection();
        const animationSection = this.createAnimationSection();
        const actionSection = this.createActionSection();
        
        // Add sections to the container
        this.container.appendChild(colorSection);
        this.container.appendChild(accessoriesSection);
        this.container.appendChild(animationSection);
        this.container.appendChild(actionSection);
    }
    
    /**
     * Create the color selection section
     */
    createColorSection() {
        const section = document.createElement('div');
        section.className = 'customizer-section';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Color';
        section.appendChild(heading);
        
        const colorGrid = document.createElement('div');
        colorGrid.className = 'color-grid';
        
        // Add color swatches
        this.config.availableColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color.value;
            swatch.setAttribute('data-color', color.value);
            swatch.setAttribute('title', color.name);
            
            // Mark the current color as selected
            if (color.value === this.currentState.color) {
                swatch.classList.add('selected');
            }
            
            // Add click event
            swatch.addEventListener('click', () => {
                // Update the UI
                document.querySelectorAll('.color-swatch').forEach(s => {
                    s.classList.remove('selected');
                });
                swatch.classList.add('selected');
                
                // Update the avatar
                this.currentState.color = color.value;
                if (this.avatarRenderer) {
                    this.avatarRenderer.changeColor(color.value);
                }
            });
            
            colorGrid.appendChild(swatch);
        });
        
        section.appendChild(colorGrid);
        return section;
    }
    
    /**
     * Create the accessories selection section
     */
    createAccessoriesSection() {
        const section = document.createElement('div');
        section.className = 'customizer-section';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Accessories';
        section.appendChild(heading);
        
        // Create accessory selectors
        this.config.availableAccessories.forEach(accessory => {
            if (accessory.name === 'None') return; // Skip the "None" option
            
            const accessoryRow = document.createElement('div');
            accessoryRow.className = 'accessory-row';
            
            const label = document.createElement('label');
            label.textContent = accessory.name;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('data-accessory', JSON.stringify(accessory));
            
            // Check if this accessory is already selected
            const isSelected = this.currentState.accessories.some(a => a.value === accessory.value);
            checkbox.checked = isSelected;
            
            // Add change event
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    // Add the accessory
                    this.currentState.accessories.push(accessory);
                    if (this.avatarRenderer) {
                        this.avatarRenderer.addAccessory(accessory.value, accessory.attachPoint);
                    }
                } else {
                    // Remove the accessory
                    this.currentState.accessories = this.currentState.accessories.filter(a => a.value !== accessory.value);
                    // Note: Removing accessories would require additional implementation in the renderer
                }
            });
            
            label.prepend(checkbox);
            accessoryRow.appendChild(label);
            section.appendChild(accessoryRow);
        });
        
        return section;
    }
    
    /**
     * Create the animation selection section
     */
    createAnimationSection() {
        const section = document.createElement('div');
        section.className = 'customizer-section';
        
        const heading = document.createElement('h3');
        heading.textContent = 'Animation';
        section.appendChild(heading);
        
        const select = document.createElement('select');
        select.className = 'animation-select';
        
        // Add animation options
        this.config.availableAnimations.forEach(animation => {
            const option = document.createElement('option');
            option.value = animation.value;
            option.textContent = animation.name;
            
            // Set the current animation as selected
            if (animation.value === this.currentState.animation) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        // Add change event
        select.addEventListener('change', () => {
            this.currentState.animation = select.value;
            if (this.avatarRenderer) {
                this.avatarRenderer.playAnimation(select.value);
            }
        });
        
        section.appendChild(select);
        return section;
    }
    
    /**
     * Create the action buttons section
     */
    createActionSection() {
        const section = document.createElement('div');
        section.className = 'customizer-section action-section';
        
        // Create save button
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-primary';
        saveButton.textContent = 'Save Avatar';
        saveButton.addEventListener('click', () => {
            this.saveAvatar();
        });
        
        // Create reset button
        const resetButton = document.createElement('button');
        resetButton.className = 'btn btn-secondary';
        resetButton.textContent = 'Reset';
        resetButton.addEventListener('click', () => {
            this.resetCustomization();
        });
        
        section.appendChild(saveButton);
        section.appendChild(resetButton);
        
        return section;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for avatar loaded event
        window.addEventListener('avatar:avatarLoaded', () => {
            // Apply current customization to the newly loaded avatar
            this.applyCurrentState();
        });
    }
    
    /**
     * Apply the current customization state to the avatar
     */
    applyCurrentState() {
        if (!this.avatarRenderer) return;
        
        // Apply color
        this.avatarRenderer.changeColor(this.currentState.color);
        
        // Apply accessories
        this.currentState.accessories.forEach(accessory => {
            this.avatarRenderer.addAccessory(accessory.value, accessory.attachPoint);
        });
        
        // Apply animation
        this.avatarRenderer.playAnimation(this.currentState.animation);
    }
    
    /**
     * Save the current avatar customization
     */
    saveAvatar() {
        // Prepare the data to save
        const avatarData = {
            avatarId: this.currentState.avatarId,
            color: this.currentState.color,
            accessories: this.currentState.accessories.map(a => a.value),
            animation: this.currentState.animation
        };
        
        // Call the onSave callback if provided
        if (typeof this.config.onSave === 'function') {
            this.config.onSave(avatarData);
        }
        
        // Save to the server
        this.saveToServer(avatarData);
    }
    
    /**
     * Save the avatar customization to the server
     * @param {Object} avatarData - The avatar customization data
     */
    saveToServer(avatarData) {
        fetch('/api/save_avatar_customization', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(avatarData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Avatar saved successfully!');
                
                // Update the avatar ID if provided
                if (data.avatarId) {
                    this.currentState.avatarId = data.avatarId;
                }
            } else {
                alert('Failed to save avatar: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error saving avatar:', error);
            alert('An error occurred while saving the avatar.');
        });
    }
    
    /**
     * Reset the customization to default values
     */
    resetCustomization() {
        // Reset to defaults
        this.currentState = {
            avatarId: this.currentState.avatarId, // Keep the avatar ID
            color: this.config.availableColors[0].value,
            accessories: [],
            animation: 'idle'
        };
        
        // Recreate the UI
        this.createUI();
        
        // Apply the reset state
        this.applyCurrentState();
    }
    
    /**
     * Load a saved avatar customization
     * @param {Object} avatarData - The saved avatar customization data
     */
    loadCustomization(avatarData) {
        if (!avatarData) return;
        
        // Update the current state
        this.currentState.avatarId = avatarData.avatarId || this.currentState.avatarId;
        this.currentState.color = avatarData.color || this.currentState.color;
        this.currentState.animation = avatarData.animation || this.currentState.animation;
        
        // Map accessory values to full accessory objects
        this.currentState.accessories = (avatarData.accessories || [])
            .map(accessoryValue => {
                return this.config.availableAccessories.find(a => a.value === accessoryValue);
            })
            .filter(Boolean); // Remove any undefined values
        
        // Recreate the UI
        this.createUI();
        
        // Apply the loaded state
        this.applyCurrentState();
    }
    
    /**
     * Load the user's saved avatar customization from the server
     */
    loadFromServer() {
        fetch('/api/get_avatar_customization')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.avatarData) {
                    this.loadCustomization(data.avatarData);
                }
            })
            .catch(error => {
                console.error('Error loading avatar customization:', error);
            });
    }
    
    /**
     * Set the avatar renderer
     * @param {AvatarRenderer} renderer - The avatar renderer instance
     */
    setAvatarRenderer(renderer) {
        this.avatarRenderer = renderer;
        this.applyCurrentState();
    }
}

// Export the AvatarCustomizer class
window.AvatarCustomizer = AvatarCustomizer;

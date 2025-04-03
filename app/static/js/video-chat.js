/**
 * Video Chat functionality for Motion Powered Games
 */

// Configuration for WebRTC
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Media constraints with bandwidth optimization
const mediaConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    },
    video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 }
    }
};

// Bandwidth management settings
const bandwidthConstraints = {
    low: {
        video: 250, // kbps
        audio: 32   // kbps
    },
    medium: {
        video: 500, // kbps
        audio: 64   // kbps
    },
    high: {
        video: 1000, // kbps
        audio: 96    // kbps
    }
};

// Global variables
let localStream = null;
let peerConnections = {};
let currentBandwidthProfile = 'medium';
let socket = null;
let localVideo = null;
let remoteVideos = {};

/**
 * Initialize the video chat functionality
 * @param {Object} options - Configuration options
 */
function initVideoChat(options = {}) {
    // Set default options
    const defaultOptions = {
        localVideoId: 'localVideo',
        remoteVideoContainer: 'remoteVideos',
        socketInstance: null,
        autoStart: false,
        bandwidthProfile: 'medium'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Initialize socket
    socket = config.socketInstance || io();
    
    // Set bandwidth profile
    currentBandwidthProfile = config.bandwidthProfile;
    
    // Set up local video element
    localVideo = document.getElementById(config.localVideoId);
    
    // Set up remote video container
    const remoteContainer = document.getElementById(config.remoteVideoContainer);
    
    // Set up socket event handlers
    setupSocketHandlers();
    
    // Start video if autoStart is true
    if (config.autoStart) {
        startLocalVideo();
    }
    
    // Return public API
    return {
        startLocalVideo,
        stopLocalVideo,
        connectToUser,
        disconnectFromUser,
        setBandwidthProfile,
        toggleMute,
        toggleVideo
    };
}

/**
 * Set up socket event handlers for WebRTC signaling
 */
function setupSocketHandlers() {
    // Handle incoming call
    socket.on('call-made', async (data) => {
        const { offer, socket: callerSocket } = data;
        
        // Create peer connection if it doesn't exist
        if (!peerConnections[callerSocket]) {
            peerConnections[callerSocket] = createPeerConnection(callerSocket);
        }
        
        try {
            // Set remote description
            await peerConnections[callerSocket].setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create answer
            const answer = await peerConnections[callerSocket].createAnswer();
            await peerConnections[callerSocket].setLocalDescription(answer);
            
            // Send answer to caller
            socket.emit('make-answer', {
                answer,
                to: callerSocket
            });
        } catch (error) {
            console.error('Error handling incoming call:', error);
        }
    });
    
    // Handle answer to our call
    socket.on('answer-made', async (data) => {
        const { answer, socket: answerSocket } = data;
        
        try {
            await peerConnections[answerSocket].setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    });
    
    // Handle ICE candidates
    socket.on('ice-candidate', async (data) => {
        const { candidate, socket: candidateSocket } = data;
        
        try {
            if (peerConnections[candidateSocket]) {
                await peerConnections[candidateSocket].addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    });
    
    // Handle user disconnection
    socket.on('user-disconnected', (socketId) => {
        if (peerConnections[socketId]) {
            peerConnections[socketId].close();
            delete peerConnections[socketId];
        }
        
        // Remove remote video element
        if (remoteVideos[socketId]) {
            remoteVideos[socketId].remove();
            delete remoteVideos[socketId];
        }
    });
}

/**
 * Create a new RTCPeerConnection
 * @param {string} socketId - The socket ID of the remote peer
 * @returns {RTCPeerConnection} The new peer connection
 */
function createPeerConnection(socketId) {
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Add local stream tracks to peer connection
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
    
    // Set up ICE candidate handling
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                candidate: event.candidate,
                to: socketId
            });
        }
    };
    
    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
        // Create or get remote video element
        let remoteVideo = remoteVideos[socketId];
        
        if (!remoteVideo) {
            remoteVideo = document.createElement('video');
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.id = `remote-video-${socketId}`;
            remoteVideo.className = 'remote-video';
            
            // Add to remote videos container
            document.getElementById('remoteVideos').appendChild(remoteVideo);
            
            // Store reference
            remoteVideos[socketId] = remoteVideo;
        }
        
        // Set remote stream
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };
    
    // Apply bandwidth limits
    applyBandwidthLimits(peerConnection);
    
    return peerConnection;
}

/**
 * Apply bandwidth limits to a peer connection
 * @param {RTCPeerConnection} peerConnection - The peer connection to apply limits to
 */
function applyBandwidthLimits(peerConnection) {
    const bandwidth = bandwidthConstraints[currentBandwidthProfile];
    
    // Set bandwidth limits on all senders
    peerConnection.getSenders().forEach(sender => {
        if (sender.track.kind === 'video') {
            const parameters = sender.getParameters();
            if (!parameters.encodings) {
                parameters.encodings = [{}];
            }
            parameters.encodings[0].maxBitrate = bandwidth.video * 1000;
            sender.setParameters(parameters).catch(e => console.error('Failed to set video bandwidth:', e));
        } else if (sender.track.kind === 'audio') {
            const parameters = sender.getParameters();
            if (!parameters.encodings) {
                parameters.encodings = [{}];
            }
            parameters.encodings[0].maxBitrate = bandwidth.audio * 1000;
            sender.setParameters(parameters).catch(e => console.error('Failed to set audio bandwidth:', e));
        }
    });
}

/**
 * Start the local video stream
 * @returns {Promise<MediaStream>} The local media stream
 */
async function startLocalVideo() {
    try {
        // Get user media with constraints
        localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        // Set local video source
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        
        return localStream;
    } catch (error) {
        console.error('Error starting local video:', error);
        throw error;
    }
}

/**
 * Stop the local video stream
 */
function stopLocalVideo() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (localVideo) {
        localVideo.srcObject = null;
    }
    
    // Close all peer connections
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
}

/**
 * Connect to another user
 * @param {string} socketId - The socket ID of the user to connect to
 */
async function connectToUser(socketId) {
    // Create peer connection if it doesn't exist
    if (!peerConnections[socketId]) {
        peerConnections[socketId] = createPeerConnection(socketId);
    }
    
    try {
        // Create offer
        const offer = await peerConnections[socketId].createOffer();
        await peerConnections[socketId].setLocalDescription(offer);
        
        // Send offer to remote peer
        socket.emit('call-user', {
            offer,
            to: socketId
        });
    } catch (error) {
        console.error('Error connecting to user:', error);
    }
}

/**
 * Disconnect from a user
 * @param {string} socketId - The socket ID of the user to disconnect from
 */
function disconnectFromUser(socketId) {
    if (peerConnections[socketId]) {
        peerConnections[socketId].close();
        delete peerConnections[socketId];
    }
    
    // Remove remote video element
    if (remoteVideos[socketId]) {
        remoteVideos[socketId].remove();
        delete remoteVideos[socketId];
    }
}

/**
 * Set the bandwidth profile
 * @param {string} profile - The bandwidth profile ('low', 'medium', or 'high')
 */
function setBandwidthProfile(profile) {
    if (bandwidthConstraints[profile]) {
        currentBandwidthProfile = profile;
        
        // Apply new bandwidth limits to all peer connections
        Object.values(peerConnections).forEach(pc => {
            applyBandwidthLimits(pc);
        });
        
        return true;
    }
    
    return false;
}

/**
 * Toggle audio mute state
 * @returns {boolean} The new mute state (true = muted)
 */
function toggleMute() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const muted = !audioTracks[0].enabled;
            audioTracks.forEach(track => {
                track.enabled = muted;
            });
            return !muted;
        }
    }
    return false;
}

/**
 * Toggle video enabled state
 * @returns {boolean} The new video state (true = enabled)
 */
function toggleVideo() {
    if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const videoOff = !videoTracks[0].enabled;
            videoTracks.forEach(track => {
                track.enabled = videoOff;
            });
            return videoOff;
        }
    }
    return false;
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initVideoChat,
        startLocalVideo,
        stopLocalVideo,
        connectToUser,
        disconnectFromUser,
        setBandwidthProfile,
        toggleMute,
        toggleVideo
    };
}

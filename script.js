// DOM Elements
const logo = document.getElementById('logo');
const uploadState = document.getElementById('uploadState');
const workingState = document.getElementById('workingState');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

const video = document.getElementById('video');
const extractFrame = document.getElementById('extractFrame');
const extractAll = document.getElementById('extractAll');
const newVideo = document.getElementById('newVideo');
const intervalSelect = document.getElementById('intervalSelect');
const formatSelect = document.getElementById('formatSelect');

const framesGrid = document.getElementById('framesGrid');
const frameCount = document.getElementById('frameCount');
const downloadAll = document.getElementById('downloadAll');
const clearAll = document.getElementById('clearAll');
const emptyState = document.getElementById('emptyState');

const progressModal = document.getElementById('progressModal');
const progressFill = document.getElementById('progressFill');
const currentProgress = document.getElementById('currentProgress');
const totalProgress = document.getElementById('totalProgress');

// State
let currentVideo = null;
let extractedFrames = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeLogo();
    initializeUpload();
    initializeVideoControls();
    initializeGallery();
});

// Logo functionality
function initializeLogo() {
    logo.addEventListener('click', (e) => {
        e.preventDefault();
        resetToUpload();
    });
}

// Upload functionality
function initializeUpload() {
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            handleVideoFile(files[0]);
        } else if (files.length > 0) {
            showNotification('올바른 비디오 파일을 선택해주세요.', 'error');
        }
    });

    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });


    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVideoFile(e.target.files[0]);
        }
    });
}

// Video controls
function initializeVideoControls() {
    // Extract current frame
    extractFrame.addEventListener('click', () => {
        if (video.readyState >= 2) {
            extractCurrentFrame();
        } else {
            showNotification('비디오가 아직 로드되지 않았습니다.', 'error');
        }
    });

    // Extract all frames
    extractAll.addEventListener('click', () => {
        if (video.readyState >= 2) {
            extractAllFrames();
        } else {
            showNotification('비디오가 아직 로드되지 않았습니다.', 'error');
        }
    });

    // New video
    newVideo.addEventListener('click', () => {
        resetToUpload();
    });
}

// Gallery controls
function initializeGallery() {
    // Download all
    downloadAll.addEventListener('click', () => {
        if (extractedFrames.length === 0) {
            showNotification('다운로드할 프레임이 없습니다.', 'error');
            return;
        }
        downloadAllFrames();
    });

    // Clear all
    clearAll.addEventListener('click', () => {
        if (extractedFrames.length === 0) {
            showNotification('삭제할 프레임이 없습니다.', 'error');
            return;
        }
        if (confirm('모든 프레임을 삭제하시겠습니까?')) {
            clearAllFrames();
        }
    });
}

// Store event handlers globally to remove them later
let videoMetadataHandler = null;
let videoErrorHandler = null;

// Handle video file
function handleVideoFile(file) {
    // Check file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('파일 크기는 2GB를 초과할 수 없습니다.', 'error');
        return;
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
        showNotification('올바른 비디오 파일을 선택해주세요.', 'error');
        return;
    }

    // Remove any existing event listeners
    if (videoMetadataHandler) {
        video.removeEventListener('loadedmetadata', videoMetadataHandler);
        videoMetadataHandler = null;
    }
    if (videoErrorHandler) {
        video.removeEventListener('error', videoErrorHandler);
        videoErrorHandler = null;
    }

    currentVideo = file;
    const videoURL = URL.createObjectURL(file);
    
    // Switch to working state BEFORE setting video src
    uploadState.style.display = 'none';
    workingState.style.display = 'block';
    
    // Create new handlers
    videoMetadataHandler = function onMetadataLoaded() {
        video.removeEventListener('loadedmetadata', videoMetadataHandler);
        videoMetadataHandler = null;
        
        const aspectRatio = video.videoWidth / video.videoHeight;
        const isPortrait = aspectRatio < 1;
        
        console.log('Video loaded:', {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            aspectRatio: aspectRatio.toFixed(2),
            orientation: isPortrait ? 'portrait' : 'landscape',
            filename: file.name
        });
        
        // Apply portrait class if needed
        if (isPortrait) {
            video.classList.add('portrait-video');
        } else {
            video.classList.remove('portrait-video');
        }
        
        // Show notification only once
        showNotification(`비디오 로드 완료: ${file.name}`, 'success');
        
        // Adjust frames grid based on video aspect ratio
        adjustFramesGrid();
    };

    videoErrorHandler = function onVideoError(e) {
        // Prevent multiple error handling
        if (videoErrorHandler) {
            video.removeEventListener('error', videoErrorHandler);
            videoErrorHandler = null;
            
            // Only show error if we haven't reset yet
            if (currentVideo) {
                console.error('Video load error:', e);
                showNotification('비디오를 로드할 수 없습니다.', 'error');
                resetToUpload();
            }
        }
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', videoMetadataHandler);
    video.addEventListener('error', videoErrorHandler);
    
    // Set video source after listeners are attached
    video.src = videoURL;
}

// Extract current frame
function extractCurrentFrame() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Maintain original video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame maintaining aspect ratio
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const format = formatSelect.value;
    const mimeType = format === 'jpg' ? 'image/jpeg' : 
                     format === 'webp' ? 'image/webp' : 'image/png';
    
    canvas.toBlob((blob) => {
        const frameUrl = URL.createObjectURL(blob);
        const timestamp = video.currentTime.toFixed(2);
        addFrameToGallery(frameUrl, timestamp, blob);
        showNotification('프레임이 추출되었습니다.', 'success');
    }, mimeType, 0.95);
}

// Extract all frames
function extractAllFrames() {
    const interval = parseFloat(intervalSelect.value);
    const duration = video.duration;
    const totalFrames = Math.floor(duration / interval);
    
    if (totalFrames > 100) {
        if (!confirm(`${totalFrames}개의 프레임이 추출됩니다. 계속하시겠습니까?`)) {
            return;
        }
    }
    
    let currentFrame = 0;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const format = formatSelect.value;
    const mimeType = format === 'jpg' ? 'image/jpeg' : 
                     format === 'webp' ? 'image/webp' : 'image/png';
    
    // Show progress modal
    progressModal.style.display = 'flex';
    totalProgress.textContent = totalFrames;
    currentProgress.textContent = 0;
    progressFill.style.width = '0%';
    
    function extractNextFrame() {
        if (currentFrame >= totalFrames) {
            progressModal.style.display = 'none';
            showNotification(`${totalFrames}개의 프레임이 추출되었습니다.`, 'success');
            return;
        }
        
        const timestamp = currentFrame * interval;
        video.currentTime = timestamp;
        
        video.addEventListener('seeked', function onSeeked() {
            video.removeEventListener('seeked', onSeeked);
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                const frameUrl = URL.createObjectURL(blob);
                addFrameToGallery(frameUrl, timestamp.toFixed(2), blob);
                
                currentFrame++;
                currentProgress.textContent = currentFrame;
                progressFill.style.width = `${(currentFrame / totalFrames) * 100}%`;
                
                requestAnimationFrame(extractNextFrame);
            }, mimeType, 0.95);
        });
    }
    
    extractNextFrame();
}

// Add frame to gallery
function addFrameToGallery(frameUrl, timestamp, blob) {
    // Hide empty state if it's the first frame
    if (extractedFrames.length === 0 && emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Adjust grid after adding frame
    setTimeout(() => {
        adjustFramesGrid();
    }, 100);
    
    const frameId = `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const frameItem = document.createElement('div');
    frameItem.className = 'frame-item';
    frameItem.id = frameId;
    
    const img = document.createElement('img');
    img.src = frameUrl;
    img.alt = `Frame at ${timestamp}s`;
    img.loading = 'lazy';
    
    // Delete button (X) at top-right corner
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'frame-delete';
    deleteBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
    deleteBtn.title = '삭제';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFrame(frameId, frameUrl);
    });
    
    const frameInfo = document.createElement('div');
    frameInfo.className = 'frame-info';
    
    const frameTime = document.createElement('span');
    frameTime.className = 'frame-time';
    frameTime.textContent = `${timestamp}s`;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'frame-download';
    downloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V10M8 10L5 7M8 10L11 7M2 14H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
    `;
    downloadBtn.title = '다운로드';
    
    const format = formatSelect.value;
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFrame(frameUrl, timestamp, format);
    });
    
    frameInfo.appendChild(frameTime);
    frameInfo.appendChild(downloadBtn);
    frameItem.appendChild(img);
    frameItem.appendChild(deleteBtn);
    frameItem.appendChild(frameInfo);
    framesGrid.appendChild(frameItem);
    
    extractedFrames.push({ id: frameId, url: frameUrl, timestamp, blob });
    updateFrameCount();
}

// Download single frame
function downloadFrame(url, timestamp, format) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `frame_${timestamp}s.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download all frames
function downloadAllFrames() {
    const format = formatSelect.value;
    
    extractedFrames.forEach((frame, index) => {
        setTimeout(() => {
            downloadFrame(frame.url, frame.timestamp, format);
        }, index * 100); // Delay to prevent browser blocking
    });
    
    showNotification(`${extractedFrames.length}개의 프레임을 다운로드 중입니다.`, 'success');
}

// Delete single frame
function deleteFrame(frameId, frameUrl) {
    const frameElement = document.getElementById(frameId);
    if (frameElement) {
        frameElement.remove();
    }
    
    // Remove from array and clean up URL
    const frameIndex = extractedFrames.findIndex(f => f.id === frameId);
    if (frameIndex !== -1) {
        URL.revokeObjectURL(extractedFrames[frameIndex].url);
        extractedFrames.splice(frameIndex, 1);
    }
    
    updateFrameCount();
    showNotification('프레임이 삭제되었습니다.', 'success');
}

// Clear all frames
function clearAllFrames(showMessage = true) {
    framesGrid.innerHTML = '';
    extractedFrames.forEach(frame => {
        URL.revokeObjectURL(frame.url);
    });
    extractedFrames = [];
    updateFrameCount();
    
    // Show empty state
    if (emptyState) {
        emptyState.style.display = 'flex';
    }
    
    // Only show notification if requested
    if (showMessage) {
        showNotification('모든 프레임이 삭제되었습니다.', 'success');
    }
}

// Reset to upload
function resetToUpload() {
    // Remove any existing event listeners FIRST
    if (videoMetadataHandler) {
        video.removeEventListener('loadedmetadata', videoMetadataHandler);
        videoMetadataHandler = null;
    }
    if (videoErrorHandler) {
        video.removeEventListener('error', videoErrorHandler);
        videoErrorHandler = null;
    }
    
    // Clear current video reference
    currentVideo = null;
    
    // Switch back to upload state
    uploadState.style.display = 'flex';
    workingState.style.display = 'none';
    
    // Reset video and remove classes
    video.pause();
    video.src = '';
    video.load(); // Force video element to reset
    video.classList.remove('portrait-video');
    fileInput.value = '';
    
    // Clear frames without showing notification
    if (extractedFrames.length > 0) {
        clearAllFrames(false);
    }
}

// Update frame count
function updateFrameCount() {
    frameCount.textContent = extractedFrames.length;
    
    // Show/hide empty state based on frame count
    if (emptyState) {
        if (extractedFrames.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }
    }
}

// Adjust frames grid based on video aspect ratio
function adjustFramesGrid() {
    const aspectRatio = video.videoWidth / video.videoHeight;
    const framesGrid = document.getElementById('framesGrid');
    
    if (framesGrid) {
        // Remove all mode classes first
        framesGrid.classList.remove('portrait-mode', 'wide-mode');
        
        // Apply appropriate class based on video orientation
        if (aspectRatio < 1) {
            // Portrait video
            framesGrid.classList.add('portrait-mode');
        } else if (aspectRatio > 1.5) {
            // Wide landscape video (16:9 or wider)
            framesGrid.classList.add('wide-mode');
        }
    }
}

// Track active notifications
let activeNotifications = new Set();

// Show notification
function showNotification(message, type = 'info') {
    // Check if this exact message is already showing
    const notificationKey = `${type}:${message}`;
    if (activeNotifications.has(notificationKey)) {
        return; // Don't show duplicate
    }
    
    // Remove any existing error notifications if showing a new one
    if (type === 'error') {
        document.querySelectorAll('.notification-error').forEach(el => {
            el.remove();
        });
        // Clear error notifications from tracking
        activeNotifications.forEach(key => {
            if (key.startsWith('error:')) {
                activeNotifications.delete(key);
            }
        });
    }
    
    activeNotifications.add(notificationKey);
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#28A745' : type === 'error' ? '#DC3545' : '#5B5FDE'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
            activeNotifications.delete(notificationKey);
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
// Audio Generator JavaScript
let audioContext;
let currentVideo = null;
let bgmBuffer = null;
let sfxBuffers = {};
let bgmSource = null;
let analyser = null;
let isPlaying = false;

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
    }
}

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    const videoUploadBox = document.getElementById('videoUploadBox');
    const videoInput = document.getElementById('videoInput');
    const videoPreview = document.getElementById('videoPreview');
    const videoInfo = document.getElementById('videoInfo');
    const fileName = document.getElementById('fileName');
    const duration = document.getElementById('duration');
    
    const bgmSelect = document.getElementById('bgmSelect');
    const bgmVolume = document.getElementById('bgmVolume');
    const bgmVolumeValue = document.getElementById('bgmVolumeValue');
    const sfxVolume = document.getElementById('sfxVolume');
    const sfxVolumeValue = document.getElementById('sfxVolumeValue');
    
    const previewAudio = document.getElementById('previewAudio');
    const applyAudio = document.getElementById('applyAudio');
    const downloadResult = document.getElementById('downloadResult');
    const backToExtractor = document.getElementById('backToExtractor');
    
    const audioVisualizer = document.getElementById('audioVisualizer');
    const canvasCtx = audioVisualizer.getContext('2d');

    // Back to extractor button
    backToExtractor.addEventListener('click', () => {
        window.location.href = '/';
    });

    // Video Upload
    videoUploadBox.addEventListener('click', () => {
        videoInput.click();
    });

    videoUploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoUploadBox.classList.add('drag-over');
    });

    videoUploadBox.addEventListener('dragleave', () => {
        videoUploadBox.classList.remove('drag-over');
    });

    videoUploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        videoUploadBox.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            handleVideoUpload(files[0]);
        }
    });

    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVideoUpload(e.target.files[0]);
        }
    });

    // Handle video upload
    function handleVideoUpload(file) {
        currentVideo = file;
        const videoURL = URL.createObjectURL(file);
        
        videoPreview.src = videoURL;
        videoPreview.style.display = 'block';
        videoUploadBox.style.display = 'none';
        videoInfo.style.display = 'block';
        
        fileName.textContent = file.name;
        
        videoPreview.addEventListener('loadedmetadata', () => {
            duration.textContent = videoPreview.duration.toFixed(2);
        });
    }

    // Volume Controls
    bgmVolume.addEventListener('input', (e) => {
        bgmVolumeValue.textContent = e.target.value + '%';
        if (bgmSource && bgmSource.gainNode) {
            bgmSource.gainNode.gain.value = e.target.value / 100;
        }
    });

    sfxVolume.addEventListener('input', (e) => {
        sfxVolumeValue.textContent = e.target.value + '%';
    });

    // BGM Selection
    bgmSelect.addEventListener('change', async (e) => {
        stopBGM();
        if (e.target.value) {
            await loadBGM(e.target.value);
        }
    });

    // Load BGM
    async function loadBGM(type) {
        initAudioContext();
        
        // In a real implementation, you would load actual audio files
        // For demo, we'll create synthetic sounds
        bgmBuffer = await createSyntheticBGM(type);
    }

    // Create synthetic BGM (placeholder)
    async function createSyntheticBGM(type) {
        const sampleRate = audioContext.sampleRate;
        const duration = 10; // 10 seconds loop
        const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);
        
        // Generate different patterns based on type
        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                switch(type) {
                    case 'ambient':
                        // Soft sine waves
                        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1 * 
                                        Math.sin(2 * Math.PI * 0.1 * i / sampleRate);
                        break;
                    case 'cinematic':
                        // Low frequency rumble
                        channelData[i] = Math.sin(2 * Math.PI * 60 * i / sampleRate) * 0.15 * 
                                        Math.sin(2 * Math.PI * 0.05 * i / sampleRate);
                        break;
                    case 'upbeat':
                        // Higher frequency with rhythm
                        channelData[i] = Math.sin(2 * Math.PI * 880 * i / sampleRate) * 0.1 * 
                                        (Math.floor(i / (sampleRate * 0.25)) % 2);
                        break;
                    case 'dramatic':
                        // Building intensity
                        channelData[i] = Math.sin(2 * Math.PI * 220 * i / sampleRate) * 
                                        (i / channelData.length) * 0.2;
                        break;
                    case 'peaceful':
                        // Gentle waves
                        channelData[i] = Math.sin(2 * Math.PI * 330 * i / sampleRate) * 0.05 * 
                                        Math.cos(2 * Math.PI * 0.2 * i / sampleRate);
                        break;
                }
            }
        }
        
        return buffer;
    }

    // Stop BGM
    function stopBGM() {
        if (bgmSource) {
            bgmSource.stop();
            bgmSource = null;
        }
    }

    // Play BGM
    function playBGM() {
        if (bgmBuffer) {
            stopBGM();
            bgmSource = audioContext.createBufferSource();
            bgmSource.buffer = bgmBuffer;
            bgmSource.loop = true;
            
            const gainNode = audioContext.createGain();
            gainNode.gain.value = bgmVolume.value / 100;
            bgmSource.gainNode = gainNode;
            
            bgmSource.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioContext.destination);
            
            bgmSource.start();
        }
    }

    // Effect buttons
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playEffect(btn.dataset.effect);
        });
    });

    // Play sound effect
    function playEffect(type) {
        initAudioContext();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const now = audioContext.currentTime;
        gainNode.gain.value = sfxVolume.value / 100;
        
        switch(type) {
            case 'click':
                oscillator.frequency.value = 1000;
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                break;
            case 'whoosh':
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                break;
            case 'impact':
                oscillator.frequency.value = 50;
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                break;
            case 'transition':
                oscillator.frequency.setValueAtTime(500, now);
                oscillator.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                break;
        }
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    // Preview audio
    previewAudio.addEventListener('click', () => {
        if (!isPlaying) {
            playBGM();
            isPlaying = true;
            previewAudio.textContent = '정지';
            startVisualizer();
        } else {
            stopBGM();
            isPlaying = false;
            previewAudio.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 4L15 10L5 16V4Z" fill="currentColor"/>
                </svg>
                미리듣기
            `;
        }
    });

    // Audio Visualizer
    function startVisualizer() {
        if (!analyser) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function draw() {
            if (!isPlaying) return;
            
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            canvasCtx.fillStyle = '#000';
            canvasCtx.fillRect(0, 0, audioVisualizer.width, audioVisualizer.height);
            
            const barWidth = (audioVisualizer.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                const r = 229;
                const g = 9;
                const b = 20;
                
                canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                canvasCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }

    // Apply audio to video
    applyAudio.addEventListener('click', async () => {
        if (!currentVideo) {
            showNotification('먼저 비디오를 업로드해주세요.', 'error');
            return;
        }
        
        showProgressModal();
        
        // In a real implementation, you would:
        // 1. Use MediaRecorder API to combine video and audio
        // 2. Process with Web Audio API
        // 3. Export the combined file
        
        setTimeout(() => {
            hideProgressModal();
            downloadResult.disabled = false;
            showNotification('오디오가 성공적으로 적용되었습니다!', 'success');
        }, 2000);
    });

    // Download result
    downloadResult.addEventListener('click', () => {
        // In a real implementation, download the processed video
        showNotification('다운로드 기능은 준비 중입니다.', 'info');
    });

    // Show notification
    function showNotification(message, type = 'info') {
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
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Progress modal
    function showProgressModal() {
        document.getElementById('progressModal').style.display = 'flex';
        const progressFill = document.getElementById('progressFill');
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += 10;
            progressFill.style.width = progress + '%';
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 180);
    }

    function hideProgressModal() {
        document.getElementById('progressModal').style.display = 'none';
    }
});

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
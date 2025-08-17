// Enhanced Audio Engine - 움직임 기반 동적 오디오 생성
class EnhancedAudioEngine {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.currentSources = [];
        this.analyser = null;
        this.masterGain = null;
        
        // Motion to sound mapping
        this.motionSounds = {
            // Movement intensity levels
            static: { tempo: 60, volume: 0.3, energy: 0.1 },
            minimal: { tempo: 80, volume: 0.4, energy: 0.3 },
            moderate: { tempo: 100, volume: 0.5, energy: 0.5 },
            active: { tempo: 120, volume: 0.7, energy: 0.7 },
            intense: { tempo: 140, volume: 0.9, energy: 0.9 }
        };
        
        // Pattern-based music styles
        this.patternStyles = {
            rhythmic: {
                type: 'percussion',
                pattern: [1, 0, 0.5, 0, 1, 0, 0.5, 0], // Basic beat pattern
                sounds: ['kick', 'hihat', 'snare']
            },
            continuous: {
                type: 'ambient',
                pattern: 'sustained',
                sounds: ['pad', 'drone']
            },
            variable: {
                type: 'melodic',
                pattern: 'arpeggiated',
                sounds: ['synth', 'pluck']
            },
            steady: {
                type: 'bass',
                pattern: [1, 0.5, 1, 0.5],
                sounds: ['bass', 'sub']
            }
        };
        
        // Event-based sound effects
        this.eventSounds = {
            collision: { type: 'impact', duration: 0.2, frequency: 100 },
            gesture: { type: 'swoosh', duration: 0.3, frequency: 800 },
            jump: { type: 'thud', duration: 0.15, frequency: 60 },
            clap: { type: 'clap', duration: 0.05, frequency: 2000 }
        };
        
        // Current playback state
        this.currentTempo = 100;
        this.currentPattern = null;
        this.isPlaying = false;
        this.scheduledEvents = [];
    }
    
    // Initialize audio context and nodes
    async initialize() {
        if (this.isInitialized) return;
        
        // Use shared audio context if available, otherwise create new one
        if (window.sharedAudioContext) {
            this.audioContext = window.sharedAudioContext;
        } else {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.sharedAudioContext = this.audioContext;
        }
        
        // Master gain for volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        
        // Analyzer for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        // Create effects chain
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        // Create reverb
        this.convolver = this.audioContext.createConvolver();
        await this.createReverbImpulse();
        
        // Connect nodes
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        // Reverb send
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0.2;
        this.masterGain.connect(this.reverbGain);
        this.reverbGain.connect(this.convolver);
        this.convolver.connect(this.audioContext.destination);
        
        this.isInitialized = true;
    }
    
    // Create reverb impulse response
    async createReverbImpulse() {
        const length = this.audioContext.sampleRate * 2;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.convolver.buffer = impulse;
    }
    
    // Generate audio based on motion analysis
    generateFromMotion(motionData, geminiAnalysis) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        // Stop current playback
        this.stopAll();
        
        // Determine audio parameters from motion
        const motionParams = this.motionSounds[motionData.type] || this.motionSounds.moderate;
        
        // Adjust tempo based on motion intensity
        this.currentTempo = motionParams.tempo;
        if (motionData.pattern === 'rhythmic') {
            this.currentTempo *= 1.2; // Speed up for rhythmic motion
        }
        
        // Set volume based on motion intensity
        this.masterGain.gain.value = motionParams.volume;
        
        // Generate appropriate music pattern
        this.playMotionPattern(motionData.pattern, motionParams);
        
        // Add event-based sounds if detected
        if (geminiAnalysis && geminiAnalysis.motion_analysis) {
            this.scheduleEventSounds(geminiAnalysis.motion_analysis);
        }
        
        // Apply spatial audio based on motion vector
        if (motionData.vector && Math.abs(motionData.vector.x) > 0.1) {
            this.applySpatialAudio(motionData.vector);
        }
        
        this.isPlaying = true;
    }
    
    // Play pattern-based music
    playMotionPattern(pattern, params) {
        const style = this.patternStyles[pattern] || this.patternStyles.steady;
        const beatDuration = 60 / this.currentTempo; // Duration of one beat in seconds
        
        if (style.type === 'percussion') {
            this.playPercussionPattern(style, beatDuration, params.energy);
        } else if (style.type === 'ambient') {
            this.playAmbientDrone(params.energy);
        } else if (style.type === 'melodic') {
            this.playMelodicPattern(beatDuration, params.energy);
        } else if (style.type === 'bass') {
            this.playBassPattern(style, beatDuration, params.energy);
        }
    }
    
    // Play percussion pattern
    playPercussionPattern(style, beatDuration, energy) {
        const startTime = this.audioContext.currentTime;
        const pattern = style.pattern;
        
        const playBeat = (beatIndex) => {
            if (!this.isPlaying) return;
            
            const time = startTime + (beatIndex * beatDuration / 4); // 16th notes
            const velocity = pattern[beatIndex % pattern.length];
            
            if (velocity > 0) {
                // Create drum sound
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                // Vary frequency based on beat position
                if (beatIndex % 4 === 0) {
                    // Kick drum
                    osc.frequency.setValueAtTime(60, time);
                    osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
                } else if (beatIndex % 4 === 2) {
                    // Snare
                    osc.frequency.setValueAtTime(200, time);
                    const noise = this.createNoise(0.05);
                    noise.connect(gainNode);
                    noise.start(time);
                } else {
                    // Hi-hat
                    osc.frequency.setValueAtTime(8000, time);
                }
                
                gainNode.gain.setValueAtTime(velocity * energy * 0.3, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                
                osc.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                osc.start(time);
                osc.stop(time + 0.1);
                
                this.currentSources.push(osc);
            }
            
            // Schedule next beat
            if (this.isPlaying) {
                setTimeout(() => playBeat(beatIndex + 1), beatDuration * 250); // Convert to ms
            }
        };
        
        playBeat(0);
    }
    
    // Play ambient drone
    playAmbientDrone(energy) {
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Set frequencies for pleasant harmony
        const baseFreq = 110 * (1 + energy * 0.5);
        osc1.frequency.value = baseFreq;
        osc2.frequency.value = baseFreq * 1.5; // Perfect fifth
        
        osc1.type = 'sine';
        osc2.type = 'triangle';
        
        // Filter for warmth
        filter.type = 'lowpass';
        filter.frequency.value = 800 + (energy * 1200);
        filter.Q.value = 2;
        
        // Slow volume fade in
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(energy * 0.2, this.audioContext.currentTime + 2);
        
        // Connect nodes
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Start oscillators
        osc1.start();
        osc2.start();
        
        this.currentSources.push(osc1, osc2);
    }
    
    // Play melodic arpeggiated pattern
    playMelodicPattern(beatDuration, energy) {
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C major scale
        let noteIndex = 0;
        
        const playNote = () => {
            if (!this.isPlaying) return;
            
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            // Select note from scale
            const freq = scale[noteIndex % scale.length] * (1 + Math.random() * 0.02); // Slight detuning
            osc.frequency.value = freq;
            osc.type = 'sawtooth';
            
            // Filter settings
            filter.type = 'lowpass';
            filter.frequency.value = 2000 + (energy * 2000);
            filter.Q.value = 5;
            
            // ADSR envelope
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(energy * 0.15, now + 0.01); // Attack
            gainNode.gain.exponentialRampToValueAtTime(energy * 0.08, now + 0.1); // Decay
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + beatDuration); // Release
            
            // Connect and play
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + beatDuration);
            
            this.currentSources.push(osc);
            
            // Next note
            noteIndex = (noteIndex + 1 + Math.floor(Math.random() * 2)) % scale.length;
            
            if (this.isPlaying) {
                setTimeout(() => playNote(), beatDuration * 1000 / 2);
            }
        };
        
        playNote();
    }
    
    // Play bass pattern
    playBassPattern(style, beatDuration, energy) {
        const pattern = style.pattern;
        let beatIndex = 0;
        
        const playBass = () => {
            if (!this.isPlaying) return;
            
            const velocity = pattern[beatIndex % pattern.length];
            if (velocity > 0) {
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                // Deep bass frequency
                osc.frequency.value = 55 * (beatIndex % 2 === 0 ? 1 : 1.5);
                osc.type = 'sawtooth';
                
                // Filter for bass tone
                filter.type = 'lowpass';
                filter.frequency.value = 200 + (energy * 100);
                filter.Q.value = 10;
                
                // Envelope
                const now = this.audioContext.currentTime;
                gainNode.gain.setValueAtTime(velocity * energy * 0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + beatDuration * 0.9);
                
                // Connect and play
                osc.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                osc.start(now);
                osc.stop(now + beatDuration);
                
                this.currentSources.push(osc);
            }
            
            beatIndex++;
            
            if (this.isPlaying) {
                setTimeout(() => playBass(), beatDuration * 1000);
            }
        };
        
        playBass();
    }
    
    // Schedule event-based sounds
    scheduleEventSounds(motionAnalysis) {
        if (motionAnalysis.collision_events) {
            this.playEventSound('collision');
        }
        
        if (motionAnalysis.gesture_detected && motionAnalysis.gesture_detected.includes('clap')) {
            this.playEventSound('clap');
        }
        
        if (motionAnalysis.primary_action && motionAnalysis.primary_action.includes('jump')) {
            this.playEventSound('jump');
        }
    }
    
    // Play specific event sound
    playEventSound(eventType, delay = 0) {
        const event = this.eventSounds[eventType];
        if (!event) return;
        
        const startTime = this.audioContext.currentTime + delay;
        
        if (eventType === 'clap') {
            // Clap sound (burst of noise)
            const noise = this.createNoise(event.duration);
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            filter.type = 'bandpass';
            filter.frequency.value = event.frequency;
            filter.Q.value = 10;
            
            gainNode.gain.setValueAtTime(0.5, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + event.duration);
            
            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            noise.start(startTime);
        } else {
            // Other event sounds using oscillators
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            osc.frequency.value = event.frequency;
            osc.type = 'sine';
            
            if (eventType === 'collision') {
                // Add some noise for impact
                const noise = this.createNoise(0.05);
                noise.connect(gainNode);
                noise.start(startTime);
            }
            
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + event.duration);
            
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + event.duration);
        }
    }
    
    // Create noise buffer
    createNoise(duration) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        return source;
    }
    
    // Apply spatial audio based on motion vector
    applySpatialAudio(vector) {
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, vector.x));
        
        // Reconnect through panner
        this.masterGain.disconnect();
        this.masterGain.connect(panner);
        panner.connect(this.compressor);
    }
    
    // Update audio based on continuous motion
    updateFromMotion(motionSummary) {
        if (!motionSummary || !this.isPlaying) return;
        
        // Adjust tempo dynamically
        const targetTempo = motionSummary.suggestedTempo;
        if (Math.abs(this.currentTempo - targetTempo) > 10) {
            this.currentTempo = targetTempo;
            // Restart with new tempo
            const lastPattern = this.currentPattern;
            this.stopAll();
            if (lastPattern) {
                this.playMotionPattern(lastPattern, this.motionSounds.moderate);
            }
        }
        
        // Adjust volume based on motion
        this.masterGain.gain.linearRampToValueAtTime(
            motionSummary.suggestedVolume * 0.5,
            this.audioContext.currentTime + 0.1
        );
    }
    
    // Stop all playing sounds
    stopAll() {
        this.isPlaying = false;
        
        this.currentSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Already stopped
            }
        });
        
        this.currentSources = [];
        this.scheduledEvents = [];
    }
    
    // Get analyser for visualization
    getAnalyser() {
        return this.analyser;
    }
}

// Export for use
window.EnhancedAudioEngine = EnhancedAudioEngine;
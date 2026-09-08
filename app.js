/**
 * KARTU UCAPAN SELAMAT ULANG TAHUN INTERAKTIF
 * Engine Javascript: QR/Barcode Scanner, Web Audio Synth, Fireworks Canvas, Blow-Candle Mic Listener, Balloon Physics
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. STATE & DATA INITIALIZATION
    // ==========================================
    const state = {
        recipientName: "Sahabatku",
        recipientAge: "Spesial Hari Bahagiamu ✨",
        senderName: "Seseorang yang Peduli ❤️",
        birthdayMessage: "Selamat ulang tahun! Semoga di usiamu yang baru ini selalu dilimpahi kesehatan, kebahagiaan, kedamaian, dan keberkahan. Semoga semua impian dan cita-citamu tercapai dengan indah. Tetaplah tersenyum dan menginspirasi!",
        candlesLit: true,
        isAudioPlaying: false,
        micStream: null,
        micAnalyser: null,
        micAnimationId: null,
        html5QrCode: null
    };

    let isDirectScanUrl = false;
    // Parse URL Parameters if available (e.g. ?name=Siska&msg=...&from=Budi)
    function parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('name') || urlParams.has('msg') || urlParams.has('from')) {
            isDirectScanUrl = true;
        }
        if (urlParams.has('name')) state.recipientName = urlParams.get('name');
        if (urlParams.has('age')) state.recipientAge = urlParams.get('age');
        if (urlParams.has('from')) state.senderName = urlParams.get('from');
        if (urlParams.has('msg')) state.birthdayMessage = urlParams.get('msg');
    }
    parseUrlParams();

    // ==========================================
    // 2. DOM ELEMENTS
    // ==========================================
    const screens = {
        scanner: document.getElementById('screen-scanner'),
        unboxing: document.getElementById('screen-unboxing'),
        greeting: document.getElementById('screen-greeting')
    };

    const elements = {
        displayName: document.getElementById('display-name'),
        displayAge: document.getElementById('display-age'),
        displaySender: document.getElementById('sender-name'),
        typedMessage: document.getElementById('typed-message'),
        audioControlBtn: document.getElementById('audio-control-btn'),
        toggleMusicBtn: document.getElementById('toggle-music-btn'),
        giftBoxTrigger: document.getElementById('gift-box-trigger'),
        btnOpenGiftDirect: document.getElementById('btn-open-gift-direct'),
        btnQuickDemo: document.getElementById('btn-quick-demo'),
        btnCreateQr: document.getElementById('btn-create-qr'),
        btnSubmitCode: document.getElementById('btn-submit-code'),
        manualCodeInput: document.getElementById('manual-code-input'),
        scanStatus: document.getElementById('scan-status'),
        btnBlowCandle: document.getElementById('btn-blow-candle'),
        btnMicBlow: document.getElementById('btn-mic-blow'),
        candleStatusText: document.getElementById('candle-status-text'),
        candles: document.querySelectorAll('.candle'),
        btnTriggerFireworks: document.getElementById('btn-trigger-fireworks'),
        btnSpawnBalloons: document.getElementById('btn-spawn-balloons'),
        btnShareCard: document.getElementById('btn-share-card'),
        btnBackScan: document.getElementById('btn-back-scan'),
        balloonContainer: document.getElementById('balloon-container'),
        // Modal QR
        qrModal: document.getElementById('qr-modal'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        qrForm: document.getElementById('qr-form'),
        btnGenerateQr: document.getElementById('btn-generate-qr'),
        qrResultBox: document.getElementById('qr-result-box'),
        qrcodeRender: document.getElementById('qrcode-render'),
        btnTestScanned: document.getElementById('btn-test-scanned'),
        btnCopyLink: document.getElementById('btn-copy-link'),
        toast: document.getElementById('toast')
    };

    // Populate Initial Greeting Data
    function applyStateToGreeting() {
        elements.displayName.textContent = state.recipientName;
        elements.displayAge.textContent = state.recipientAge;
        elements.displaySender.textContent = state.senderName;
    }
    applyStateToGreeting();

    // ==========================================
    // 3. NAVIGATION & SCREEN SWITCHING
    // ==========================================
    function switchScreen(targetScreenName) {
        if (targetScreenName === 'unboxing') {
            isUnboxingTriggered = false;
            if (elements.giftBoxTrigger) {
                elements.giftBoxTrigger.classList.remove('opened');
            }
        }
        Object.keys(screens).forEach(key => {
            if (key === targetScreenName) {
                screens[key].classList.remove('hidden');
                screens[key].classList.add('active');
            } else {
                screens[key].classList.add('hidden');
                screens[key].classList.remove('active');
            }
        });
    }

    // ==========================================
    // 4. WEB AUDIO SYNTHESIZER (MUSIC & SFX)
    // ==========================================
    let audioCtx = null;
    let isSynthPlaying = false;
    let synthTimeoutId = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Play Tone Helper
    function playNote(freq, type, duration, delay = 0, gainValue = 0.1) {
        const ctx = getAudioContext();
        setTimeout(() => {
            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(gainValue, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch (e) {
                console.error("Audio synth note error:", e);
            }
        }, delay * 1000);
    }

    // Sound FX: Chime (Scan success)
    function playSoundScanSuccess() {
        playNote(523.25, 'triangle', 0.4, 0, 0.15); // C5
        playNote(659.25, 'triangle', 0.4, 0.1, 0.15); // E5
        playNote(783.99, 'triangle', 0.6, 0.2, 0.2); // G5
        playNote(1046.50, 'triangle', 0.8, 0.3, 0.25); // C6
    }

    // Sound FX: Fanfare (Unboxing)
    function playSoundFanfare() {
        playNote(523.25, 'sine', 0.2, 0, 0.2);
        playNote(523.25, 'sine', 0.2, 0.15, 0.2);
        playNote(523.25, 'sine', 0.2, 0.3, 0.2);
        playNote(659.25, 'triangle', 0.6, 0.45, 0.3);
        playNote(783.99, 'triangle', 0.8, 0.8, 0.3);
    }

    // Sound FX: Balloon Pop
    function playSoundPop() {
        const ctx = getAudioContext();
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch(e){}
    }

    // Sound FX: Candle Blow Smoke Sound
    function playSoundBlow() {
        const ctx = getAudioContext();
        try {
            const bufferSize = ctx.sampleRate * 0.4;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start();
        } catch(e){}
    }

    // Full Happy Birthday Melody Loop Synthesizer
    const birthdayNotes = [
        { note: 264, duration: 0.35, pause: 0.4 },  // Happy
        { note: 264, duration: 0.35, pause: 0.4 },  // birthday
        { note: 297, duration: 0.7,  pause: 0.8 },  // to
        { note: 264, duration: 0.7,  pause: 0.8 },  // you
        { note: 352, duration: 0.7,  pause: 0.8 },  // Happy
        { note: 330, duration: 1.1,  pause: 1.2 },  // birthday

        { note: 264, duration: 0.35, pause: 0.4 },  // Happy
        { note: 264, duration: 0.35, pause: 0.4 },  // birthday
        { note: 297, duration: 0.7,  pause: 0.8 },  // to
        { note: 264, duration: 0.7,  pause: 0.8 },  // you
        { note: 396, duration: 0.7,  pause: 0.8 },  // Happy
        { note: 352, duration: 1.1,  pause: 1.2 },  // birthday

        { note: 264, duration: 0.35, pause: 0.4 },  // Happy
        { note: 264, duration: 0.35, pause: 0.4 },  // birthday
        { note: 528, duration: 0.7,  pause: 0.8 },  // Happy
        { note: 440, duration: 0.7,  pause: 0.8 },  // birthday
        { note: 352, duration: 0.7,  pause: 0.8 },  // dear...
        { note: 330, duration: 0.7,  pause: 0.8 },
        { note: 297, duration: 0.9,  pause: 1.0 },

        { note: 470, duration: 0.35, pause: 0.4 },  // Happy
        { note: 470, duration: 0.35, pause: 0.4 },  // birthday
        { note: 440, duration: 0.7,  pause: 0.8 },  // to
        { note: 352, duration: 0.7,  pause: 0.8 },  // you!
        { note: 396, duration: 0.7,  pause: 0.8 },
        { note: 352, duration: 1.3,  pause: 1.5 }
    ];

    function startBirthdayMelody() {
        if (isSynthPlaying) return;
        isSynthPlaying = true;
        elements.toggleMusicBtn.classList.add('playing');
        elements.audioControlBtn.classList.remove('hidden');

        let noteIndex = 0;

        function playNextNote() {
            if (!isSynthPlaying) return;
            const current = birthdayNotes[noteIndex];
            playNote(current.note, 'triangle', current.duration, 0, 0.15);
            playNote(current.note * 0.5, 'sine', current.duration, 0, 0.1); // Harmony bass

            noteIndex = (noteIndex + 1) % birthdayNotes.length;
            synthTimeoutId = setTimeout(playNextNote, current.pause * 650);
        }

        playNextNote();
    }

    function stopBirthdayMelody() {
        isSynthPlaying = false;
        if (synthTimeoutId) clearTimeout(synthTimeoutId);
        elements.toggleMusicBtn.classList.remove('playing');
    }

    elements.toggleMusicBtn.addEventListener('click', () => {
        getAudioContext();
        if (isSynthPlaying) {
            stopBirthdayMelody();
            showToast("Musik di-pause 🔇");
        } else {
            startBirthdayMelody();
            showToast("Memutar Musik Ultah 🎶");
        }
    });

    // ==========================================
    // 5. FIREWORKS CANVAS ENGINE
    // ==========================================
    const canvas = document.getElementById('fireworks-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.alpha = 1;
            this.decay = Math.random() * 0.02 + 0.015;
            this.gravity = 0.1;
        }

        update() {
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = Math.max(this.alpha, 0);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.restore();
        }
    }

    function launchFirework(x, y) {
        const colors = ['#ff007f', '#ffd700', '#00f0ff', '#ff69b4', '#00ff66', '#ffffff'];
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 45; i++) {
            particles.push(new Particle(x, y, baseColor));
        }
    }

    function launchMassiveFireworks() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const rx = Math.random() * (width * 0.8) + (width * 0.1);
                const ry = Math.random() * (height * 0.5) + (height * 0.1);
                launchFirework(rx, ry);
            }, i * 300);
        }
    }

    function animateFireworks() {
        ctx.fillStyle = 'rgba(15, 12, 32, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].alpha <= 0) {
                particles.splice(i, 1);
            }
        }
        requestAnimationFrame(animateFireworks);
    }
    animateFireworks();

    // Trigger Fireworks Button
    elements.btnTriggerFireworks.addEventListener('click', () => {
        launchMassiveFireworks();
        triggerConfettiBurst();
    });


    // ==========================================
    // 6. CONFETTI BURST INTEGRATION
    // ==========================================
    function triggerConfettiBurst() {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    function triggerGoldenStarsRain() {
        if (typeof confetti === 'function') {
            const end = Date.now() + 2 * 1000;
            const colors = ['#ffd700', '#ff007f', '#ffffff'];

            (function frame() {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            })();
        }
    }


    // ==========================================
    // 7. BARCODE / QR SCANNER ENGINE
    // ==========================================
    function initScanner() {
        try {
            if (typeof Html5QrcodeScanner !== 'undefined') {
                state.html5QrCode = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 200, height: 200 } },
                    /* verbose= */ false
                );
                state.html5QrCode.render(onScanSuccess, onScanFailure);
            }
        } catch (e) {
            console.log("Scanner camera init fallback:", e);
        }
    }

    function onScanSuccess(decodedText, decodedResult) {
        console.log("Scan Result:", decodedText);
        playSoundScanSuccess();
        processScannedData(decodedText);
    }

    function onScanFailure(error) {
        // Continuous scanning, silence log
    }

    function processScannedData(dataString) {
        if (state.html5QrCode) {
            try { state.html5QrCode.clear(); } catch(e){}
        }

        // Always reset unboxing animation trigger & close lid for the new scanned card
        isUnboxingTriggered = false;
        if (elements.giftBoxTrigger) {
            elements.giftBoxTrigger.classList.remove('opened');
        }

        elements.scanStatus.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#00ff66"></i> Kode Terdeteksi! Membuka kejutan...`;

        // Check if data is URL with parameters
        if (dataString.includes('name=') || dataString.includes('msg=')) {
            try {
                const url = new URL(dataString.startsWith('http') ? dataString : `http://dummy.com?${dataString}`);
                const params = new URLSearchParams(url.search);
                if (params.has('name')) state.recipientName = params.get('name');
                if (params.has('age')) state.recipientAge = params.get('age');
                if (params.has('from')) state.senderName = params.get('from');
                if (params.has('msg')) state.birthdayMessage = params.get('msg');
            } catch(e){}
        } else if (dataString.startsWith('HBD-')) {
            const parts = dataString.split('-');
            if (parts.length >= 2 && parts[1]) {
                state.recipientName = parts[1];
            }
        }

        applyStateToGreeting();

        setTimeout(() => {
            switchScreen('unboxing');
            showToast("Kode Berhasil Diverifikasi! 🎁");
        }, 600);
    }

    // Manual Code Input
    elements.btnSubmitCode.addEventListener('click', () => {
        const code = elements.manualCodeInput.value.trim();
        if (code) {
            playSoundScanSuccess();
            processScannedData(code);
        } else {
            showToast("Harap masukkan kode barcode!");
        }
    });

    initScanner();

    // Auto-switch to unboxing screen if URL contains barcode parameters (?name=...)
    if (isDirectScanUrl) {
        switchScreen('unboxing');
    }


    // ==========================================
    // 8. UNBOXING INTERACTION
    // ==========================================
    let isUnboxingTriggered = false;

    function openGiftBoxSequence() {
        if (isUnboxingTriggered) return;
        isUnboxingTriggered = true;

        if (elements.giftBoxTrigger) {
            elements.giftBoxTrigger.classList.add('opened');
        }
        playSoundFanfare();
        triggerGoldenStarsRain();
        launchMassiveFireworks();

        setTimeout(() => {
            switchScreen('greeting');
            startBirthdayMelody();
            startTypingMessage();
            spawnBalloons(8);
        }, 1100);
    }

    // Attach listeners for Click, Touch, and Pointer events to prevent missed touches on mobile
    if (elements.giftBoxTrigger) {
        ['click', 'touchstart', 'pointerdown'].forEach(evt => {
            elements.giftBoxTrigger.addEventListener(evt, (e) => {
                if (evt === 'touchstart') e.preventDefault();
                openGiftBoxSequence();
            }, { passive: false });
        });
    }

    if (elements.btnOpenGiftDirect) {
        ['click', 'touchstart', 'pointerdown'].forEach(evt => {
            elements.btnOpenGiftDirect.addEventListener(evt, (e) => {
                if (evt === 'touchstart') e.preventDefault();
                openGiftBoxSequence();
            }, { passive: false });
        });
    }


    // ==========================================
    // 9. TYPING EFFECT FOR BIRTHDAY MESSAGE
    // ==========================================
    let typingIndex = 0;
    let isTyping = false;

    function startTypingMessage() {
        if (isTyping) return;
        isTyping = true;
        elements.typedMessage.textContent = '';
        typingIndex = 0;

        const text = state.birthdayMessage;

        function typeChar() {
            if (typingIndex < text.length) {
                elements.typedMessage.textContent += text.charAt(typingIndex);
                typingIndex++;
                setTimeout(typeChar, 35);
            } else {
                isTyping = false;
            }
        }
        typeChar();
    }


    // ==========================================
    // 10. CANDLE BLOWING & MIC DETECTOR
    // ==========================================
    function extinguishCandles() {
        if (!state.candlesLit) return;
        state.candlesLit = false;

        playSoundBlow();
        elements.candles.forEach(candle => candle.classList.add('out'));

        elements.candleStatusText.innerHTML = `<i class="fa-solid fa-star" style="color:#ffd700"></i> Lilin telah ditiup! Semoga semua kebaikan menyertaimu ✨`;
        elements.btnBlowCandle.disabled = true;
        elements.btnBlowCandle.style.opacity = 0.6;
        elements.btnMicBlow.style.display = 'none';

        // Massive celebration burst
        launchMassiveFireworks();
        triggerConfettiBurst();
        triggerGoldenStarsRain();
        showToast("Lilin Ditiup! Make a wish! 🎂✨");
    }

    elements.btnBlowCandle.addEventListener('click', extinguishCandles);

    // Microphone Blow Listener
    elements.btnMicBlow.addEventListener('click', async () => {
        getAudioContext();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            state.micStream = stream;
            const ctx = getAudioContext();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            elements.btnMicBlow.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mendengarkan Tiupan...`;
            showToast("Silakan tiup ke dekat mikrofon HP/Laptop-mu! 🌬️");

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            function checkBlowVolume() {
                if (!state.candlesLit) return;
                analyser.getByteFrequencyData(dataArray);
                
                // Calculate average volume intensity
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;

                if (average > 55) { // Threshold for blow sound
                    extinguishCandles();
                    // Stop mic stream
                    stream.getTracks().forEach(track => track.stop());
                } else {
                    state.micAnimationId = requestAnimationFrame(checkBlowVolume);
                }
            }

            checkBlowVolume();

        } catch (err) {
            console.error("Mic access denied:", err);
            showToast("Akses mikrofon ditolak. Gunakan tombol 'Tiup Lilin' saja! 😊");
        }
    });


    // ==========================================
    // 11. FLOATING BALLOONS SYSTEM
    // ==========================================
    const balloonColors = ['#ff007f', '#ffd700', '#00f0ff', '#ff69b4', '#9d4edd', '#00ff66'];

    function spawnBalloons(count = 5) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const balloon = document.createElement('div');
                balloon.className = 'balloon';
                const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];
                balloon.style.background = color;
                balloon.style.left = `${Math.random() * 85 + 5}%`;
                balloon.style.animationDuration = `${Math.random() * 4 + 6}s`;

                balloon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playSoundPop();
                    balloon.classList.add('popped');
                    setTimeout(() => balloon.remove(), 300);
                });

                elements.balloonContainer.appendChild(balloon);

                // Auto clean after float animation ends
                setTimeout(() => {
                    if (balloon.parentNode) balloon.remove();
                }, 10000);
            }, i * 300);
        }
    }

    elements.btnSpawnBalloons.addEventListener('click', () => {
        spawnBalloons(6);
    });


    // Navigation Back to Scan
    elements.btnBackScan.addEventListener('click', () => {
        switchScreen('scanner');
        initScanner();
    });

    // Share Card Link
    elements.btnShareCard.addEventListener('click', () => {
        openQrModal();
    });


    // ==========================================
    // 12. QR CODE CREATOR & CUSTOMIZER MODAL
    // ==========================================
    function openQrModal() {
        elements.qrModal.classList.remove('hidden');
        // Pre-fill inputs with current state
        document.getElementById('input-rec-name').value = state.recipientName;
        document.getElementById('input-rec-age').value = state.recipientAge;
        document.getElementById('input-sender-name').value = state.senderName;
        document.getElementById('input-birthday-msg').value = state.birthdayMessage;
    }

    function closeQrModal() {
        elements.qrModal.classList.add('hidden');
    }

    elements.btnCreateQr.addEventListener('click', openQrModal);
    elements.btnCloseModal.addEventListener('click', closeQrModal);

    // Generate Custom Barcode & QR Code
    elements.btnGenerateQr.addEventListener('click', () => {
        const rName = document.getElementById('input-rec-name').value.trim() || "Sahabatku";
        const rAge = document.getElementById('input-rec-age').value.trim() || "Spesial Hari Bahagiamu ✨";
        const sName = document.getElementById('input-sender-name').value.trim() || "Seseorang yang Peduli ❤️";
        const bMsg = document.getElementById('input-birthday-msg').value.trim() || "Selamat ulang tahun!";

        // Build Custom Shareable Link for 2D QR Code
        const baseUrl = window.location.origin + window.location.pathname;
        const query = `?name=${encodeURIComponent(rName)}&age=${encodeURIComponent(rAge)}&from=${encodeURIComponent(sName)}&msg=${encodeURIComponent(bMsg)}`;
        const fullShareUrl = baseUrl + query;

        // Code text for 1D Barcode (e.g. HBD-SISKA-2026)
        const cleanNameCode = rName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || "SPECIAL";
        const barcodeCode = `HBD-${cleanNameCode}-2026`;

        // 1. Render 2D QR Code
        elements.qrcodeRender.innerHTML = '';
        let qrSuccess = false;

        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(elements.qrcodeRender, {
                    text: fullShareUrl,
                    width: 150,
                    height: 150,
                    colorDark: "#1a103c",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
                qrSuccess = true;
            } catch (e) {
                console.warn("QRCode JS error, using fallback API:", e);
            }
        }

        // Fallback QR Image API if QRCode library didn't produce image
        if (!qrSuccess || !elements.qrcodeRender.querySelector('img, canvas')) {
            const qrImg = document.createElement('img');
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullShareUrl)}`;
            qrImg.alt = "QR Code Birthday Card";
            qrImg.width = 150;
            qrImg.height = 150;
            elements.qrcodeRender.innerHTML = '';
            elements.qrcodeRender.appendChild(qrImg);
        }

        // 2. Render 1D Barcode Line (JsBarcode)
        const barcodeSvg = document.getElementById('barcode-svg');
        if (barcodeSvg) {
            barcodeSvg.innerHTML = '';
            if (typeof JsBarcode !== 'undefined') {
                try {
                    JsBarcode("#barcode-svg", barcodeCode, {
                        format: "CODE128",
                        width: 1.8,
                        height: 50,
                        displayValue: true,
                        fontSize: 12,
                        lineColor: "#1a103c",
                        background: "#ffffff",
                        margin: 5
                    });
                } catch (e) {
                    console.warn("JsBarcode error:", e);
                }
            } else {
                // SVG fallback for 1D Barcode line pattern
                barcodeSvg.setAttribute('viewBox', '0 0 200 60');
                barcodeSvg.innerHTML = `<rect width="200" height="60" fill="#fff"/>
                <text x="100" y="35" font-family="monospace" font-size="14" fill="#1a103c" text-anchor="middle">${barcodeCode}</text>`;
            }
        }

        elements.qrResultBox.classList.remove('hidden');
        showToast("Barcode & QR Code berhasil dibuat! 🎉");

        // Attach action events for generated link
        const btnDownloadQr = document.getElementById('btn-download-qr');
        if (btnDownloadQr) {
            btnDownloadQr.onclick = () => {
                downloadQrCodeImage(rName);
            };
        }

        elements.btnCopyLink.onclick = () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(fullShareUrl).then(() => {
                    showToast("Link ucapan berhasil disalin ke clipboard! 📋");
                }).catch(() => {
                    fallbackCopyText(fullShareUrl);
                });
            } else {
                fallbackCopyText(fullShareUrl);
            }
        };

        function fallbackCopyText(text) {
            const tempInput = document.createElement("input");
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
            showToast("Link ucapan disalin! 📋");
        }

        elements.btnTestScanned.onclick = () => {
            closeQrModal();
            state.recipientName = rName;
            state.recipientAge = rAge;
            state.senderName = sName;
            state.birthdayMessage = bMsg;
            applyStateToGreeting();
            switchScreen('unboxing');
            showToast("Memuat Kartu Ucapan Hasil Scan Barcode/QR! 🎁");
        };
    });

    // Download QR Code Image Function
    function downloadQrCodeImage(recipientName) {
        const qrContainer = elements.qrcodeRender;
        const canvasEl = qrContainer.querySelector('canvas');
        const imgEl = qrContainer.querySelector('img');
        const safeName = recipientName.replace(/[^a-zA-Z0-9]/g, '_') || 'Ucapan';
        const fileName = `QR_Ultah_${safeName}.png`;

        if (canvasEl) {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvasEl.toDataURL('image/png');
            link.click();
            showToast("Gambar QR Code berhasil diunduh! 📥");
        } else if (imgEl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function() {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth || 200;
                tempCanvas.height = img.naturalHeight || 200;
                const ctx = tempCanvas.getContext('2d');
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                ctx.drawImage(img, 0, 0);

                const link = document.createElement('a');
                link.download = fileName;
                link.href = tempCanvas.toDataURL('image/png');
                link.click();
                showToast("Gambar QR Code berhasil diunduh! 📥");
            };
            img.onerror = function() {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = imgEl.src;
                link.target = "_blank";
                link.click();
                showToast("Mengunduh gambar QR Code... 📥");
            };
            img.src = imgEl.src;
        } else {
            showToast("Gambar QR Code tidak ditemukan.");
        }
    }


    // ==========================================
    // 13. TOAST NOTIFICATIONS
    // ==========================================
    let toastTimeout = null;
    function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.classList.remove('hidden');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            elements.toast.classList.add('hidden');
        }, 3200);
    }

});

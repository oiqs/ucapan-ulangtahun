/**
 * KARTU UCAPAN SELAMAT ULANG TAHUN INTERAKTIF - Versi Disempurnakan
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

    // Universal & Safe Parameter Extractor (Supports Base64, short keys, long keys, JSON, raw text)
    function extractParamsFromString(rawString) {
        const res = { name: null, age: null, from: null, msg: null };
        if (!rawString) return res;

        try {
            const str = rawString.trim();

            // 1. Check for Base64 encoded payload ?d= or ?card=
            let b64Val = null;
            if (str.includes('d=')) {
                const match = str.match(/[?&]d=([^&]+)/);
                if (match) b64Val = match[1];
            } else if (str.includes('card=')) {
                const match = str.match(/[?&]card=([^&]+)/);
                if (match) b64Val = match[1];
            }

            if (b64Val) {
                try {
                    const decodedB64 = decodeURIComponent(b64Val);
                    // Safe UTF-8 Base64 decode
                    const jsonStr = decodeURIComponent(escape(atob(decodedB64)));
                    const obj = JSON.parse(jsonStr);
                    if (obj.n || obj.name || obj.rName || obj.ni) res.name = obj.n || obj.name || obj.rName || obj.ni;
                    if (obj.a || obj.age || obj.rAge) res.age = obj.a || obj.age || obj.rAge;
                    if (obj.f || obj.from || obj.sName) res.from = obj.f || obj.from || obj.sName;
                    if (obj.m || obj.msg || obj.bMsg) res.msg = obj.m || obj.msg || obj.bMsg;
                    if (res.name || res.msg || res.from) return res;
                } catch(e) {
                    console.warn("Base64 decode attempt failed:", e);
                }
            }

            // 2. Check for URL query params (?name=, ?n=, ?msg=, ?m=, etc.)
            let searchString = str;
            if (str.includes('?')) {
                searchString = str.substring(str.indexOf('?'));
            } else if (!str.startsWith('?')) {
                searchString = '?' + str;
            }

            const params = new URLSearchParams(searchString);

            if (params.has('name') && params.get('name')) res.name = params.get('name');
            else if (params.has('n') && params.get('n')) res.name = params.get('n');

            if (params.has('age') && params.get('age')) res.age = params.get('age');
            else if (params.has('a') && params.get('a')) res.age = params.get('a');

            if (params.has('from') && params.get('from')) res.from = params.get('from');
            else if (params.has('f') && params.get('f')) res.from = params.get('f');

            if (params.has('msg') && params.get('msg')) res.msg = params.get('msg');
            else if (params.has('m') && params.get('m')) res.msg = params.get('m');

            if (res.name || res.msg || res.from) return res;

            // 3. Check for JSON string
            if (str.startsWith('{') && str.endsWith('}')) {
                const obj = JSON.parse(str);
                if (obj.name || obj.n || obj.rName) res.name = obj.name || obj.n || obj.rName;
                if (obj.age || obj.a || obj.rAge) res.age = obj.age || obj.a || obj.rAge;
                if (obj.from || obj.f || obj.sName) res.from = obj.from || obj.f || obj.sName;
                if (obj.msg || obj.m || obj.bMsg) res.msg = obj.msg || obj.m || obj.bMsg;
                if (res.name || res.msg || res.from) return res;
            }
        } catch(err) {
            console.warn("extractParamsFromString exception handled:", err);
        }

        return res;
    }

    // Helper: Build ultra-compact, ultra-reliable Base64 shareable URL for QR Code
    function generateCompactShareUrl(rName, rAge, sName, bMsg) {
        let baseUrl = window.location.origin + window.location.pathname;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            baseUrl = 'https://ucapan-ulangtahun.vercel.app/';
        }

        try {
            const jsonPayload = JSON.stringify({ n: rName, a: rAge, f: sName, m: bMsg });
            const b64 = btoa(unescape(encodeURIComponent(jsonPayload)));
            return baseUrl + `?d=${encodeURIComponent(b64)}`;
        } catch(e) {
            // Fallback to short parameter keys
            return baseUrl + `?n=${encodeURIComponent(rName)}&a=${encodeURIComponent(rAge)}&f=${encodeURIComponent(sName)}&m=${encodeURIComponent(bMsg)}`;
        }
    }

    // Parse URL Parameters on initial page load safely
    function parseUrlParams() {
        try {
            const fullUrl = window.location.href;
            const extracted = extractParamsFromString(fullUrl);
            if (extracted.name || extracted.msg || extracted.from) {
                isDirectScanUrl = true;
                if (extracted.name) state.recipientName = extracted.name;
                if (extracted.age) state.recipientAge = extracted.age;
                if (extracted.from) state.senderName = extracted.from;
                if (extracted.msg) state.birthdayMessage = extracted.msg;
            }
        } catch(e) {
            console.error("parseUrlParams exception:", e);
        }
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
    function resetCandlesToLit() {
        state.candlesLit = true;
        if (elements.candles) {
            elements.candles.forEach(candle => candle.classList.remove('out'));
        }
        if (elements.candleStatusText) {
            elements.candleStatusText.innerHTML = `<i class="fa-solid fa-fire"></i> Lilin sedang menyala! Tiup atau ketuk tombol untuk memadamkannya.`;
        }
        if (elements.btnBlowCandle) {
            elements.btnBlowCandle.disabled = false;
            elements.btnBlowCandle.style.opacity = 1;
        }
        if (elements.btnMicBlow) {
            elements.btnMicBlow.style.display = 'inline-flex';
            elements.btnMicBlow.innerHTML = `<i class="fa-solid fa-microphone"></i> Gunakan Mic (Tiup Asli)`;
            elements.btnMicBlow.classList.remove('glow-btn');
        }
    }

    function switchScreen(targetScreenName) {
        if (targetScreenName === 'greeting') {
            resetCandlesToLit();
        }
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
    let currentCameraFacingMode = "environment"; // Default: Kamera Belakang (rear camera)
    let html5QrCodeEngineInstance = null;

    function initScanner() {
        startCameraScanner(currentCameraFacingMode);

        // Camera Switch Button Handler (Depan <-> Belakang)
        const btnSwitchCamera = document.getElementById('btn-switch-camera');
        if (btnSwitchCamera) {
            ['click', 'touchstart'].forEach(evt => {
                btnSwitchCamera.addEventListener(evt, (e) => {
                    if (evt === 'touchstart') e.preventDefault();
                    toggleCameraFacingMode();
                }, { passive: false });
            });
        }

        // Helper: Offscreen canvas QR decoding using jsQR library for uploaded image files
        function decodeImageFileWithJsQR(file, callback) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        if (typeof jsQR !== 'undefined') {
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: "dontInvert"
                            }) || jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: "attemptBoth"
                            });
                            if (code && code.data) {
                                callback(code.data);
                                return;
                            }
                        }
                    } catch(err) {
                        console.warn("jsQR decode exception:", err);
                    }
                    callback(null);
                };
                img.onerror = function() { callback(null); };
                img.src = e.target.result;
            };
            reader.onerror = function() { callback(null); };
            reader.readAsDataURL(file);
        }

        // Dedicated Barcode/QR File Upload Handler
        const barcodeFileInput = document.getElementById('barcode-file-input');
        if (barcodeFileInput) {
            barcodeFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    showToast("Membaca gambar barcode... 🔍");

                    decodeImageFileWithJsQR(file, (jsQrDecodedText) => {
                        if (jsQrDecodedText) {
                            playSoundScanSuccess();
                            processScannedData(jsQrDecodedText);
                        } else if (typeof Html5Qrcode !== 'undefined') {
                            const fileEngine = new Html5Qrcode("reader");
                            fileEngine.scanFile(file, false)
                                .then(decodedText => {
                                    playSoundScanSuccess();
                                    processScannedData(decodedText);
                                })
                                .catch(err => {
                                    console.warn("Scan file primary failed:", err);
                                    playSoundScanSuccess();
                                    processScannedData("");
                                });
                        } else {
                            playSoundScanSuccess();
                            processScannedData("");
                        }
                    });
                }
            });
        }
    }

    function startCameraScanner(facingMode) {
        if (typeof Html5Qrcode === 'undefined') return;

        if (html5QrCodeEngineInstance && html5QrCodeEngineInstance.isScanning) {
            html5QrCodeEngineInstance.stop().then(() => {
                launchCameraEngine(facingMode);
            }).catch(err => {
                console.log("Stop camera error:", err);
                launchCameraEngine(facingMode);
            });
        } else {
            launchCameraEngine(facingMode);
        }
    }

    function launchCameraEngine(facingMode) {
        try {
            html5QrCodeEngineInstance = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 220, height: 220 } };

            html5QrCodeEngineInstance.start(
                { facingMode: facingMode },
                config,
                onScanSuccess,
                onScanFailure
            ).catch(err => {
                console.log(`Failed camera facingMode: ${facingMode}, trying fallback:`, err);
                // Fallback camera
                html5QrCodeEngineInstance.start(
                    { facingMode: "user" },
                    config,
                    onScanSuccess,
                    onScanFailure
                ).catch(e => console.log("Camera fallback failed:", e));
            });
        } catch(e) {
            console.log("Launch camera exception:", e);
        }
    }

    function toggleCameraFacingMode() {
        currentCameraFacingMode = (currentCameraFacingMode === "environment") ? "user" : "environment";
        const label = (currentCameraFacingMode === "environment") ? "Belakang" : "Depan";
        showToast(`Beralih ke Kamera ${label}... 📷`);
        startCameraScanner(currentCameraFacingMode);
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

        elements.scanStatus.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#00ff66"></i> Kode Terdeteksi! Membuka panggung ucapan...`;

        let hasCustomParams = false;

        if (dataString) {
            const extracted = extractParamsFromString(dataString);
            if (extracted.name || extracted.msg || extracted.from) {
                if (extracted.name) state.recipientName = extracted.name;
                if (extracted.age) state.recipientAge = extracted.age;
                if (extracted.from) state.senderName = extracted.from;
                if (extracted.msg) state.birthdayMessage = extracted.msg;
                hasCustomParams = true;
            } else if (!dataString.startsWith('http') && !dataString.includes('?') && dataString.length > 3) {
                // Scanned raw text card
                state.birthdayMessage = dataString;
                hasCustomParams = true;
            }
        }

        // Fallback: If no parameters in scanned string, retrieve last created card from localStorage
        if (!hasCustomParams) {
            const saved = localStorage.getItem('lastCreatedCard');
            if (saved) {
                try {
                    const card = JSON.parse(saved);
                    if (card.rName) state.recipientName = card.rName;
                    if (card.rAge) state.recipientAge = card.rAge;
                    if (card.sName) state.senderName = card.sName;
                    if (card.bMsg) state.birthdayMessage = card.bMsg;
                } catch(e){}
            }
        }

        applyStateToGreeting();

        setTimeout(() => {
            switchScreen('greeting');
            startBirthdayMelody();
            startTypingMessage();
            spawnBalloons(8);
            launchMassiveFireworks();
            triggerGoldenStarsRain();
            showToast("Selamat Ulang Tahun! 🎉✨");
        }, 400);
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

    // Auto-switch directly to greeting screen if URL contains barcode parameters (?name=...)
    if (isDirectScanUrl) {
        switchScreen('greeting');
        setTimeout(() => {
            startBirthdayMelody();
            startTypingMessage();
            spawnBalloons(8);
            launchMassiveFireworks();
            triggerGoldenStarsRain();
        }, 500);
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
    let typingTimeoutId = null;

    function startTypingMessage() {
        if (typingTimeoutId) {
            clearTimeout(typingTimeoutId);
            typingTimeoutId = null;
        }
        isTyping = false;
        elements.typedMessage.textContent = '';
        typingIndex = 0;

        const text = state.birthdayMessage || "Selamat ulang tahun!";
        isTyping = true;

        function typeChar() {
            if (typingIndex < text.length) {
                elements.typedMessage.textContent += text.charAt(typingIndex);
                typingIndex++;
                typingTimeoutId = setTimeout(typeChar, 35);
            } else {
                isTyping = false;
                typingTimeoutId = null;
            }
        }
        typeChar();
    }

    // Copy Message Text Button Handler
    const btnCopyMessage = document.getElementById('btn-copy-message');
    if (btnCopyMessage) {
        ['click', 'touchstart'].forEach(evt => {
            btnCopyMessage.addEventListener(evt, (e) => {
                if (evt === 'touchstart') e.preventDefault();
                const msgToCopy = state.birthdayMessage || (elements.typedMessage ? elements.typedMessage.textContent : '');
                if (msgToCopy) {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(msgToCopy).then(() => {
                            showToast("Pesan & Doa berhasil disalin ke clipboard! 📋");
                        }).catch(() => fallbackCopyMsgText(msgToCopy));
                    } else {
                        fallbackCopyMsgText(msgToCopy);
                    }
                }
            }, { passive: false });
        });
    }

    function fallbackCopyMsgText(text) {
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = text;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand("copy");
        document.body.removeChild(tempTextArea);
        showToast("Pesan & Doa disalin! 📋");
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

    // Microphone Blow Listener with Pure Frequency Volume Detector (With 600ms Grace Period)
    elements.btnMicBlow.addEventListener('click', async () => {
        if (!state.candlesLit) return;
        getAudioContext();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            state.micStream = stream;
            const ctx = getAudioContext();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            elements.btnMicBlow.innerHTML = `<i class="fa-solid fa-wind fa-spin"></i> Mendengarkan Tiupan... (Tiup ke Mic!)`;
            elements.btnMicBlow.classList.add('glow-btn');
            showToast("Silakan tiup ke dekat mikrofon HP/Laptop-mu sekarang! 🌬️🎂");

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const micStartTime = Date.now();

            function checkBlowVolume() {
                if (!state.candlesLit) return;

                // Grace Period (600ms): ignore tap click sound when button is pressed
                if (Date.now() - micStartTime < 600) {
                    state.micAnimationId = requestAnimationFrame(checkBlowVolume);
                    return;
                }

                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;

                // Simple & sensitive blow volume detection threshold
                if (average > 38) {
                    extinguishCandles();
                    if (state.micStream) {
                        state.micStream.getTracks().forEach(track => track.stop());
                    }
                    if (state.micAnimationId) {
                        cancelAnimationFrame(state.micAnimationId);
                    }
                    return;
                }

                state.micAnimationId = requestAnimationFrame(checkBlowVolume);
            }

            checkBlowVolume();

        } catch (err) {
            console.error("Mic access denied or error:", err);
            elements.btnMicBlow.innerHTML = `<i class="fa-solid fa-microphone-slash"></i> Mic Tidak Aktif`;
            showToast("Akses mikrofon ditolak/tidak tersedia. Gunakan tombol 'Tiup Lilin' saja! 😊");
        }
    });


    // ==========================================
    // 11. FLOATING BALLOONS SYSTEM
    // ==========================================
    const balloonColors = ['#ff007f', '#ffd700', '#00f0ff', '#ff69b4', '#9d4edd', '#00ff66'];

    function spawnBalloons(count = 8) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const balloon = document.createElement('div');
                balloon.className = 'balloon';
                const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];
                balloon.style.background = color;

                // Distribute balloons evenly across left side, right side, and middle area on PC/Mobile
                let leftPercent;
                if (i % 3 === 0) {
                    // Left side (3% - 32%)
                    leftPercent = Math.random() * 29 + 3;
                } else if (i % 3 === 1) {
                    // Right side (68% - 96%)
                    leftPercent = Math.random() * 28 + 68;
                } else {
                    // Middle area (33% - 67%)
                    leftPercent = Math.random() * 34 + 33;
                }

                balloon.style.left = `${leftPercent}%`;
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
            }, i * 250);
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
        if (elements.qrModal) {
            elements.qrModal.classList.remove('hidden');
            elements.qrModal.style.display = 'flex';
        }
        // Pre-fill inputs with current state
        if (document.getElementById('input-rec-name')) document.getElementById('input-rec-name').value = state.recipientName;
        if (document.getElementById('input-rec-age')) document.getElementById('input-rec-age').value = state.recipientAge;
        if (document.getElementById('input-sender-name')) document.getElementById('input-sender-name').value = state.senderName;
        if (document.getElementById('input-birthday-msg')) document.getElementById('input-birthday-msg').value = state.birthdayMessage;
    }

    function closeQrModal() {
        if (elements.qrModal) {
            elements.qrModal.classList.add('hidden');
            elements.qrModal.style.display = 'none';
        }
    }

    if (elements.btnCreateQr) {
        ['click', 'touchstart', 'pointerdown'].forEach(evt => {
            elements.btnCreateQr.addEventListener(evt, (e) => {
                if (evt === 'touchstart') e.preventDefault();
                openQrModal();
            }, { passive: false });
        });
    }

    if (elements.btnCloseModal) {
        ['click', 'touchstart', 'pointerdown'].forEach(evt => {
            elements.btnCloseModal.addEventListener(evt, (e) => {
                if (evt === 'touchstart') e.preventDefault();
                closeQrModal();
            }, { passive: false });
        });
    }

    // Generate Custom Barcode & QR Code
    elements.btnGenerateQr.addEventListener('click', () => {
        const rName = document.getElementById('input-rec-name').value.trim() || "Sahabatku";
        const rAge = document.getElementById('input-rec-age').value.trim() || "Spesial Hari Bahagiamu ✨";
        const sName = document.getElementById('input-sender-name').value.trim() || "Seseorang yang Peduli ❤️";
        const bMsg = document.getElementById('input-birthday-msg').value.trim() || "Selamat ulang tahun!";

        // Update state and local storage immediately
        state.recipientName = rName;
        state.recipientAge = rAge;
        state.senderName = sName;
        state.birthdayMessage = bMsg;

        try {
            localStorage.setItem('lastCreatedCard', JSON.stringify({ rName, rAge, sName, bMsg }));
        } catch(e){}

        // Build Compact Shareable Link for 2D QR Code (Fast scanning, low-density QR matrix)
        const fullShareUrl = generateCompactShareUrl(rName, rAge, sName, bMsg);

        // Code text for 1D Barcode (e.g. HBD-SISKA-2026)
        const cleanNameCode = rName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || "SPECIAL";
        const barcodeCode = `HBD-${cleanNameCode}-2026`;

        // 1. Render High Definition 2D QR Code
        elements.qrcodeRender.innerHTML = '';
        let qrSuccess = false;

        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(elements.qrcodeRender, {
                    text: fullShareUrl,
                    width: 280,
                    height: 280,
                    colorDark: "#000000",
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
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&color=000000&bgcolor=ffffff&data=${encodeURIComponent(fullShareUrl)}`;
            qrImg.alt = "QR Code Birthday Card";
            qrImg.width = 280;
            qrImg.height = 280;
            elements.qrcodeRender.innerHTML = '';
            elements.qrcodeRender.appendChild(qrImg);
        }

        // 2. Display Clean Ticket Code Text
        const ticketCodeDisplay = document.getElementById('ticket-code-display');
        if (ticketCodeDisplay) {
            ticketCodeDisplay.textContent = barcodeCode;
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
            applyStateToGreeting();
            switchScreen('greeting');
            startBirthdayMelody();
            startTypingMessage();
            spawnBalloons(8);
            launchMassiveFireworks();
            triggerGoldenStarsRain();
            showToast("Memuat Kartu Ucapan Ulang Tahun! 🎁✨");
        };
    });

    // Download High Quality QR Code Image Function with Crisp Non-Blurred Margins
    function downloadQrCodeImage(recipientName) {
        const qrContainer = elements.qrcodeRender;
        const sourceCanvas = qrContainer.querySelector('canvas');
        const sourceImg = qrContainer.querySelector('img');
        const safeName = recipientName.replace(/[^a-zA-Z0-9]/g, '_') || 'Ucapan';
        const fileName = `QR_Ultah_${safeName}.png`;

        const outCanvas = document.createElement('canvas');
        const size = 360;
        const padding = 30;
        outCanvas.width = size;
        outCanvas.height = size + 40;
        const ctx = outCanvas.getContext('2d');

        // Turn OFF image smoothing so QR squares remain 100% crisp black & white
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;

        // Fill background pure white (#ffffff)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

        function triggerDownload() {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = outCanvas.toDataURL('image/png');
            link.click();
            showToast("Gambar QR Code HD berhasil diunduh! 📥");
        }

        function renderAndSave(drawableObj) {
            ctx.drawImage(drawableObj, padding, padding, size - (padding * 2), size - (padding * 2));
            
            // Text Label at bottom
            ctx.fillStyle = "#1a103c";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("🎁 Scan Kartu Ucapan Ulang Tahun", size / 2, size + 18);

            triggerDownload();
        }

        if (sourceCanvas) {
            renderAndSave(sourceCanvas);
        } else if (sourceImg) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function() {
                renderAndSave(img);
            };
            img.onerror = function() {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = sourceImg.src;
                link.target = "_blank";
                link.click();
                showToast("Mengunduh gambar QR Code... 📥");
            };
            img.src = sourceImg.src;
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

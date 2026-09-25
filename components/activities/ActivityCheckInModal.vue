<template>
    <Transition name="modal">
        <div v-if="show" class="checkin-modal-backdrop" @click.self="handleClose">
            <div class="checkin-modal-card">
                <!-- Header -->
                <div class="modal-header">
                    <div class="header-info">
                        <div class="title-row">
                            <h3>📷 สแกนเช็คชื่อเข้าร่วมกิจกรรม</h3>
                            <span class="hours-tag">⭐ {{ activity?.activity_hours || 0 }} ชม.</span>
                        </div>
                        <p class="subtitle-small">
                            <strong>{{ activity?.title }}</strong>
                            <span v-if="activity?.category_name"> • {{ activity.category_name }}</span>
                        </p>
                    </div>
                    <button class="btn-close" @click="handleClose" title="ปิดหน้าต่าง">&times;</button>
                </div>

                <div class="modal-body">
                    <!-- Scanner Mode Switcher -->
                    <div class="scanner-tabs">
                        <button type="button" class="tab-btn" :class="{ active: scannerMode === 'camera' }"
                            @click="switchMode('camera')">
                            📷 กล้องสแกนสด (Camera)
                        </button>
                        <button type="button" class="tab-btn" :class="{ active: scannerMode === 'manual' }"
                            @click="switchMode('manual')">
                            ⌨️ เครื่องยิงบาร์โค้ด / พิมพ์รหัส (Barcode Input)
                        </button>
                    </div>

                    <!-- CAMERA SCANNER VIEW -->
                    <div v-show="scannerMode === 'camera'" class="camera-scanner-section">
                        <div class="video-container">
                            <video ref="videoElement" playsinline class="scanner-video"
                                :class="{ mirrored: isFrontCamera }"></video>

                            <!-- Scanner Viewfinder Overlay -->
                            <div class="viewfinder-box">
                                <div class="corner corner-tl"></div>
                                <div class="corner corner-tr"></div>
                                <div class="corner corner-bl"></div>
                                <div class="corner corner-br"></div>
                                <div class="scan-laser-line"></div>
                                <span class="viewfinder-text">วาง QR Code ในกรอบนี้</span>
                            </div>

                            <!-- Camera Loading/Permission Overlay -->
                            <div v-if="cameraLoading" class="camera-status-overlay">
                                <div class="scanner-spinner"></div>
                                <span>กำลังเปิดกล้อง...</span>
                            </div>
                            <div v-else-if="cameraError" class="camera-status-overlay camera-error">
                                <span>⚠️ {{ cameraError }}</span>
                                <button type="button" class="btn-retry-cam"
                                    @click="startCamera">ลองเปิดกล้องใหม่</button>
                            </div>
                        </div>

                        <!-- Camera Controls -->
                        <div class="camera-controls">
                            <button type="button" class="btn-cam-action" @click="flipCamera" :disabled="cameraLoading">
                                🔄 สลับกล้อง (หน้า/หลัง)
                            </button>
                            <span class="cam-hint">คำแนะนำ: นำ QR Code จากหน้าจอของนักศึกษามาส่องที่หน้ากล้อง</span>
                        </div>
                    </div>

                    <!-- BARCODE / MANUAL INPUT SECTION -->
                    <div v-show="scannerMode === 'manual'" class="manual-input-section">
                        <div class="input-card">
                            <label for="manualQrInput">
                                <strong>ยิงบาร์โค้ด หรือพิมพ์รหัสนักศึกษา / ข้อมูล QR:</strong>
                            </label>
                            <p class="input-desc">
                                สามารถใช้เครื่องยิงบาร์โค้ด 2D ยิง QR Code ของนักศึกษา หรือพิมพ์รหัสนักศึกษา 12 หลัก
                                แล้วกด Enter
                            </p>
                            <form @submit.prevent="submitManualCode" class="manual-form">
                                <input id="manualQrInput" ref="manualInputRef" v-model="manualCode" type="text"
                                    placeholder="เช่น 680112418001 หรือยิง QR ด้วยเครื่องสแกน..." class="manual-input"
                                    :disabled="isProcessing" autocomplete="off" />
                                <button type="submit" class="btn-manual-submit"
                                    :disabled="!manualCode.trim() || isProcessing">
                                    {{ isProcessing ? 'กำลังตรวจสอบ...' : '✅ เช็คชื่อ' }}
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- SCAN RESULT FEEDBACK BANNERS -->
                    <!-- Success Banner -->
                    <div v-if="lastSuccess" class="result-banner result-success">
                        <div class="banner-icon">🎉</div>
                        <div class="banner-content">
                            <h4>เช็คชื่อเข้าร่วมกิจกรรมสำเร็จ!</h4>
                            <p class="stu-info">
                                <strong>{{ lastSuccess.first_name }} {{ lastSuccess.last_name }}</strong>
                                (<code>{{ lastSuccess.student_id }}</code>)
                            </p>
                            <p class="meta-info">
                                {{ lastSuccess.major_name || '-' }} • {{ lastSuccess.faculty_name || '-' }}
                            </p>
                            <div class="hours-summary">
                                <span class="tag-added">+{{ lastSuccess.added_hours }} ชม.</span>
                                <span class="tag-accum">ชั่วโมงสะสมรวม: {{ lastSuccess.new_accumulated_hours }}
                                    ชม.</span>
                            </div>
                        </div>
                    </div>

                    <!-- Error / Warning Banner -->
                    <div v-if="lastError" class="result-banner result-error">
                        <div class="banner-icon">❌</div>
                        <div class="banner-content">
                            <h4>ไม่สามารถบันทึกการเช็คชื่อได้</h4>
                            <p class="error-msg">{{ lastError }}</p>
                        </div>
                    </div>

                    <!-- CHECKED-IN ATTENDEES LIST -->
                    <div class="recent-feed-section">
                        <div class="feed-header">
                            <div>
                                <h5>📋 รายชื่อผู้ที่เช็คชื่อเข้าร่วมกิจกรรมแล้ว ({{ checkedInStudents.length }} คน)</h5>
                                <span v-if="activity?.registered_count" class="feed-sub-count">
                                    จากผู้ลงทะเบียนทั้งหมด {{ activity.registered_count }} คน
                                </span>
                            </div>
                            <button type="button" class="btn-refresh-feed" :disabled="isLoadingList"
                                @click="fetchCheckedInList" title="ดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์">
                                <span :class="{ 'spin-icon': isLoadingList }">🔄</span> {{ isLoadingList ?
                                'กำลังโหลด...' : 'รีเฟรช' }}
                            </button>
                        </div>

                        <div v-if="isLoadingList && checkedInStudents.length === 0" class="feed-loading">
                            <div class="scanner-spinner"></div>
                            <span>กำลังโหลดข้อมูลผู้เช็คชื่อ...</span>
                        </div>

                        <div v-else-if="checkedInStudents.length === 0" class="feed-empty">
                            <span>ยังไม่มีนักศึกษาเช็คชื่อในกิจกรรมนี้ สแกน QR เพื่อเริ่มต้น</span>
                        </div>

                        <div v-else class="feed-list">
                            <div v-for="(item, idx) in checkedInStudents" :key="item.registration_id || item.student_id"
                                class="feed-item">
                                <div class="feed-item-left">
                                    <span class="feed-num">{{ checkedInStudents.length - idx }}</span>
                                    <div>
                                        <div class="feed-name">
                                            <strong>{{ item.first_name }} {{ item.last_name }}</strong>
                                            <code>{{ item.student_id }}</code>
                                        </div>
                                        <div class="feed-sub">{{ item.major_name || item.faculty_name || '-' }}</div>
                                    </div>
                                </div>
                                <div class="feed-item-right">
                                    <span class="feed-time">{{ formatTime(item.check_in_time) }}</span>
                                    <span class="feed-hours">+{{ item.added_hours || activity?.activity_hours || 0 }}
                                        ชม.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="modal-footer">
                    <button type="button" class="btn-done" @click="handleClose">เสร็จสิ้น</button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    activity: {
        type: Object,
        default: null
    },
    userRole: {
        type: String,
        default: ''
    },
    currentUser: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['close', 'checked-in']);

const scannerMode = ref('camera'); // 'camera' | 'manual'
const videoElement = ref(null);
const manualInputRef = ref(null);
const manualCode = ref('');

const cameraLoading = ref(false);
const cameraError = ref('');
const isFrontCamera = ref(false);
let mediaStream = null;
let scanInterval = null;
let barcodeDetector = null;

const isProcessing = ref(false);
const lastSuccess = ref(null);
const lastError = ref('');
const checkedInStudents = ref([]);
const isLoadingList = ref(false);
const scansSinceSync = ref(0);

const fetchCheckedInList = async () => {
    if (!props.activity?.activity_id) {
        checkedInStudents.value = [];
        return;
    }

    isLoadingList.value = true;
    try {
        const params = new URLSearchParams({
            activity_id: String(props.activity.activity_id),
            checked_in_only: '1',
            role: props.userRole || '',
            faculty_id: props.currentUser?.faculty_id ? String(props.currentUser.faculty_id) : ''
        });

        const res = await $fetch(`/api/activities/registrations?${params.toString()}`);
        if (res.success && Array.isArray(res.data)) {
            checkedInStudents.value = res.data;
        }
    } catch (err) {
        console.error('Error fetching checked-in list:', err);
    } finally {
        isLoadingList.value = false;
        scansSinceSync.value = 0;
    }
};

// Anti-spam debounce for camera scan
let lastScannedPayload = '';
let lastScanTimestamp = 0;

const handleClose = () => {
    stopCamera();
    emit('close');
};

const switchMode = (mode) => {
    scannerMode.value = mode;
    if (mode === 'camera') {
        startCamera();
    } else {
        stopCamera();
        nextTick(() => {
            manualInputRef.value?.focus();
        });
    }
};

// Web Audio API Sound Chime
const playSuccessSound = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {
        // Ignore audio failures
    }
};

const playErrorSound = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(164.81, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {
        // Ignore audio failures
    }
};

// Camera Management
const startCamera = async () => {
    stopCamera();
    cameraLoading.value = true;
    cameraError.value = '';

    try {
        if (!navigator?.mediaDevices?.getUserMedia) {
            throw new Error('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง กรุณาใช้โหมดเครื่องยิงบาร์โค้ด');
        }

        const constraints = {
            video: {
                facingMode: isFrontCamera.value ? 'user' : { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoElement.value) {
            videoElement.value.srcObject = mediaStream;
            await videoElement.value.play();
        }

        // Initialize BarcodeDetector if available
        if ('BarcodeDetector' in window) {
            try {
                barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
            } catch (e) {
                barcodeDetector = null;
            }
        }

        startScanningLoop();
    } catch (err) {
        cameraError.value = err.message || 'ไม่สามารถเปิดกล้องได้ โปรดอนุญาตสิทธิ์การเข้าถึงกล้อง';
    } finally {
        cameraLoading.value = false;
    }
};

const stopCamera = () => {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (videoElement.value) {
        videoElement.value.srcObject = null;
    }
};

const flipCamera = () => {
    isFrontCamera.value = !isFrontCamera.value;
    startCamera();
};

const startScanningLoop = () => {
    if (scanInterval) clearInterval(scanInterval);

    scanInterval = setInterval(async () => {
        if (!videoElement.value || videoElement.value.readyState < 2 || isProcessing.value) {
            return;
        }

        if (barcodeDetector) {
            try {
                const barcodes = await barcodeDetector.detect(videoElement.value);
                if (barcodes.length > 0) {
                    const rawVal = barcodes[0].rawValue;
                    handleDetectedCode(rawVal);
                }
            } catch (e) {
                // detector error
            }
        }
    }, 250);
};

const handleDetectedCode = (code) => {
    if (!code) return;
    const now = Date.now();

    // Prevent immediate repeated scanning of the same QR code within 3 seconds
    if (code === lastScannedPayload && now - lastScanTimestamp < 3000) {
        return;
    }

    lastScannedPayload = code;
    lastScanTimestamp = now;

    processCheckIn(code);
};

const submitManualCode = () => {
    if (!manualCode.value.trim() || isProcessing.value) return;
    const code = manualCode.value.trim();
    manualCode.value = '';
    processCheckIn(code);
};

const processCheckIn = async (codeString) => {
    if (!props.activity?.activity_id) return;

    isProcessing.value = true;
    lastSuccess.value = null;
    lastError.value = '';

    try {
        const payload = {
            activity_id: props.activity.activity_id,
            qr_data: codeString,
            operator_role: props.userRole,
            operator_faculty_id: props.currentUser?.faculty_id || null
        };

        const res = await $fetch('/api/activities/check-in', {
            method: 'POST',
            body: payload
        });

        if (res.success && res.data) {
            lastSuccess.value = res.data;
            playSuccessSound();

            // Prepend to checkedInStudents locally without full API roundtrip
            const exists = checkedInStudents.value.some(
                s => s.student_id === res.data.student_id
            );
            if (!exists) {
                checkedInStudents.value.unshift(res.data);
            }

            scansSinceSync.value++;

            // Auto-refresh when 20 scans completed OR when checkedIn reaches registered count
            const regCount = props.activity?.registered_count || 0;
            if (scansSinceSync.value >= 20 || (regCount > 0 && checkedInStudents.value.length >= regCount)) {
                fetchCheckedInList();
            }

            emit('checked-in', res.data);
        }
    } catch (err) {
        const msg = err.data?.statusMessage || err.message || 'เกิดข้อผิดพลาดในการเช็คชื่อ';
        lastError.value = msg;
        playErrorSound();
    } finally {
        isProcessing.value = false;
        // Keep focus on manual input if in manual mode
        if (scannerMode.value === 'manual') {
            nextTick(() => {
                manualInputRef.value?.focus();
            });
        }
    }
};

const formatTime = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';
};

watch(
    () => props.activity?.activity_id,
    (newActId, oldActId) => {
        if (newActId !== oldActId) {
            checkedInStudents.value = [];
            lastSuccess.value = null;
            lastError.value = '';
            scansSinceSync.value = 0;
            if (props.show) {
                fetchCheckedInList();
            }
        }
    }
);

watch(
    () => props.show,
    (val) => {
        if (val) {
            lastSuccess.value = null;
            lastError.value = '';
            manualCode.value = '';
            fetchCheckedInList();
            if (scannerMode.value === 'camera') {
                startCamera();
            } else {
                nextTick(() => manualInputRef.value?.focus());
            }
        } else {
            stopCamera();
        }
    }
);

onBeforeUnmount(() => {
    stopCamera();
});
</script>

<style scoped>
.checkin-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
}

.checkin-modal-card {
    background: #ffffff;
    border-radius: 1.25rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 100%;
    max-width: 640px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: modalPop 0.25s ease-out;
}

@keyframes modalPop {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    background: #f8fafc;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
}

.title-row h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #1e293b;
}

.hours-tag {
    background: #fef3c7;
    color: #b45309;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.2rem 0.65rem;
    border-radius: 9999px;
}

.subtitle-small {
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
}

.btn-close {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 9999px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.btn-close:hover {
    background: #e2e8f0;
    color: #0f172a;
}

.modal-body {
    padding: 1.25rem 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.scanner-tabs {
    display: flex;
    background: #f1f5f9;
    padding: 0.25rem;
    border-radius: 0.75rem;
    gap: 0.25rem;
}

.tab-btn {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.6rem 0.75rem;
    font-size: 0.86rem;
    font-weight: 600;
    color: #64748b;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
}

.tab-btn.active {
    background: #ffffff;
    color: #2563eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.video-container {
    position: relative;
    width: 100%;
    height: 280px;
    background: #090d16;
    border-radius: 1rem;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.scanner-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.scanner-video.mirrored {
    transform: scaleX(-1);
}

.viewfinder-box {
    position: absolute;
    width: 180px;
    height: 180px;
    pointer-events: none;
    box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.45);
}

.corner {
    position: absolute;
    width: 24px;
    height: 24px;
    border-color: #38bdf8;
    border-style: solid;
}

.corner-tl {
    top: 0;
    left: 0;
    border-width: 4px 0 0 4px;
    border-top-left-radius: 8px;
}

.corner-tr {
    top: 0;
    right: 0;
    border-width: 4px 4px 0 0;
    border-top-right-radius: 8px;
}

.corner-bl {
    bottom: 0;
    left: 0;
    border-width: 0 0 4px 4px;
    border-bottom-left-radius: 8px;
}

.corner-br {
    bottom: 0;
    right: 0;
    border-width: 0 4px 4px 0;
    border-bottom-right-radius: 8px;
}

.scan-laser-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #38bdf8, #60a5fa, transparent);
    box-shadow: 0 0 8px #38bdf8;
    animation: laserScan 2s ease-in-out infinite;
}

@keyframes laserScan {

    0%,
    100% {
        top: 4px;
    }

    50% {
        top: calc(100% - 6px);
    }
}

.viewfinder-text {
    position: absolute;
    bottom: -28px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.76rem;
    color: #ffffff;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.camera-status-overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #e2e8f0;
    font-size: 0.9rem;
    padding: 1rem;
    text-align: center;
}

.camera-status-overlay.camera-error {
    color: #fca5a5;
}

.scanner-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.btn-retry-cam {
    background: #3b82f6;
    color: #ffffff;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 0.4rem;
    cursor: pointer;
    font-size: 0.82rem;
}

.camera-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.6rem;
}

.btn-cam-action {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #334155;
    padding: 0.4rem 0.85rem;
    border-radius: 0.5rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cam-action:hover {
    background: #e2e8f0;
}

.cam-hint {
    font-size: 0.76rem;
    color: #64748b;
}

/* Manual Barcode Input */
.input-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.875rem;
    padding: 1.25rem;
}

.input-desc {
    margin: 0.25rem 0 0.75rem;
    font-size: 0.82rem;
    color: #64748b;
}

.manual-form {
    display: flex;
    gap: 0.5rem;
}

.manual-input {
    flex: 1;
    padding: 0.65rem 0.85rem;
    border: 1.5px solid #cbd5e1;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    font-family: monospace;
    transition: all 0.2s;
}

.manual-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.btn-manual-submit {
    background: #2563eb;
    color: #ffffff;
    border: none;
    padding: 0.65rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-manual-submit:hover:not(:disabled) {
    background: #1d4ed8;
}

.btn-manual-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Feedback Banners */
.result-banner {
    display: flex;
    gap: 0.85rem;
    padding: 1rem 1.25rem;
    border-radius: 0.875rem;
    animation: bannerSlide 0.2s ease-out;
}

@keyframes bannerSlide {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.result-success {
    background: #f0fdf4;
    border: 1.5px solid #86efac;
    color: #166534;
}

.result-error {
    background: #fef2f2;
    border: 1.5px solid #fca5a5;
    color: #991b1b;
}

.banner-icon {
    font-size: 2rem;
    line-height: 1;
}

.banner-content h4 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 700;
}

.stu-info {
    margin: 0 0 0.2rem;
    font-size: 0.92rem;
}

.stu-info code {
    background: rgba(0, 0, 0, 0.06);
    padding: 0.15rem 0.35rem;
    border-radius: 0.25rem;
}

.meta-info {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    opacity: 0.85;
}

.hours-summary {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.tag-added {
    background: #22c55e;
    color: #ffffff;
    font-weight: 700;
    font-size: 0.78rem;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
}

.tag-accum {
    background: #dcfce7;
    color: #15803d;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
}

.error-msg {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.4;
}

/* Recent Feed */
.recent-feed-section {
    border-top: 1px solid #f1f5f9;
    padding-top: 1rem;
}

.feed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
}

.feed-header h5 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: #334155;
}

.feed-sub-count {
    display: block;
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 0.1rem;
}

.btn-refresh-feed {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #475569;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.25rem 0.65rem;
    border-radius: 0.375rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    transition: all 0.2s;
}

.btn-refresh-feed:hover:not(:disabled) {
    background: #e2e8f0;
    color: #0f172a;
}

.btn-refresh-feed:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.spin-icon {
    display: inline-block;
    animation: spin 0.8s linear infinite;
}

.feed-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    color: #64748b;
    font-size: 0.82rem;
}

.btn-clear-feed {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 0.76rem;
    cursor: pointer;
}

.btn-clear-feed:hover {
    color: #ef4444;
}

.feed-empty {
    padding: 1.5rem;
    text-align: center;
    color: #94a3b8;
    font-size: 0.82rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    border: 1px dashed #cbd5e1;
}

.feed-list {
    max-height: 180px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.feed-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    border: 1px solid #f1f5f9;
}

.feed-item-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
}

.feed-num {
    font-size: 0.75rem;
    font-weight: 700;
    color: #94a3b8;
    width: 18px;
}

.feed-name {
    font-size: 0.86rem;
    color: #1e293b;
}

.feed-name code {
    font-size: 0.75rem;
    color: #64748b;
    margin-left: 0.35rem;
}

.feed-sub {
    font-size: 0.75rem;
    color: #94a3b8;
}

.feed-item-right {
    text-align: right;
}

.feed-time {
    display: block;
    font-size: 0.75rem;
    color: #64748b;
}

.feed-hours {
    font-size: 0.75rem;
    font-weight: 700;
    color: #16a34a;
}

.modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #f1f5f9;
    background: #f8fafc;
    display: flex;
    justify-content: flex-end;
}

.btn-done {
    background: #2563eb;
    color: #ffffff;
    border: none;
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-done:hover {
    background: #1d4ed8;
}
</style>

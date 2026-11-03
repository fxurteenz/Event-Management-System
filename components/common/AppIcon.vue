<template>
    <svg xmlns="http://www.w3.org/2000/svg" :width="pixelSize" :height="pixelSize" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"
        class="app-icon" :class="customClass" aria-hidden="true">
        <!-- building-library: มหาวิทยาลัย / ตราสถาบัน -->
        <g v-if="name === 'building-library'">
            <path d="m3 9 9-7 9 7v2H3V9zm2 4v6m4-6v6m6-6v6m4-6v6M2 21h20" />
        </g>

        <!-- clipboard-list: จัดการกิจกรรม -->
        <g v-else-if="name === 'clipboard-list'">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect width="6" height="4" x="9" y="3" rx="1" />
            <path d="M9 12h6m-6 4h4" />
        </g>

        <!-- chart-bar: แดชบอร์ด / สถิติ -->
        <g v-else-if="name === 'chart-bar' || name === 'dashboard'">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </g>

        <!-- cog-6-tooth: เมนูผู้ดูแลระบบ -->
        <g v-else-if="name === 'cog-6-tooth' || name === 'settings'">
            <circle cx="12" cy="12" r="3" />
            <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </g>

        <!-- user: โปรไฟล์ / ผู้ใช้งาน -->
        <g v-else-if="name === 'user'">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </g>

        <!-- arrow-right-on-rectangle: ออกจากระบบ -->
        <g v-else-if="name === 'arrow-right-on-rectangle' || name === 'logout'">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
        </g>

        <!-- arrow-left-on-rectangle: เข้าสู่ระบบ -->
        <g v-else-if="name === 'arrow-left-on-rectangle' || name === 'login'">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4m-5-4-5-5 5-5m-5 5h12" />
        </g>

        <!-- calendar: ปฏิทิน / วันที่ -->
        <g v-else-if="name === 'calendar'">
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </g>

        <!-- clock: เวลา / เริ่มต้น / สิ้นสุด -->
        <g v-else-if="name === 'clock'">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </g>

        <!-- sparkles / award: ชั่วโมงกิจกรรม -->
        <g v-else-if="name === 'sparkles' || name === 'star'">
            <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </g>

        <!-- users: จำนวนรับ / ผู้เข้าร่วม -->
        <g v-else-if="name === 'users'">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </g>

        <!-- target: สิทธิ์เข้าร่วม -->
        <g v-else-if="name === 'target'">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </g>

        <!-- globe: ทุกคณะและสาขา -->
        <g v-else-if="name === 'globe'">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" x2="22" y1="12" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </g>

        <!-- building-office: คณะ -->
        <g v-else-if="name === 'building-office'">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <path
                d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
        </g>

        <!-- academic-cap: สาขาวิชา -->
        <g v-else-if="name === 'academic-cap'">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </g>

        <!-- ticket: บัตร / ตั๋ว -->
        <g v-else-if="name === 'ticket'">
            <path
                d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
            <path d="M13 5v2m0 4v2m0 4v2" />
        </g>

        <!-- qr-code: QR Code ประจำกิจกรรม -->
        <g v-else-if="name === 'qr-code'">
            <rect width="5" height="5" x="3" y="3" rx="1" />
            <rect width="5" height="5" x="16" y="3" rx="1" />
            <rect width="5" height="5" x="3" y="16" rx="1" />
            <path d="M21 16h-3a2 2 0 0 0-2 2v3m5 0h.01M12 7v3m-2-3h2m-2 7h.01M16 12h5m-5 4h.01M12 16v5" />
        </g>

        <!-- lock-closed: กิจกรรมบังคับ / รอสโมสรยืนยัน -->
        <g v-else-if="name === 'lock-closed'">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </g>

        <!-- check-circle: ยืนยันแล้ว / สำเร็จ -->
        <g v-else-if="name === 'check-circle'">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </g>

        <!-- badge-check: เข้าร่วมกิจกรรมแล้ว -->
        <g v-else-if="name === 'badge-check'">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            <polyline points="9 12 11 14 15 10" />
        </g>

        <!-- x-circle: ยกเลิก -->
        <g v-else-if="name === 'x-circle'">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" x2="9" y1="9" y2="15" />
            <line x1="9" x2="15" y1="9" y2="15" />
        </g>

        <!-- x-mark: ปิดหน้าต่าง -->
        <g v-else-if="name === 'x-mark'">
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
        </g>

        <!-- pencil-square: ลงทะเบียน -->
        <g v-else-if="name === 'pencil-square'">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </g>

        <!-- no-symbol: เต็มแล้ว / สิทธิ์ไม่ตรง -->
        <g v-else-if="name === 'no-symbol' || name === 'ban'">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" x2="19.07" y1="4.93" y2="19.07" />
        </g>

        <!-- exclamation-triangle: แจ้งเตือน / ผิดพลาด -->
        <g v-else-if="name === 'exclamation-triangle'">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4m0 4h.01" />
        </g>

        <!-- light-bulb: คำแนะนำ -->
        <g v-else-if="name === 'light-bulb'">
            <path d="M9 18h6m-4 4h2M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </g>

        <!-- chevron-left: ซ้าย -->
        <g v-else-if="name === 'chevron-left'">
            <polyline points="15 18 9 12 15 6" />
        </g>

        <!-- chevron-right: ขวา -->
        <g v-else-if="name === 'chevron-right'">
            <polyline points="9 18 15 12 9 6" />
        </g>

        <!-- bars-3: แฮมเบอร์เกอร์เมนูมือถือ -->
        <g v-else-if="name === 'bars-3'">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
        </g>

        <!-- credit-card: บัตรนักศึกษา -->
        <g v-else-if="name === 'credit-card'">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
        </g>

        <!-- arrow-path: รีเฟรช -->
        <g v-else-if="name === 'arrow-path'">
            <path
                d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m0-5v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16m0 5v-5h-5" />
        </g>

        <!-- Fallback icon: circle info -->
        <g v-else>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="16" y2="12" />
            <line x1="12" x2="12.01" y1="8" y2="8" />
        </g>
    </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    name: {
        type: String,
        required: true
    },
    size: {
        type: [Number, String],
        default: 18
    },
    strokeWidth: {
        type: [Number, String],
        default: 1.75
    },
    customClass: {
        type: String,
        default: ''
    }
})

const pixelSize = computed(() => {
    if (typeof props.size === 'number') return `${props.size}px`
    if (props.size.endsWith('px') || props.size.endsWith('rem') || props.size.endsWith('em')) return props.size
    return `${props.size}px`
});
</script>

<style scoped>
.app-icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
}
</style>

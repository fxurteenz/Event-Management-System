<template>
    <header class="navbar">
        <div class="nav-brand-container">
            <div class="nav-brand">
                <div class="logo-wrapper">
                    <AppIcon name="building-library" :size="24" class="logo-icon-svg" />
                </div>
                <div class="brand-text">
                    <h2 class="brand-title">ระบบสารสนเทศเพื่อการจัดการกิจกรรมนักศึกษา</h2>
                    <p class="brand-sub">สโมสรนักศึกษาคณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
                </div>
            </div>

            <!-- Mobile Hamburger Toggle -->
            <button class="mobile-menu-btn" @click="isMobileMenuOpen = !isMobileMenuOpen"
                :aria-expanded="isMobileMenuOpen" aria-label="เมนูหลัก">
                <AppIcon :name="isMobileMenuOpen ? 'x-mark' : 'bars-3'" :size="22" />
            </button>
        </div>

        <!-- Nav Actions: Desktop & Responsive Drawer on Mobile (Floating Overlay) -->
        <nav class="nav-actions" :class="{ 'mobile-open': isMobileMenuOpen }">
            <template v-if="currentUser">
                <!-- ถ้าอยู่ในหน้ากิจกรรม ให้ลิงก์กลับไปปฏิทิน -->
                <NuxtLink v-if="route.path !== '/'" to="/" class="btn-nav btn-org" @click="isMobileMenuOpen = false">
                    <AppIcon name="calendar" :size="16" />
                    <span>ปฏิทินกิจกรรม</span>
                </NuxtLink>
                <!-- ถ้าอยู่ในหน้าแรก ให้ลิงก์ไปจัดการกิจกรรม -->
                <NuxtLink v-else-if="isOrgPresident || isClubPresident" to="/activities" class="btn-nav btn-org"
                    @click="isMobileMenuOpen = false">
                    <AppIcon name="clipboard-list" :size="16" />
                    <span>จัดการกิจกรรม{{ isClubPresident ? ' (สโมสร)' : ' (องค์การ)' }}</span>
                </NuxtLink>

                <NuxtLink v-if="isAdmin" to="/admin" class="btn-nav btn-admin" @click="isMobileMenuOpen = false">
                    <AppIcon name="cog-6-tooth" :size="16" />
                    <span>เมนูผู้ดูแลระบบ</span>
                </NuxtLink>

                <div class="user-chip">
                    <AppIcon name="user" :size="15" class="user-icon" />
                    <span class="user-name">{{ currentUser.username }}</span>
                    <span class="user-role-badge">({{ currentUser.role }})</span>
                </div>

                <button @click="handleLogout" class="btn-logout" title="ออกจากระบบ">
                    <AppIcon name="arrow-right-on-rectangle" :size="16" />
                    <span>ออกจากระบบ</span>
                </button>
            </template>
            <template v-else>
                <NuxtLink to="/login" class="btn-login" @click="isMobileMenuOpen = false">
                    <AppIcon name="arrow-left-on-rectangle" :size="16" />
                    <span>เข้าสู่ระบบ (Login)</span>
                </NuxtLink>
            </template>
        </nav>
    </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '~/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const authCookie = useCookie('auth_user')

const currentUser = computed(() => authCookie.value || null)
const userRole = computed(() => (currentUser.value?.role || '').toLowerCase())

const isOrgPresident = computed(() => userRole.value === 'org_president' || userRole.value === 'admin')
const isClubPresident = computed(() => userRole.value === 'club_president')
const isAdmin = computed(() => userRole.value === 'admin')

const isMobileMenuOpen = ref(false)

const handleLogout = () => {
    authCookie.value = null
    isMobileMenuOpen.value = false
    router.push('/login')
}
</script>

<style scoped>
/* Navbar: BRU Royal Purple & Gold (Always 100% Full Width) */
.navbar {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #ffffff;
    border-bottom: 2px solid var(--bru-gold-400, #facc15);
    box-shadow: 0 2px 10px rgba(107, 33, 168, 0.06);
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
}

.nav-brand-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    gap: 0.75rem;
}

.nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
}

.logo-wrapper {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--bru-purple-800, #581c87) 0%, var(--bru-purple-600, #7e22ce) 100%);
    border: 2px solid var(--bru-gold-400, #facc15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
}

.logo-icon-svg {
    color: var(--bru-gold-200, #fef08a);
}

.brand-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.brand-title {
    margin: 0;
    font-size: 1.12rem;
    font-weight: 700;
    color: var(--bru-purple-900, #3b0764);
    font-family: var(--font-heading, sans-serif);
    line-height: 1.25;
    word-break: break-word;
    overflow-wrap: break-word;
}

.brand-sub {
    margin: 0.15rem 0 0;
    font-size: 0.78rem;
    color: #64748b;
    font-family: var(--font-body, sans-serif);
    word-break: break-word;
    overflow-wrap: break-word;
}

/* Mobile Hamburger Button */
.mobile-menu-btn {
    display: none;
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 6px;
    transition: background-color 0.2s, color 0.2s;
}

.mobile-menu-btn:hover {
    background: var(--bru-purple-50, #faf5ff);
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.btn-nav,
.btn-login,
.btn-logout {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 1rem;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: var(--font-heading, sans-serif);
}

.btn-nav {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
}

.btn-nav:hover {
    background: #e2e8f0;
    color: #1e293b;
    border-color: #cbd5e1;
}

.btn-org {
    background: var(--bru-purple-50, #faf5ff);
    color: var(--bru-purple-700, #6b21a8);
    border: 1px solid var(--bru-purple-200, #e9d5ff);
}

.btn-org:hover {
    background: var(--bru-purple-100, #f3e8ff);
    color: var(--bru-purple-800, #581c87);
}

.btn-admin {
    background: var(--bru-gold-50, #fffbeb);
    color: var(--bru-gold-700, #a16207);
    border: 1px solid var(--bru-gold-200, #fef08a);
}

.btn-admin:hover {
    background: var(--bru-gold-100, #fef9c3);
    color: var(--bru-gold-800, #854d0e);
}

.user-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 1rem;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 9999px;
    font-size: 0.82rem;
    color: #334155;
    font-family: var(--font-heading, sans-serif);
}

.user-icon {
    color: var(--bru-purple-600, #7e22ce);
}

.user-name {
    font-weight: 700;
}

.user-role-badge {
    color: #64748b;
    font-size: 0.75rem;
}

.btn-logout {
    background: transparent;
    color: #dc2626;
    border: 1px solid transparent;
}

.btn-logout:hover {
    background: #fee2e2;
    color: #b91c1c;
}

.btn-login {
    background: var(--bru-purple-600, #7e22ce);
    color: white;
    border: 1px solid var(--bru-purple-700, #6b21a8);
    box-shadow: 0 2px 4px rgba(126, 34, 206, 0.2);
}

.btn-login:hover {
    background: var(--bru-purple-700, #6b21a8);
    box-shadow: 0 4px 6px rgba(126, 34, 206, 0.3);
}

@media (max-width: 1024px) {
    .navbar {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        padding: 0.75rem 1.25rem;
        flex-direction: column;
        align-items: stretch;
    }

    .nav-brand-container {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        min-width: 0;
    }

    .nav-brand {
        flex: 1;
        min-width: 0;
    }

    .brand-title {
        font-size: 1rem;
    }

    .brand-sub {
        font-size: 0.74rem;
    }

    .mobile-menu-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    /* Collapsible Navigation on Tablet & Mobile (Floating Overlay) */
    .nav-actions {
        display: none;
        flex-direction: column;
        align-items: stretch;
        gap: 0.65rem;
        padding: 1rem 1.25rem;
        width: 100%;
        box-sizing: border-box;
        position: absolute;
        top: 100%; /* Float below the navbar */
        left: 0;
        background: #ffffff;
        border-bottom: 2px solid var(--bru-gold-400, #facc15);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(107, 33, 168, 0.1);
        z-index: 40;
    }

    .nav-actions.mobile-open {
        display: flex;
    }

    .btn-nav,
    .btn-login,
    .btn-logout,
    .user-chip {
        justify-content: center;
        width: 100%;
        box-sizing: border-box;
        padding: 0.6rem 1rem;
    }
}

@media (max-width: 640px) {
    .navbar {
        padding: 0.65rem 0.85rem;
    }

    .logo-wrapper {
        width: 36px;
        height: 36px;
    }

    .brand-title {
        font-size: 0.88rem;
        line-height: 1.2;
    }

    .brand-sub {
        font-size: 0.68rem;
        line-height: 1.2;
    }
}
</style>

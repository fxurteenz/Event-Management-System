<!-- app.vue -->
<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>

<style>
:root {
    /* BRU Theme Colors (ม่วง - เหลืองทอง - ขาว) */
    --bru-purple-900: #3b0764;
    --bru-purple-800: #581c87;
    --bru-purple-700: #6b21a8;
    --bru-purple-600: #7e22ce;
    --bru-purple-500: #9333ea;
    --bru-purple-200: #e9d5ff;
    --bru-purple-100: #f3e8ff;
    --bru-purple-50: #faf5ff;

    --bru-gold-700: #a16207;
    --bru-gold-600: #ca8a04;
    --bru-gold-500: #eab308;
    --bru-gold-400: #facc15;
    --bru-gold-200: #fef08a;
    --bru-gold-100: #fef9c3;
    --bru-gold-50: #fffbeb;

    /* Fonts: ส่วนหัวแบบไม่มีหัว (Prompt), เนื้อหาทั่วไปแบบมีหัว (Sarabun) */
    --font-heading: 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-body: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

*,
*::before,
*::after {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    font-family: var(--font-body);
    background-color: #f8fafc;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

h1,
h2,
h3,
h4,
h5,
h6,
.font-heading {
    font-family: var(--font-heading);
    letter-spacing: -0.01em;
}

button,
input,
select,
textarea {
    font-family: inherit;
}
</style>
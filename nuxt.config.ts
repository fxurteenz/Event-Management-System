// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    app: {
        head: {
            title: "ระบบสารสนเทศเพื่อการจัดการกิจกรรมนักศึกษา - มรภ.บุรีรัมย์",
            meta: [
                { charset: "utf-8" },
                {
                    name: "viewport",
                    content:
                        "width=device-width, initial-scale=1, viewport-fit=cover",
                },
                {
                    name: "description",
                    content:
                        "ระบบสารสนเทศเพื่อการจัดการกิจกรรมนักศึกษา สโมสรนักศึกษาคณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์",
                },
            ],
            link: [
                { rel: "preconnect", href: "https://fonts.googleapis.com" },
                {
                    rel: "preconnect",
                    href: "https://fonts.gstatic.com",
                    crossorigin: "",
                },
                {
                    rel: "stylesheet",
                    href: "https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap",
                },
            ],
        },
    },
    vite: {
        server: {
            watch: {
                usePolling: true,
            },
        },
    },
    nitro: {
        devServer: {
            watch: ["server"],
        },
    },
});

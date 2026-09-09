/**
 * generate-qr.js — Genera imágenes QR con estilo
 * (bordes redondeados y logo central) usando qr-code-styling.
 *
 * Pipeline:
 *   1. qr-code-styling genera el QR como SVG.
 *   2. sharp rasteriza el SVG a PNG.
 *   3. sharp compone el logo centrado.
 *
 * Uso:
 *   npm run qr:generate
 *   node scripts/generate-qr.js
 */

const path = require('path');
const fs = require('fs');

const {
    QRCodeStyling,
} = require('qr-code-styling/lib/qr-code-styling.common.js');

const { JSDOM } = require('jsdom');
const sharp = require('sharp');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
    // URL que codifica el QR
    data: 'https://www.redepor.com/',

    // ── Seguimiento (tracking) ────────────────────────────────────────────────
    tracking: {
        source: 'QR',
        campaignId: 'newijfnue8hfe',
        promo: 'BIENVENIDO10XA',
    },
    width: 1024,
    height: 1024,
    includeLogo: true,
    logo: path.join(__dirname,'../../APP_BOOKING/assets/booking_sport.png'),
    output: path.join(__dirname,'../../FRONTEND_BOOKING/src/assets/imgs/qr_redepor.png'),
    margin: 24,
    errorCorrectionLevel: 'H',
    dotsOptions: {type: 'rounded',color: '#000000',},
    cornersSquareOptions: {type: 'extra-rounded',color: '#000000',},
    cornersDotOptions: { type: 'dot', color: '#000000', },
    backgroundOptions: { color: '#ffffff', },

    // ── Logo central ──────────────────────────────────────────────────────────
    logoOptions: {
        imageSize: 0.25,
        background: '#ffffff',
        margin: 24,
        borderRadius: 16,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERAR QR
// ─────────────────────────────────────────────────────────────────────────────

async function generateQR() {
    try {
        const outputDir = path.dirname(CONFIG.output);
        if (!fs.existsSync(outputDir)) { fs.mkdirSync(outputDir, { recursive: true, }); }

        const { source, campaignId, promo, } = CONFIG.tracking || {};

        const url = new URL(CONFIG.data);

        if (source) {
            url.searchParams.set('source_from',`${source}-${campaignId || ''}`);
        }

        if (promo) { url.searchParams.set('promo', promo); }

        const finalData = url.toString();

        // ─────────────────────────────────────────────────────────────────────
        // 1. GENERAR QR COMO SVG
        // ─────────────────────────────────────────────────────────────────────

        const qrCode = new QRCodeStyling({
            jsdom: JSDOM,
            type: 'svg',
            width: CONFIG.width,
            height: CONFIG.height,
            data: finalData,
            margin: CONFIG.margin,
            qrOptions: { errorCorrectionLevel: CONFIG.errorCorrectionLevel, },
            dotsOptions: CONFIG.dotsOptions,
            cornersSquareOptions: CONFIG.cornersSquareOptions,
            cornersDotOptions: CONFIG.cornersDotOptions,
            backgroundOptions: CONFIG.backgroundOptions,
        });

        const svg = await qrCode.getRawData('svg');

        // ─────────────────────────────────────────────────────────────────────
        // 2. CONVERTIR SVG → PNG
        // ─────────────────────────────────────────────────────────────────────

        const basePng = await sharp(svg).png().toBuffer();
        let finalPng = basePng;
        let logoInfo = 'sin logo';

        if (CONFIG.includeLogo) {
            const {
                imageSize,
                background,
                margin,
                borderRadius,
            } = CONFIG.logoOptions;

            const logoRaw = await sharp(CONFIG.logo).metadata();
            const logoMaxW = Math.round(CONFIG.width * imageSize);
            const logoMaxH = Math.round(CONFIG.height * imageSize);
            const scale = Math.min(
                logoMaxW / logoRaw.width,
                logoMaxH / logoRaw.height
            );

            const logoW = Math.round(logoRaw.width * scale);

            const logoH = Math.round(logoRaw.height * scale);

            const plateW = logoW + margin * 2;
            const plateH = logoH + margin * 2;

            const plateSvg = Buffer.from(`
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="${plateW}"
                    height="${plateH}"
                >
                    <rect
                        x="0"
                        y="0"
                        width="${plateW}"
                        height="${plateH}"
                        rx="${borderRadius}"
                        ry="${borderRadius}"
                        fill="${background}"
                    />
                </svg>
            `);

            const plate = await sharp(plateSvg).png().toBuffer();
            const logoResized = await sharp(CONFIG.logo).resize(logoW, logoH).png().toBuffer();
            const plateLogo = await sharp(plate).composite([{input: logoResized,gravity: 'center',},]).png().toBuffer();
            finalPng = await sharp(basePng).composite([{input: plateLogo,gravity: 'center',},]).png().toBuffer();
            logoInfo = `${logoW}x${logoH}px sobre plato de ` + `${plateW}x${plateH}px`;
        }

        // ─────────────────────────────────────────────────────────────────────
        // 4. GUARDAR PNG
        // ─────────────────────────────────────────────────────────────────────

        fs.writeFileSync(CONFIG.output,finalPng);
        console.log(`✅ QR generado: ${CONFIG.output}`);
        console.log(`   datos: ${finalData}`);
        console.log(`   tamaño: ${CONFIG.width}x${CONFIG.height}`);
        console.log(`   puntos: ${CONFIG.dotsOptions.type}`);
        console.log(`   esquinas: ${CONFIG.cornersSquareOptions.type}`);
        console.log(`   centro esquinas: ${CONFIG.cornersDotOptions.type}`);
        console.log(`   logo: ${logoInfo}`);

    } catch (err) {
        console.error('❌ Error generando el QR:',err);
        process.exit(1);
    }
}

generateQR();
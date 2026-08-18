// ==UserScript==
// @name         TikTok Tool - Full Menu Panel
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Menu điều khiển TikTok - Auto View/Like, Anti-Report, Ẩn danh
// @author       palofsc
// @match        https://www.tiktok.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    //  1. CẤU HÌNH MẶC ĐỊNH
    // ============================================================
    const CONFIG = {
        AUTO_LIKE: true,
        AUTO_VIEW: true,
        VIEW_DURATION: 7000,
        SCROLL_DELAY: 2500,
        MAX_VIDEOS: 30,
        RANDOM_DELAY: true,
        BLOCK_REPORT: true,
        BLOCK_SHARE: true,
        BLOCK_COMMENT: true,
        ANONYMOUS_MODE: true
    };

    // ============================================================
    //  2. CHẶN BÁO CÁO + LOG
    // ============================================================
    function blockReports() {
        if (!CONFIG.BLOCK_REPORT) return;
        const origFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string') {
                if (url.includes('/report/') || url.includes('/abuse/') || url.includes('/feedback/')) {
                    console.log('[🛡️] Blocked report:', url);
                    return Promise.resolve(new Response('{"status":"blocked"}', {status: 200}));
                }
                if (CONFIG.BLOCK_COMMENT && url.includes('/comment/')) {
                    console.log('[🛡️] Blocked comment:', url);
                    return Promise.resolve(new Response('{"status":"blocked"}', {status: 200}));
                }
                if (CONFIG.BLOCK_SHARE && url.includes('/share/')) {
                    console.log('[🛡️] Blocked share:', url);
                    return Promise.resolve(new Response('{"status":"blocked"}', {status: 200}));
                }
            }
            return origFetch.call(this, url, options);
        };

        const origXHR = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (typeof url === 'string') {
                if (url.includes('/report/') || url.includes('/abuse/') || url.includes('/feedback/')) {
                    console.log('[🛡️] Blocked XHR report:', url);
                    this.abort(); return;
                }
                if (CONFIG.BLOCK_COMMENT && url.includes('/comment/')) {
                    console.log('[🛡️] Blocked XHR comment:', url);
                    this.abort(); return;
                }
                if (CONFIG.BLOCK_SHARE && url.includes('/share/')) {
                    console.log('[🛡️] Blocked XHR share:', url);
                    this.abort(); return;
                }
            }
            return origXHR.call(this, method, url, ...args);
        };
        console.log('[🛡️] Anti-Report active');
    }

    function blockAnalytics() {
        const origSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function(url, data) {
            if (typeof url === 'string' && url.includes('analytics')) {
                console.log('[🛡️] Blocked analytics:', url);
                return true;
            }
            return origSendBeacon.call(this, url, data);
        };
        const origAddEvent = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (['scroll','click','mousemove','touchstart'].includes(type)) {
                if (listener.toString().includes('scrollToNext') || 
                    listener.toString().includes('processVideo')) {
                    return origAddEvent.call(this, type, listener, options);
                }
                return;
            }
            return origAddEvent.call(this, type, listener, options);
        };
        console.log('[🛡️] Analytics blocked');
    }

    function clearTrackingCookies() {
        if (!CONFIG.ANONYMOUS_MODE) return;
        try {
            document.cookie.split(';').forEach(c => {
                const name = c.split('=')[0].trim();
                if (name.includes('session') || name.includes('user') || 
                    name.includes('track') || name.includes('id')) {
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.tiktok.com';
                }
            });
            ['session','user_id','tracking','visitor','device'].forEach(k => {
                localStorage.removeItem(k);
                sessionStorage.removeItem(k);
            });
            console.log('[🛡️] Tracking cookies cleared');
        } catch(e) {}
    }

    // ============================================================
    //  3. LOGIC BOT
    // ============================================================
    function randomDelay(base) {
        if (!CONFIG.RANDOM_DELAY) return base;
        return base + Math.floor(Math.random() * 2000) - 1000;
    }

    function findLikeButton() {
        const selectors = [
            'button[data-e2e="like"]',
            'button[class*="LikeButton"]',
            'div[class*="DivLikeButton"] button',
            'span[data-e2e="like-icon"]'
        ];
        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) return btn.closest('button') || btn;
        }
        return null;
    }

    function likeVideo() {
        const btn = findLikeButton();
        if (!btn) return false;
        if (btn.classList.contains('active') || btn.classList.contains('liked')) return true;
        btn.click();
        console.log('[❤️] Liked');
        return true;
    }

    function scrollToNext() {
        window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
    }

    function isVideoPlaying() {
        return document.querySelectorAll('video').some(v => !v.paused && v.currentTime > 0);
    }

    let botRunning = false;
    let botTimer = null;

    function processVideo() {
        setTimeout(() => { if (CONFIG.AUTO_LIKE) likeVideo(); }, randomDelay(800));
        setTimeout(() => { if (CONFIG.AUTO_VIEW) scrollToNext(); }, randomDelay(CONFIG.VIEW_DURATION));
    }

    function startBot() {
        if (botRunning) return;
        botRunning = true;
        console.log('[▶️] Bot started');
        let processed = 0;

        function loop() {
            if (!botRunning || processed >= CONFIG.MAX_VIDEOS) {
                if (!botRunning) console.log('[⏹️] Bot stopped by user');
                else console.log(`[✅] Done ${processed} videos`);
                updateStatus(botRunning ? '⏹️ DONE' : '⏹️ STOPPED');
                return;
            }
            if (!isVideoPlaying()) {
                scrollToNext();
                setTimeout(loop, randomDelay(2000));
                return;
            }
            processed++;
            processVideo();
            setTimeout(loop, randomDelay(CONFIG.VIEW_DURATION + CONFIG.SCROLL_DELAY));
        }
        setTimeout(loop, 3000);
        updateStatus('▶️ RUNNING');
    }

    function stopBot() {
        botRunning = false;
        if (botTimer) clearTimeout(botTimer);
        updateStatus('⏹️ STOPPED');
        console.log('[⏹️] Bot stopped');
    }

    // ============================================================
    //  4. MENU CHÍNH (HIỆN KHI VÀO TIKTOK)
    // ============================================================
    function createMenu() {
        // Xóa menu cũ nếu có
        const old = document.getElementById('tiktokToolMenu');
        if (old) old.remove();

        const menu = document.createElement('div');
        menu.id = 'tiktokToolMenu';
        menu.style.cssText = `
            position: fixed; top: 70px; right: 15px; z-index: 999999;
            background: #0d0d0d; color: #eee; padding: 18px 16px; border-radius: 16px;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 13px; min-width: 200px;
            border: 1px solid #2a2a2a; box-shadow: 0 8px 32px rgba(0,0,0,0.8);
            backdrop-filter: blur(12px); user-select: none;
        `;

        menu.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #222;padding-bottom:8px;">
                <span style="font-weight:700;font-size:15px;color:#00f0ff;">🎵 TikTok Tool</span>
                <span id="menuStatus" style="font-size:11px;color:#00ff88;">● IDLE</span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
                <button id="btnStart" style="background:#00c8a0;color:#000;border:none;padding:7px;border-radius:8px;font-weight:600;cursor:pointer;">▶ START</button>
                <button id="btnStop" style="background:#cc3344;color:#fff;border:none;padding:7px;border-radius:8px;font-weight:600;cursor:pointer;">⏹ STOP</button>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                <span style="background:#1a1a1a;padding:2px 10px;border-radius:12px;font-size:11px;color:#888;">🔒 No Report</span>
                <span style="background:#1a1a1a;padding:2px 10px;border-radius:12px;font-size:11px;color:#888;">🕵️ Anonymous</span>
                <span style="background:#1a1a1a;padding:2px 10px;border-radius:12px;font-size:11px;color:#888;">❤️ Auto Like</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#666;border-top:1px solid #1a1a1a;padding-top:8px;">
                <div style="display:flex;justify-content:space-between;"><span>View duration</span><span style="color:#aaa;">${CONFIG.VIEW_DURATION}ms</span></div>
                <div style="display:flex;justify-content:space-between;"><span>Max videos</span><span style="color:#aaa;">${CONFIG.MAX_VIDEOS}</span></div>
                <div style="display:flex;justify-content:space-between;"><span>Auto Like</span><span style="color:#00ff88;">${CONFIG.AUTO_LIKE ? 'ON' : 'OFF'}</span></div>
            </div>

            <div style="margin-top:8px;font-size:10px;color:#444;text-align:center;border-top:1px solid #1a1a1a;padding-top:6px;">
                F1 Start · F2 Stop
            </div>
        `;

        document.body.appendChild(menu);

        // Gán sự kiện
        document.getElementById('btnStart').addEventListener('click', function() {
            // Kích hoạt bảo vệ
            blockReports();
            blockAnalytics();
            clearTrackingCookies();
            startBot();
        });

        document.getElementById('btnStop').addEventListener('click', stopBot);
    }

    function updateStatus(text) {
        const el = document.getElementById('menuStatus');
        if (el) el.textContent = text;
    }

    // ============================================================
    //  5. PHÍM TẮT
    // ============================================================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F1') {
            e.preventDefault();
            blockReports(); blockAnalytics(); clearTrackingCookies();
            startBot();
        }
        if (e.key === 'F2') {
            e.preventDefault();
            stopBot();
        }
    });

    // ============================================================
    //  6. KHỞI TẠO - TỰ ĐỘNG HIỆN MENU KHI VÀO TIKTOK
    // ============================================================
    function init() {
        // Chờ trang load xong
        if (document.readyState === 'complete') {
            setTimeout(createMenu, 1500);
        } else {
            window.addEventListener('load', function() {
                setTimeout(createMenu, 1500);
            });
        }
        console.log('[✅] TikTok Tool Menu loaded - Press F1/F2');
    }

    init();

})();

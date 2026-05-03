Module.register("MMM-Gemini", {
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.width = this.config.szerokosc;
        wrapper.style.height = this.config.wysokosc;

        // --- 1. CSS DLA PŁYNNEGO SCROLLOWANIA TEKSTU ---
        if (!document.getElementById("gemini-scroll-styles")) {
            var style = document.createElement("style");
            style.id = "gemini-scroll-styles";
            style.innerHTML = `
                @keyframes scrollTextUp {
                    0% { transform: translateY(100%); }
                    100% { transform: translateY(-100%); }
                }
                .scrolling-text {
                    animation-name: scrollTextUp;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
            `;
            document.head.appendChild(style);
        }

        // --- 2. KONTENER OGRANICZAJĄCY TEKST (Rozwiązuje problem włażenia na pole wpisywania) ---
        var textContainer = document.createElement("div");
        textContainer.style.position = "absolute";
        textContainer.style.top = "0";
        textContainer.style.left = "0";
        textContainer.style.width = "100%";
        textContainer.style.height = "calc(100% - 250px)"; // Zmień 250px, jeśli chcesz uciąć wyżej/niżej
        textContainer.style.overflow = "hidden"; 
        textContainer.style.zIndex = "10";
        textContainer.style.pointerEvents = "none";
        // Efekt mgły (fade) na krawędziach tekstu
        textContainer.style.webkitMaskImage = "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)";
        textContainer.style.maskImage = "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)";

        var textDisplay = document.createElement("div");
        textDisplay.id = "gemini-text-display";
        textDisplay.className = "medium bright";
        textDisplay.innerHTML = "Powiedz 'action', aby zapytać...";
        
        textDisplay.style.position = "absolute";
        textDisplay.style.width = "100%";
        textDisplay.style.textAlign = "center";
        
        textContainer.appendChild(textDisplay);

        // --- 3. WEBVIEW I JEGO MASKA ---
        var webview = document.createElement("webview");
        webview.src = this.config.url;
        webview.style.width = "100%";
        webview.style.height = "100%";
        webview.style.border = "none";

        webview.style.webkitMaskImage = "linear-gradient(to top, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 200px, rgba(0,0,0,0) 200px, rgba(0,0,0,0) 100%)";
        webview.style.maskImage = "linear-gradient(to top, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 200px, rgba(0,0,0,0) 200px, rgba(0,0,0,0) 100%)";

        webview.style.position = "absolute";
        webview.style.top = "0";
        webview.style.left = "0";
        webview.style.zIndex = "1";

        // --- 4. LOGIKA SCROLLOWANIA I WYSYŁANIA DO PYTHONA ---
        webview.addEventListener("console-message", function(e) {
            if (e.message && e.message.startsWith("TTS_SEND:")) {
                let textToRead = e.message.substring(9);
                Log.info("Host MagicMirror odebrał tekst z czatu. Wysyłam do Pythona: " + textToRead);

                let displayEl = document.getElementById("gemini-text-display");
                displayEl.innerHTML = textToRead;

                // Reset animacji
                displayEl.classList.remove("scrolling-text");
                void displayEl.offsetWidth; 

                // Kalkulacja prędkości scrollowania
                if (textToRead.length > 50) {
                    let animationTime = Math.max(12, textToRead.length / 12); 
                    displayEl.style.animationDuration = animationTime + "s";
                    displayEl.classList.add("scrolling-text");
                    displayEl.style.top = "auto"; 
                } else {
                    displayEl.style.top = "50%";
                    displayEl.style.transform = "translateY(-50%)";
                }

                // Wysłanie do Pythona (Flask)
                fetch('http://127.0.0.1:5000/speak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: textToRead })
                }).catch(err => console.error("Błąd połączenia z Pythonem:", err));
            }
        });

        // --- 5. OPCJA ATOMOWA (DARK MODE) I OBSERVER ---
        webview.addEventListener("dom-ready", function() {
            Log.info("Strona czatu załadowana. Wstrzykuję Invert CSS i Observera!");

            const darkModeCSS = `
                /* Odwrócenie całości */
                html { 
                    filter: invert(1) hue-rotate(180deg) !important; 
                    background-color: white !important; 
                }
                /* Zapobieganie podwójnemu odwróceniu obrazków i ikon */
                img, picture, video, iframe, canvas, svg { 
                    filter: invert(1) hue-rotate(180deg) !important; 
                }
                /* Ukrycie paska przewijania */
                ::-webkit-scrollbar { 
                    display: none !important; 
                }
            `;
            webview.insertCSS(darkModeCSS);

            const injectionCode = `
                const CHAT_BUBBLE_CLASS = '.model-response-text';
                const WAIT_TIME_MS = 2000;

                const targetNode = document.body;
                const config = { childList: true, subtree: true, characterData: true };

                let typingTimer;
                let lastSpokenText = "";

                const callback = function(mutationsList, observer) {
                    for(let mutation of mutationsList) {
                        let bubbles = document.querySelectorAll(CHAT_BUBBLE_CLASS);
                        if (bubbles.length === 0) continue;

                        let latestBubble = bubbles[bubbles.length - 1];

                        clearTimeout(typingTimer);

                        typingTimer = setTimeout(() => {
                            let textToRead = latestBubble.innerText || latestBubble.textContent;

                            if (textToRead && textToRead !== lastSpokenText) {
                                lastSpokenText = textToRead;
                                console.log("TTS_SEND:" + textToRead);
                            }
                        }, WAIT_TIME_MS);
                    }
                };

                const observer = new MutationObserver(callback);
                observer.observe(targetNode, config);
            `;

            webview.executeJavaScript(injectionCode);
        });

        wrapper.appendChild(webview);
        wrapper.appendChild(textContainer);
        return wrapper;
    }
});

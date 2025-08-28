// ===== VARIÁVEIS GLOBAIS =====
let currentZoom = 100;
const minZoom = 50;
const maxZoom = 200;
const zoomStep = 10;

// Variáveis de TTS e Fala
let isSpeaking = false;
let isTyping = false;
let speechSynthesis = window.speechSynthesis;
let currentVoice = null;
let isMuted = false;
let volume = 0.7;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    initializeTTS();
    checkAIStatus();
    updateInitialSpeech();
});

// ===== INICIALIZAÇÃO DA APLICAÇÃO =====
function initializeApp() {
    console.log('🤖 Assistente IA Web v2.1 iniciado');
    
    // Focar no campo de entrada
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.focus();
    }
    
    // Configurar altura automática do textarea
    setupAutoResize();
    
    // Inicializar zoom
    updateZoomDisplay();
    
    // Carregar preferências
    loadUserPreferences();
    
    console.log('✅ Aplicação inicializada com sucesso');
}

// ===== CONFIGURAÇÃO DE EVENT LISTENERS =====
function setupEventListeners() {
    // Botão de envio
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Campo de entrada - Enter para enviar
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Contador de caracteres
        userInput.addEventListener('input', updateCharCounter);
    }
    
    // Botões de zoom
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetZoom);
    
    // Controles de áudio
    const muteToggle = document.getElementById('mute-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    
    if (muteToggle) {
        muteToggle.addEventListener('click', toggleMute);
    }
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function() {
            volume = this.value / 100;
            updateVolumeDisplay();
            saveUserPreferences();
        });
    }
    
    // Botões de sugestão
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');
    suggestionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.getAttribute('data-text');
            if (text && userInput) {
                userInput.value = text;
                userInput.focus();
                updateCharCounter();
                // Auto-resize do textarea
                userInput.style.height = 'auto';
                userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
            }
        });
    });
    
    // Atalhos de teclado
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Plus para zoom in
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoomIn();
        }
        // Ctrl/Cmd + Minus para zoom out
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoomOut();
        }
        // Ctrl/Cmd + 0 para reset zoom
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            resetZoom();
        }
        // Espaço para parar/iniciar fala
        if (e.key === ' ' && e.ctrlKey) {
            e.preventDefault();
            if (isSpeaking) {
                stopSpeaking();
            }
        }
    });
}

// ===== INICIALIZAÇÃO DO TTS =====
function initializeTTS() {
    if ('speechSynthesis' in window) {
        // Aguardar carregamento das vozes
        speechSynthesis.onvoiceschanged = function() {
            const voices = speechSynthesis.getVoices();
            // Procurar por voz em português brasileiro
            currentVoice = voices.find(voice => 
                voice.lang.includes('pt-BR') || 
                voice.lang.includes('pt')
            ) || voices[0];
            
            console.log('🔊 TTS inicializado com voz:', currentVoice?.name || 'Padrão');
            updateTTSStatus('TTS: Pronto');
        };
        
        // Forçar carregamento das vozes
        speechSynthesis.getVoices();
    } else {
        console.warn('⚠️ TTS não suportado neste navegador');
        updateTTSStatus('TTS: Não suportado');
    }
}

// ===== FUNCIONALIDADES DE ZOOM =====
function zoomIn() {
    if (currentZoom < maxZoom) {
        currentZoom += zoomStep;
        applyZoom();
        updateZoomDisplay();
        showZoomFeedback('Zoom aumentado');
    }
}

function zoomOut() {
    if (currentZoom > minZoom) {
        currentZoom -= zoomStep;
        applyZoom();
        updateZoomDisplay();
        showZoomFeedback('Zoom diminuído');
    }
}

function resetZoom() {
    currentZoom = 100;
    applyZoom();
    updateZoomDisplay();
    showZoomFeedback('Zoom resetado');
}

function applyZoom() {
    const zoomFactor = currentZoom / 100;
    document.documentElement.style.setProperty('--zoom-factor', zoomFactor);
    saveUserPreferences();
}

function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = `${currentZoom}%`;
    }
    
    // Atualizar estado dos botões
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    
    if (zoomInBtn) {
        zoomInBtn.disabled = currentZoom >= maxZoom;
    }
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentZoom <= minZoom;
    }
}

function showZoomFeedback(message) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        font-size: 14px;
        z-index: 1000;
        animation: fadeInOut 2s ease;
        pointer-events: none;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, 2000);
}

// ===== FUNCIONALIDADES DE TTS E FALA =====
function speak(text) {
    if (!text || isMuted || !speechSynthesis) return;
    
    // Parar qualquer fala anterior
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurar voz e parâmetros
    if (currentVoice) {
        utterance.voice = currentVoice;
    }
    utterance.volume = volume;
    utterance.rate = 0.9; // Velocidade um pouco mais lenta
    utterance.pitch = 1.0;
    
    // Event listeners
    utterance.onstart = function() {
        isSpeaking = true;
        startSpeakingAnimation();
        updateTTSStatus('TTS: Falando');
    };
    
    utterance.onend = function() {
        isSpeaking = false;
        stopSpeakingAnimation();
        updateTTSStatus('TTS: Pronto');
    };
    
    utterance.onerror = function(event) {
        console.error('Erro no TTS:', event.error);
        isSpeaking = false;
        stopSpeakingAnimation();
        updateTTSStatus('TTS: Erro');
    };
    
    // Iniciar fala
    speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
        isSpeaking = false;
        stopSpeakingAnimation();
        updateTTSStatus('TTS: Pronto');
    }
}

function startSpeakingAnimation() {
    const avatar = document.getElementById('speaking-avatar');
    const indicator = document.getElementById('speaking-indicator');
    
    if (avatar) {
        avatar.classList.add('speaking');
    }
    if (indicator) {
        indicator.classList.add('active');
    }
}

function stopSpeakingAnimation() {
    const avatar = document.getElementById('speaking-avatar');
    const indicator = document.getElementById('speaking-indicator');
    
    if (avatar) {
        avatar.classList.remove('speaking');
    }
    if (indicator) {
        indicator.classList.remove('active');
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const muteBtn = document.getElementById('mute-toggle');
    const audioIcon = muteBtn?.querySelector('.audio-icon');
    
    if (audioIcon) {
        audioIcon.textContent = isMuted ? '🔇' : '🔊';
    }
    if (muteBtn) {
        muteBtn.classList.toggle('muted', isMuted);
    }
    
    if (isMuted && isSpeaking) {
        stopSpeaking();
    }
    
    saveUserPreferences();
    showZoomFeedback(isMuted ? 'Som desativado' : 'Som ativado');
}

function updateVolumeDisplay() {
    const volumeLabel = document.querySelector('.volume-label');
    if (volumeLabel) {
        volumeLabel.textContent = `${Math.round(volume * 100)}%`;
    }
}

// ===== ANIMAÇÃO DE DIGITAÇÃO =====
function typeText(element, text, callback) {
    if (!element || isTyping) return;
    
    isTyping = true;
    element.textContent = '';
    
    // Mostrar indicador de digitação
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.classList.add('active');
    }
    
    let index = 0;
    const speed = 30; // ms por caractere
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        } else {
            // Esconder indicador de digitação
            if (typingIndicator) {
                typingIndicator.classList.remove('active');
            }
            
            isTyping = false;
            
            // Iniciar fala após digitação
            setTimeout(() => {
                speak(text);
            }, 300);
            
            if (callback) callback();
        }
    }
    
    // Pequeno delay antes de começar a digitar
    setTimeout(type, 500);
}

// ===== VERIFICAÇÃO DE STATUS DA IA =====
async function checkAIStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.status === 'online') {
            updateConnectionStatus(true, 'Conectado');
            updateAIStatus('IA: Online');
        } else {
            updateConnectionStatus(false, 'Desconectado');
            updateAIStatus('IA: Offline');
        }
    } catch (error) {
        console.error('Erro ao verificar status da IA:', error);
        updateConnectionStatus(false, 'Erro de conexão');
        updateAIStatus('IA: Erro');
    }
}

function updateConnectionStatus(connected, text) {
    const statusDot = document.getElementById('connection-dot');
    const statusText = document.getElementById('connection-status');
    
    if (statusDot) {
        statusDot.className = `status-dot ${connected ? 'connected' : ''}`;
    }
    if (statusText) {
        statusText.textContent = text;
    }
}

function updateAIStatus(text) {
    const aiStatus = document.getElementById('ai-status');
    if (aiStatus) {
        aiStatus.textContent = text;
    }
}

function updateTTSStatus(text) {
    const ttsStatus = document.getElementById('tts-status');
    if (ttsStatus) {
        ttsStatus.textContent = text;
    }
}

// ===== ENVIO DE MENSAGENS =====
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    if (!userInput || !sendButton) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    // Parar qualquer fala anterior
    stopSpeaking();
    
    // Adicionar mensagem do usuário ao chat
    addMessageToChat(message, 'user');
    
    // Limpar campo de entrada
    userInput.value = '';
    updateCharCounter();
    userInput.style.height = 'auto';
    
    // Desabilitar botão e mostrar loading
    sendButton.disabled = true;
    sendButton.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
    
    // Mostrar overlay de loading
    showLoadingOverlay('Processando sua mensagem...');
    
    try {
        // Simular resposta da IA (substitua pela chamada real da API)
        const response = await simulateAIResponse(message);
        
        if (response.status === 'success') {
            // Mostrar resposta na interface de fala com animação de digitação
            const speechText = document.getElementById('speech-text');
            if (speechText) {
                typeText(speechText, response.response);
            }
            
            // Adicionar resposta ao chat também
            setTimeout(() => {
                addMessageToChat(response.response, 'ai');
            }, 1000);
        } else {
            const errorMsg = 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
            const speechText = document.getElementById('speech-text');
            if (speechText) {
                typeText(speechText, errorMsg);
            }
            addMessageToChat(errorMsg, 'ai');
        }
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        const errorMsg = 'Erro de conexão. Verifique sua internet e tente novamente.';
        const speechText = document.getElementById('speech-text');
        if (speechText) {
            typeText(speechText, errorMsg);
        }
        addMessageToChat(errorMsg, 'ai');
    } finally {
        // Reabilitar botão
        sendButton.disabled = false;
        sendButton.innerHTML = '<span class="send-icon">➤</span>';
        
        // Esconder loading
        hideLoadingOverlay();
        
        // Focar novamente no campo
        userInput.focus();
    }
}

// ===== SIMULAÇÃO DE RESPOSTA DA IA =====
async function simulateAIResponse(message) {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const lowerMessage = message.toLowerCase();
    
    // Verificar se é uma solicitação de leitura
    if (lowerMessage.startsWith('leia:') || lowerMessage.startsWith('ler:') || lowerMessage.includes('pode ler')) {
        const textToRead = message.replace(/^(leia:|ler:|pode ler isso:?)/i, '').trim();
        if (textToRead) {
            return {
                status: 'success',
                response: ` Lendo: "${textToRead}"`
            };
        }
    }
    
    // Saudações
    if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia') || lowerMessage.includes('boa tarde') || lowerMessage.includes('boa noite')) {
        const saudacoes = [
            'Olá! Como posso ajudá-lo hoje?',
            'Oi! É um prazer falar com você!',
            'Olá! Estou aqui para ajudar no que precisar!',
            'Oi! Como está seu dia?'
        ];
        return {
            status: 'success',
            response: saudacoes[Math.floor(Math.random() * saudacoes.length)]
        };
    }
    
    // Temperatura
    if (lowerMessage.includes('temperatura') || lowerMessage.includes('tempo') || lowerMessage.includes('clima')) {
        const temperaturas = [
            'A temperatura atual está em torno de 24°C, com céu parcialmente nublado.',
            'Hoje está fazendo 22°C, um dia agradável!',
            'A temperatura está em 26°C, um pouco quente hoje.',
            'Está fazendo 20°C, um clima bem fresquinho!'
        ];
        return {
            status: 'success',
            response: temperaturas[Math.floor(Math.random() * temperaturas.length)]
        };
    }
    
    // Matemática
    const mathMatch = message.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
    if (mathMatch) {
        const [, num1, operator, num2] = mathMatch;
        const a = parseFloat(num1);
        const b = parseFloat(num2);
        let result;
        
        switch (operator) {
            case '+':
                result = a + b;
                break;
            case '-':
                result = a - b;
                break;
            case '*':
                result = a * b;
                break;
            case '/':
                result = b !== 0 ? a / b : 'Erro: divisão por zero';
                break;
            default:
                result = 'Operação não reconhecida';
        }
        
        return {
            status: 'success',
            response: `🧮 ${a} ${operator} ${b} = ${result}`
        };
    }
    
    // Resposta padrão
    return {
        status: 'success',
        response: 'Entendi sua mensagem! Posso ajudar com saudações, informações sobre temperatura, cálculos matemáticos e leitura de textos. O que você gostaria de saber?'
    };
}

// ===== GERENCIAMENTO DE MENSAGENS DO CHAT =====
function addMessageToChat(content, sender) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${sender === 'user' ? '👤' : '🤖'}
        </div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(content)}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll para a última mensagem
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animar entrada da mensagem
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        messageDiv.style.transition = 'all 0.5s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== UTILITÁRIOS =====
function updateCharCounter() {
    const userInput = document.getElementById('user-input');
    const charCount = document.getElementById('char-count');
    
    if (userInput && charCount) {
        const count = userInput.value.length;
        charCount.textContent = count;
        
        // Mudar cor se próximo do limite
        if (count > 800) {
            charCount.style.color = 'var(--error-color)';
        } else if (count > 600) {
            charCount.style.color = 'var(--warning-color)';
        } else {
            charCount.style.color = 'var(--text-muted)';
        }
    }
}

function setupAutoResize() {
    const userInput = document.getElementById('user-input');
    if (!userInput) return;
    
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

function updateInitialSpeech() {
    const speechText = document.getElementById('speech-text');
    if (speechText) {
        const initialText = speechText.textContent;
        // Falar o texto inicial após um pequeno delay
        setTimeout(() => {
            speak(initialText);
        }, 2000);
    }
}

function showLoadingOverlay(text = 'Processando...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = overlay?.querySelector('.loading-text');
    
    if (overlay) {
        if (loadingText) {
            loadingText.textContent = text;
        }
        overlay.classList.add('show');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// ===== GERENCIAMENTO DE PREFERÊNCIAS =====
function saveUserPreferences() {
    const preferences = {
        zoom: currentZoom,
        volume: volume,
        muted: isMuted
    };
    localStorage.setItem('ai-chat-preferences', JSON.stringify(preferences));
}

function loadUserPreferences() {
    try {
        const saved = localStorage.getItem('ai-chat-preferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            
            // Carregar zoom
            if (preferences.zoom) {
                currentZoom = preferences.zoom;
                applyZoom();
                updateZoomDisplay();
            }
            
            // Carregar volume
            if (preferences.volume !== undefined) {
                volume = preferences.volume;
                const volumeSlider = document.getElementById('volume-slider');
                if (volumeSlider) {
                    volumeSlider.value = volume * 100;
                }
                updateVolumeDisplay();
            }
            
            // Carregar estado do mute
            if (preferences.muted !== undefined) {
                isMuted = preferences.muted;
                const muteBtn = document.getElementById('mute-toggle');
                const audioIcon = muteBtn?.querySelector('.audio-icon');
                
                if (audioIcon) {
                    audioIcon.textContent = isMuted ? '🔇' : '🔊';
                }
                if (muteBtn) {
                    muteBtn.classList.toggle('muted', isMuted);
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar preferências:', error);
    }
}

// ===== VERIFICAÇÃO PERIÓDICA DE STATUS =====
setInterval(checkAIStatus, 30000); // A cada 30 segundos

// ===== ANIMAÇÃO CSS ADICIONAL =====
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(100px); }
        20% { opacity: 1; transform: translateX(0); }
        80% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-100px); }
    }
`;
document.head.appendChild(style);

// ===== LOG DE INICIALIZAÇÃO =====
console.log('🚀 Interface web da IA Assistente v2.1 carregada com sucesso!');
console.log('📱 Design responsivo ativado');
console.log('🔍 Funcionalidades de zoom disponíveis');
console.log('🔊 Text-to-Speech integrado');
console.log('💬 Interface de fala central implementada');
console.log('📖 Funcionalidade de leitura de texto ativa');
console.log('⌨️ Atalhos: Ctrl/Cmd + Plus/Minus para zoom, Ctrl/Cmd + 0 para reset, Ctrl + Espaço para parar fala');
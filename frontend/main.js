// ============================================
// STORAGE SETUP (Must be first!)
// ============================================
window.storage = {
        async get(key) {
            return new Promise((resolve, reject) => {
                try {
                    const value = localStorage.getItem(key);
                    if (value === null) {
                        reject(new Error('Key not found'));
                    } else {
                        resolve({ key, value, shared: false });
                    }
                } catch (error) {
                    reject(error);
                }
            });
        },
        
        async set(key, value) {
            return new Promise((resolve, reject) => {
                try {
                    localStorage.setItem(key, value);
                    resolve({ key, value, shared: false });
                } catch (error) {
                    reject(error);
                }
            });
        },
        
        async delete(key) {
            return new Promise((resolve, reject) => {
                try {
                    localStorage.removeItem(key);
                    resolve({ key, deleted: true, shared: false });
                } catch (error) {
                    reject(error);
                }
            });
        },
        
        async list(prefix) {
            return new Promise((resolve, reject) => {
                try {
                    const keys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (!prefix || key.startsWith(prefix)) {
                            keys.push(key);
                        }
                    }
                    resolve({ keys, prefix, shared: false });
                } catch (error) {
                    reject(error);
                }
            });
        }
    };

// ============================================
// GAME STATE
// ============================================
let gameState = {
    currentUser: null,
    currentQuestion: 0,
    score: 0,
    keys: { bronze: 0, silver: 0, gold: 0 },
    hintsUsed: 0,
    timeLeft: 1800, // 30 minutes in seconds
    thesisTimeLeft: 300, // 5 minutes in seconds
    answers: [],
    currentScreen: 'auth',
    thesisTopic: '',
    thesisText: '',
    selectedAnswer: null,
    timerInterval: null,
    thesisTimerInterval: null
};

// NOTE: We removed embedding of API keys in client-side code.
// Use the local proxy server (server.js) that reads GROQ_API_KEY from environment.

// ============================================
// QUESTIONS DATABASE (30 questions)
// ============================================
const questionsDatabase = [
    // Bronze level questions (10 total)
    {
        question: "Кой е авторът на 'Под игото'?",
        options: ["Иван Вазов", "Христо Ботев", "Алеко Константинов", "Елин Пелин"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "Иван Вазов е авторът на 'Под игото' - най-известният български роман."
    },
    {
        question: "Кой жанр е 'До Чикаго и назад'?",
        options: ["Пътепис", "Роман", "Поема", "Пиеса"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "'До Чикаго и назад' е пътепис на Алеко Константинов."
    },
    {
        question: "Кое произведение започва с 'Вазов, ти си народен поет'?",
        options: ["На прощаване", "Обесването на Васил Левски", "Хаджи Димитър", "До Чикаго и назад"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "'На прощаване' на Христо Ботев започва с тези стихове."
    },
    {
        question: "Кой е герой от 'Под игото'?",
        options: ["Боримечката", "Киро", "Бай Ганьо", "Хаджи Димитър"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "Боримечката е важен герой в 'Под игото' на Иван Вазов."
    },
    {
        question: "Кой е автор на 'История славянобългарска'?",
        options: ["Паисий Хилендарски", "Софроний Врачански", "Григорий Цамблак", "Неофит Рилски"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "Паисий Хилендарски е автор на 'История славянобългарска'."
    },
    {
        question: "Кой е написал поемата 'Хаджи Димитър'?",
        options: ["Христо Ботев", "Иван Вазов", "Пенчо Славейков", "Пейо Яворов"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "Христо Ботев е автор на поемата 'Хаджи Димитър'."
    },
    {
        question: "Кое произведение е написано от Алеко Константинов?",
        options: ["Бай Ганьо", "Под игото", "Епопея на забравените", "Немили-недраги"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "'Бай Ганьо' е най-известното произведение на Алеко Константинов."
    },
    {
        question: "Кой е авторът на 'Чичовци'?",
        options: ["Иван Вазов", "Елин Пелин", "Йордан Йовков", "Христо Ботев"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "Иван Вазов е автор на разказа 'Чичовци'."
    },
    {
        question: "Какъв е жанърът на 'История славянобългарска'?",
        options: ["Исторически труд", "Роман", "Поема", "Пътепис"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "'История славянобългарска' е исторически труд от Паисий Хилендарски."
    },
    {
        question: "Кой герой е от 'Бай Ганьо'?",
        options: ["Ганьо Сомов", "Огнянов", "Боримечката", "Хаджи Димитър"],
        correct: 0,
        difficulty: 'bronze',
        explanation: "Ганьо Сомов е главният герой в 'Бай Ганьо' на Алеко Константинов."
    },
    
    // Silver level questions (10 total)
    {
        question: "Коя тема доминира в 'До Чикаго и назад'?",
        options: ["Българска емиграция", "Селски живот", "Исторически събития", "Религия"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Българската емиграция е централна тема в произведението."
    },
    {
        question: "Кой символ се използва в 'Хаджи Димитър'?",
        options: ["Залез", "Орел", "Роза", "Кръст"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Залезът е основен символ в поемата 'Хаджи Димитър'."
    },
    {
        question: "Кой е разказвачът в 'Чичовци'?",
        options: ["Авторът", "Кирица", "Бай Ганьо", "Чичото"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Авторът е разказвачът в 'Чичовци' на Иван Вазов."
    },
    {
        question: "Кое е основното конфликтно ядро в 'Под игото'?",
        options: ["Борбата за свобода", "Семейни раздели", "Икономическа криза", "Религиозен спор"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Борбата за свобода е централният конфликт в романа."
    },
    {
        question: "Кой стилен похват е характерен за Вазовия епос?",
        options: ["Историзъм", "Сюрреализъм", "Абсурд", "Гротеска"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Историзмът е характерен похват за Вазов."
    },
    {
        question: "Каква е ролята на природата в 'Хаджи Димитър'?",
        options: ["Символ на вечността", "Фон на действието", "Конфликтен елемент", "Източник на конфликт"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Природата в 'Хаджи Димитър' е символ на вечността."
    },
    {
        question: "Коя е основната тема в 'Опълченците на Шипка'?",
        options: ["Героизъм", "Любов", "Природа", "Семейство"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Героизмът е основната тема в поемата 'Опълченците на Шипка'."
    },
    {
        question: "Какъв е основният тон в 'Бай Ганьо'?",
        options: ["Сатиричен", "Лиричен", "Трагичен", "Епичен"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Сатиричният тон е характерен за 'Бай Ганьо'."
    },
    {
        question: "Кой е основният конфликт в 'Немили-недраги'?",
        options: ["Социална несправедливост", "Любовна драма", "Исторически сблъсък", "Религиозен спор"],
        correct: 0,
        difficulty: 'silver',
        explanation: "Социалната несправедливост е основният конфликт в 'Немили-недраги'."
    },
    {
        question: "Какъв е жанърът на 'Епопея на забравените'?",
        options: ["Поетичен цикъл", "Роман", "Пиеса", "Разказ"],
        correct: 0,
        difficulty: 'silver',
        explanation: "'Епопея на забравените' е поетичен цикъл от Иван Вазов."
    },
    
    // Gold level questions (10 total)
    {
        question: "Кой мотив свързва 'Хаджи Димитър' и 'Обесването на Васил Левски'?",
        options: ["Жертвеност", "Любов", "Природа", "Семейство"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Жертвеността е общият мотив в двете произведения."
    },
    {
        question: "Какво представлява композицията на 'Епопея на забравените'?",
        options: ["Цикъл от поеми", "Роман", "Пиеса", "Разказ"],
        correct: 0,
        difficulty: 'gold',
        explanation: "'Епопея на забравените' е цикъл от поеми на Иван Вазов."
    },
    {
        question: "Кой е литературният източник на образа на Боримечката?",
        options: ["Фолклор", "История", "Митология", "Библия"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Образът е взет от българския фолклор."
    },
    {
        question: "Коя философска идея се крие в 'До Чикаго и назад'?",
        options: ["Идентичност", "Съдба", "Смърт", "Любов"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Идентичността е централната философска идея."
    },
    {
        question: "Кой е поетичният метафорен център в 'Хаджи Димитър'?",
        options: ["Безсмъртие", "Природа", "Война", "Семейство"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Безсмъртието е поетичният център на поемата."
    },
    {
        question: "Каква е ролята на Рада в 'Под игото'?",
        options: ["Символ на чистотата", "Бунтовник", "Предател", "Жертва на обществото"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Рада е символ на чистотата в 'Под игото'."
    },
    {
        question: "Кой е основният художествен похват в 'Бай Ганьо'?",
        options: ["Сатира", "Лирика", "Епос", "Драма"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Сатирата е основният похват в 'Бай Ганьо'."
    },
    {
        question: "Каква е ролята на природата в 'Епопея на забравените'?",
        options: ["Олицетворение на борбата", "Фон на действието", "Символ на любовта", "Източник на конфликт"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Природата е олицетворение на борбата в 'Епопея на забравените'."
    },
    {
        question: "Кой е основният конфликт в 'Опълченците на Шипка'?",
        options: ["Героизъм срещу страх", "Любов срещу дълг", "Природа срещу човек", "Семейство срещу общество"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Героизмът срещу страха е основният конфликт в поемата."
    },
    {
        question: "Коя е философската идея в 'Немили-недраги'?",
        options: ["Човешкото страдание", "Любовта", "Природата", "Съдбата"],
        correct: 0,
        difficulty: 'gold',
        explanation: "Човешкото страдание е философската идея в 'Немили-недраги'."
    }
];

// ============================================
// THESIS TOPICS
// ============================================
const thesisTopics = [
    "Силата на знанието в съвременния свят",
    "Литературата като огледало на обществото",
    "Героизмът в българската литература",
    "Свободата и робството в българското Възраждане",
    "Природата като символ в поезията",
    "Паметта и историята в литературата",
    "Чуждото и своето в 'До Чикаго и назад'",
    "Борбата за национална идентичност",
    "Смисълът на жертвата в поезията",
    "Бъдещето на българската литература"
];

// ============================================
// DOM ELEMENTS
// ============================================
const authScreen = document.getElementById('authScreen');
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const thesisScreen = document.getElementById('thesisScreen');
const resultsScreen = document.getElementById('resultsScreen');
const surrenderModal = document.getElementById('surrenderModal');

// ============================================
// PROFILE DROPDOWN FUNCTIONS
// ============================================
function createProfileDropdown() {
    const profileSection = document.getElementById('profileSection');
    if (!profileSection || !gameState.currentUser) return;
    
    // Show profile icon
    profileSection.innerHTML = `
        <div class="relative">
            <button id="profileBtn" class="profile-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </button>
            <div id="profileDropdown" class="profile-dropdown hidden">
                <div class="profile-info">
                    <div class="profile-username">${gameState.currentUser.username}</div>
                    <div class="profile-date">Дата на създаване:<br>${formatDate(gameState.currentUser.createdAt)}</div>
                </div>
                <button id="logoutBtnProfile" class="logout-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Изход
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtnProfile = document.getElementById('logoutBtnProfile');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                profileDropdown.classList.add('hidden');
            }
        });
    }
    
    if (logoutBtnProfile) {
        logoutBtnProfile.addEventListener('click', handleLogout);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Неизвестна дата';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('bg-BG', options);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
async function initializeAuth() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignupBtn = document.getElementById('showSignup');
    const showLoginBtn = document.getElementById('showLogin');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtnStart = document.getElementById('logoutBtnStart');
    const googleLoginBtn = document.getElementById('googleLoginBtn');

    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            document.getElementById('authError').classList.add('hidden');
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            document.getElementById('authError').classList.add('hidden');
        });
    }

    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (signupBtn) signupBtn.addEventListener('click', handleSignup);
    if (logoutBtnStart) logoutBtnStart.addEventListener('click', handleLogout);
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);

    // Check if user is already logged in
    try {
        const currentUser = await window.storage.get('currentUser');
        if (currentUser && currentUser.value) {
            const userData = JSON.parse(currentUser.value);
            gameState.currentUser = userData;
            showStartScreen();
        }
    } catch (error) {
        console.log('No current user session');
    }
}

async function handleGoogleLogin() {
    try {
        const proxyUrl = window.PROXY_BASE_URL || 'http://localhost:3000';
        const response = await fetch(proxyUrl + '/auth/google/url');
        const { url } = await response.json();
        
        // Open Google login in a popup
        const popup = window.open(url, 'googleLogin', 'width=500,height=600');
        
        // Listen for the OAuth2 callback
        window.addEventListener('message', async function(event) {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'googleAuth' && event.data.token) {
                try {
                    const authResponse = await fetch(proxyUrl + '/auth/google', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: event.data.token })
                    });
                    
                    if (!authResponse.ok) throw new Error('Google auth failed');
                    
                    const { user } = await authResponse.json();
                    gameState.currentUser = user;
                    await window.storage.set('currentUser', JSON.stringify(user));
                    showStartScreen();
                } catch (error) {
                    console.error('Google auth error:', error);
                    showAuthError('Грешка при вход с Google: ' + error.message);
                }
            }
        });
    } catch (error) {
        console.error('Google login error:', error);
        showAuthError('Грешка при вход с Google: ' + error.message);
    }
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showAuthError('Моля, попълнете всички полета!');
        return;
    }

    try {
        const userKey = `user:${username}`;
        let userData = null;
        
        try {
            const result = await window.storage.get(userKey);
            userData = result;
        } catch (error) {
            showAuthError('Потребителят не съществува! Моля, регистрирайте се.');
            return;
        }
        
        if (!userData || !userData.value) {
            showAuthError('Потребителят не съществува! Моля, регистрирайте се.');
            return;
        }

        const user = JSON.parse(userData.value);
        
        if (user.password !== password) {
            showAuthError('Грешна парола!');
            return;
        }

        gameState.currentUser = { 
            username: user.username,
            createdAt: user.createdAt
        };
        
        await window.storage.set('currentUser', JSON.stringify(gameState.currentUser));
        
        // Clear form
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        
        showStartScreen();
    } catch (error) {
        console.error('Login error:', error);
        showAuthError('Грешка при влизане: ' + error.message);
    }
}

async function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    if (!username || !password || !passwordConfirm) {
        showAuthError('Моля, попълнете всички полета!');
        return;
    }

    if (username.length < 3) {
        showAuthError('Потребителското име трябва да е поне 3 символа!');
        return;
    }

    if (password !== passwordConfirm) {
        showAuthError('Паролите не съвпадат!');
        return;
    }

    if (password.length < 6) {
        showAuthError('Паролата трябва да е поне 6 символа!');
        return;
    }

    try {
        const userKey = `user:${username}`;
        
        // Check if user already exists
        let userExists = false;
        try {
            const existingUser = await window.storage.get(userKey);
            if (existingUser && existingUser.value) {
                userExists = true;
            }
        } catch (error) {
            // User doesn't exist, which is what we want
            console.log('User does not exist yet, proceeding with signup');
        }

        if (userExists) {
            showAuthError('Потребителското име вече е заето!');
            return;
        }

        const createdAt = new Date().toISOString();
        const userData = {
            username: username,
            password: password,
            createdAt: createdAt
        };

        // Save user data
        await window.storage.set(userKey, JSON.stringify(userData));
        
        console.log('User created successfully:', username);

        // Set current user
        gameState.currentUser = { 
            username: username,
            createdAt: createdAt
        };
        
        await window.storage.set('currentUser', JSON.stringify(gameState.currentUser));
        
        console.log('Session saved successfully');
        
        // Clear form
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupPasswordConfirm').value = '';
        
        showStartScreen();
    } catch (error) {
        console.error('Signup error:', error);
        showAuthError('Грешка при регистрацията: ' + error.message);
    }
}

async function handleLogout() {
    try {
        // Stop all timers
        stopTimer();
        stopThesisTimer();
        
        await window.storage.delete('currentUser');
        gameState.currentUser = null;
        
        // Reset game state
        resetGameState();
        
        showScreen(authScreen);
        
        // Reset forms
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupPasswordConfirm').value = '';
        
        // Clear profile section
        const profileSection = document.getElementById('profileSection');
        if (profileSection) {
            profileSection.innerHTML = '';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function showStartScreen() {
    if (gameState.currentUser) {
        document.getElementById('welcomeUsername').textContent = gameState.currentUser.username;
        createProfileDropdown();
    }
    showScreen(startScreen);
}

// ============================================
// SCREEN MANAGEMENT
// ============================================
function showScreen(screen) {
    [authScreen, startScreen, gameScreen, thesisScreen, resultsScreen].forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
}

// ============================================
// GAME FUNCTIONS
// ============================================
function initializeGame() {
    if (!authScreen || !startScreen || !gameScreen || !thesisScreen || !resultsScreen) {
        console.error('One or more required DOM elements are missing!');
        return;
    }
    
    initializeAuth();
    initParticles();
    
    const startBtn = document.getElementById('startBtn');
    const openAICreatorBtn = document.getElementById('openAICreatorBtn');
    const submitBtn = document.getElementById('submitBtn');
    const nextBtn = document.getElementById('nextBtn');
    const hintBtn = document.getElementById('hintBtn');
    const surrenderBtn = document.getElementById('surrenderBtn');
    const submitThesisBtn = document.getElementById('submitThesisBtn');
    const restartBtn = document.getElementById('restartBtn');
    const thesisInput = document.getElementById('thesisInput');
    const confirmSurrender = document.getElementById('confirmSurrender');
    const cancelSurrender = document.getElementById('cancelSurrender');
    
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (openAICreatorBtn) openAICreatorBtn.addEventListener('click', () => showAICreator());
    if (submitBtn) submitBtn.addEventListener('click', submitAnswer);
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
    if (hintBtn) hintBtn.addEventListener('click', showHint);
    if (surrenderBtn) surrenderBtn.addEventListener('click', () => surrenderModal.classList.remove('hidden'));
    if (confirmSurrender) confirmSurrender.addEventListener('click', surrenderGame);
    if (cancelSurrender) cancelSurrender.addEventListener('click', () => surrenderModal.classList.add('hidden'));
    if (submitThesisBtn) submitThesisBtn.addEventListener('click', submitThesis);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (thesisInput) thesisInput.addEventListener('input', updateWordCount);
    
    if (typeof Splitting !== 'undefined') {
        Splitting();
    }
}
    // Load custom questions from localStorage
    loadCustomQuestions();


// ==========================
// AI Question Creator
// ==========================
function loadCustomQuestions() {
    try {
        const raw = localStorage.getItem('customQuestions');
        if (!raw) return;
        const custom = JSON.parse(raw);
        if (Array.isArray(custom) && custom.length) {
            // Append custom questions to the in-memory questionsDatabase
            for (const q of custom) {
                // Basic validation
                if (q && q.question && Array.isArray(q.options) && typeof q.correct === 'number') {
                    questionsDatabase.push(q);
                }
            }
            console.log('Loaded', custom.length, 'custom questions');
        }
    } catch (err) {
        console.error('Error loading custom questions:', err);
    }
}

function showAICreator() {
    const modal = document.getElementById('aiCreatorModal');
    if (!modal) return;
    // Pre-fill API key if stored (convenience only)
    const storedOpenAI = localStorage.getItem('openai_api_key');
    const keyInput = document.getElementById('aiApiKey');
    const providerSelect = document.getElementById('aiProvider');
    if (providerSelect) providerSelect.value = 'openai';
    if (keyInput && storedOpenAI) keyInput.value = storedOpenAI;
    modal.classList.remove('hidden');

    // Wire modal buttons once
    const closeBtn = document.getElementById('closeAIModal');
    const genBtn = document.getElementById('generateAIQuestionBtn');
    const saveBtn = document.getElementById('saveAIQuestionBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    if (genBtn) genBtn.addEventListener('click', () => generateAIQuestion());
    if (saveBtn) saveBtn.addEventListener('click', () => saveGeneratedQuestion());
}

async function generateAIQuestion() {
    const status = document.getElementById('aiGeneratorStatus');
    const preview = document.getElementById('aiPreview');
    const previewContent = document.getElementById('aiPreviewContent');
    const saveBtn = document.getElementById('saveAIQuestionBtn');

    const difficulty = (document.getElementById('aiDifficulty') || {}).value || 'bronze';
    const keywords = (document.getElementById('aiKeywords') || {}).value || '';
    const testSize = parseInt((document.getElementById('aiTestSize') || {}).value || '10', 10);
    const includeThesis = ((document.getElementById('aiIncludeThesis') || {}).value || 'yes') === 'yes';

    if (status) status.textContent = 'Генерирам въпрос… Моля изчакайте.';
    if (previewContent) previewContent.innerHTML = '';
    if (preview) preview.classList.add('hidden');
    if (saveBtn) saveBtn.disabled = true;

    // Build a strict prompt that returns a full test as JSON only
    const userPrompt = `You are a Bulgarian literature expert. Generate a multiple-choice TEST for 10th grade Bulgarian literature (БЕЛ матура 10. клас).

!!!CRITICAL REQUIREMENT!!!
You MUST generate EXACTLY ${testSize} questions - NO MORE, NO LESS.
Count carefully: 1, 2, 3... up to ${testSize}.
DO NOT generate ${testSize + 1} or more questions.
DO NOT generate ${testSize - 1} or fewer questions.
The questions array MUST contain EXACTLY ${testSize} items.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just pure JSON):
{
  "testTitle": "Заглавие на теста",
  "questions": [
    {
      "question": "Въпросът на български?",
      "options": ["отговор1","отговор2","отговор3","отговор4"],
      "correct": 0,
      "difficulty": "bronze",
      "explanation": "Кратко обяснение на български"
    }
    // ... repeat EXACTLY ${testSize} times
  ],
  "thesisTopic": "Тема за есе (само ако е поискано)"
}

REQUIREMENTS (MANDATORY):
1. EXACTLY ${testSize} questions in the array (count: 1,2,3...${testSize})
2. Each question MUST have exactly 4 options in Bulgarian
3. Difficulty level: "${difficulty}" for ALL questions
4. All text MUST be in Bulgarian language
5. Include short explanation in Bulgarian for each answer
6. Include thesisTopic only if: ${includeThesis}
7. Focus on: ${keywords || 'българска литература, Вазов, Ботев, Под игото'}
8. Topics: Bulgarian Revival literature, Vazov, Botev, Bulgarian poetry and prose

FINAL CHECK BEFORE RESPONDING:
- Count the questions in your JSON
- Verify you have EXACTLY ${testSize} questions
- If you have more than ${testSize}, remove the extra ones
- If you have less than ${testSize}, add more questions

Return ONLY the JSON object, no other text.`;


    try {
    // POST to local proxy which calls AI API server-side (do not embed keys client-side)
        let content = null; // Define content variable here at the top
        try {
            // PROXY_BASE_URL can be changed if your proxy runs on a different host/port
            // Prefer an explicitly set PROXY_BASE_URL, otherwise use the app origin
            // (this makes the frontend work when served from the same server at http(s)://host:port)
            const PROXY_BASE_URL = window.PROXY_BASE_URL || window.location.origin || 'http://localhost:3000';
            // Calculate appropriate token limit based on test size
            // Each question needs ~150 tokens, add buffer for JSON structure
            const estimatedTokens = Math.max(2048, testSize * 200 + 500);
            
            const proxyRes = await fetch(PROXY_BASE_URL + '/generate-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Default model set to llama-3.3-70b-versatile; can be overridden by window.PROXY_MODEL
                body: JSON.stringify({ 
                    prompt: userPrompt, 
                    model: window.PROXY_MODEL || 'llama-3.3-70b-versatile', 
                    temperature: 0.2, 
                    maxOutputTokens: estimatedTokens 
                })
            });

            // Read the response text first
            const text = await proxyRes.text();
            console.log('[AI] Response status:', proxyRes.status);
            console.log('[AI] Response text preview:', text.substring(0, 200));
            
            if (!proxyRes.ok) {
                if (status) status.textContent = 'Proxy error: ' + proxyRes.status + ' - ' + text;
                return;
            }

            // Try to parse the response as JSON
            let data = null;
            try { 
                data = JSON.parse(text); 
            } catch (e) { 
                // If it's not JSON, use the raw text
                data = text;
            }

            // Ensure we have content either as parsed JSON or raw text
            content = typeof data === 'string' ? data : JSON.stringify(data);
            console.log('[AI] Content type:', typeof content);
            console.log('[AI] Content length:', content ? content.length : 0);
            console.log('[AI] Content preview:', content ? content.substring(0, 200) : 'EMPTY');

            // Check if we have valid content
            if (!content) {
                if (status) status.textContent = 'Празен отговор от проксито.';
                return;
            }

            // reassign 'content' variable in outer scope usage
            // keep using the 'content' variable below
            // (no-op here because content is already defined)
            // we will use content below
            // override the previous content variable by attaching to window
            window.__ai_last_raw_content = content;
            content = window.__ai_last_raw_content;
        } catch (err) {
            console.error('Proxy request error:', err);
            if (status) status.textContent = 'Грешка при заявка към проксито: ' + err.message;
            return;
        }
        if (!content) {
            if (status) status.textContent = 'Няма отговор от избрания провайдър.';
            return;
        }

    // Try to find JSON in the response
    // content may include extra text. Try to extract a JSON block that contains "questions" or "testTitle".
    const rawText = (typeof content === 'string' ? content : JSON.stringify(content));
    function extractJsonWithKeywords(text) {
        // look for balanced braces blocks and pick the first that contains the keyword
        const keywords = ['"questions"', '"testTitle"', 'questions":'];
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                let depth = 0;
                for (let j = i; j < text.length; j++) {
                    if (text[j] === '{') depth++;
                    else if (text[j] === '}') depth--;
                    if (depth === 0) {
                        const candidate = text.slice(i, j + 1);
                        for (const k of keywords) {
                            if (candidate.includes(k)) return candidate;
                        }
                        break; // move to next opening brace
                    }
                }
            }
        }
        // fallback: try to find first {...} block
        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first >= 0 && last > first) return text.slice(first, last + 1);
        return null;
    }

    let jsonText = extractJsonWithKeywords(rawText) || rawText.trim();

        let parsed = null;
        // Try several tolerant parsing strategies because model/proxy may return JSON in different shapes
        function tryParseCandidate(txt) {
            if (!txt || typeof txt !== 'string') return null;
            // direct parse
            try { return JSON.parse(txt); } catch (e) {}
            // try unescaping common escapes
            try {
                const cleaned = txt.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');
                return JSON.parse(cleaned);
            } catch (e) {}
            // try trimming to first {...} block (balanced braces)
            try {
                let start = txt.indexOf('{');
                if (start >= 0) {
                    let depth = 0;
                    for (let i = start; i < txt.length; i++) {
                        if (txt[i] === '{') depth++;
                        else if (txt[i] === '}') depth--;
                        if (depth === 0) {
                            const candidate = txt.slice(start, i + 1);
                            try { return JSON.parse(candidate); } catch (e) {}
                            // try cleaned candidate
                            try {
                                const cc = candidate.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                                return JSON.parse(cc);
                            } catch (e) {}
                            break;
                        }
                    }
                }
            } catch (e) {}
            return null;
        }

        parsed = tryParseCandidate(jsonText);
        if (!parsed) {
            // as a fallback, try to locate JSON-like block in rawText using the existing extractor
            const candidate = extractJsonWithKeywords(rawText);
            if (candidate) parsed = tryParseCandidate(candidate);
        }

        if (!parsed) {
            // Show raw content for debugging
            if (status) status.textContent = 'Неуспешно парсване на JSON. Вижте съдържанието по-долу.';
            if (previewContent) previewContent.textContent = content;
            if (preview) preview.classList.remove('hidden');
            return;
        }

        // Expecting full test JSON: { testTitle, questions: [ {question, options, correct, difficulty, explanation}, ... ], thesisTopic? }
        if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
            if (status) status.textContent = 'Полученият JSON няма структура на тест (липсва поле questions).';
            if (previewContent) previewContent.textContent = JSON.stringify(parsed, null, 2);
            if (preview) preview.classList.remove('hidden');
            return;
        }

        // Validate each question briefly
        const bad = parsed.questions.find(q => !q.question || !Array.isArray(q.options) || typeof q.correct !== 'number');
        if (bad) {
            if (status) status.textContent = 'Някои въпроси в JSON нямат необходимите полета (question/options/correct).';
            if (previewContent) previewContent.textContent = JSON.stringify(parsed, null, 2);
            if (preview) preview.classList.remove('hidden');
            return;
        }

        // Validate question count matches requested size
        if (parsed.questions.length !== testSize) {
            console.warn(`Expected ${testSize} questions, but got ${parsed.questions.length}`);
            
            // Automatically trim or warn about question count mismatch
            if (parsed.questions.length > testSize) {
                // Too many questions - trim to exact size
                parsed.questions = parsed.questions.slice(0, testSize);
                if (status) status.textContent = `Изрязани са излишните въпроси. Генерирани ${testSize} въпроса. Започвам играта...`;
            } else {
                // Too few questions - show warning but continue
                if (status) status.textContent = `Предупреждение: Генерирани са само ${parsed.questions.length} въпроса вместо ${testSize}. Започвам играта...`;
            }
        } else {
            if (status) status.textContent = `Тестът е генериран успешно! Генерирани ${parsed.questions.length} въпроса. Започвам играта...`;
        }

        // Save parsed object in-memory for saving
        window._lastGeneratedAIQuestion = parsed;

        // Automatically save the questions and start the game
        if (parsed.questions && Array.isArray(parsed.questions)) {
            // Clear existing questions and add only the AI-generated ones
            questionsDatabase.length = 0; // Clear array
            
            for (const qq of parsed.questions) {
                const q = {
                    question: qq.question,
                    options: qq.options,
                    correct: qq.correct,
                    difficulty: qq.difficulty || 'bronze',
                    explanation: qq.explanation || ''
                };
                questionsDatabase.push(q);
            }
            
            // Close the AI modal
            const modal = document.getElementById('aiCreatorModal');
            if (modal) modal.classList.add('hidden');
            
            // Start the game immediately
            setTimeout(() => {
                startGame();
            }, 500);
        }

    } catch (err) {
        console.error('AI generation error:', err);
        if (status) status.textContent = 'Грешка при генериране: ' + err.message;
    }
}

function saveGeneratedQuestion() {
    const obj = window._lastGeneratedAIQuestion;
    const status = document.getElementById('aiGeneratorStatus');
    if (!obj) {
        if (status) status.textContent = 'Няма генериран въпрос за запазване.';
        return;
    }
    // If object represents a full test, save all questions
    if (obj.questions && Array.isArray(obj.questions)) {
        try {
            const raw = localStorage.getItem('customQuestions');
            const arr = raw ? JSON.parse(raw) : [];

            for (const qq of obj.questions) {
                const q = {
                    question: qq.question,
                    options: qq.options,
                    correct: qq.correct,
                    difficulty: qq.difficulty || 'bronze',
                    explanation: qq.explanation || ''
                };
                // Append to in-memory DB and to arr
                questionsDatabase.push(q);
                arr.push(q);
            }

            localStorage.setItem('customQuestions', JSON.stringify(arr));
            if (status) status.textContent = 'Тестът и въпросите са запазени локално.';
            const saveBtn = document.getElementById('saveAIQuestionBtn');
            if (saveBtn) saveBtn.disabled = true;
        } catch (err) {
            console.error('Save custom test error:', err);
            if (status) status.textContent = 'Грешка при записване: ' + err.message;
        }
    } else {
        if (status) status.textContent = 'Няма валиден тест за запазване.';
    }
}
function startGame() {
    shuffleQuestions();
    
    gameState.currentScreen = 'game';
    gameState.currentQuestion = 0;
    gameState.score = 0;
    gameState.keys = { bronze: 0, silver: 0, gold: 0 };
    gameState.hintsUsed = 0;
    gameState.timeLeft = 1800;
    gameState.answers = [];
    gameState.selectedAnswer = null;
    
    // Reset key displays
    const bronzeCount = document.getElementById('bronzeCount');
    const silverCount = document.getElementById('silverCount');
    const goldCount = document.getElementById('goldCount');
    if (bronzeCount) bronzeCount.textContent = '0';
    if (silverCount) silverCount.textContent = '0';
    if (goldCount) goldCount.textContent = '0';
    
    showScreen(gameScreen);
    loadQuestion();
    startTimer();
    
    if (typeof anime !== 'undefined') {
        anime({
            targets: '[data-splitting] .char',
            translateY: [-100, 0],
            opacity: [0, 1],
            easing: 'easeOutExpo',
            duration: 1400,
            delay: (el, i) => 30 * i
        });
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleQuestions() {
    window.shuffledQuestions = shuffleArray(questionsDatabase);
}

function loadQuestion() {
    const currentQ = window.shuffledQuestions[gameState.currentQuestion];
    const shuffledOptions = shuffleArray(currentQ.options);
    const correctAnswer = currentQ.options[currentQ.correct];
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
    
    const modifiedQuestion = {
        ...currentQ,
        options: shuffledOptions,
        correct: newCorrectIndex
    };
    
    window.currentModifiedQuestion = modifiedQuestion;

    const totalQuestions = window.shuffledQuestions.length;
    document.getElementById('currentQuestion').textContent = gameState.currentQuestion + 1;
    document.getElementById('totalQuestions').textContent = totalQuestions; // Update total questions
    document.getElementById('progressPercent').textContent = Math.round(((gameState.currentQuestion + 1) / totalQuestions) * 100) + '%';
    document.getElementById('progressBar').style.width = ((gameState.currentQuestion + 1) / totalQuestions) * 100 + '%';
    
    document.getElementById('questionText').textContent = modifiedQuestion.question;
    
    const answerOptions = document.getElementById('answerOptions');
    answerOptions.innerHTML = '';
    
    modifiedQuestion.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'answer-btn p-4 rounded-lg text-left text-white font-medium transition-all duration-300';
        button.textContent = `${String.fromCharCode(65 + index)}) ${option}`;
        button.addEventListener('click', () => selectAnswer(index, button));
        answerOptions.appendChild(button);
    });
    
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('nextBtn').classList.add('hidden');
    
    // Ensure hint button is enabled so clicks always trigger showHint()
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
        hintBtn.disabled = false;
        hintBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        hintBtn.textContent = '💡 Помощ';
    }
    
    if (typeof anime !== 'undefined') {
        anime({
            targets: '.question-enter',
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 500,
            easing: 'easeOutQuad'
        });
    }
}

function selectAnswer(index, button) {
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    button.classList.add('selected');
    gameState.selectedAnswer = index;
}

function submitAnswer() {
    if (gameState.selectedAnswer === null) {
        showFeedback('Моля, изберете отговор!', 'warning');
        return;
    }
    
    const modifiedQuestion = window.currentModifiedQuestion;
    const isCorrect = gameState.selectedAnswer === modifiedQuestion.correct;
    
    document.querySelectorAll('.answer-btn').forEach((btn, index) => {
        btn.disabled = true;
        if (index === modifiedQuestion.correct) {
            btn.classList.add('correct');
        } else if (index === gameState.selectedAnswer && !isCorrect) {
            btn.classList.add('wrong');
        }
    });
    
    if (isCorrect) {
        gameState.score++;
        updateKeys(modifiedQuestion.difficulty);
        showFeedback('Правилно! ' + modifiedQuestion.explanation, 'success');
        animateKeyCollection(modifiedQuestion.difficulty);
    } else {
        showFeedback('Грешно! ' + modifiedQuestion.explanation, 'error');
    }
    
    gameState.answers.push({
        question: gameState.currentQuestion,
        selected: gameState.selectedAnswer,
        correct: modifiedQuestion.correct,
        isCorrect: isCorrect
    });
    
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('nextBtn').classList.remove('hidden');
    gameState.selectedAnswer = null;
}

function nextQuestion() {
    gameState.currentQuestion++;
    
    if (gameState.currentQuestion >= window.shuffledQuestions.length) {
        stopTimer(); // Stop timer before going to thesis
        startThesis();
    } else {
        loadQuestion();
    }
}

function showHint() {
    const modifiedQuestion = window.currentModifiedQuestion;
    if (!modifiedQuestion) {
        showFeedback('Грешка: Няма активен въпрос', 'error');
        return;
    }
    
    const correctAnswer = modifiedQuestion.options[modifiedQuestion.correct];
    if (!correctAnswer) {
        showFeedback('Грешка: Неправилни данни за въпроса', 'error');
        return;
    }

    // Show hint with first letter
    const hint = `💡 Подсказка: Правилният отговор започва с "${correctAnswer.charAt(0)}" и има ${correctAnswer.length} букви`;
    showFeedback(hint, 'info');
    
    // Eliminate one wrong answer (visual hint)
    const answerButtons = document.querySelectorAll('.answer-btn');
    let wrongAnswersIndices = [];
    
    // Find all wrong answer indices
    answerButtons.forEach((btn, index) => {
        if (index !== modifiedQuestion.correct) {
            wrongAnswersIndices.push(index);
        }
    });
    
    // Randomly eliminate one wrong answer if there are any
    if (wrongAnswersIndices.length > 0) {
        const randomWrongIndex = wrongAnswersIndices[Math.floor(Math.random() * wrongAnswersIndices.length)];
        const btnToFade = answerButtons[randomWrongIndex];
        btnToFade.style.opacity = '0.3';
        btnToFade.style.textDecoration = 'line-through';
        btnToFade.style.pointerEvents = 'none';
        btnToFade.classList.add('cursor-not-allowed');
    }
    
    gameState.hintsUsed++;
    
    // Update the hint counter if it exists
    const usedHints = document.getElementById('usedHints');
    if (usedHints) {
        usedHints.textContent = gameState.hintsUsed;
    }
    
    // Disable hint button after use for this question
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
        hintBtn.disabled = true;
        hintBtn.classList.add('opacity-50', 'cursor-not-allowed');
        hintBtn.textContent = '💡 Помощ използвана';
    }
}

function updateKeys(difficulty) {
    switch (difficulty) {
        case 'bronze':
            gameState.keys.bronze++;
            document.getElementById('bronzeCount').textContent = gameState.keys.bronze;
            break;
        case 'silver':
            gameState.keys.silver++;
            document.getElementById('silverCount').textContent = gameState.keys.silver;
            break;
        case 'gold':
            gameState.keys.gold++;
            document.getElementById('goldCount').textContent = gameState.keys.gold;
            break;
    }
}

// ============================================
// TIMER FUNCTIONS
// ============================================
function startTimer() {
    // Clear any existing timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timeLeft = 1800; // Reset to 30 minutes
    
    updateTimerDisplay();
    
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();
        
        // Warning when 5 minutes left
        if (gameState.timeLeft === 300) {
            showFeedback('⚠️ Остават само 5 минути!', 'warning');
        }
        
        // Warning when 1 minute left
        if (gameState.timeLeft === 60) {
            showFeedback('⚠️ Остава само 1 минута!', 'warning');
        }
        
        // Time's up
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            timeUp();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerElement.textContent = timeString;
    
    // Add warning class when time is running out
    if (gameState.timeLeft <= 300) { // 5 minutes
        timerElement.classList.add('timer-warning');
    }
    
    if (gameState.timeLeft <= 60) { // 1 minute
        timerElement.classList.add('timer-critical');
    }
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function startThesisTimer() {
    // Clear any existing timer
    if (gameState.thesisTimerInterval) {
        clearInterval(gameState.thesisTimerInterval);
    }
    
    gameState.thesisTimeLeft = 300; // Reset to 5 minutes
    
    updateThesisTimerDisplay();
    
    gameState.thesisTimerInterval = setInterval(() => {
        gameState.thesisTimeLeft--;
        updateThesisTimerDisplay();
        
        // Warning when 1 minute left
        if (gameState.thesisTimeLeft === 60) {
            showFeedback('⚠️ Остава само 1 минута за есето!', 'warning');
        }
        
        // Time's up
        if (gameState.thesisTimeLeft <= 0) {
            clearInterval(gameState.thesisTimerInterval);
            submitThesis(true); // Auto-submit
        }
    }, 1000);
}

function updateThesisTimerDisplay() {
    const timerElement = document.getElementById('thesisTimer');
    if (!timerElement) return;
    
    const minutes = Math.floor(gameState.thesisTimeLeft / 60);
    const seconds = gameState.thesisTimeLeft % 60;
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerElement.textContent = timeString;
    
    // Add warning class when time is running out
    if (gameState.thesisTimeLeft <= 60) { // 1 minute
        timerElement.classList.add('timer-critical');
    }
}

function stopThesisTimer() {
    if (gameState.thesisTimerInterval) {
        clearInterval(gameState.thesisTimerInterval);
        gameState.thesisTimerInterval = null;
    }
}

function timeUp() {
    showFeedback('⏰ Времето изтече! Играта приключва автоматично.', 'error');
    
    // Wait a moment before showing results
    setTimeout(() => {
        showResults();
    }, 2000);
}

// ============================================
// FEEDBACK SYSTEM
// ============================================
function showFeedback(message, type = 'info') {
    // Create feedback element if it doesn't exist
    let feedbackEl = document.getElementById('gameFeedback');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.id = 'gameFeedback';
        feedbackEl.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg text-white text-center max-w-md';
        document.body.appendChild(feedbackEl);
    }
    
    // Set type class and background color based on type
    const bgColors = {
        'info': 'bg-blue-600',
        'success': 'bg-green-600',
        'warning': 'bg-yellow-600',
        'error': 'bg-red-600'
    };
    
    feedbackEl.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg text-white text-center max-w-md ${bgColors[type] || 'bg-blue-600'} opacity-100 transition-opacity duration-300`;
    feedbackEl.textContent = message;
    
    // Make sure the element is visible
    feedbackEl.style.display = 'block';
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        feedbackEl.style.opacity = '0';
        setTimeout(() => {
            feedbackEl.style.display = 'none';
        }, 300);
    }, 4000);
}

// ============================================
// THESIS FUNCTIONS
// ============================================
function startThesis() {
    stopTimer(); // Stop game timer
    
    gameState.thesisTopic = thesisTopics[Math.floor(Math.random() * thesisTopics.length)];
    
    const thesisTopicEl = document.getElementById('thesisTopic');
    const thesisInput = document.getElementById('thesisInput');
    
    if (thesisTopicEl) thesisTopicEl.textContent = gameState.thesisTopic;
    if (thesisInput) thesisInput.value = '';
    
    updateWordCount();
    
    showScreen(thesisScreen);
    startThesisTimer();
}

function updateWordCount() {
    const thesisInput = document.getElementById('thesisInput');
    const wordCountEl = document.getElementById('wordCount');
    
    if (!thesisInput || !wordCountEl) return;
    
    const text = thesisInput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    
    wordCountEl.textContent = words;
    
    // Update color based on word count
    if (words >= 150) {
        wordCountEl.style.color = '#10b981'; // green
    } else if (words >= 100) {
        wordCountEl.style.color = '#fbbf24'; // yellow
    } else {
        wordCountEl.style.color = '#ef4444'; // red
    }
}

function submitThesis(autoSubmit = false) {
    stopThesisTimer();
    
    const thesisInput = document.getElementById('thesisInput');
    if (thesisInput) {
        gameState.thesisText = thesisInput.value.trim();
    }
    
    const words = gameState.thesisText ? gameState.thesisText.split(/\s+/).length : 0;
    
    if (!autoSubmit && words < 100) {
        showFeedback('⚠️ Есето трябва да е поне 100 думи!', 'warning');
        startThesisTimer(); // Restart timer
        return;
    }
    
    if (autoSubmit) {
        showFeedback('⏰ Времето изтече! Есето е подадено автоматично.', 'warning');
    } else {
        showFeedback('✅ Есето е подадено успешно!', 'success');
    }
    
    setTimeout(() => {
        showResults();
    }, 1500);
}

// ============================================
// RESULTS FUNCTIONS
// ============================================
async function calculateGradeWithAI(correctAnswers, totalQuestions, thesisText, hintsUsed) {
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const words = thesisText ? thesisText.split(/\s+/).length : 0;
    
    const prompt = `Ти си учител по български език и литература. Оцени ученика по БЕЛ матура 10. клас.

Резултати:
- Тестова част: ${correctAnswers}/${totalQuestions} верни отговора (${percentage}%)
- Използвани подсказки: ${hintsUsed}
- Думи в есето: ${words}

Есе:
${thesisText || 'Не е написано есе'}

Оцени по българската система (от 2.00 до 6.00). Върни SAMO JSON в този формат:
{
  "grade": "5.50",
  "testFeedback": "Кратък коментар за теста",
  "thesisFeedback": "Кратък коментар за есето",
  "comment": "Общ коментар"
}

Критерии:
- Тест: 60% от оценката
- Есе: 40% от оценката
- Подсказките намаляват оценката с 0.10 за всяка
- Есето трябва да е 150-200 думи за максимална оценка

Върни SAMO JSON, без друг текст.`;

    try {
        const PROXY_BASE_URL = window.PROXY_BASE_URL || window.location.origin || 'http://localhost:3000';
        const response = await fetch(PROXY_BASE_URL + '/generate-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: prompt, 
                model: window.PROXY_MODEL || 'llama-3.3-70b-versatile', 
                temperature: 0.3, 
                maxOutputTokens: 1000 
            })
        });
        
        const text = await response.text();
        
        if (!response.ok) {
            throw new Error('AI grading failed: ' + text);
        }
        
        // Try to parse JSON
        let gradeData;
        try {
            gradeData = JSON.parse(text);
        } catch (e) {
            // Try to extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                gradeData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not parse AI response');
            }
        }
        
        return gradeData;
    } catch (err) {
        console.error('AI grading error:', err);
        // Fallback calculation
        const testGrade = 2 + (percentage / 100) * 4; // 2-6 scale
        const thesisGrade = words >= 150 && words <= 250 ? 6 : words >= 100 ? 5 : 3;
        const finalGrade = (testGrade * 0.6 + thesisGrade * 0.4) - (hintsUsed * 0.1);
        
        return {
            grade: Math.max(2, Math.min(6, finalGrade)).toFixed(2),
            testFeedback: `${percentage}% верни отговори`,
            thesisFeedback: words > 0 ? `${words} думи` : 'Не е написано',
            comment: 'Добро представяне!'
        };
    }
}

async function showResults() {
    stopTimer();
    stopThesisTimer();
    
    const finalGradeEl = document.getElementById('finalGrade');
    const correctAnswersEl = document.getElementById('correctAnswers');
    const wrongAnswersEl = document.getElementById('wrongAnswers');
    const finalBronzeEl = document.getElementById('finalBronze');
    const finalSilverEl = document.getElementById('finalSilver');
    const finalGoldEl = document.getElementById('finalGold');
    const usedHintsEl = document.getElementById('usedHints');
    const performanceAnalysisEl = document.getElementById('performanceAnalysis');
    
    const totalQuestions = window.shuffledQuestions ? window.shuffledQuestions.length : 30;
    const correctCount = gameState.score;
    const wrongCount = totalQuestions - correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    // Update statistics
    if (correctAnswersEl) correctAnswersEl.textContent = correctCount;
    if (wrongAnswersEl) wrongAnswersEl.textContent = wrongCount;
    if (finalBronzeEl) finalBronzeEl.textContent = gameState.keys.bronze;
    if (finalSilverEl) finalSilverEl.textContent = gameState.keys.silver;
    if (finalGoldEl) finalGoldEl.textContent = gameState.keys.gold;
    if (usedHintsEl) usedHintsEl.textContent = gameState.hintsUsed;
    
    // Show loading for AI grading
    if (finalGradeEl) finalGradeEl.textContent = 'Оценява се...';
    if (performanceAnalysisEl) performanceAnalysisEl.innerHTML = '<div class="text-gray-400">AI анализира представянето...</div>';
    
    showScreen(resultsScreen);
    
    // Calculate grade using AI
    try {
        const grade = await calculateGradeWithAI(correctCount, totalQuestions, gameState.thesisText, gameState.hintsUsed);
        if (finalGradeEl) finalGradeEl.textContent = grade.grade;
        if (performanceAnalysisEl) {
            performanceAnalysisEl.innerHTML = `
                <div><strong>Тестова част:</strong> ${grade.testFeedback}</div>
                <div class="mt-2"><strong>Есе:</strong> ${grade.thesisFeedback}</div>
                <div class="mt-2"><strong>Общ коментар:</strong> ${grade.comment}</div>
            `;
        }
    } catch (err) {
        console.error('Error calculating grade:', err);
        // Fallback to simple calculation
        const simpleGrade = 2 + (percentage / 100) * 4;
        if (finalGradeEl) finalGradeEl.textContent = simpleGrade.toFixed(2);
        if (performanceAnalysisEl) {
            performanceAnalysisEl.innerHTML = `
                <div>Верни отговори: ${percentage}%</div>
                <div>Грешни отговори: ${100 - percentage}%</div>
            `;
        }
    }
}

// ============================================
// SURRENDER FUNCTIONS
// ============================================
function surrenderGame() {
    // Hide modal
    if (surrenderModal) {
        surrenderModal.classList.add('hidden');
    }
    
    // Stop timers
    stopTimer();
    stopThesisTimer();
    
    // Show feedback
    showFeedback('Предадохте играта. Връщате се към началния екран.', 'info');
    
    // Wait a moment then go to start screen
    setTimeout(() => {
        resetGameState();
        showStartScreen();
    }, 1500);
}

function resetGameState() {
    gameState.currentQuestion = 0;
    gameState.score = 0;
    gameState.keys = { bronze: 0, silver: 0, gold: 0 };
    gameState.hintsUsed = 0;
    gameState.timeLeft = 1800;
    gameState.thesisTimeLeft = 300;
    gameState.answers = [];
    gameState.thesisTopic = '';
    gameState.thesisText = '';
    gameState.selectedAnswer = null;
}

function restartGame() {
    resetGameState();
    startGame();
}

// ============================================
// OTHER FUNCTIONS
// ============================================
function initParticles() {
    // Particle initialization code - optional
}

function animateKeyCollection(difficulty) {
    // Animation code - optional
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}
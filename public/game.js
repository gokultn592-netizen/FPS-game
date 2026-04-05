const API_BASE = window.location.origin + '/api';

let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let canJump = false;
let targets = [];
let currentLevel = null;
let targetsHit = 0;
let ammo = 30;
let isPointerLocked = false;
let pitchObject = new THREE.Object3D();
let yawObject = new THREE.Object3D();
let ak47;
let recoilOffset = 0;
let gunTexture = new THREE.TextureLoader().load("gun_texture.png");

// Free Fire System Logic
const DEFAULT_STATS = {
    coins: 0,
    unlockedChars: [1],
    unlockedGuns: [1],
    eqChar: 1,
    eqGun: 1,
    unlockedLevels: 3,
    tutorialSeen: false,
    difficulty: 'med'
};
let playerStats = JSON.parse(JSON.stringify(DEFAULT_STATS));
let currentUser = "guest";
let activeCharObj = null;
let activeGunObj = null;
let levelTimeRemaining = 0;
let levelTimerInterval = null;
let coinsInLevel = [];
let collectedCoinsCount = 0;
let lastFireTime = 0;
let bgMusic = null;
let playerHP = 100;
let lastHitTime = 0;
let isScoped = false;
let targetFOV = 75;

function loadStorage() {
    playerStats = JSON.parse(JSON.stringify(DEFAULT_STATS)); // Reset purely
    let s = localStorage.getItem('neon_ops_save_' + currentUser);
    if (s) {
        let saved = JSON.parse(s);
        playerStats = { ...playerStats, ...saved }; 
    }
    if (!GAMEDATA.characters) return; 
    activeCharObj = GAMEDATA.characters.find(c => c.id === playerStats.eqChar) || GAMEDATA.characters[0];
    activeGunObj = GAMEDATA.guns.find(g => g.id === playerStats.eqGun) || GAMEDATA.guns[0];
    updateHomeUI();
}

function saveStorage() {
    localStorage.setItem('neon_ops_save_' + currentUser, JSON.stringify(playerStats));
    updateHomeUI();
}

function updateHomeUI() {
    document.getElementById('global-coins').innerText = playerStats.coins;
    document.getElementById('store-coins').innerText = playerStats.coins;
    document.getElementById('eq-char').innerText = activeCharObj.name;
    document.getElementById('eq-char').style.color = '#' + activeCharObj.color.toString(16).padStart(6, '0');
    document.getElementById('eq-gun').innerText = activeGunObj.name;
    document.getElementById('eq-gun').style.color = '#' + activeGunObj.color.toString(16).padStart(6, '0');

    // Update Difficulty Buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === playerStats.difficulty);
    });
}

function initApp() {
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    
    // UI Navigation
    document.getElementById('open-levels-btn').addEventListener('click', () => {
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        populateMenu();
    });
    document.getElementById('back-home-btn').addEventListener('click', () => {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    });
    document.getElementById('open-store-btn').addEventListener('click', () => {
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('store-screen').classList.remove('hidden');
        renderStore('chars');
    });
    document.getElementById('close-store-btn').addEventListener('click', () => {
        document.getElementById('store-screen').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    });
    document.getElementById('tab-chars').addEventListener('click', e => {
        document.getElementById('tab-chars').classList.add('active');
        document.getElementById('tab-guns').classList.remove('active');
        renderStore('chars');
    });
    document.getElementById('tab-guns').addEventListener('click', e => {
        document.getElementById('tab-guns').classList.add('active');
        document.getElementById('tab-chars').classList.remove('active');
        renderStore('guns');
    });

    // End Screen Buttons
    document.getElementById('retry-level-btn').addEventListener('click', () => {
        document.getElementById('end-screen').classList.add('hidden');
        if (currentLevel) startLevel(currentLevel);
    });
    document.getElementById('next-level-btn').addEventListener('click', () => {
        document.getElementById('end-screen').classList.add('hidden');
        if (currentLevel && currentLevel.id < GAMEDATA.levels.length) {
            startLevel(GAMEDATA.levels[currentLevel.id]); 
        }
    });
    document.getElementById('open-missions-btn').addEventListener('click', () => {
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        populateMenu();
    });
    document.getElementById('return-menu-btn').addEventListener('click', () => {
        document.getElementById('end-screen').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    });

    // Difficulty Selection
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playerStats.difficulty = btn.dataset.diff;
            saveStorage();
        });
    });

    document.addEventListener('pointerlockchange', pointerLockChanged, false);
    init3D();
}

function handleLogin() {
    const user = document.getElementById('username')?.value || '';
    const contact = document.getElementById('contact')?.value || '';
    
    if (!user || !contact) {
        document.getElementById('login-error').innerText = "User ID and Contact Info required.";
        return;
    }
    
    if (!contact.includes('@')) {
        const isTenDigits = /^\d{10}$/.test(contact);
        if (!isTenDigits) {
            document.getElementById('login-error').innerText = "Mobile Number must be exactly 10 digits.";
            return;
        }
    }
    
    currentUser = user.toLowerCase().trim();
    
    fetch(API_BASE + '/login', { method: 'POST', body: JSON.stringify({ user }) })
        .catch(e => console.log("Backend API not reachable, playing in local cache mode."));
    
    loadStorage();
    document.getElementById('player-name-display').innerText = user.toUpperCase();
    document.getElementById('login-screen').classList.add('hidden');
    
    if (!playerStats.tutorialSeen) {
        showTutorial();
    } else {
        document.getElementById('home-screen').classList.remove('hidden');
    }
    
    bgMusic = document.getElementById('bg-music');
    if(bgMusic.paused) bgMusic.play().catch(e => console.log("Audio autoplay prevented."));
    bgMusic.volume = 0.3;
}

function showTutorial() {
    const tut = document.getElementById('tutorial-overlay');
    tut.classList.remove('hidden');
    
    // Reset to step 1
    document.querySelectorAll('.tutorial-card').forEach(c => c.classList.remove('active'));
    document.querySelector('.tutorial-card[data-step="1"]').classList.add('active');
}

function nextTutorialStep(step) {
    const current = document.querySelector(`.tutorial-card[data-step="${step}"]`);
    const next = document.querySelector(`.tutorial-card[data-step="${step + 1}"]`);
    
    if (next) {
        current.classList.remove('active');
        next.classList.add('active');
    } else {
        closeTutorial();
    }
}

function closeTutorial() {
    playerStats.tutorialSeen = true;
    saveStorage();
    document.getElementById('tutorial-overlay').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
}

function renderStore(type) {
    const grid = document.getElementById('store-grid');
    grid.innerHTML = '';
    const items = type === 'chars' ? GAMEDATA.characters : GAMEDATA.guns;
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'store-card';
        const isChar = type === 'chars';
        const isUnlocked = isChar ? playerStats.unlockedChars.includes(item.id) : playerStats.unlockedGuns.includes(item.id);
        const isEquipped = isChar ? playerStats.eqChar === item.id : playerStats.eqGun === item.id;
        
        let colorStr = '#' + item.color.toString(16).padStart(6, '0');
        let html = `<h3 style="color:${colorStr}">${item.name}</h3>`;
        
        if (isChar) {
            html += `<div class="stats">Speed Multiplier: ${item.speed}x</div>`;
        } else {
            html += `<div class="stats">Fire Rate: ${item.fireRate}s<br>Mag: ${item.mag}</div>`;
        }
        
        card.innerHTML = html;
        if (isEquipped) {
            const span = document.createElement('span');
            span.className = 'equipped-text';
            span.innerText = 'EQUIPPED';
            card.appendChild(span);
        } else if (isUnlocked) {
            let btn = document.createElement('button');
            btn.className = 'equip-btn';
            btn.innerText = 'EQUIP';
            btn.onclick = () => equipItem(type, item.id);
            card.appendChild(btn);
        } else {
            let btn = document.createElement('button');
            btn.className = 'buy-btn';
            btn.innerText = `BUY 💰${item.cost}`;
            btn.disabled = playerStats.coins < item.cost;
            btn.onclick = () => buyItem(type, item.id, item.cost);
            card.appendChild(btn);
        }
        grid.appendChild(card);
    });
}

function buyItem(type, id, cost) {
    if (playerStats.coins >= cost) {
        playerStats.coins -= cost;
        if (type === 'chars') playerStats.unlockedChars.push(id);
        else playerStats.unlockedGuns.push(id);
        saveStorage();
        renderStore(type);
    }
}

function equipItem(type, id) {
    if (type === 'chars') {
        playerStats.eqChar = id;
        activeCharObj = GAMEDATA.characters.find(c => c.id === id);
    } else {
        playerStats.eqGun = id;
        activeGunObj = GAMEDATA.guns.find(g => g.id === id);
    }
    saveStorage();
    renderStore(type);
}

function populateMenu() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    GAMEDATA.levels.forEach((lvl, index) => {
        let card = document.createElement('div');
        let isLocked = index >= playerStats.unlockedLevels; 
        card.className = 'level-card ' + (isLocked ? 'locked' : '');
        card.innerHTML = `<div class="num">${lvl.id}</div><div>${lvl.name}</div>`;
        if (!isLocked) {
            card.addEventListener('click', () => startLevel(lvl));
        }
        grid.appendChild(card);
    });
}

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    camera.rotation.set(0,0,0);
    pitchObject.add(camera);

    yawObject.position.y = 2;
    yawObject.add(pitchObject);
    scene.add(yawObject);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.insertBefore(renderer.domElement, document.body.firstChild);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        toggleScope();
    });
    window.addEventListener('resize', onWindowResize);

    animate();
}

function buildGun() {
    if (ak47) {
        pitchObject.remove(ak47);
    }
    ak47 = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({
        map: gunTexture,
        color: activeGunObj.color, 
        metalness: 0.8, 
        roughness: 0.2
    });
    // Apply texture to wood and hands too for a unified "Shoot Gun" look as requested
    const woodMat = new THREE.MeshStandardMaterial({map: gunTexture, color: 0x333333, roughness: 0.9});
    const skinMat = new THREE.MeshStandardMaterial({map: gunTexture, color: activeCharObj.color, roughness: 0.6});

    let n = activeGunObj.name;
    let type = "AR";
    if (["G18"].includes(n)) type = "PISTOL";
    if (["UMP", "MP5", "MP40", "THOMPSON", "VECTOR", "P90"].includes(n)) type = "SMG";
    if (["SKS", "SVD", "WOODPECKER", "AWM"].includes(n)) type = "SNIPER";
    if (["MAG7", "M1887"].includes(n)) type = "SHOTGUN";

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), skinMat);
    hand.position.set(-0.02, -0.05, 0.1);
    ak47.add(hand);

    if (type === "PISTOL") {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.2), metalMat);
        barrel.position.set(0, 0, 0);
        ak47.add(barrel);
        
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), woodMat);
        grip.position.set(0, -0.08, 0.05);
        grip.rotation.x = -0.2;
        ak47.add(grip);
    } 
    else if (type === "SMG") {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.25), metalMat);
        barrel.position.set(0, 0, -0.1);
        ak47.add(barrel);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.2), metalMat);
        body.position.set(0, -0.02, 0.1);
        ak47.add(body);

        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.08), woodMat);
        mag.position.set(0, -0.15, 0.05);
        ak47.add(mag);
    }
    else if (type === "SNIPER") {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.8), metalMat);
        barrel.position.set(0, 0, -0.4);
        ak47.add(barrel);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.4), metalMat);
        body.position.set(0, -0.02, 0.2);
        ak47.add(body);

        const scope = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), woodMat);
        scope.position.set(0, 0.06, 0.15);
        ak47.add(scope);

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.25), woodMat);
        stock.position.set(0, -0.04, 0.5);
        ak47.add(stock);
    }
    else if (type === "SHOTGUN") {
        const barrel1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), metalMat);
        barrel1.position.set(0, 0.02, -0.1);
        ak47.add(barrel1);
        const barrel2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), metalMat);
        barrel2.position.set(0, -0.02, -0.1);
        ak47.add(barrel2);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.2), metalMat);
        body.position.set(0, 0, 0.15);
        ak47.add(body);

        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.06), woodMat);
        grip.position.set(0, -0.08, 0.2);
        grip.rotation.x = -0.2;
        ak47.add(grip);
    }
    else {
        // Standard AR
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), metalMat);
        barrel.position.set(0, 0, -0.2);
        ak47.add(barrel);

        const gunbody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.3), metalMat);
        gunbody.position.set(0, -0.02, 0.1);
        ak47.add(gunbody);

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.2), woodMat);
        stock.position.set(0, -0.03, 0.3);
        ak47.add(stock);

        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.08), metalMat);
        mag.position.set(0, -0.1, 0.05);
        mag.rotation.x = -0.2;
        ak47.add(mag);
    }

    ak47.position.set(0.3, -0.3, -0.4);
    pitchObject.add(ak47);
    
    // UI Hint for Scope
    let scopeHint = document.getElementById('scope-btn-hint');
    if (activeGunObj.range > 1.0) scopeHint.style.display = 'block';
    else scopeHint.style.display = 'none';
}

function toggleScope() {
    if (!isPointerLocked || activeGunObj.range <= 1.0) return;
    isScoped = !isScoped;
    
    const overlay = document.getElementById('scope-overlay');
    if (isScoped) {
        overlay.style.display = 'flex';
        targetFOV = 75 / activeGunObj.range;
        if (ak47) ak47.visible = false; // Hide gun when scoped
    } else {
        overlay.style.display = 'none';
        targetFOV = 75;
        if (ak47) ak47.visible = true;
    }
}

function pointerLockChanged() {
    isPointerLocked = document.pointerLockElement === document.body;
    if (!isPointerLocked && currentLevel) {
        document.getElementById('home-screen').classList.remove('hidden');
        document.getElementById('ui-background').style.opacity = '1';
        document.getElementById('game-ui').classList.add('hidden');
        if (levelTimerInterval) clearInterval(levelTimerInterval);
        currentLevel = null; // Unload active level flag safely
    }
}

function updateTimerDisplay() {
    const min = Math.floor(levelTimeRemaining / 60).toString().padStart(2, '0');
    const sec = (levelTimeRemaining % 60).toString().padStart(2, '0');
    const td = document.getElementById('timer-display');
    td.innerText = `${min}:${sec}`;
    if (levelTimeRemaining <= 10) td.classList.add('time-warning');
    else td.classList.remove('time-warning');
}

function timeOutGame() {
    endGame("MISSION FAILED: TIME OUT");
}

function endGame(reasonText) {
    clearInterval(levelTimerInterval);
    document.exitPointerLock();
    currentLevel = null; // Mark as no active level for setTimeout guards
    
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('ui-background').style.opacity = '1';
    
    // reset background color just in case modified by damage flicker
    document.getElementById('ui-background').style.background = 'linear-gradient(rgba(10, 10, 15, 0.6), rgba(10, 10, 15, 0.8)), url("cover.png") center/cover no-repeat';
    
    // Directly move to mission selection
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    populateMenu();

    // Reset combat state
    isScoped = false;
    targetFOV = 75;
}

function startLevel(lvl) {
    currentLevel = lvl;
    targetsHit = 0;
    ammo = activeGunObj.mag; 
    collectedCoinsCount = 0;
    
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('ui-background').style.opacity = '0';
    document.getElementById('game-ui').classList.remove('hidden');
    
    document.getElementById('hud-level').innerText = lvl.id;
    document.getElementById('hud-targets').innerText = `0/${lvl.targets}`;
    document.getElementById('hud-ammo').innerText = ammo;
    document.getElementById('hud-coins').innerText = '0';
    
    playerHP = 100;
    document.getElementById('hud-health').style.width = '100%';

    // Timers
    levelTimeRemaining = lvl.timeLimit;
    updateTimerDisplay();
    if (levelTimerInterval) clearInterval(levelTimerInterval);
    levelTimerInterval = setInterval(() => {
        levelTimeRemaining--;
        updateTimerDisplay();
        if (levelTimeRemaining <= 0) {
            clearInterval(levelTimerInterval);
            timeOutGame();
        }
    }, 1000);

    buildGun();

    // Clear old scene items
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    
    scene.add(yawObject);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    let dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(20, 50, 20);
    scene.add(dl);

    // Build Arena
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x050510, 
        roughness: 0.2, 
        metalness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(200, 50, lvl.colorTheme, 0x111122);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Coins
    coinsInLevel = [];
    const coinGeo = new THREE.BoxGeometry(0.5, 0.5, 0.1);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa7700, metalness: 1, roughness: 0.2 });
    for(let c = 0; c < lvl.targets * 2; c++) {
        let coin = new THREE.Mesh(coinGeo, coinMat);
        coin.position.x = (Math.random() - 0.5) * 80;
        coin.position.z = (Math.random() - 0.5) * 80 - 10;
        coin.position.y = 0.5;
        scene.add(coin);
        coinsInLevel.push(coin);
    }

    // Zombies
    targets = [];
    const zombieMat = new THREE.MeshStandardMaterial({color: 0x228b22, roughness: 0.9});
    const clothesMat = new THREE.MeshStandardMaterial({color: 0x3b3b4f, roughness: 0.8});
    
    for (let i = 0; i < lvl.targets; i++) {
        const zombie = new THREE.Group();
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), zombieMat);
        head.position.y = 1.3;
        zombie.add(head);

        const zbody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.6), clothesMat);
        zbody.position.y = 0.2;
        zombie.add(zbody);

        const armGeo = new THREE.BoxGeometry(0.3, 0.3, 1.0);
        const armL = new THREE.Mesh(armGeo, zombieMat);
        armL.position.set(-0.65, 0.7, 0.3);
        zombie.add(armL);

        const armR = new THREE.Mesh(armGeo, zombieMat);
        armR.position.set(0.65, 0.7, 0.3);
        zombie.add(armR);
        
        const hitboxGeo = new THREE.BoxGeometry(1.5, 2.5, 1.2);
        const hitboxMat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
        const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitbox.position.y = 0.5;
        zombie.add(hitbox);
        
        zombie.position.x = (Math.random() - 0.5) * 80;
        zombie.position.z = (Math.random() - 0.5) * 80 - 10;
        zombie.position.y = 1.25;

        hitbox.userData = { parent: zombie };
        
        scene.add(zombie);
        targets.push(hitbox);
    }

    yawObject.position.set(0, 2, 0);
    yawObject.rotation.y = 0;
    pitchObject.rotation.x = 0;
    velocity.set(0,0,0);

    document.body.requestPointerLock();
}

function onMouseMove(event) {
    if (!isPointerLocked) return;
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    yawObject.rotation.y -= movementX * 0.002;
    pitchObject.rotation.x -= movementY * 0.002;
    pitchObject.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObject.rotation.x));
}

function onKeyDown(event) {
    if (!isPointerLocked) return;
    switch(event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
        case 'Space': 
            if (canJump) {
                velocity.y += 18;
                canJump = false;
            }
            break;
    }
}

function onKeyUp(event) {
    switch(event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
    }
}

function onMouseDown(event) {
    if (!isPointerLocked) return;
    
    let time = performance.now();
    if (time - lastFireTime < (activeGunObj.fireRate * 1000)) return; // Check fire rate
    
    if (ammo <= 0) {
        // Auto reload wait duration is arbitrarily 1 second
        if (time - lastFireTime > 1000) {
            ammo = activeGunObj.mag;
            document.getElementById('hud-ammo').innerText = ammo;
        }
        return;
    }
    
    lastFireTime = time;
    ammo--;
    document.getElementById('hud-ammo').innerText = ammo;

    // Play gun sound
    let fireSound = document.getElementById('fire-sound');
    if (fireSound) {
        // Clone node for overlapping fast-firing sounds
        let soundClone = fireSound.cloneNode(true);
        soundClone.volume = 0.4;
        soundClone.play().catch(e => {}); // ignore autoplay errors
    }

    // Screenshake and recoil scaling by fire rate
    pitchObject.rotation.x += 0.005 / activeGunObj.fireRate; 
    recoilOffset = 0.1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    const intersects = raycaster.intersectObjects(targets);
    
    if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        scene.remove(hitObj.userData.parent || hitObj);
        targets = targets.filter(t => t !== hitObj);
        targetsHit++;
        document.getElementById('hud-targets').innerText = `${targetsHit}/${currentLevel.targets}`;

        if (targets.length === 0) {
            levelComplete();
        }
    }
}

function levelComplete() {
    clearInterval(levelTimerInterval);
    document.exitPointerLock();

    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('ui-background').style.opacity = '1';
    
    const endScreen = document.getElementById('end-screen');
    endScreen.classList.remove('hidden');
    document.getElementById('end-title').innerText = "MISSION " + (targetsHit >= 0 ? "COMPLETE" : "UPDATE");
    document.getElementById('end-title').style.color = "#4aff7c"; // Green
    
    // Reset combat state
    isScoped = false;
    targetFOV = 75;
    
    // Show rewards on victory
    document.getElementById('end-reward').classList.remove('hidden');
    document.getElementById('end-stats').classList.remove('hidden');
    
    // Hide Retry, Show Next Mission
    document.getElementById('retry-level-btn').classList.add('hidden');
    document.getElementById('next-level-btn').classList.remove('hidden');
    
    // Calculate Reward based on a flat Default of 100 and timing bonus up to 500
    const baseAmount = 100;
    const timingBonus = Math.floor((levelTimeRemaining / currentLevel.timeLimit) * 500);
    const totalWinReward = baseAmount + timingBonus;
    
    playerStats.coins += totalWinReward;
    saveStorage();
    
    document.getElementById('end-reward').innerText = `Total Reward: 💰 ${totalWinReward}`;
    document.getElementById('end-stats').innerText = `Base Reward: ${baseAmount} | Time Bonus: +${timingBonus}`;

    fetch(API_BASE + '/progress', { 
        method: 'POST', 
        body: JSON.stringify({ level: currentLevel.id, score: ammo, reward: totalWinReward }) 
    }).catch(e => console.log("Progress saved locally."));
    
    if (currentLevel.id < GAMEDATA.levels.length) {
        if (currentLevel.id >= playerStats.unlockedLevels) {
            playerStats.unlockedLevels = currentLevel.id + 1;
            saveStorage();
        }
        
        let gridCards = document.getElementById('level-grid').children;
        if (gridCards[currentLevel.id]) {
            let nextCard = gridCards[currentLevel.id];
            nextCard.classList.remove('locked');
            let newCard = nextCard.cloneNode(true);
            nextCard.parentNode.replaceChild(newCard, nextCard);
            
            newCard.addEventListener('click', () => {
                endScreen.classList.add('hidden');
                startLevel(GAMEDATA.levels[currentLevel.id]);
            });
        }
    }
    
    document.getElementById('return-menu-btn').onclick = () => {
        endScreen.classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    };
    
    currentLevel = null; // Safe to clear now
}

let prevTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Coins animation & Logic
    coinsInLevel.forEach((coin, index) => {
        if (!coin) return;
        coin.rotation.y += 2 * delta;
        coin.rotation.x += 1 * delta;
        if (yawObject.position.distanceTo(coin.position) < 2.0) {
            scene.remove(coin);
            coinsInLevel[index] = null;
            collectedCoinsCount += 50; 
            playerStats.coins += 50;
            saveStorage();
            document.getElementById('hud-coins').innerText = collectedCoinsCount;
        }
    });

    // Zombie movement towards player and collision damage
    targets.forEach(hitbox => {
        let zombie = hitbox.userData.parent;
        if (zombie) {
            let diffMult = 1.0;
            if (playerStats.difficulty === 'easy') diffMult = 0.7;
            if (playerStats.difficulty === 'hard') diffMult = 1.6;

            let dir = new THREE.Vector3();
            dir.subVectors(yawObject.position, zombie.position);
            dir.y = 0;
            dir.normalize();
            zombie.position.addScaledVector(dir, 2.0 * diffMult * delta); // scaled zombie speed
            zombie.lookAt(new THREE.Vector3(yawObject.position.x, zombie.position.y, yawObject.position.z));
            
            // Damage Check
            if (zombie.position.distanceTo(yawObject.position) < 2.0) {
                if (performance.now() - lastHitTime > 1000) { // 1 second invulnerability cooldown
                    playerHP -= 5;
                    playerHP = Math.max(0, playerHP);
                    document.getElementById('hud-health').style.width = playerHP + '%';
                    document.getElementById('hud-health-val').innerText = playerHP;
                    lastHitTime = performance.now();
                    
                    // Damage Flash
                    document.getElementById('ui-background').style.opacity = '1';
                    document.getElementById('ui-background').style.background = 'rgba(255, 0, 0, 0.5)';
                    setTimeout(() => {
                        if (!currentLevel) return; // Ignore if game ended
                        document.getElementById('ui-background').style.opacity = '0';
                        document.getElementById('ui-background').style.background = 'linear-gradient(rgba(10, 10, 15, 0.6), rgba(10, 10, 15, 0.8)), url("cover.png") center/cover no-repeat';
                    }, 150);

                    if (playerHP <= 0) {
                        endGame("MISSION FAILED: KILLED BY ZOMBIE");
                    }
                }
            }
        }
    });

    // Handle recoil animation
    if (ak47) {
        recoilOffset = THREE.MathUtils.lerp(recoilOffset, 0, 10 * delta);
        ak47.position.z = -0.4 + recoilOffset;
        ak47.rotation.x = recoilOffset * 0.5;
    }

    if (isPointerLocked) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 4.0 * delta; // Gravity

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const baseSpd = 200.0;
        const charSpd = activeCharObj ? activeCharObj.speed : 1.0;
        const finalSpd = baseSpd * charSpd;

        if (moveForward || moveBackward) velocity.z -= direction.z * finalSpd * delta;
        if (moveLeft || moveRight) velocity.x += direction.x * finalSpd * delta;

        yawObject.translateX(velocity.x * delta);
        yawObject.translateZ(velocity.z * delta);
        yawObject.position.y += (velocity.y * delta);

        if (yawObject.position.y < 2) {
            velocity.y = 0;
            yawObject.position.y = 2;
            canJump = true;
        }
    }

    // FOV Zoom for Scope
    if (camera.fov !== targetFOV) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 10 * delta);
        camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    prevTime = time;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = initApp;

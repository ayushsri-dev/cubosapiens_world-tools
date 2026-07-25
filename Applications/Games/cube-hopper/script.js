/* --- CONSTANTS & CONFIGURATION --- */
const STORAGE_KEY = "cubosapiens_cube_hopper_v1";

const SKINS = [
  { id: "cyan", name: "Cyber Cyan", color: "#00f0ff", side: "#00a8b3", top: "#80f8ff" },
  { id: "pink", name: "Neon Pink", color: "#ff2a6d", side: "#b31d4c", top: "#ff80a6" },
  { id: "emerald", name: "Emerald Spark", color: "#05ffa1", side: "#03b371", top: "#80ffcf" },
  { id: "gold", name: "Gold Master", color: "#ffd700", side: "#b39700", top: "#ffea80" }
];

const PLATFORM_TYPES = {
  NORMAL: "normal",
  MOVING: "moving",
  CRUMBLING: "crumbling",
  SPRING: "spring",
  HAZARD: "hazard"
};

/* --- AUDIO ENGINE --- */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playHop() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playGem() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playSpring() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playCrash() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

/* --- STATE MANAGEMENT --- */
class GameState {
  constructor() {
    this.score = 0;
    this.highScore = 0;
    this.gems = 0;
    this.totalGems = 0;
    this.totalHops = 0;
    this.totalGames = 0;
    this.combo = 1;
    this.activeSkin = "cyan";
    this.theme = "dark";
    this.sound = true;
    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;

    this.loadStorage();
  }

  loadStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      this.highScore = data.highScore || 0;
      this.totalGems = data.totalGems || 0;
      this.totalHops = data.totalHops || 0;
      this.totalGames = data.totalGames || 0;
      this.activeSkin = data.activeSkin || "cyan";
      this.theme = data.theme || "dark";
      this.sound = data.sound !== undefined ? data.sound : true;
    } catch (e) {
      console.error(e);
    }
  }

  saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        highScore: this.highScore,
        totalGems: this.totalGems,
        totalHops: this.totalHops,
        totalGames: this.totalGames,
        activeSkin: this.activeSkin,
        theme: this.theme,
        sound: this.sound
      }));
    } catch (e) {
      console.error(e);
    }
  }
}

/* --- MAIN GAME ENGINE --- */
class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.audio = new AudioEngine();
    this.state = new GameState();

    this.gridSize = 40;
    this.platforms = [];
    this.particles = [];
    this.gemsList = [];

    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.player = {
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      gridX: 0, gridY: 0,
      isHopping: false,
      hopProgress: 0,
      scaleX: 1, scaleY: 1
    };

    this.initUI();
    this.initEvents();
    this.applyTheme(this.state.theme);
    this.updateScoreboard();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initUI() {
    this.scoreEl = document.getElementById("scoreVal");
    this.bestEl = document.getElementById("bestVal");
    this.gemsEl = document.getElementById("gemsVal");
    this.comboEl = document.getElementById("comboVal");
    this.srEl = document.getElementById("srAnnounce");

    this.startOverlay = document.getElementById("startOverlay");
    this.gameOverOverlay = document.getElementById("gameOverOverlay");
    this.pauseOverlay = document.getElementById("pauseOverlay");

    this.renderSkinsModal();
  }

  initEvents() {
    document.getElementById("startBtn").addEventListener("click", () => this.startGame());
    document.getElementById("restartBtn").addEventListener("click", () => this.startGame());
    document.getElementById("resumeBtn").addEventListener("click", () => this.togglePause());

    document.getElementById("themeToggle").addEventListener("click", () => {
      this.state.theme = this.state.theme === "dark" ? "light" : "dark";
      this.applyTheme(this.state.theme);
      this.state.saveStorage();
    });

    document.getElementById("audioToggle").addEventListener("click", () => {
      this.state.sound = !this.state.sound;
      this.audio.enabled = this.state.sound;
      this.updateAudioIcon();
      this.state.saveStorage();
    });

    document.getElementById("skinsBtn").addEventListener("click", () => this.openModal("skinModal"));
    document.getElementById("statsBtn").addEventListener("click", () => {
      this.updateStatsModal();
      this.openModal("statsModal");
    });

    document.getElementById("closeSkinModal").addEventListener("click", () => this.closeModal("skinModal"));
    document.getElementById("closeStatsModal").addEventListener("click", () => this.closeModal("statsModal"));

    window.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // Mobile controls
    document.getElementById("mJumpBtn").addEventListener("click", () => this.triggerHop(0, 1));
    document.getElementById("mLeftBtn").addEventListener("click", () => this.triggerHop(-1, 0));
    document.getElementById("mRightBtn").addEventListener("click", () => this.triggerHop(1, 0));
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const themeBtn = document.getElementById("themeToggle");
    themeBtn.innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }

  updateAudioIcon() {
    const audioBtn = document.getElementById("audioToggle");
    audioBtn.innerHTML = this.state.sound ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
  }

  openModal(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  closeModal(id) {
    document.getElementById(id).classList.add("hidden");
  }

  renderSkinsModal() {
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = SKINS.map(skin => `
      <div class="skin-card ${this.state.activeSkin === skin.id ? 'active' : ''}" onclick="window.game.selectSkin('${skin.id}')">
        <div class="skin-preview" style="background: ${skin.color}"></div>
        <strong>${skin.name}</strong>
      </div>
    `).join("");
  }

  selectSkin(id) {
    this.state.activeSkin = id;
    this.state.saveStorage();
    this.renderSkinsModal();
  }

  updateStatsModal() {
    document.getElementById("statGames").innerText = this.state.totalGames;
    document.getElementById("statBest").innerText = this.state.highScore;
    document.getElementById("statGems").innerText = this.state.totalGems;
    document.getElementById("statHops").innerText = this.state.totalHops;
  }

  startGame() {
    this.audio.init();
    this.state.score = 0;
    this.state.gems = 0;
    this.state.combo = 1;
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.isGameOver = false;

    this.state.totalGames++;
    this.state.saveStorage();

    this.player.gridX = 0;
    this.player.gridY = 0;
    this.player.z = 0;
    this.player.isHopping = false;
    this.player.hopProgress = 0;

    this.generateInitialPlatforms();
    this.updateScoreboard();

    this.startOverlay.classList.add("hidden");
    this.gameOverOverlay.classList.add("hidden");
    this.pauseOverlay.classList.add("hidden");

    this.trackAnalytics("game_start");
  }

  generateInitialPlatforms() {
    this.platforms = [];
    this.gemsList = [];

    // Starting safe zone
    for (let y = -2; y <= 3; y++) {
      for (let x = -1; x <= 1; x++) {
        this.platforms.push({
          x, y, z: 0,
          type: PLATFORM_TYPES.NORMAL,
          crumblingTimer: 0,
          crumbling: false
        });
      }
    }

    // Procedural track ahead
    this.extendTrack(50);
  }

  extendTrack(count) {
    const lastY = this.platforms.length > 0 ? Math.max(...this.platforms.map(p => p.y)) : 0;
    for (let i = 1; i <= count; i++) {
      const y = lastY + i;
      const width = Math.random() > 0.4 ? 2 : 1;
      const startX = Math.floor(Math.random() * 2) - 1;

      for (let w = 0; w < width; w++) {
        const x = startX + w;
        let type = PLATFORM_TYPES.NORMAL;
        const rand = Math.random();

        if (rand < 0.15) type = PLATFORM_TYPES.MOVING;
        else if (rand < 0.3) type = PLATFORM_TYPES.CRUMBLING;
        else if (rand < 0.38) type = PLATFORM_TYPES.SPRING;

        const plat = {
          x, y, z: 0,
          type,
          offset: Math.random() * Math.PI * 2,
          crumbling: false,
          crumbleProgress: 0
        };
        this.platforms.push(plat);

        if (Math.random() < 0.25 && type !== PLATFORM_TYPES.HAZARD) {
          this.gemsList.push({ x, y, z: 0.8, collected: false });
        }
      }
    }
  }

  handleKeyDown(e) {
    if (e.key === "p" || e.key === "P") {
      this.togglePause();
      return;
    }

    if (!this.state.isPlaying || this.state.isPaused || this.player.isHopping) return;

    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
      this.triggerHop(0, 1);
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      this.triggerHop(-1, 0);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      this.triggerHop(1, 0);
    }
  }

  triggerHop(dx, dy) {
    if (!this.state.isPlaying || this.state.isPaused || this.player.isHopping) return;

    this.player.isHopping = true;
    this.player.hopProgress = 0;
    this.player.targetGridX = this.player.gridX + dx;
    this.player.targetGridY = this.player.gridY + dy;
    this.player.startGridX = this.player.gridX;
    this.player.startGridY = this.player.gridY;

    this.audio.playHop();
    this.state.totalHops++;
    this.spawnParticles(this.player.gridX, this.player.gridY, "#ffffff", 4);
  }

  togglePause() {
    if (!this.state.isPlaying || this.state.isGameOver) return;
    this.state.isPaused = !this.state.isPaused;
    if (this.state.isPaused) {
      this.pauseOverlay.classList.remove("hidden");
    } else {
      this.pauseOverlay.classList.add("hidden");
    }
  }

  update() {
    if (!this.state.isPlaying || this.state.isPaused) return;

    // Moving platforms logic
    const time = Date.now() * 0.003;
    this.platforms.forEach(p => {
      if (p.type === PLATFORM_TYPES.MOVING) {
        p.renderX = p.x + Math.sin(time + p.offset) * 0.8;
      } else {
        p.renderX = p.x;
      }

      if (p.crumbling) {
        p.crumbleProgress += 0.05;
        if (p.crumbleProgress >= 1) {
          p.z -= 0.5;
        }
      }
    });

    // Player hopping animation
    if (this.player.isHopping) {
      this.player.hopProgress += 0.12;
      const t = this.player.hopProgress;

      this.player.gridX = this.player.startGridX + (this.player.targetGridX - this.player.startGridX) * t;
      this.player.gridY = this.player.startGridY + (this.player.targetGridY - this.player.startGridY) * t;
      this.player.z = Math.sin(t * Math.PI) * 1.2;

      if (t >= 1) {
        this.player.gridX = this.player.targetGridX;
        this.player.gridY = this.player.targetGridY;
        this.player.z = 0;
        this.player.isHopping = false;
        this.onLand();
      }
    }

    // Camera follow
    this.camera.targetX = this.player.gridX;
    this.camera.targetY = this.player.gridY;
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

    // Extend track dynamically
    if (this.player.gridY > this.platforms.length - 20) {
      this.extendTrack(30);
    }

    // Particle updates
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.life -= 0.04;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  onLand() {
    const currentPlat = this.platforms.find(p =>
      Math.abs(p.renderX - this.player.gridX) < 0.6 &&
      Math.round(p.y) === Math.round(this.player.gridY)
    );

    if (!currentPlat || currentPlat.z < -2) {
      this.gameOver("You fell into the void!");
      return;
    }

    if (currentPlat.type === PLATFORM_TYPES.CRUMBLING) {
      currentPlat.crumbling = true;
    } else if (currentPlat.type === PLATFORM_TYPES.SPRING) {
      this.audio.playSpring();
      this.triggerHop(0, 2);
    }

    // Gem pickup check
    this.gemsList.forEach(g => {
      if (!g.collected && Math.abs(g.x - this.player.gridX) < 0.6 && Math.round(g.y) === Math.round(this.player.gridY)) {
        g.collected = true;
        this.state.gems++;
        this.state.totalGems++;
        this.state.score += 25;
        this.audio.playGem();
        this.spawnParticles(this.player.gridX, this.player.gridY, "#ffd700", 8);
      }
    });

    this.state.score += 10;
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
    }

    this.updateScoreboard();
    this.state.saveStorage();
  }

  gameOver(reason) {
    this.state.isPlaying = false;
    this.state.isGameOver = true;
    this.audio.playCrash();

    document.getElementById("overReason").innerText = reason;
    document.getElementById("finalScore").innerText = this.state.score;
    document.getElementById("finalBest").innerText = this.state.highScore;
    document.getElementById("finalGems").innerText = this.state.gems;

    this.gameOverOverlay.classList.remove("hidden");
    this.trackAnalytics("game_over", reason, this.state.score);
  }

  updateScoreboard() {
    this.scoreEl.innerText = this.state.score;
    this.bestEl.innerText = this.state.highScore;
    this.gemsEl.innerText = `💎 ${this.state.gems}`;
    this.comboEl.innerText = `x${this.state.combo}`;

    this.srEl.innerText = `Score: ${this.state.score}, High Score: ${this.state.highScore}`;
  }

  toIso(x, y, z) {
    const isoX = (x - y) * 36;
    const isoY = (x + y) * 18 - z * 24;
    return {
      x: this.canvas.width / 2 + isoX - (this.camera.x - this.camera.y) * 36,
      y: this.canvas.height / 2 + 100 + isoY - (this.camera.x + this.camera.y) * 18
    };
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid rendering sorted by isometric depth (x + y)
    const sortedPlatforms = [...this.platforms].sort((a, b) => (a.x + a.y) - (b.x + b.y));

    sortedPlatforms.forEach(p => {
      const pos = this.toIso(p.renderX, p.y, p.z);
      this.drawCube(pos.x, pos.y, 36, 18, 20, this.getPlatformColors(p.type));
    });

    // Render Gems
    this.gemsList.forEach(g => {
      if (!g.collected) {
        const pos = this.toIso(g.x, g.y, g.z);
        this.drawGem(pos.x, pos.y);
      }
    });

    // Render Player
    const skin = SKINS.find(s => s.id === this.state.activeSkin) || SKINS[0];
    const playerPos = this.toIso(this.player.gridX, this.player.gridY, this.player.z);
    this.drawCube(playerPos.x, playerPos.y, 28, 14, 28, skin);

    // Render Particles
    this.particles.forEach(p => {
      const pos = this.toIso(p.x, p.y, p.z);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 3 * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  getPlatformColors(type) {
    switch (type) {
      case PLATFORM_TYPES.MOVING: return { color: "#00f0ff", side: "#00a2ff", top: "#80f8ff" };
      case PLATFORM_TYPES.CRUMBLING: return { color: "#ff2a6d", side: "#b31d4c", top: "#ff80a6" };
      case PLATFORM_TYPES.SPRING: return { color: "#05ffa1", side: "#03b371", top: "#80ffcf" };
      default: return { color: "#3a4763", side: "#242e42", top: "#526388" };
    }
  }

  drawCube(x, y, sizeX, sizeY, height, colors) {
    const ctx = this.ctx;

    // Top face
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x + sizeX, y - height + sizeY);
    ctx.lineTo(x, y - height + sizeY * 2);
    ctx.lineTo(x - sizeX, y - height + sizeY);
    ctx.closePath();
    ctx.fill();

    // Left face
    ctx.fillStyle = colors.side;
    ctx.beginPath();
    ctx.moveTo(x - sizeX, y - height + sizeY);
    ctx.lineTo(x, y - height + sizeY * 2);
    ctx.lineTo(x, y + sizeY * 2);
    ctx.lineTo(x - sizeX, y + sizeY);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = colors.color;
    ctx.beginPath();
    ctx.moveTo(x, y - height + sizeY * 2);
    ctx.lineTo(x + sizeX, y - height + sizeY);
    ctx.lineTo(x + sizeX, y + sizeY);
    ctx.lineTo(x, y + sizeY * 2);
    ctx.closePath();
    ctx.fill();
  }

  drawGem(x, y) {
    this.ctx.fillStyle = "#ffd700";
    this.ctx.beginPath();
    this.ctx.arc(x, y - 10, 6, 0, Math.PI * 2);
    this.ctx.fill();
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, z: 0.2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        vz: Math.random() * 0.3,
        life: 1,
        color
      });
    }
  }

  trackAnalytics(action, label = "", value = 0) {
    if (window.gtag) {
      window.gtag("event", action, { event_category: "CubeHopper", event_label: label, value });
    }
  }

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop);
  }
}

/* --- BOOTSTRAP --- */
window.addEventListener("DOMContentLoaded", () => {
  window.game = new GameEngine();
});

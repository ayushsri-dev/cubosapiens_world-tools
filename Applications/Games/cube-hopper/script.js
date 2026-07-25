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
  SPRING: "spring"
};

class AudioSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  play(type) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === "hop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "gem") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "spring") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "crash") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }
}

class CubeHopper {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.audio = new AudioSynth();

    this.platforms = [];
    this.gems = [];
    this.particles = [];

    this.score = 0;
    this.highScore = 0;
    this.collectedGems = 0;
    this.totalGems = 0;
    this.totalHops = 0;
    this.totalGames = 0;
    this.combo = 1;

    this.activeSkin = "cyan";
    this.theme = "dark";

    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;

    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.player = {
      gridX: 0, gridY: 0, z: 0,
      startGridX: 0, startGridY: 0,
      targetGridX: 0, targetGridY: 0,
      isHopping: false, hopProgress: 0
    };

    this.loadState();
    this.bindDOM();
    this.bindEvents();
    this.applyTheme(this.theme);
    this.updateHUD();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  loadState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      this.highScore = data.highScore || 0;
      this.totalGems = data.totalGems || 0;
      this.totalHops = data.totalHops || 0;
      this.totalGames = data.totalGames || 0;
      this.activeSkin = data.activeSkin || "cyan";
      this.theme = data.theme || "dark";
      this.audio.enabled = data.sound !== undefined ? data.sound : true;
    } catch {
      // fallback defaults
    }
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        highScore: this.highScore,
        totalGems: this.totalGems,
        totalHops: this.totalHops,
        totalGames: this.totalGames,
        activeSkin: this.activeSkin,
        theme: this.theme,
        sound: this.audio.enabled
      }));
    } catch {
      // ignore storage write errors
    }
  }

  bindDOM() {
    this.els = {
      score: document.getElementById("scoreVal"),
      best: document.getElementById("bestVal"),
      gems: document.getElementById("gemsVal"),
      combo: document.getElementById("comboVal"),
      sr: document.getElementById("srAnnounce"),
      startOverlay: document.getElementById("startOverlay"),
      gameOverOverlay: document.getElementById("gameOverOverlay"),
      pauseOverlay: document.getElementById("pauseOverlay"),
      themeBtn: document.getElementById("themeToggle"),
      audioBtn: document.getElementById("audioToggle"),
      skinGrid: document.getElementById("skinGrid")
    };
  }

  bindEvents() {
    document.getElementById("startBtn").addEventListener("click", () => this.startGame());
    document.getElementById("restartBtn").addEventListener("click", () => this.startGame());
    document.getElementById("resumeBtn").addEventListener("click", () => this.togglePause());

    this.els.themeBtn.addEventListener("click", () => {
      this.theme = this.theme === "dark" ? "light" : "dark";
      this.applyTheme(this.theme);
      this.saveState();
    });

    this.els.audioBtn.addEventListener("click", () => {
      this.audio.enabled = !this.audio.enabled;
      this.updateAudioIcon();
      this.saveState();
    });

    document.getElementById("skinsBtn").addEventListener("click", () => this.openModal("skinModal"));
    document.getElementById("statsBtn").addEventListener("click", () => {
      this.updateStatsModal();
      this.openModal("statsModal");
    });

    document.getElementById("closeSkinModal").addEventListener("click", () => this.closeModal("skinModal"));
    document.getElementById("closeStatsModal").addEventListener("click", () => this.closeModal("statsModal"));

    window.addEventListener("keydown", (e) => this.onKeyDown(e));

    document.getElementById("mJumpBtn").addEventListener("click", () => this.hop(0, 1));
    document.getElementById("mLeftBtn").addEventListener("click", () => this.hop(-1, 0));
    document.getElementById("mRightBtn").addEventListener("click", () => this.hop(1, 0));

    this.els.skinGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".skin-card");
      if (card && card.dataset.skin) {
        this.activeSkin = card.dataset.skin;
        this.saveState();
        this.renderSkinGrid();
      }
    });
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.els.themeBtn.innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }

  updateAudioIcon() {
    this.els.audioBtn.innerHTML = this.audio.enabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
  }

  openModal(id) {
    if (id === "skinModal") this.renderSkinGrid();
    document.getElementById(id).classList.remove("hidden");
  }

  closeModal(id) {
    document.getElementById(id).classList.add("hidden");
  }

  renderSkinGrid() {
    this.els.skinGrid.innerHTML = SKINS.map(skin => `
      <div class="skin-card ${this.activeSkin === skin.id ? 'active' : ''}" data-skin="${skin.id}">
        <div class="skin-preview" style="background: ${skin.color}"></div>
        <strong>${skin.name}</strong>
      </div>
    `).join("");
  }

  updateStatsModal() {
    document.getElementById("statGames").innerText = this.totalGames;
    document.getElementById("statBest").innerText = this.highScore;
    document.getElementById("statGems").innerText = this.totalGems;
    document.getElementById("statHops").innerText = this.totalHops;
  }

  startGame() {
    this.audio.init();
    this.score = 0;
    this.collectedGems = 0;
    this.combo = 1;
    this.isPlaying = true;
    this.isPaused = false;
    this.isGameOver = false;

    this.totalGames++;
    this.saveState();

    this.player.gridX = 0;
    this.player.gridY = 0;
    this.player.z = 0;
    this.player.isHopping = false;
    this.player.hopProgress = 0;

    this.generateMap();
    this.updateHUD();

    this.els.startOverlay.classList.add("hidden");
    this.els.gameOverOverlay.classList.add("hidden");
    this.els.pauseOverlay.classList.add("hidden");
  }

  generateMap() {
    this.platforms = [];
    this.gems = [];

    for (let y = -2; y <= 3; y++) {
      for (let x = -1; x <= 1; x++) {
        this.platforms.push({ x, y, z: 0, type: PLATFORM_TYPES.NORMAL, crumbling: false, crumbleProgress: 0 });
      }
    }

    this.extendTrack(50);
  }

  extendTrack(count) {
    const lastY = this.platforms.length ? Math.max(...this.platforms.map(p => p.y)) : 0;

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

        this.platforms.push({
          x, y, z: 0,
          type,
          offset: Math.random() * Math.PI * 2,
          crumbling: false,
          crumbleProgress: 0
        });

        if (Math.random() < 0.25) {
          this.gems.push({ x, y, z: 0.8, collected: false });
        }
      }
    }
  }

  onKeyDown(e) {
    if (e.key === "p" || e.key === "P") {
      this.togglePause();
      return;
    }

    if (!this.isPlaying || this.isPaused || this.player.isHopping) return;

    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") {
      this.hop(0, 1);
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      this.hop(-1, 0);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      this.hop(1, 0);
    }
  }

  hop(dx, dy) {
    if (!this.isPlaying || this.isPaused || this.player.isHopping) return;

    this.player.isHopping = true;
    this.player.hopProgress = 0;
    this.player.startGridX = this.player.gridX;
    this.player.startGridY = this.player.gridY;
    this.player.targetGridX = this.player.gridX + dx;
    this.player.targetGridY = this.player.gridY + dy;

    this.audio.play("hop");
    this.totalHops++;
    this.spawnDust(this.player.gridX, this.player.gridY, "#ffffff", 4);
  }

  togglePause() {
    if (!this.isPlaying || this.isGameOver) return;
    this.isPaused = !this.isPaused;
    this.els.pauseOverlay.classList.toggle("hidden", !this.isPaused);
  }

  update() {
    if (!this.isPlaying || this.isPaused) return;

    const time = Date.now() * 0.003;
    this.platforms.forEach(p => {
      p.renderX = p.type === PLATFORM_TYPES.MOVING ? p.x + Math.sin(time + p.offset) * 0.8 : p.x;
      if (p.crumbling) {
        p.crumbleProgress += 0.05;
        if (p.crumbleProgress >= 1) p.z -= 0.5;
      }
    });

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

    this.camera.targetX = this.player.gridX;
    this.camera.targetY = this.player.gridY;
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

    if (this.player.gridY > this.platforms.length - 20) {
      this.extendTrack(30);
    }

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.life -= 0.04;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  onLand() {
    const current = this.platforms.find(p =>
      Math.abs(p.renderX - this.player.gridX) < 0.6 &&
      Math.round(p.y) === Math.round(this.player.gridY)
    );

    if (!current || current.z < -2) {
      this.gameOver("You fell into the void!");
      return;
    }

    if (current.type === PLATFORM_TYPES.CRUMBLING) {
      current.crumbling = true;
    } else if (current.type === PLATFORM_TYPES.SPRING) {
      this.audio.play("spring");
      this.hop(0, 2);
    }

    this.gems.forEach(g => {
      if (!g.collected && Math.abs(g.x - this.player.gridX) < 0.6 && Math.round(g.y) === Math.round(this.player.gridY)) {
        g.collected = true;
        this.collectedGems++;
        this.totalGems++;
        this.score += 25;
        this.audio.play("gem");
        this.spawnDust(this.player.gridX, this.player.gridY, "#ffd700", 8);
      }
    });

    this.score += 10;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    this.updateHUD();
    this.saveState();
  }

  gameOver(reason) {
    this.isPlaying = false;
    this.isGameOver = true;
    this.audio.play("crash");

    document.getElementById("overReason").innerText = reason;
    document.getElementById("finalScore").innerText = this.score;
    document.getElementById("finalBest").innerText = this.highScore;
    document.getElementById("finalGems").innerText = this.collectedGems;

    this.els.gameOverOverlay.classList.remove("hidden");
  }

  updateHUD() {
    this.els.score.innerText = this.score;
    this.els.best.innerText = this.highScore;
    this.els.gems.innerText = `💎 ${this.collectedGems}`;
    this.els.combo.innerText = `x${this.combo}`;
    this.els.sr.innerText = `Score: ${this.score}, High Score: ${this.highScore}`;
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

    const sortedPlatforms = [...this.platforms].sort((a, b) => (a.x + a.y) - (b.x + b.y));

    sortedPlatforms.forEach(p => {
      const pos = this.toIso(p.renderX, p.y, p.z);
      this.drawCube(pos.x, pos.y, 36, 18, 20, this.getPlatformColors(p.type));
    });

    this.gems.forEach(g => {
      if (!g.collected) {
        const pos = this.toIso(g.x, g.y, g.z);
        this.ctx.fillStyle = "#ffd700";
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y - 10, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    const skin = SKINS.find(s => s.id === this.activeSkin) || SKINS[0];
    const playerPos = this.toIso(this.player.gridX, this.player.gridY, this.player.z);
    this.drawCube(playerPos.x, playerPos.y, 28, 14, 28, skin);

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
      case PLATFORM_TYPES.MOVING: return { color: "#00f0ff", side: "#00a8b3", top: "#80f8ff" };
      case PLATFORM_TYPES.CRUMBLING: return { color: "#ff2a6d", side: "#b31d4c", top: "#ff80a6" };
      case PLATFORM_TYPES.SPRING: return { color: "#05ffa1", side: "#03b371", top: "#80ffcf" };
      default: return { color: "#3a4763", side: "#242e42", top: "#526388" };
    }
  }

  drawCube(x, y, sizeX, sizeY, height, colors) {
    const ctx = this.ctx;

    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x + sizeX, y - height + sizeY);
    ctx.lineTo(x, y - height + sizeY * 2);
    ctx.lineTo(x - sizeX, y - height + sizeY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.side;
    ctx.beginPath();
    ctx.moveTo(x - sizeX, y - height + sizeY);
    ctx.lineTo(x, y - height + sizeY * 2);
    ctx.lineTo(x, y + sizeY * 2);
    ctx.lineTo(x - sizeX, y + sizeY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.color;
    ctx.beginPath();
    ctx.moveTo(x, y - height + sizeY * 2);
    ctx.lineTo(x + sizeX, y - height + sizeY);
    ctx.lineTo(x + sizeX, y + sizeY);
    ctx.lineTo(x, y + sizeY * 2);
    ctx.closePath();
    ctx.fill();
  }

  spawnDust(x, y, color, count) {
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

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new CubeHopper();
});

const PLANETS = {
  earth: {
    name: 'Earth',
    gravity: 9.81,
    skyVar: '--earth-sky',
    groundVar: '--earth-ground',
    sceneClass: 'world--earth',
    description: 'The blue planet. Gravity keeps your feet firmly planted and your weight feels familiar.',
  },
  moon: {
    name: 'Moon',
    gravity: 1.62,
    skyVar: '--moon-sky',
    groundVar: '--moon-ground',
    sceneClass: 'world--moon',
    description: 'Only one-sixth of Earth gravity! Astronauts can bound across the dusty surface with ease.',
  },
  mars: {
    name: 'Mars',
    gravity: 3.71,
    skyVar: '--mars-sky',
    groundVar: '--mars-ground',
    sceneClass: 'world--mars',
    description: 'The red planet has just over one-third of Earth gravity — jumps feel floaty and long.',
  },
  jupiter: {
    name: 'Jupiter',
    gravity: 24.79,
    skyVar: '--jupiter-sky',
    groundVar: '--jupiter-ground',
    sceneClass: 'world--jupiter',
    description: 'A gas giant with crushing gravity. Jumping is a struggle and you feel incredibly heavy.',
  },
  saturn: {
    name: 'Saturn',
    gravity: 10.44,
    skyVar: '--saturn-sky',
    groundVar: '--saturn-ground',
    sceneClass: 'world--saturn',
    description: 'Saturn is slightly stronger than Earth gravity, but still friendly enough for a decent hop.',
  },
};

const earthGravity = PLANETS.earth.gravity;
const baseJumpHeight = 0.6; // meters on Earth ≈ athletic standing jump
const maxHeightMultiplier = 3; // cap low-gravity hang time to ~3 s
const pixelsPerMeter = 55;

const planetSelect = document.getElementById('planet-select');
const massInput = document.getElementById('mass-input');
const weightReadout = document.getElementById('weight-readout');
const factsList = document.getElementById('planet-facts');
const world = document.getElementById('world');
const worldSky = document.getElementById('world-sky');
const worldGround = document.getElementById('world-ground');
const astronaut = document.getElementById('astronaut');
const shadow = document.getElementById('shadow');

const state = {
  planet: PLANETS.earth,
  mass: parseFloat(massInput.value) || 70,
  velocity: 0,
  position: 0, // meters, 0 means ground
  jumping: false,
  timeInAir: 0,
  jumpStartVelocity: 0,
};

function formatNewton(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kN`;
  }
  return `${value.toFixed(1)} N`;
}

function updateBackground(planet) {
  if (planet.sceneClass) {
    world.className = `world ${planet.sceneClass}`;
  }
  worldSky.style.background = `var(${planet.skyVar})`;
  worldGround.style.background = `var(${planet.groundVar})`;
}

function updateReadout() {
  const weight = state.mass * state.planet.gravity;
  weightReadout.innerHTML = `Weight on ${state.planet.name}: <strong>${formatNewton(weight)}</strong>`;
}

function updateFacts() {
  const weight = state.mass * state.planet.gravity;
  const earthWeight = state.mass * earthGravity;
  const relativeGravity = state.planet.gravity / earthGravity;

  factsList.innerHTML = `
    <div>
      <dt>Gravity (g)</dt>
      <dd>${state.planet.gravity.toFixed(2)} m/s²</dd>
    </div>
    <div>
      <dt>Your weight</dt>
      <dd>${formatNewton(weight)}</dd>
    </div>
    <div>
      <dt>Vs. Earth</dt>
      <dd>${(relativeGravity * 100).toFixed(0)}% of your Earth weight (${formatNewton(earthWeight)})</dd>
    </div>
    <div class="fact-description">
      <dt>Fun fact</dt>
      <dd>${state.planet.description}</dd>
    </div>
  `;
}

function clampMassInput() {
  const value = parseFloat(massInput.value);
  if (!Number.isFinite(value) || value <= 0) {
    state.mass = 70;
    massInput.value = '70';
  } else {
    state.mass = Math.min(value, 300);
    if (value !== state.mass) {
      massInput.value = state.mass.toString();
    }
  }
}

function resetJump() {
  state.position = 0;
  state.velocity = 0;
  state.jumping = false;
  state.timeInAir = 0;
  state.jumpStartVelocity = 0;
  astronaut.style.transform = 'translate3d(0, 0, 0)';
  shadow.style.transform = 'scale(1)';
  shadow.style.opacity = '1';
  astronaut.style.filter = 'brightness(1)';
  astronaut.classList.remove('astronaut--jumping');
}

function startJump() {
  if (state.jumping) return;
  state.jumping = true;
  const gravity = state.planet.gravity;
  const heightMultiplier = Math.min(maxHeightMultiplier, earthGravity / gravity);
  const targetHeight = baseJumpHeight * heightMultiplier;
  state.jumpStartVelocity = -Math.sqrt(2 * gravity * targetHeight);
  state.velocity = state.jumpStartVelocity;
  state.timeInAir = 0;
  astronaut.classList.add('astronaut--jumping');
}

let lastTimestamp = null;

function animate(timestamp) {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  }
  let delta = (timestamp - lastTimestamp) / 1000;
  if (!Number.isFinite(delta)) {
    delta = 0;
  }
  delta = Math.min(delta, 0.2);
  lastTimestamp = timestamp;

  if (state.jumping) {
    let remaining = delta;
    const maxStep = 1 / 180; // integrate with ~180 fps granularity to smooth large frame gaps

    while (state.jumping && remaining > 0) {
      const step = Math.min(remaining, maxStep);
      state.timeInAir += step;
      state.velocity = state.jumpStartVelocity + state.planet.gravity * state.timeInAir;
      state.position = state.jumpStartVelocity * state.timeInAir +
        0.5 * state.planet.gravity * state.timeInAir * state.timeInAir;

      if (state.position >= 0) {
        resetJump();
      }

      remaining -= step;
    }

    if (state.jumping) {
      const heightMeters = -state.position;
      astronaut.style.transform = `translate3d(0, ${state.position * pixelsPerMeter}px, 0)`;
      const shadowScale = Math.max(0.5, 1 - heightMeters / 4);
      const shadowOpacity = Math.max(0.45, 1 - heightMeters / 3);
      shadow.style.transform = `scale(${shadowScale.toFixed(2)})`;
      shadow.style.opacity = shadowOpacity.toFixed(2);
      const brightnessBoost = 1 + Math.min(heightMeters / 8, 0.35);
      astronaut.style.filter = `brightness(${brightnessBoost.toFixed(2)})`;
    } else {
      // ensure final frame snaps back cleanly when we land mid-step
      astronaut.style.transform = 'translate3d(0, 0, 0)';
      shadow.style.transform = 'scale(1)';
      shadow.style.opacity = '1';
      astronaut.style.filter = 'brightness(1)';
    }
  }

  requestAnimationFrame(animate);
}

function handlePlanetChange() {
  state.planet = PLANETS[planetSelect.value];
  updateBackground(state.planet);
  updateReadout();
  updateFacts();
  resetJump();
}

massInput.addEventListener('change', () => {
  clampMassInput();
  updateReadout();
  updateFacts();
});

massInput.addEventListener('input', () => {
  state.mass = parseFloat(massInput.value) || state.mass;
  updateReadout();
});

planetSelect.addEventListener('change', handlePlanetChange);

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    startJump();
  }
});

updateBackground(state.planet);
updateReadout();
updateFacts();
requestAnimationFrame(animate);

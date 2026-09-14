<template>
  <section class="schema panel" aria-labelledby="schema-title">
    <p class="kicker">Schema</p>
    <h2 id="schema-title">Hoe het werkt</h2>
    <p class="muted intro">
      Video blijft op het sensor-apparaat. Alleen landmarks gaan via de sessie naar het scherm.
    </p>

    <ol class="flow">
      <li class="step">
        <span class="num">1</span>
        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <rect x="12" y="6" width="24" height="36" rx="4" stroke="currentColor" stroke-width="2" />
            <circle cx="24" cy="16" r="5" stroke="currentColor" stroke-width="2" />
            <path d="M16 34c2.2-4 13.8-4 16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <h3>Jij + camera</h3>
        <p>Sensor op telefoon of laptop. Start de webcam in dezelfde sessie.</p>
      </li>

      <li class="arrow" aria-hidden="true">
        <span>MediaPipe</span>
      </li>

      <li class="step">
        <span class="num">2</span>
        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="14" r="4" stroke="currentColor" stroke-width="2" />
            <path d="M24 18v8M16 22l8 4 8-4M18 38l6-12 6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="12" cy="28" r="2" fill="currentColor" />
            <circle cx="36" cy="28" r="2" fill="currentColor" />
          </svg>
        </div>
        <h3>Detectie lokaal</h3>
        <p>Pose of gezicht wordt in de browser herkend. Beeld wordt niet geüpload.</p>
      </li>

      <li class="arrow" aria-hidden="true">
        <span>landmarks</span>
      </li>

      <li class="step">
        <span class="num">3</span>
        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <rect x="8" y="14" width="14" height="20" rx="3" stroke="currentColor" stroke-width="2" />
            <rect x="26" y="14" width="14" height="20" rx="3" stroke="currentColor" stroke-width="2" />
            <path d="M22 24h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="15" cy="24" r="1.5" fill="currentColor" />
            <circle cx="33" cy="24" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <h3>Sessie</h3>
        <p>Socket.IO stuurt alleen cijfers: botten, gezicht, bril. Zelfde code op elk scherm.</p>
      </li>

      <li class="arrow" aria-hidden="true">
        <span>stage</span>
      </li>

      <li class="step">
        <span class="num">4</span>
        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <rect x="6" y="10" width="36" height="24" rx="3" stroke="currentColor" stroke-width="2" />
            <path d="M18 40h12M24 34v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="20" cy="20" r="2" fill="currentColor" />
            <circle cx="28" cy="20" r="2" fill="currentColor" />
            <path d="M18 27c2.4 3 9.6 3 12 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <h3>Pop op het scherm</h3>
        <p>Stage toont 3D-humanoid, VRM of Halloween-gezicht. Muziek neemt 9:16 op.</p>
      </li>
    </ol>

    <ul class="notes">
      <li>
        <strong>Hele lichaam</strong>
        armen, romp en benen sturen de avatar
      </li>
      <li>
        <strong>Gezicht</strong>
        hoofd, mond, ogen en bril sturen het figuur
      </li>
      <li>
        <strong>Muziek</strong>
        countdown, lipsync en WebM-opname
      </li>
    </ul>
  </section>
</template>

<style scoped>
.schema {
  display: grid;
  gap: 0.85rem;
}

h2 {
  margin: 0;
  font-size: 1.25rem;
}

.intro {
  margin: 0;
}

.flow {
  list-style: none;
  margin: 0.4rem 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  gap: 0.55rem;
  align-items: stretch;
}

.step {
  position: relative;
  display: grid;
  align-content: start;
  gap: 0.4rem;
  padding: 0.85rem 0.8rem 0.95rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #140f18;
}

.num {
  position: absolute;
  top: 0.55rem;
  right: 0.6rem;
  width: 1.35rem;
  height: 1.35rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #2a2333;
  color: var(--accent-2);
  font-size: 0.72rem;
  font-weight: 700;
}

.icon {
  width: 2.4rem;
  height: 2.4rem;
  color: var(--accent);
}

.icon svg {
  width: 100%;
  height: 100%;
}

h3 {
  margin: 0;
  font-size: 0.95rem;
}

.step p,
.notes li {
  margin: 0;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.4;
}

.arrow {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.2rem;
  min-width: 3.4rem;
  color: var(--accent-2);
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.arrow::after {
  content: '';
  width: 2.2rem;
  height: 0.45rem;
  background:
    linear-gradient(90deg, var(--accent), var(--accent-2)) no-repeat left center / calc(100% - 0.35rem) 2px,
    linear-gradient(135deg, var(--accent-2) 50%, transparent 50%) no-repeat right top / 0.42rem 0.42rem,
    linear-gradient(-135deg, var(--accent-2) 50%, transparent 50%) no-repeat right bottom / 0.42rem 0.42rem;
}

.notes {
  list-style: none;
  margin: 0.15rem 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
}

.notes li {
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: #100d14;
  border: 1px solid #2a2333;
}

.notes strong {
  display: block;
  margin-bottom: 0.15rem;
  color: var(--text);
  font-size: 0.78rem;
}

@media (max-width: 860px) {
  .flow {
    grid-template-columns: 1fr;
  }

  .arrow {
    min-height: 1.8rem;
    transform: rotate(90deg);
    justify-self: center;
  }

  .notes {
    grid-template-columns: 1fr;
  }
}
</style>

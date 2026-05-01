// ═══════════════════════════════════════════════════════════════
//  ELO RATING SYSTEM — localStorage-based rating tracker
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'battleChessElo';
const DEFAULT_ELO = 1200;
const K = 32;

// AI difficulty → approximate opponent ELO
const DIFF_ELO = {
    RECRUIT: 800,
    SOLDIER: 1000,
    COMMANDER: 1400,
    GRANDMASTER: 1800,
};

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { elo: DEFAULT_ELO, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0 };
}

function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

/**
 * Get current ELO stats
 * @returns {{ elo: number, wins: number, losses: number, draws: number, streak: number, bestStreak: number }}
 */
export function getElo() {
    return load();
}

/**
 * Update ELO after a game
 * @param {'win'|'loss'|'draw'} result
 * @param {string} difficulty — AI difficulty key (RECRUIT, SOLDIER, COMMANDER, GRANDMASTER)
 * @returns {{ elo: number, change: number }} — new ELO and the delta
 */
export function updateElo(result, difficulty) {
    const data = load();
    const opponentElo = DIFF_ELO[difficulty] || 1000;

    // Expected score (standard ELO formula)
    const expected = 1 / (1 + Math.pow(10, (opponentElo - data.elo) / 400));

    // Actual score
    const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;

    // New rating
    const change = Math.round(K * (actual - expected));
    data.elo = Math.max(100, data.elo + change); // floor at 100

    // Stats
    if (result === 'win') { data.wins++; data.streak++; }
    else if (result === 'loss') { data.losses++; data.streak = 0; }
    else { data.draws++; }
    if (data.streak > data.bestStreak) data.bestStreak = data.streak;

    save(data);
    return { elo: data.elo, change };
}

/**
 * Reset all ELO data
 */
export function resetElo() {
    save({ elo: DEFAULT_ELO, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0 });
}

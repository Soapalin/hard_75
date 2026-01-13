const DEFAULT_GOALS = [
  "45 min workout",
  "Second workout or active recovery",
  "1 gallon of water",
  "Stick to nutrition plan",
  "Read 10 pages",
  "Progress photo"
];

const goalList = document.getElementById("goalList");
const goalForm = document.getElementById("goalForm");
const goalInput = document.getElementById("goalInput");
const dailyChecklist = document.getElementById("dailyChecklist");
const todayLabel = document.getElementById("todayLabel");
const currentDay = document.getElementById("currentDay");
const currentStreak = document.getElementById("currentStreak");
const bestStreak = document.getElementById("bestStreak");
const completionRate = document.getElementById("completionRate");
const daysTracked = document.getElementById("daysTracked");
const lockToday = document.getElementById("lockToday");

const countdownTotal = document.getElementById("countdownTotal");
const countdownStart = document.getElementById("countdownStart");
const daysRemaining = document.getElementById("daysRemaining");

const resetGoals = document.getElementById("resetGoals");
const resetCountdown = document.getElementById("resetCountdown");

const challengeSelect = document.getElementById("challengeSelect");
const challengeName = document.getElementById("challengeName");
const newChallenge = document.getElementById("newChallenge");
const restartChallenge = document.getElementById("restartChallenge");
const saveChallengeName = document.getElementById("saveChallengeName");
const exportData = document.getElementById("exportData");
const importData = document.getElementById("importData");

const progressGrid = document.getElementById("progressGrid");
const progressSummary = document.getElementById("progressSummary");
const reviewDate = document.getElementById("reviewDate");
const reviewChecklist = document.getElementById("reviewChecklist");
const reviewLock = document.getElementById("reviewLock");

const reminderEnabled = document.getElementById("reminderEnabled");
const reminderTime = document.getElementById("reminderTime");
const testNotification = document.getElementById("testNotification");

const STORAGE_KEY = "pwa75_data_v2";
const SCHEMA_VERSION = 1;
const LEGACY_STORAGE = {
  goals: "pwa75_goals",
  checkins: "pwa75_checkins",
  countdown: "pwa75_countdown"
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
};

const addDays = (value, delta) => {
  const date = new Date(value + "T00:00:00");
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
};

const isPastDate = (value) => value < todayISO();

const createGoalObjects = (labels) =>
  labels.map((label) => ({ id: crypto.randomUUID(), label }));

const copyGoals = (goals) => goals.map((goal) => ({ id: goal.id, label: goal.label }));

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const createChallenge = ({ name, goals, countdown }) => ({
  id: crypto.randomUUID(),
  name: name || "75 Hard",
  createdAt: new Date().toISOString(),
  goals: goals || createGoalObjects(DEFAULT_GOALS),
  countdown: countdown || { totalDays: 75, startDate: todayISO() },
  checkins: {},
  locks: {},
  goalSnapshots: {},
  reminders: {
    enabled: false,
    time: "20:00",
    lastNotified: null
  }
});

const normalizeChallenge = (challenge) => {
  if (!challenge.id) challenge.id = crypto.randomUUID();
  if (!challenge.name) challenge.name = "75 Hard";
  if (!challenge.createdAt) challenge.createdAt = new Date().toISOString();
  if (!Array.isArray(challenge.goals) || challenge.goals.length === 0) {
    challenge.goals = createGoalObjects(DEFAULT_GOALS);
  }
  if (!challenge.countdown) {
    challenge.countdown = { totalDays: 75, startDate: todayISO() };
  }
  challenge.checkins = challenge.checkins || {};
  challenge.locks = challenge.locks || {};
  challenge.goalSnapshots = challenge.goalSnapshots || {};
  challenge.reminders = challenge.reminders || {
    enabled: false,
    time: "20:00",
    lastNotified: null
  };
};

const migrateLegacyData = () => {
  const legacyGoals = safeParse(localStorage.getItem(LEGACY_STORAGE.goals));
  const legacyCheckins = safeParse(localStorage.getItem(LEGACY_STORAGE.checkins));
  const legacyCountdown = safeParse(localStorage.getItem(LEGACY_STORAGE.countdown));

  if (!legacyGoals && !legacyCheckins && !legacyCountdown) return null;

  const goals = Array.isArray(legacyGoals) && legacyGoals.length > 0
    ? legacyGoals
    : createGoalObjects(DEFAULT_GOALS);

  const challenge = createChallenge({
    name: "My 75 Hard",
    goals,
    countdown: legacyCountdown || { totalDays: 75, startDate: todayISO() }
  });
  challenge.checkins = legacyCheckins || {};

  Object.keys(challenge.checkins).forEach((dateKey) => {
    challenge.goalSnapshots[dateKey] = copyGoals(goals);
    if (isPastDate(dateKey)) {
      challenge.locks[dateKey] = true;
    }
  });

  return {
    activeId: challenge.id,
    challenges: {
      [challenge.id]: challenge
    }
  };
};

const normalizeData = (data) => {
  if (!data || typeof data !== "object" || !data.challenges) {
    const starter = createChallenge({ name: "75 Hard" });
    return {
      schemaVersion: SCHEMA_VERSION,
      activeId: starter.id,
      challenges: { [starter.id]: starter }
    };
  }

  if (!data.schemaVersion) {
    data.schemaVersion = SCHEMA_VERSION;
  }

  Object.values(data.challenges).forEach(normalizeChallenge);
  if (!data.activeId || !data.challenges[data.activeId]) {
    const first = Object.keys(data.challenges)[0];
    data.activeId = first || createChallenge({ name: "75 Hard" }).id;
    if (!data.challenges[data.activeId]) {
      const challenge = createChallenge({ name: "75 Hard" });
      data.challenges[challenge.id] = challenge;
      data.activeId = challenge.id;
    }
  }

  return data;
};

let appData = (() => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    return normalizeData(safeParse(raw));
  }
  const migrated = migrateLegacyData();
  return normalizeData(migrated);
})();

const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
};

const getActiveChallenge = () => appData.challenges[appData.activeId];

const setActiveChallenge = (id) => {
  if (!appData.challenges[id]) return;
  appData.activeId = id;
  saveData();
  renderAll();
};

const getGoalsForDate = (challenge, dateKey) => {
  return challenge.goalSnapshots[dateKey] || challenge.goals;
};

const ensureSnapshot = (challenge, dateKey) => {
  if (!challenge.goalSnapshots[dateKey]) {
    challenge.goalSnapshots[dateKey] = copyGoals(challenge.goals);
  }
};

const isLocked = (challenge, dateKey) => {
  if (isPastDate(dateKey)) {
    return challenge.locks[dateKey] !== false;
  }
  return Boolean(challenge.locks[dateKey]);
};

const setLock = (challenge, dateKey, locked) => {
  if (isPastDate(dateKey)) {
    challenge.locks[dateKey] = locked ? true : false;
  } else {
    challenge.locks[dateKey] = locked;
  }
};

const cleanCheckins = (checkins, goals) => {
  const allowed = new Set(goals.map((goal) => goal.id));
  const cleaned = {};
  Object.keys(checkins || {}).forEach((goalId) => {
    if (allowed.has(goalId)) {
      cleaned[goalId] = Boolean(checkins[goalId]);
    }
  });
  return cleaned;
};

const isDayComplete = (dateKey, challenge) => {
  const goals = getGoalsForDate(challenge, dateKey);
  if (goals.length === 0) return false;
  const dayCheckins = challenge.checkins[dateKey];
  if (!dayCheckins) return false;
  return goals.every((goal) => Boolean(dayCheckins[goal.id]));
};

const renderGoals = (challenge) => {
  goalList.innerHTML = "";
  challenge.goals.forEach((goal) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = goal.label;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      challenge.goals = challenge.goals.filter((item) => item.id !== goal.id);
      const todayKey = todayISO();
      if (!isLocked(challenge, todayKey)) {
        challenge.goalSnapshots[todayKey] = copyGoals(challenge.goals);
        challenge.checkins[todayKey] = cleanCheckins(
          challenge.checkins[todayKey] || {},
          challenge.goalSnapshots[todayKey]
        );
      }
      saveData();
      renderAll();
    });

    li.append(label, remove);
    goalList.append(li);
  });
};

const renderChecklist = (challenge) => {
  const todayKey = todayISO();
  const goals = getGoalsForDate(challenge, todayKey);
  const dayCheckins = challenge.checkins[todayKey] || {};
  const locked = isLocked(challenge, todayKey);
  dailyChecklist.innerHTML = "";
  lockToday.checked = locked;

  goals.forEach((goal) => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(dayCheckins[goal.id]);
    checkbox.disabled = locked;

    checkbox.addEventListener("change", () => {
      if (locked) return;
      ensureSnapshot(challenge, todayKey);
      const today = cleanCheckins(challenge.checkins[todayKey] || {}, goals);
      today[goal.id] = checkbox.checked;
      challenge.checkins[todayKey] = today;
      saveData();
      updateDayBadge();
      updateStats(challenge);
      renderProgressGrid(challenge);
    });

    const text = document.createElement("span");
    text.textContent = goal.label;
    li.append(checkbox, text);
    dailyChecklist.append(li);
  });
};

const updateStats = (challenge) => {
  const allDates = Object.keys(challenge.checkins).sort();
  const trackedDays = allDates.length;
  daysTracked.textContent = trackedDays;

  if (trackedDays === 0 || challenge.goals.length === 0) {
    currentStreak.textContent = "0";
    bestStreak.textContent = "0";
    completionRate.textContent = "0%";
    return;
  }

  let completed = 0;
  let possible = 0;
  allDates.forEach((dateKey) => {
    const goals = getGoalsForDate(challenge, dateKey);
    if (goals.length === 0) return;
    possible += goals.length;
    goals.forEach((goal) => {
      if (challenge.checkins[dateKey]?.[goal.id]) completed += 1;
    });
  });

  const rate = possible === 0 ? 0 : Math.round((completed / possible) * 100);
  completionRate.textContent = `${rate}%`;

  let current = 0;
  let cursor = todayISO();
  while (isDayComplete(cursor, challenge)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  currentStreak.textContent = String(current);

  let best = 0;
  let running = 0;
  let previous = null;
  allDates.forEach((dateKey) => {
    const complete = isDayComplete(dateKey, challenge);
    if (!complete) {
      running = 0;
      previous = dateKey;
      return;
    }

    if (previous && dateKey === addDays(previous, 1)) {
      running += 1;
    } else {
      running = 1;
    }
    best = Math.max(best, running);
    previous = dateKey;
  });
  bestStreak.textContent = String(best);
};

const updateCountdown = (challenge) => {
  const totalDays = Number(countdownTotal.value) || 1;
  const startDate = countdownStart.value || todayISO();
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, diff);
  const remaining = Math.max(0, totalDays - elapsed);

  daysRemaining.textContent = remaining;
  currentDay.textContent = Math.min(totalDays, elapsed + 1);
  challenge.countdown = { totalDays, startDate };
  saveData();
  renderProgressGrid(challenge);
};

const updateDayBadge = () => {
  const challenge = getActiveChallenge();
  const data = challenge.countdown;
  const start = new Date(data.startDate + "T00:00:00");
  const diff = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, diff);
  currentDay.textContent = Math.min(data.totalDays, elapsed + 1);
};

const renderProgressGrid = (challenge) => {
  progressGrid.innerHTML = "";
  const totalDays = challenge.countdown.totalDays;
  const startDate = challenge.countdown.startDate;
  let completedDays = 0;

  for (let i = 0; i < totalDays; i += 1) {
    const dateKey = addDays(startDate, i);
    const goals = getGoalsForDate(challenge, dateKey);
    const dayCheckins = challenge.checkins[dateKey] || {};
    const completedCount = goals.filter((goal) => dayCheckins[goal.id]).length;

    let status = "empty";
    if (goals.length > 0 && completedCount === goals.length) {
      status = "complete";
      completedDays += 1;
    } else if (completedCount > 0) {
      status = "partial";
    }

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `progress-cell progress-cell--${status}`;
    cell.dataset.date = dateKey;
    cell.title = `${formatDate(dateKey)}: ${completedCount}/${goals.length || 0}`;
    cell.setAttribute(
      "aria-label",
      `Day ${i + 1} on ${formatDate(dateKey)}: ${completedCount} of ${goals.length || 0} complete`
    );

    const label = document.createElement("span");
    label.textContent = String(i + 1);
    cell.append(label);

    cell.addEventListener("click", () => {
      reviewDate.value = dateKey;
      renderReview(challenge, dateKey);
    });

    progressGrid.append(cell);
  }

  progressSummary.textContent = `${completedDays}/${totalDays}`;
};

const renderReview = (challenge, dateKey) => {
  const goals = getGoalsForDate(challenge, dateKey);
  const dayCheckins = challenge.checkins[dateKey] || {};
  const locked = isLocked(challenge, dateKey);

  reviewLock.checked = locked;
  reviewChecklist.innerHTML = "";

  goals.forEach((goal) => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(dayCheckins[goal.id]);
    checkbox.disabled = locked;

    checkbox.addEventListener("change", () => {
      if (locked) return;
      ensureSnapshot(challenge, dateKey);
      const updated = cleanCheckins(challenge.checkins[dateKey] || {}, goals);
      updated[goal.id] = checkbox.checked;
      challenge.checkins[dateKey] = updated;
      if (isPastDate(dateKey)) {
        challenge.locks[dateKey] = false;
      }
      saveData();
      updateStats(challenge);
      renderProgressGrid(challenge);
      if (dateKey === todayISO()) {
        renderChecklist(challenge);
      }
    });

    const text = document.createElement("span");
    text.textContent = goal.label;
    li.append(checkbox, text);
    reviewChecklist.append(li);
  });
};

const renderChallengeSelect = () => {
  challengeSelect.innerHTML = "";
  Object.values(appData.challenges).forEach((challenge) => {
    const option = document.createElement("option");
    option.value = challenge.id;
    option.textContent = challenge.name;
    challengeSelect.append(option);
  });
  challengeSelect.value = appData.activeId;
};

const updateReminderUI = (challenge) => {
  reminderEnabled.checked = Boolean(challenge.reminders.enabled);
  reminderTime.value = challenge.reminders.time || "20:00";
};

let reminderTimer = null;

const showNotification = async (title, options) => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
};

const checkReminder = () => {
  const challenge = getActiveChallenge();
  if (!challenge.reminders.enabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hours}:${minutes}`;
  const reminderTimeValue = challenge.reminders.time || "20:00";

  if (currentTime >= reminderTimeValue) {
    const todayKey = todayISO();
    if (challenge.reminders.lastNotified !== todayKey) {
      showNotification("75 Hard", {
        body: "Time to check off your daily goals.",
        icon: "icon.svg",
        tag: "pwa75-reminder"
      });
      challenge.reminders.lastNotified = todayKey;
      saveData();
    }
  }
};

const startReminderTimer = () => {
  if (reminderTimer) {
    clearInterval(reminderTimer);
  }
  reminderTimer = setInterval(checkReminder, 60 * 1000);
  checkReminder();
};

const renderAll = () => {
  const challenge = getActiveChallenge();

  todayLabel.textContent = formatDate(todayISO());
  countdownTotal.value = challenge.countdown.totalDays;
  countdownStart.value = challenge.countdown.startDate;
  challengeName.value = challenge.name;

  if (!reviewDate.value) {
    reviewDate.value = todayISO();
  }

  renderChallengeSelect();
  renderGoals(challenge);
  renderChecklist(challenge);
  updateCountdown(challenge);
  updateStats(challenge);
  renderProgressGrid(challenge);
  renderReview(challenge, reviewDate.value);
  updateReminderUI(challenge);
  startReminderTimer();
};

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = goalInput.value.trim();
  if (!value) return;

  const challenge = getActiveChallenge();
  challenge.goals.push({ id: crypto.randomUUID(), label: value });

  const todayKey = todayISO();
  if (!isLocked(challenge, todayKey)) {
    challenge.goalSnapshots[todayKey] = copyGoals(challenge.goals);
    challenge.checkins[todayKey] = cleanCheckins(
      challenge.checkins[todayKey] || {},
      challenge.goalSnapshots[todayKey]
    );
  }

  saveData();
  goalInput.value = "";
  renderAll();
});

countdownTotal.addEventListener("input", () => {
  updateCountdown(getActiveChallenge());
});

countdownStart.addEventListener("change", () => {
  updateCountdown(getActiveChallenge());
});

resetGoals.addEventListener("click", () => {
  const challenge = getActiveChallenge();
  challenge.goals = createGoalObjects(DEFAULT_GOALS);
  const todayKey = todayISO();
  if (!isLocked(challenge, todayKey)) {
    challenge.goalSnapshots[todayKey] = copyGoals(challenge.goals);
    challenge.checkins[todayKey] = cleanCheckins(
      challenge.checkins[todayKey] || {},
      challenge.goalSnapshots[todayKey]
    );
  }
  saveData();
  renderAll();
});

resetCountdown.addEventListener("click", () => {
  const challenge = getActiveChallenge();
  challenge.countdown = { totalDays: 75, startDate: todayISO() };
  saveData();
  renderAll();
});

lockToday.addEventListener("change", () => {
  const challenge = getActiveChallenge();
  const todayKey = todayISO();
  setLock(challenge, todayKey, lockToday.checked);
  saveData();
  renderChecklist(challenge);
  renderReview(challenge, reviewDate.value);
});

reviewDate.addEventListener("change", () => {
  renderReview(getActiveChallenge(), reviewDate.value || todayISO());
});

reviewLock.addEventListener("change", () => {
  const challenge = getActiveChallenge();
  const dateKey = reviewDate.value || todayISO();
  if (isPastDate(dateKey) && !reviewLock.checked) {
    const approved = window.confirm("Unlock this past day for edits?");
    if (!approved) {
      reviewLock.checked = true;
      return;
    }
  }
  setLock(challenge, dateKey, reviewLock.checked);
  saveData();
  renderReview(challenge, dateKey);
  if (dateKey === todayISO()) {
    renderChecklist(challenge);
  }
});

challengeSelect.addEventListener("change", () => {
  setActiveChallenge(challengeSelect.value);
});

newChallenge.addEventListener("click", () => {
  const name = window.prompt("Name your new challenge:", "New 75 Hard");
  const challenge = createChallenge({ name: name || "New 75 Hard" });
  appData.challenges[challenge.id] = challenge;
  appData.activeId = challenge.id;
  saveData();
  renderAll();
});

restartChallenge.addEventListener("click", () => {
  const active = getActiveChallenge();
  const approved = window.confirm("Restart this challenge with the same goals?");
  if (!approved) return;
  const challenge = createChallenge({
    name: `${active.name} Restart`,
    goals: copyGoals(active.goals),
    countdown: { totalDays: active.countdown.totalDays, startDate: todayISO() }
  });
  appData.challenges[challenge.id] = challenge;
  appData.activeId = challenge.id;
  saveData();
  renderAll();
});

saveChallengeName.addEventListener("click", () => {
  const active = getActiveChallenge();
  const value = challengeName.value.trim();
  if (!value) return;
  active.name = value;
  saveData();
  renderAll();
});

exportData.addEventListener("click", () => {
  const data = JSON.stringify(appData, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `75hard-backup-${todayISO()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

importData.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeParse(reader.result);
    if (!parsed || !parsed.challenges) {
      window.alert("Invalid backup file.");
      return;
    }
    const approved = window.confirm("Replace current data with this backup?");
    if (!approved) return;
    appData = normalizeData(parsed);
    saveData();
    renderAll();
  };
  reader.readAsText(file);
  event.target.value = "";
});

reminderEnabled.addEventListener("change", async () => {
  const challenge = getActiveChallenge();
  if (reminderEnabled.checked) {
    if (!("Notification" in window)) {
      window.alert("Notifications are not supported in this browser.");
      reminderEnabled.checked = false;
      return;
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        reminderEnabled.checked = false;
        return;
      }
    } else if (Notification.permission !== "granted") {
      reminderEnabled.checked = false;
      return;
    }
  }
  challenge.reminders.enabled = reminderEnabled.checked;
  saveData();
  startReminderTimer();
});

reminderTime.addEventListener("change", () => {
  const challenge = getActiveChallenge();
  challenge.reminders.time = reminderTime.value || "20:00";
  saveData();
  startReminderTimer();
});

testNotification.addEventListener("click", () => {
  showNotification("75 Hard", {
    body: "This is your daily reminder.",
    icon: "icon.svg",
    tag: "pwa75-test"
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

renderAll();

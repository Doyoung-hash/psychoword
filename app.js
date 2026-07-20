const state = {
  words: [],
  sets: [],
  currentUser: "사용자 1",
  currentSet: 1,
  currentQuiz: [],
  currentMode: "word-to-meaning",
};

const els = {
  totalWords: document.querySelector("#totalWords"),
  totalSets: document.querySelector("#totalSets"),
  historyCount: document.querySelector("#historyCount"),
  setGrid: document.querySelector("#setGrid"),
  searchInput: document.querySelector("#searchInput"),
  setSelect: document.querySelector("#setSelect"),
  modeSelect: document.querySelector("#modeSelect"),
  quizTitle: document.querySelector("#quizTitle"),
  quizIntro: document.querySelector("#quizIntro"),
  quizForm: document.querySelector("#quizForm"),
  submitRow: document.querySelector("#submitRow"),
  newQuiz: document.querySelector("#newQuiz"),
  submitQuiz: document.querySelector("#submitQuiz"),
  resultPanel: document.querySelector("#resultPanel"),
  detailRange: document.querySelector("#detailRange"),
  detailTitle: document.querySelector("#detailTitle"),
  wordTable: document.querySelector("#wordTable"),
  startFromDetail: document.querySelector("#startFromDetail"),
  backToSets: document.querySelector("#backToSets"),
  historyList: document.querySelector("#historyList"),
  clearHistory: document.querySelector("#clearHistory"),
};

init();

function init() {
  const data = window.WORD_DATA;
  if (!data || !Array.isArray(data.words)) {
    document.body.innerHTML =
      '<div class="app-shell"><div class="empty-state">단어 데이터를 불러오지 못했습니다.</div></div>';
    return;
  }
  state.words = data.words;
  state.sets = groupIntoSets(state.words);

  bindEvents();
  renderSummary();
  renderSetOptions();
  renderSets();
  renderHistory();
}

function bindEvents() {
  document.querySelectorAll(".user-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentUser = button.dataset.user;
      document.querySelectorAll(".user-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderSummary();
      renderHistory();
    });
  });

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  els.searchInput.addEventListener("input", renderSets);
  els.newQuiz.addEventListener("click", () => startQuiz(Number(els.setSelect.value)));
  els.submitQuiz.addEventListener("click", gradeQuiz);
  els.backToSets.addEventListener("click", () => showView("sets"));
  els.startFromDetail.addEventListener("click", () => startQuiz(state.currentSet));
  els.clearHistory.addEventListener("click", clearCurrentHistory);
}

function groupIntoSets(words) {
  return words.reduce((sets, word) => {
    const index = word.set - 1;
    if (!sets[index]) sets[index] = [];
    sets[index].push(word);
    return sets;
  }, []);
}

function showView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });

  const target = document.querySelector(`#${viewName}View`);
  if (target) target.classList.add("active");
}

function renderSummary() {
  els.totalWords.textContent = state.words.length.toLocaleString("ko-KR");
  els.totalSets.textContent = `${state.sets.length}세트`;
  els.historyCount.textContent = `${getHistory().length}회`;
}

function renderSetOptions() {
  els.setSelect.innerHTML = state.sets
    .map((setWords, index) => {
      const start = setWords[0].id;
      const end = setWords[setWords.length - 1].id;
      return `<option value="${index + 1}">${index + 1}세트 (${start}-${end})</option>`;
    })
    .join("");
}

function renderSets() {
  const keyword = normalize(els.searchInput.value);
  const visibleSets = state.sets
    .map((setWords, index) => ({ setWords, setNumber: index + 1 }))
    .filter(({ setWords }) => {
      if (!keyword) return true;
      return setWords.some((item) =>
        normalize(`${item.word} ${item.pronunciation} ${item.meaning}`).includes(keyword),
      );
    });

  els.setGrid.innerHTML = visibleSets
    .map(({ setWords, setNumber }) => {
      const first = setWords[0];
      const last = setWords[setWords.length - 1];
      const preview = setWords
        .slice(0, 3)
        .map((item) => item.word)
        .join(", ");
      return `
        <article class="set-card">
          <div>
            <p class="eyebrow">${first.id}-${last.id}</p>
            <h3>${setNumber}세트</h3>
            <div class="set-meta">${setWords.length}개 단어</div>
          </div>
          <div class="set-preview">${escapeHtml(preview)}...</div>
          <div class="card-actions">
            <button class="ghost-button" type="button" data-detail="${setNumber}">단어 보기</button>
            <button class="primary-button" type="button" data-start="${setNumber}">시험 시작</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.setGrid.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showSetDetail(Number(button.dataset.detail)));
  });
  els.setGrid.querySelectorAll("[data-start]").forEach((button) => {
    button.addEventListener("click", () => startQuiz(Number(button.dataset.start)));
  });
}

function showSetDetail(setNumber) {
  state.currentSet = setNumber;
  const setWords = state.sets[setNumber - 1];
  const first = setWords[0];
  const last = setWords[setWords.length - 1];
  els.detailRange.textContent = `${first.id}번-${last.id}번`;
  els.detailTitle.textContent = `${setNumber}세트 단어 ${setWords.length}개`;
  els.wordTable.innerHTML = `
    <div class="word-row header">
      <span>번호</span><span>영단어</span><span>발음</span><span>뜻</span>
    </div>
    ${setWords
      .map(
        (word) => `
          <div class="word-row">
            <span>${word.id}</span>
            <strong>${escapeHtml(word.word)}</strong>
            <span class="pronunciation">${escapeHtml(word.pronunciation)}</span>
            <span>${escapeHtml(word.meaning)}</span>
          </div>
        `,
      )
      .join("")}
  `;
  showView("detail");
}

function startQuiz(setNumber) {
  state.currentSet = setNumber;
  state.currentMode = els.modeSelect.value;
  els.setSelect.value = String(setNumber);
  const setWords = state.sets[setNumber - 1];
  const quizSize = Math.min(20, setWords.length);
  state.currentQuiz = shuffle([...setWords]).slice(0, quizSize);

  els.quizTitle.textContent = `${setNumber}세트 시험지`;
  els.quizIntro.classList.add("hidden");
  els.resultPanel.classList.add("hidden");
  els.quizForm.classList.remove("hidden");
  els.submitRow.classList.remove("hidden");

  els.quizForm.innerHTML = state.currentQuiz
    .map((item, index) => {
      const prompt = state.currentMode === "word-to-meaning" ? item.word : item.meaning;
      const hint = state.currentMode === "word-to-meaning" ? item.pronunciation : "영어 단어를 입력";
      return `
        <section class="question-card">
          <span class="question-number">${index + 1}</span>
          <div class="question-body">
            <div class="prompt">${escapeHtml(prompt)}</div>
            <div class="pronunciation">${escapeHtml(hint || "")}</div>
            <label class="field-label">
              답
              <input class="answer-input" name="answer-${item.id}" autocomplete="off" />
            </label>
          </div>
        </section>
      `;
    })
    .join("");

  showView("quiz");
}

function gradeQuiz() {
  if (!state.currentQuiz.length) return;
  const answers = state.currentQuiz.map((item) => {
    const input = els.quizForm.querySelector(`[name="answer-${item.id}"]`);
    const userAnswer = input.value.trim();
    const correctAnswer = state.currentMode === "word-to-meaning" ? item.meaning : item.word;
    const correct = isCorrect(userAnswer, correctAnswer, state.currentMode === "word-to-meaning");
    return { ...item, userAnswer, correctAnswer, correct };
  });
  const score = answers.filter((item) => item.correct).length;
  const record = {
    id: createRecordId(),
    user: state.currentUser,
    setNumber: state.currentSet,
    mode: state.currentMode,
    score,
    total: answers.length,
    createdAt: new Date().toISOString(),
    answers,
  };
  saveRecord(record);
  renderResult(record);
  renderSummary();
}

function renderResult(record) {
  const modeLabel = record.mode === "word-to-meaning" ? "영어 보고 뜻 쓰기" : "뜻 보고 영어 쓰기";
  els.resultPanel.classList.remove("hidden");
  els.resultPanel.innerHTML = `
    <div class="score-line">
      <div>
        <p class="eyebrow">${modeLabel}</p>
        <h3>${record.setNumber}세트 결과</h3>
      </div>
      <strong>${record.score}/${record.total}</strong>
    </div>
    ${renderReviewCards(record.answers)}
  `;
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    els.historyList.innerHTML = `<div class="empty-state">아직 저장된 시험 기록이 없어요.</div>`;
    return;
  }

  const groupedHistory = groupHistoryBySet(history);
  els.historyList.innerHTML = groupedHistory.map(renderHistoryGroup).join("");

  els.historyList.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = els.historyList.querySelector(`[data-detail-panel="${button.dataset.toggle}"]`);
      if (panel) panel.classList.toggle("hidden");
    });
  });

  els.historyList.querySelectorAll("[data-review]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = getHistory().find((item) => item.id === button.dataset.review);
      if (record) {
        renderResult(record);
        showView("quiz");
      }
    });
  });

  els.historyList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteHistoryRecord(button.dataset.delete));
  });
}

function groupHistoryBySet(history) {
  const groups = new Map();
  history.forEach((record) => {
    if (!groups.has(record.setNumber)) groups.set(record.setNumber, []);
    groups.get(record.setNumber).push(record);
  });
  return [...groups.entries()]
    .sort(([setA], [setB]) => setA - setB)
    .map(([setNumber, records]) => ({ setNumber, records }));
}

function renderHistoryGroup(group) {
  const attempts = group.records.length;
  const averageRatio =
    group.records.reduce((sum, record) => sum + record.score / record.total, 0) / attempts;
  const average = Math.round(averageRatio * 100);
  const best = Math.max(...group.records.map((record) => record.score));
  return `
    <section class="history-group">
      <div class="history-group-head">
        <div>
          <p class="eyebrow">Set ${group.setNumber}</p>
          <h3>${group.setNumber}세트</h3>
        </div>
        <div class="history-group-stats">
          <span>응시 ${attempts}회</span>
          <span>평균 ${average}점</span>
          <span>최고 ${best}/20</span>
        </div>
      </div>
      <div class="history-record-grid">
        ${group.records.map((record, index) => renderHistoryCard(record, index)).join("")}
      </div>
    </section>
  `;
}

function renderHistoryCard(record, recordIndex) {
  const wrong = record.answers.filter((item) => !item.correct);
  const correctCount = record.total - wrong.length;
  const date = new Date(record.createdAt).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const modeLabel = record.mode === "word-to-meaning" ? "영어→뜻" : "뜻→영어";
  return `
    <article class="history-card">
      <button class="history-summary" type="button" data-toggle="${record.id}">
        <span class="history-number">${recordIndex + 1}</span>
        <div>
          <h3>${date}</h3>
          <p>${modeLabel}</p>
        </div>
        <div class="history-score">
          <strong>맞음 ${correctCount}</strong>
          <span>틀림 ${wrong.length}</span>
        </div>
      </button>
      <div class="history-detail hidden" data-detail-panel="${record.id}">
        <div class="history-actions">
          <button class="ghost-button" type="button" data-review="${record.id}">결과 화면으로 보기</button>
          <button class="danger-button" type="button" data-delete="${record.id}">이 기록 삭제</button>
        </div>
        ${renderReviewCards(record.answers, "compact")}
      </div>
    </article>
  `;
}

function renderReviewCards(answers, extraClass = "") {
  return `
    <div class="review-list ${extraClass}">
      ${answers
        .map(
          (item, index) => `
            <article class="review-item ${item.correct ? "correct" : "wrong"}">
              <div class="review-head">
                <span class="question-number">${index + 1}</span>
                <strong>${escapeHtml(item.word)}</strong>
              </div>
              <dl class="review-pairs">
                <div>
                  <dt>정답</dt>
                  <dd>${escapeHtml(item.correctAnswer || "-")}</dd>
                </div>
                <div>
                  <dt>내 답</dt>
                  <dd>${escapeHtml(item.userAnswer || "(빈칸)")}</dd>
                </div>
              </dl>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function getHistory() {
  const raw = localStorage.getItem(historyKey());
  return raw ? JSON.parse(raw) : [];
}

function saveRecord(record) {
  const history = [record, ...getHistory()].slice(0, 100);
  localStorage.setItem(historyKey(), JSON.stringify(history));
}

function clearCurrentHistory() {
  const hasHistory = getHistory().length > 0;
  if (!hasHistory) return;
  const ok = confirm(`${state.currentUser}의 시험 기록을 모두 삭제할까요?`);
  if (!ok) return;
  localStorage.removeItem(historyKey());
  renderHistory();
  renderSummary();
}

function deleteHistoryRecord(recordId) {
  const history = getHistory();
  const record = history.find((item) => item.id === recordId);
  if (!record) return;
  const date = new Date(record.createdAt).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const ok = confirm(`${date} 기록을 삭제할까요?`);
  if (!ok) return;
  localStorage.setItem(historyKey(), JSON.stringify(history.filter((item) => item.id !== recordId)));
  renderHistory();
  renderSummary();
}

function historyKey() {
  return `psycho-vocab-history:${state.currentUser}`;
}

function createRecordId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[0-9]+[.)]/g, "")
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function isCorrect(userAnswer, correctAnswer, allowUnorderedTerms = false) {
  if (!userAnswer) return false;
  const normalizedUser = normalize(userAnswer);
  const normalizedCorrect = normalize(correctAnswer);
  if (normalizedUser === normalizedCorrect) return true;
  if (!allowUnorderedTerms) return false;
  const correctHasListDelimiter = /[0-9]+[.)]|[①②③④⑤⑥⑦⑧⑨⑩]|[,;\n/·]/.test(correctAnswer);
  const userTerms = splitAnswerTerms(userAnswer, correctHasListDelimiter);
  const correctTerms = splitAnswerTerms(correctAnswer, correctHasListDelimiter);
  if (!userTerms.length || !correctTerms.length) return false;
  if (userTerms.length === 1) return correctTerms.includes(userTerms[0]);
  return userTerms.every((term) => correctTerms.includes(term));
}

function splitAnswerTerms(value, splitSpaces = false) {
  const separators = splitSpaces ? /[,\n;\/·]+|\s+|(?:랑|와|과|및)/ : /[,\n;\/·]+|\s{2,}/;
  return String(value || "")
    .replace(/[0-9]+[.)]/g, "")
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, "")
    .split(separators)
    .map(normalize)
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

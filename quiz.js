// quiz.js — CompTIA A+, Network+, Security+ Quiz Generator (free 5-question preview)

(function () {
  "use strict";

  var API_URL = "/.netlify/functions/generate-quiz";
  var QUIZ_LENGTH = 5;

  /* ───────── State ───────── */

  var currentExam = null;
  var pool = [];
  var currentIndex = 0;
  var score = 0;
  var answered = false;

  /* ───────── DOM ───────── */

  var startScreen   = document.getElementById("quizStart");
  var quizScreen    = document.getElementById("quizActive");
  var resultScreen  = document.getElementById("quizResult");
  var paywallScreen = document.getElementById("quizPaywall");
  if (!startScreen) return; // not on quiz page

  var examBtns      = document.querySelectorAll("[data-exam]");
  var beginBtn      = document.getElementById("beginQuiz");

  var progressBar   = document.getElementById("progressBar");
  var progressText  = document.getElementById("progressText");
  var scoreText     = document.getElementById("scoreText");
  var questionEl    = document.getElementById("questionText");
  var optionsEl     = document.getElementById("optionsList");
  var feedbackEl    = document.getElementById("feedback");
  var nextBtn       = document.getElementById("nextBtn");

  var finalScore    = document.getElementById("finalScore");
  var finalTotal    = document.getElementById("finalTotal");
  var finalPercent  = document.getElementById("finalPercent");
  var finalMsg      = document.getElementById("finalMsg");
  var retryBtn      = document.getElementById("retryBtn");
  var newQuizBtn    = document.getElementById("newQuizBtn");

  var loadingEl     = document.getElementById("quizLoading");

  /* ───────── Helpers ───────── */

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function show(el) { if (el) el.classList.remove("hidden"); }
  function hide(el) { if (el) el.classList.add("hidden"); }

  function hideAllScreens() {
    hide(startScreen);
    hide(quizScreen);
    hide(resultScreen);
    hide(paywallScreen);
    hide(loadingEl);
  }

  /* ───────── Exam Selection ───────── */

  examBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      examBtns.forEach(function (b) { b.classList.remove("selected"); });
      btn.classList.add("selected");
      currentExam = btn.dataset.exam;
      beginBtn.disabled = false;
      beginBtn.classList.add("ready");
    });
  });

  /* ───────── Fetch Questions ───────── */

  function fetchQuestions(exam, count) {
    return fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam: exam, count: count })
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error(err.error || "Failed to generate quiz");
        });
      }
      return res.json();
    })
    .then(function (data) {
      return data.questions;
    });
  }

  /* ───────── Start Quiz ───────── */

  beginBtn.addEventListener("click", function () {
    if (!currentExam) return;

    hideAllScreens();
    show(loadingEl);

    fetchQuestions(currentExam, QUIZ_LENGTH)
      .then(function (questions) {
        pool = questions;
        currentIndex = 0;
        score = 0;
        hideAllScreens();
        show(quizScreen);
        renderQuestion();
      })
      .catch(function (err) {
        hideAllScreens();
        show(startScreen);
        var msg = err.message.toLowerCase().indexOf("too many") !== -1
          ? "Rate limit reached. Please wait about 30 seconds and try again."
          : "Could not generate quiz: " + err.message + "\n\nPlease try again.";
        alert(msg);
      });
  });

  /* ───────── Render Question ───────── */

  function renderQuestion() {
    answered = false;
    hide(feedbackEl);
    nextBtn.disabled = true;
    nextBtn.classList.remove("ready");

    var q = pool[currentIndex];
    var num = currentIndex + 1;
    var total = pool.length;

    progressBar.style.width = ((num / total) * 100) + "%";
    progressText.textContent = "Question " + num + " of " + total;
    scoreText.textContent = "Score: " + score + "/" + (num - 1);
    questionEl.textContent = q.q;

    // Build shuffled options but track the correct one
    var indexed = q.options.map(function (text, i) { return { text: text, original: i }; });
    var shuffled = shuffle(indexed.slice());

    optionsEl.innerHTML = "";
    shuffled.forEach(function (opt) {
      var li = document.createElement("li");
      var button = document.createElement("button");
      button.className = "quiz-option";
      button.textContent = opt.text;
      button.dataset.idx = opt.original;
      button.addEventListener("click", function () { handleAnswer(button, q, shuffled); });
      li.appendChild(button);
      optionsEl.appendChild(li);
    });
  }

  /* ───────── Handle Answer ───────── */

  function handleAnswer(btn, q, shuffled) {
    if (answered) return;
    answered = true;

    var chosen = parseInt(btn.dataset.idx, 10);
    var correct = chosen === q.answer;

    // Mark all buttons
    var allBtns = optionsEl.querySelectorAll(".quiz-option");
    allBtns.forEach(function (b) {
      b.disabled = true;
      var idx = parseInt(b.dataset.idx, 10);
      if (idx === q.answer) {
        b.classList.add("correct");
      } else if (b === btn && !correct) {
        b.classList.add("wrong");
      }
    });

    if (correct) score++;

    // Show feedback
    feedbackEl.innerHTML =
      '<div class="feedback-header ' + (correct ? "correct" : "wrong") + '">' +
      (correct ? "Correct!" : "Incorrect") +
      "</div>" +
      '<p class="feedback-explain">' + escapeHtml(q.explanation) + "</p>";
    show(feedbackEl);

    nextBtn.disabled = false;
    nextBtn.classList.add("ready");
    nextBtn.textContent = (currentIndex === pool.length - 1) ? "View Results" : "Next Question";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ───────── Next / Results ───────── */

  nextBtn.addEventListener("click", function () {
    currentIndex++;
    if (currentIndex >= pool.length) {
      showResults();
    } else {
      renderQuestion();
    }
  });

  function showResults() {
    hideAllScreens();
    show(resultScreen);

    var total = pool.length;
    var pct = Math.round((score / total) * 100);
    finalScore.textContent = score;
    finalTotal.textContent = total;
    finalPercent.textContent = pct + "%";

    // Animate the ring
    var ring = document.getElementById("scoreRing");
    if (ring) {
      var circumference = 2 * Math.PI * 54;
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = circumference;
      setTimeout(function () {
        ring.style.strokeDashoffset = circumference - (circumference * pct / 100);
      }, 100);
    }

    if (pct >= 90) {
      finalMsg.textContent = "Outstanding! You're exam-ready.";
      finalMsg.className = "result-msg great";
    } else if (pct >= 70) {
      finalMsg.textContent = "Good work! Review the topics you missed.";
      finalMsg.className = "result-msg good";
    } else if (pct >= 50) {
      finalMsg.textContent = "Getting there. Focus on your weak areas.";
      finalMsg.className = "result-msg okay";
    } else {
      finalMsg.textContent = "Keep studying. Review fundamentals and try again.";
      finalMsg.className = "result-msg needs-work";
    }
  }

  /* ───────── Retry / New Quiz ───────── */

  retryBtn.addEventListener("click", function () {
    hideAllScreens();
    show(loadingEl);

    fetchQuestions(currentExam, QUIZ_LENGTH)
      .then(function (questions) {
        pool = questions;
        currentIndex = 0;
        score = 0;
        hideAllScreens();
        show(quizScreen);
        renderQuestion();
      })
      .catch(function (err) {
        hideAllScreens();
        show(resultScreen);
        var msg = err.message.toLowerCase().indexOf("too many") !== -1
          ? "Rate limit reached. Please wait about 30 seconds and try again."
          : "Could not generate quiz: " + err.message + "\n\nPlease try again.";
        alert(msg);
      });
  });

  newQuizBtn.addEventListener("click", function () {
    currentExam = null;
    examBtns.forEach(function (b) { b.classList.remove("selected"); });
    beginBtn.disabled = true;
    beginBtn.classList.remove("ready");
    hideAllScreens();
    show(startScreen);
  });

})();

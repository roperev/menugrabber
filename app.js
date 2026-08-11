/* ============================================================
   MenuGrabber — dashboard logic
   Reads data/menu.json (written daily by the scraper) and shows
   the selected day's LUNCH. Defaults to today; step through days
   with the nav buttons. Pure vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  var DATA_URL = "data/menu.json";

  // Category -> {emoji, color-var}. Matched by lowercase substring so small
  // naming changes from the district don't break the styling.
  var CATEGORY_STYLE = [
    { match: "entree",    emoji: "🍽️", color: "var(--entree)" },
    { match: "entrée",    emoji: "🍽️", color: "var(--entree)" },
    { match: "side",      emoji: "🍚", color: "var(--side)" },
    { match: "vegetable", emoji: "🥕", color: "var(--veg)" },
    { match: "veggie",    emoji: "🥕", color: "var(--veg)" },
    { match: "fruit",     emoji: "🍎", color: "var(--fruit)" },
    { match: "milk",      emoji: "🥛", color: "var(--milk)" },
    { match: "dessert",   emoji: "🍪", color: "var(--dessert)" }
  ];
  var DEFAULT_STYLE = { emoji: "🍴", color: "var(--default)" };

  // Per-item food emojis, matched by keyword (lowercase substring).
  // Ordered most-specific first so "corn dog" wins over "corn", etc.
  // Each item shows up to 2 matched emojis for a fun visual cue.
  var FOOD_EMOJI = [
    // --- mains / proteins ---
    { kw: ["corn dog", "corndog"],            emoji: "🌭" },
    { kw: ["hot dog", "hotdog"],              emoji: "🌭" },
    { kw: ["sausage", "bratwurst", "kielbasa", "pepperoni"], emoji: "🌭" },
    { kw: ["hamburger", "cheeseburger", "burger"], emoji: "🍔" },
    { kw: ["sloppy joe"],                     emoji: "🍔" },
    { kw: ["bacon"],                          emoji: "🥓" },
    { kw: ["chicken nugget", "nugget", "popcorn chicken", "chicken patty", "chicken tender", "chicken strip", "drumstick", "wing"], emoji: "🍗" },
    { kw: ["chicken", "poultry"],             emoji: "🍗" },
    { kw: ["turkey"],                         emoji: "🦃" },
    { kw: ["ham ", "rib", "pork", "meatloaf", "pot roast"], avoid: ["graham"], emoji: "🍖" },
    { kw: ["beef", "steak", "meatball", "salisbury", "brisket"], emoji: "🥩" },
    { kw: ["shrimp", "prawn"],                emoji: "🦐" },
    { kw: ["crab", "lobster", "clam"],        emoji: "🦀" },
    { kw: ["fish", "tuna", "salmon", "pollock", "cod ", "tilapia"], emoji: "🐟" },
    // --- handheld / plated mains ---
    { kw: ["pizza", "calzone", "stromboli", "flatbread"], emoji: "🍕" },
    { kw: ["taco"],                           emoji: "🌮" },
    { kw: ["burrito", "quesadilla", "nacho", "enchilada", "tamale", "chimichanga", "fajita"], emoji: "🌯" },
    { kw: ["dumpling", "potsticker", "egg roll", "eggroll", "spring roll", "wonton", "pierogi", "perogi", "gyoza"], emoji: "🥟" },
    { kw: ["sushi", "maki"],                  emoji: "🍣" },
    { kw: ["ramen"],                          emoji: "🍜" },
    { kw: ["spaghetti", "pasta", "macaroni", "mac and", "mac &", "noodle", "lasagna", "ravioli", "ziti", "penne", "alfredo", "marinara", "fettuccine", "rigatoni", "tortellini"], emoji: "🍝" },
    { kw: ["curry"],                          emoji: "🍛" },
    { kw: ["soup", "chili", "stew", "gumbo", "chowder"], emoji: "🍲" },
    { kw: ["gyro", "pita", "falafel", "shawarma"], emoji: "🥙" },
    { kw: ["uncrustable", "peanut butter", "pb&j", "pbj", "sunbutter"], emoji: "🥪" },
    { kw: ["sandwich", "sub ", "hoagie", "wrap", "panini", "melt"], emoji: "🥪" },
    { kw: ["pot pie", "quiche"],              emoji: "🥧" },
    // --- breakfast-y (occasionally at lunch) ---
    { kw: ["bagel"],                          emoji: "🥯" },
    { kw: ["croissant"],                      emoji: "🥐" },
    { kw: ["pretzel"],                        emoji: "🥨" },
    { kw: ["pancake", "hotcake", "flapjack"], emoji: "🥞" },
    { kw: ["waffle"],                         emoji: "🧇" },
    { kw: ["french toast", "toast"],          emoji: "🍞" },
    { kw: ["cereal", "oatmeal", "granola", "grits", "porridge"], emoji: "🥣" },
    { kw: ["omelet", "omelette", "scrambled", "frittata"], emoji: "🍳" },
    { kw: ["eggplant"],                       emoji: "🍆" },
    { kw: ["egg"], avoid: ["egg roll", "eggroll", "eggplant"], emoji: "🥚" },
    // --- sides / carbs ---
    { kw: ["sweet potato", "yam"],            emoji: "🍠" },
    { kw: ["fries", "french fry", "tater", "tots", "hash brown", "hashbrown", "potato", "wedge", "smiles"], emoji: "🍟" },
    { kw: ["tortilla chip", "potato chip", "corn chip", "doritos", "chips"], emoji: "🍟" },
    { kw: ["popcorn"], avoid: ["chicken", "shrimp"], emoji: "🍿" },
    { kw: ["rice", "pilaf", "risotto"],       emoji: "🍚" },
    { kw: ["bread", " bun", "roll", "biscuit", "breadstick", "cornbread", "garlic bread", "dinner roll"], emoji: "🍞" },
    { kw: ["corn"], avoid: ["corn dog", "corndog", "popcorn", "cornbread"], emoji: "🌽" },
    { kw: ["bean", "refried", "lentil"],      emoji: "🫘" },
    { kw: ["peas", "green bean", "snap pea", "snow pea", "edamame"], emoji: "🫛" },
    // --- veggies ---
    { kw: ["broccoli", "cauliflower"],        emoji: "🥦" },
    { kw: ["carrot"],                         emoji: "🥕" },
    { kw: ["salad", "lettuce", "greens", "slaw", "coleslaw"], emoji: "🥗" },
    { kw: ["spinach", "kale", "cabbage", "collard", "celery"], emoji: "🥬" },
    { kw: ["tomato"],                         emoji: "🍅" },
    { kw: ["pepper", "jalapeno"],             emoji: "🫑" },
    { kw: ["cucumber", "pickle", "zucchini", "squash"], emoji: "🥒" },
    { kw: ["mushroom"],                       emoji: "🍄" },
    { kw: ["onion"],                          emoji: "🧅" },
    { kw: ["avocado", "guacamole"],           emoji: "🥑" },
    // --- fruits ---
    { kw: ["apple"],                          emoji: "🍎" },
    { kw: ["banana", "plantain"],             emoji: "🍌" },
    { kw: ["orange", "mandarin", "clementine", "tangerine"], emoji: "🍊" },
    { kw: ["lemon", "lime"],                  emoji: "🍋" },
    { kw: ["grape", "raisin"],                emoji: "🍇" },
    { kw: ["pear"],                           emoji: "🍐" },
    { kw: ["peach", "apricot", "nectarine", "plum"], emoji: "🍑" },
    { kw: ["strawberr"],                      emoji: "🍓" },
    { kw: ["watermelon"],                     emoji: "🍉" },
    { kw: ["cantaloupe", "honeydew", "melon"], avoid: ["watermelon"], emoji: "🍈" },
    { kw: ["pineapple"],                      emoji: "🍍" },
    { kw: ["mango"],                          emoji: "🥭" },
    { kw: ["kiwi"],                           emoji: "🥝" },
    { kw: ["coconut"],                        emoji: "🥥" },
    { kw: ["blueberr", "blackberr", "raspberr", "mixed berr"], emoji: "🫐" },
    { kw: ["cherry"],                         emoji: "🍒" },
    { kw: ["fruit cup", "fruit cocktail", "mixed fruit", "fruit salad", "fruit medley"], emoji: "🍓" },
    // --- dairy / drinks ---
    { kw: ["string cheese", "cheese", "mozzarella", "cheddar", "queso"], emoji: "🧀" },
    { kw: ["chocolate milk"],                 emoji: "🍫" },
    { kw: ["milk"],                           emoji: "🥛" },
    { kw: ["yogurt", "go-gurt", "gogurt", "parfait"], emoji: "🥛" },
    { kw: ["smoothie", "shake", "slushie", "slush"], emoji: "🥤" },
    { kw: ["juice", "punch", "lemonade", "cider"], emoji: "🧃" },
    { kw: ["cocoa", "hot chocolate"],         emoji: "☕" },
    { kw: ["water"], avoid: ["watermelon", "melon"], emoji: "💧" },
    // --- desserts / snacks ---
    { kw: ["cookie"],                         emoji: "🍪" },
    { kw: ["brownie"],                        emoji: "🍫" },
    { kw: ["cupcake"],                        emoji: "🧁" },
    { kw: ["muffin"],                         emoji: "🧁" },
    { kw: ["cheesecake", "cake", "shortcake"], emoji: "🍰" },
    { kw: ["pie", "cobbler", "tart"],         emoji: "🥧" },
    { kw: ["ice cream", "sundae", "gelato", "sherbet", "sorbet"], emoji: "🍦" },
    { kw: ["pudding", "jello", "jell-o", "gelatin", "custard", "mousse"], emoji: "🍮" },
    { kw: ["donut", "doughnut"],              emoji: "🍩" },
    { kw: ["churro"],                         emoji: "🥖" },
    { kw: ["cracker", "graham", "cheez-it", "cheezit", "ritz"], emoji: "🍘" },
    { kw: ["goldfish"],                       emoji: "🐟" },
    { kw: ["scooby"],                         emoji: "🐕" },
    { kw: ["gummy", "gummies", "fruit snack", "candy", "jelly bean"], emoji: "🍬" },
    { kw: ["peanut", "almond", "cashew", "walnut", "trail mix", "sunflower seed"], emoji: "🥜" }
  ];

  // Return up to 2 fun emojis for a food item name, or "" if none match.
  function foodEmoji(name) {
    var lower = (name || "").toLowerCase();
    var found = [];
    for (var i = 0; i < FOOD_EMOJI.length && found.length < 2; i++) {
      var rule = FOOD_EMOJI[i];
      // Skip if a negative keyword is present (e.g. "water" vs "watermelon").
      if (rule.avoid && rule.avoid.some(function (a) { return lower.indexOf(a) !== -1; })) {
        continue;
      }
      for (var j = 0; j < rule.kw.length; j++) {
        if (lower.indexOf(rule.kw[j]) !== -1) {
          if (found.indexOf(rule.emoji) === -1) found.push(rule.emoji);
          break;
        }
      }
    }
    return found.join("");
  }

  // ---------- fun click interactions ----------
  var CONFETTI_COLORS = ["#ff5d8f", "#ffca3a", "#6ac66a", "#4dabf7", "#b980f0", "#ff7043"];
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Spray particles outward from a viewport point. With opts.chars they're
  // emoji; otherwise little colored confetti rectangles.
  function burst(x, y, opts) {
    opts = opts || {};
    var count = opts.count || 16;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "particle";
      if (opts.chars) {
        p.textContent = pick(opts.chars);
        p.style.fontSize = Math.round(rand(opts.min || 16, opts.max || 30)) + "px";
      } else {
        p.style.width = "9px";
        p.style.height = "13px";
        p.style.borderRadius = "2px";
        p.style.background = pick(CONFETTI_COLORS);
      }
      document.body.appendChild(p);
      var ang = rand(0, Math.PI * 2);
      var dist = rand(50, 130);
      var dx = Math.cos(ang) * dist;
      var dy = Math.sin(ang) * dist - (opts.rise || 0);
      var anim = p.animate([
        { transform: "translate(" + x + "px," + y + "px) translate(-50%,-50%) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + (x + dx) + "px," + (y + dy) + "px) translate(-50%,-50%) rotate(" +
            Math.round(rand(-360, 360)) + "deg)", opacity: 0 }
      ], { duration: rand(650, 1150), easing: "cubic-bezier(.15,.7,.3,1)" });
      anim.onfinish = (function (node) { return function () { node.remove(); }; })(p);
    }
  }

  function centerOf(elm) {
    var r = elm.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // ---- full-viewport confetti cannon (physics: launch up-and-inward, then fall) ----
  var confettiPieces = [];
  var confettiRunning = false;
  var confettiLast = 0;
  var CONFETTI_GRAVITY = 0.34;   // px per frame^2 (at 60fps)
  var prefersReducedMotion = false;

  function makeConfettiPiece(x, y, vx, vy) {
    var el = document.createElement("span");
    el.className = "particle";
    if (Math.random() < 0.16) {
      el.textContent = pick(["🎉", "🎊", "⭐", "✨"]);
      el.style.fontSize = Math.round(rand(16, 26)) + "px";
    } else {
      el.style.width = Math.round(rand(7, 12)) + "px";
      el.style.height = Math.round(rand(9, 16)) + "px";
      el.style.borderRadius = Math.random() < 0.5 ? "2px" : "50%";
      el.style.background = pick(CONFETTI_COLORS);
    }
    document.body.appendChild(el);
    confettiPieces.push({
      el: el, x: x, y: y, vx: vx, vy: vy,
      rot: rand(0, 360), vrot: rand(-16, 16),
      sway: rand(0, Math.PI * 2), swayAmp: rand(0.3, 1.3)
    });
  }

  // Fire two poppers: bottom-left aiming up-right, bottom-right aiming up-left.
  function confettiCannon() {
    if (prefersReducedMotion) return;
    if (confettiPieces.length > 500) return;   // safety cap for rapid clicks
    var W = window.innerWidth, H = window.innerHeight;
    var perSide = 46;
    for (var side = 0; side < 2; side++) {
      var dir = side === 0 ? 1 : -1;           // +1 = shoot right, -1 = shoot left
      var ox = side === 0 ? 0 : W;
      for (var i = 0; i < perSide; i++) {
        var speed = rand(15, 24);
        var ang = rand(55, 80) * Math.PI / 180; // above horizontal → mostly upward
        var vx = dir * Math.cos(ang) * speed * rand(0.7, 1.4);
        var vy = -Math.sin(ang) * speed;         // negative = up
        makeConfettiPiece(ox, H, vx, vy);
      }
    }
    if (!confettiRunning) {
      confettiRunning = true;
      confettiLast = 0;
      requestAnimationFrame(confettiStep);
    }
  }

  function confettiStep(now) {
    if (!confettiLast) confettiLast = now;
    var dt = Math.min(2.5, (now - confettiLast) / 16.667); // normalize to 60fps
    confettiLast = now;
    var H = window.innerHeight;
    for (var i = confettiPieces.length - 1; i >= 0; i--) {
      var p = confettiPieces[i];
      p.vy += CONFETTI_GRAVITY * dt;
      p.vx *= Math.pow(0.995, dt);              // gentle air drag
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      p.sway += 0.15 * dt;
      var sway = Math.sin(p.sway) * p.swayAmp;
      p.el.style.transform =
        "translate(" + (p.x + sway) + "px," + p.y + "px) rotate(" + p.rot + "deg)";
      if (p.y > H + 60) { p.el.remove(); confettiPieces.splice(i, 1); }
    }
    if (confettiPieces.length) {
      requestAnimationFrame(confettiStep);
    } else {
      confettiRunning = false;
    }
  }

  function beamEffect(card) {
    var existing = card.querySelector(".fx-beam");
    if (existing) existing.remove();
    var beam = document.createElement("span");
    beam.className = "fx-beam";
    card.appendChild(beam);
    beam.addEventListener("animationend", function () { beam.remove(); });
  }

  // Random silly effect when a whole card is clicked.
  function cardEffect(card) {
    var c = centerOf(card);
    switch (pick(["beam", "rainbow", "wobble", "pop", "cloud", "confetti"])) {
      case "beam":
        beamEffect(card);
        break;
      case "rainbow":
        card.animate([{ filter: "hue-rotate(0deg)" }, { filter: "hue-rotate(360deg)" }],
          { duration: 1000, easing: "linear" });
        break;
      case "wobble":
        card.animate([
          { transform: "rotate(0deg)" }, { transform: "rotate(-4deg)" },
          { transform: "rotate(4deg)" }, { transform: "rotate(-2deg)" }, { transform: "rotate(0deg)" }
        ], { duration: 550, composite: "add" });
        break;
      case "pop":
        card.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }],
          { duration: 420, composite: "add" });
        burst(c.x, c.y, { chars: ["✨", "⭐", "🌟", "💫"], count: 12, rise: 20 });
        break;
      case "cloud":
        burst(c.x, c.y, { chars: ["☁️", "💨"], count: 12, min: 22, max: 40, rise: 30 });
        break;
      case "confetti":
        burst(c.x, c.y, { count: 22, rise: 20 });
        break;
    }
  }

  // Toggle a food item "selected" (darker shade) with a little confetti pop.
  function selectItem(item, x, y) {
    var nowSelected = item.classList.toggle("selected");
    item.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
      { duration: 260, composite: "add" });
    burst(x, y, { count: 12, rise: 10 });    // local pop on both select & deselect
    if (nowSelected) confettiCannon();       // big corner poppers only when selecting
  }

  // ---------- theme switcher ----------
  // To add a theme: add a { id, label } here and a matching
  // [data-theme="id"] block in styles.css.
  // THEMES[0] is the default for first-time visitors (no saved choice).
  var THEMES = [
    { id: "sky",   label: "Cloudy Sky",  color: "#5eb3f0" },  // <- default
    { id: "space", label: "Outer Space", color: "#241a55" },
    { id: "balloon", label: "Balloon Party", color: "#8fd3f5" },
    { id: "sea",   label: "Under the Sea", color: "#1f8fcf" },
    { id: "meadow", label: "Sunny Meadow", color: "#a6e4ff" },
    { id: "dino",  label: "Dino World",   color: "#ffe1a8" },
    { id: "rainbow", label: "Rainbow Unicorn", color: "#ffbcdd" },
    { id: "winter", label: "Winter Wonderland", color: "#7ec8f0" },
    { id: "construction", label: "Construction Zone", color: "#ffcf5e" },
    { id: "farm",  label: "Barnyard Farm", color: "#9fd8f5" },
    { id: "castle", label: "Enchanted Castle", color: "#241640" },
    { id: "candy", label: "Candy Fun",   color: "#ff8a5c" }   // <- original theme, now last
  ];

  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].id === id) return THEMES[i]; }
    return THEMES[0];
  }

  function applyTheme(id) {
    var t = themeById(id);
    document.documentElement.setAttribute("data-theme", t.id);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.color);
    // Button keeps a static "Try a New Theme" label (set in HTML).
  }

  function setupThemes() {
    var saved = null;
    try { saved = localStorage.getItem("mg-theme"); } catch (e) {}
    applyTheme(saved || THEMES[0].id);
    var btn = document.getElementById("themeBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var idx = 0;
      for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].id === cur) { idx = i; break; } }
      var next = THEMES[(idx + 1) % THEMES.length].id;
      applyTheme(next);
      try { localStorage.setItem("mg-theme", next); } catch (e) {}
    });
  }

  // A CSS-drawn shooting star for the space theme: each one gets a random
  // start point, direction, length and speed. Runs on a self-scheduling timer.
  function spawnShootingStar() {
    var isSpace = document.documentElement.getAttribute("data-theme") === "space";
    if (isSpace && !prefersReducedMotion) {
      var sky = document.querySelector(".sky");
      if (sky) {
        var W = window.innerWidth, H = window.innerHeight;
        var startX = rand(0.08 * W, 0.92 * W);
        var startY = rand(-0.15 * H, 0.2 * H);
        var dir = Math.random() < 0.5 ? -1 : 1;         // streak left or right
        var dx = dir * rand(0.3, 0.7) * W;
        var dy = rand(0.45, 0.9) * H;                    // always heading down
        var angle = Math.atan2(dy, dx) * 180 / Math.PI;
        var star = document.createElement("div");
        star.className = "shooting-star";
        star.style.width = Math.round(rand(80, 160)) + "px";
        sky.appendChild(star);
        var anim = star.animate([
          { transform: "translate(" + startX + "px," + startY + "px) rotate(" + angle + "deg)", opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, offset: 0.82 },
          { transform: "translate(" + (startX + dx) + "px," + (startY + dy) + "px) rotate(" + angle + "deg)", opacity: 0 }
        ], { duration: rand(650, 1500), easing: "ease-in" });
        anim.onfinish = (function (node) { return function () { node.remove(); }; })(star);
      }
    }
    // reschedule: frequent-ish while in space, a lazy poll otherwise
    setTimeout(spawnShootingStar, isSpace ? rand(2200, 6000) : 1500);
  }

  function setupInteractions() {
    var menu = document.getElementById("menu");
    menu.addEventListener("click", function (e) {
      var item = e.target.closest(".chip, .hero-item");
      if (item && menu.contains(item)) {
        selectItem(item, e.clientX, e.clientY);
        return;
      }
      var card = e.target.closest(".hero, .cat");
      if (card && menu.contains(card)) cardEffect(card);
    });
  }

  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

  // --- state ---
  var menuData = null;
  var selected = null;   // Date at local midnight
  var today = null;      // Date at local midnight
  var minDate = null;    // earliest browsable day
  var maxDate = null;    // latest browsable day

  // --- date helpers (all local time, to avoid UTC off-by-one) ---
  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function key(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function sameDay(a, b) { return key(a) === key(b); }
  function parseKey(k) {
    var p = k.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  // Parse a ?day=/?date= URL parameter. Accepts either YYYY-MM-DD or
  // MM-DD-YYYY (year is always the 4-digit part). Returns a local-midnight
  // Date, or null if absent/invalid.
  function dateFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("day") || params.get("date");
    if (!raw) return null;
    var m;
    if ((m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {          // YYYY-MM-DD
      return buildDate(m[1], m[2], m[3]);
    }
    if ((m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) {          // MM-DD-YYYY
      return buildDate(m[3], m[1], m[2]);
    }
    if ((m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {        // MM/DD/YYYY
      return buildDate(m[3], m[1], m[2]);
    }
    return null;
  }

  function buildDate(y, mo, d) {
    var year = Number(y), month = Number(mo), day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    var dt = new Date(year, month - 1, day);
    // Reject overflow (e.g. Feb 31 rolling into March).
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
      return null;
    }
    return dt;
  }

  function styleFor(name) {
    var lower = (name || "").toLowerCase();
    for (var i = 0; i < CATEGORY_STYLE.length; i++) {
      if (lower.indexOf(CATEGORY_STYLE[i].match) !== -1) return CATEGORY_STYLE[i];
    }
    return DEFAULT_STYLE;
  }

  function isEntree(name) { return (name || "").toLowerCase().indexOf("entree") !== -1
                                 || (name || "").toLowerCase().indexOf("entrée") !== -1; }

  // --- DOM helpers ---
  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  // --- rendering ---
  function render() {
    var menu = document.getElementById("menu");
    var dayLabel = document.getElementById("dayLabel");
    var dayDate = document.getElementById("dayDate");

    // Friendly day label.
    var label;
    if (sameDay(selected, today)) label = "Today";
    else if (sameDay(selected, addDays(today, 1))) label = "Tomorrow";
    else if (sameDay(selected, addDays(today, -1))) label = "Yesterday";
    else label = WEEKDAYS[selected.getDay()];
    dayLabel.textContent = label;
    dayDate.textContent = WEEKDAYS[selected.getDay()] + ", " +
      MONTHS[selected.getMonth()] + " " + selected.getDate() + ", " + selected.getFullYear();

    menu.innerHTML = "";
    var day = menuData && menuData.days ? menuData.days[key(selected)] : null;
    var cats = day && day.categories ? day.categories : [];

    if (!cats.length) {
      menu.appendChild(noMenuCard());
    } else {
      // Entrée hero first, everything else as chip cards.
      var entrees = cats.filter(function (c) { return isEntree(c.name); });
      var others = cats.filter(function (c) { return !isEntree(c.name); });

      entrees.forEach(function (c) { menu.appendChild(heroCard(c)); });

      if (others.length) {
        var grid = el("div", "cat-grid");
        others.forEach(function (c) { grid.appendChild(catCard(c)); });
        menu.appendChild(grid);
      }
    }

    updateNav();
  }

  function heroCard(cat) {
    var hero = el("section", "hero");
    hero.appendChild(el("span", "hero-star", "⭐"));
    hero.appendChild(el("span", "hero-kicker", "🌟 Today's Star Dish"));
    var items = el("div", "hero-items");
    cat.items.forEach(function (name) {
      var row = el("div", "hero-item");
      var emoji = foodEmoji(name);
      row.appendChild(el("span", "hero-bullet", emoji || "🍽️"));
      row.appendChild(el("span", "hero-name", name));
      items.appendChild(row);
    });
    hero.appendChild(items);
    return hero;
  }

  function catCard(cat) {
    var st = styleFor(cat.name);
    var card = el("div", "cat");
    card.style.setProperty("--cat-color", st.color);

    var head = el("div", "cat-head");
    head.appendChild(el("span", "cat-emoji", st.emoji));
    head.appendChild(el("span", "cat-name", cat.name));
    card.appendChild(head);

    var chips = el("div", "chips");
    cat.items.forEach(function (name) {
      var chip = el("span", "chip");
      var emoji = foodEmoji(name);
      if (emoji) {
        chip.appendChild(el("span", "chip-emoji", emoji));
      }
      chip.appendChild(document.createTextNode(name));
      chips.appendChild(chip);
    });
    card.appendChild(chips);
    return card;
  }

  function noMenuCard() {
    var wrap = el("div", "message");
    var isWeekend = selected.getDay() === 0 || selected.getDay() === 6;
    wrap.appendChild(el("span", "big-emoji", isWeekend ? "🎉" : "🚫🍽️"));
    wrap.appendChild(el("div", "headline",
      isWeekend ? "It's the weekend!" : "No school lunch this day"));
    wrap.appendChild(el("div", null,
      isWeekend ? "No school lunch today — enjoy your day off!"
                : "Looks like there's no lunch served. Maybe a holiday or break!"));
    return wrap;
  }

  function errorCard(msg) {
    var wrap = el("div", "message");
    wrap.appendChild(el("span", "big-emoji", "😕"));
    wrap.appendChild(el("div", "headline", "Couldn't load the menu"));
    wrap.appendChild(el("div", null, msg));
    return wrap;
  }

  // --- navigation ---
  function updateNav() {
    var prev = document.getElementById("prevBtn");
    var next = document.getElementById("nextBtn");
    var todayBtn = document.getElementById("todayBtn");
    var tomorrowBtn = document.getElementById("tomorrowBtn");
    prev.disabled = !minDate || selected <= minDate;
    next.disabled = !maxDate || selected >= maxDate;
    todayBtn.disabled = sameDay(selected, today);
    // Tomorrow jump is available whenever we're not already looking at tomorrow.
    tomorrowBtn.disabled = sameDay(selected, addDays(today, 1));
  }

  function step(n) {
    var target = addDays(selected, n);
    if (minDate && target < minDate) target = minDate;
    if (maxDate && target > maxDate) target = maxDate;
    selected = target;
    render();
  }

  function goToday() { selected = midnight(today); render(); }

  function goTomorrow() {
    var target = addDays(today, 1);
    if (maxDate && target > maxDate) target = maxDate;
    selected = target;
    render();
  }

  // --- bootstrap ---
  function computeBounds() {
    var keys = Object.keys(menuData.days || {});
    if (keys.length) {
      keys.sort();
      var dataMin = parseKey(keys[0]);
      var dataMax = parseKey(keys[keys.length - 1]);
      // Always let the user reach today even if it's outside the data range.
      minDate = dataMin < today ? dataMin : today;
      maxDate = dataMax > today ? dataMax : today;
    } else {
      minDate = maxDate = midnight(today);
    }
    // Make sure the currently-selected day (e.g. from a ?day= link that falls
    // outside the data window) is always reachable with the nav buttons.
    if (selected < minDate) minDate = midnight(selected);
    if (selected > maxDate) maxDate = midnight(selected);
  }

  function renderUpdated() {
    var span = document.getElementById("updated");
    if (!menuData || !menuData.last_updated) { span.textContent = ""; return; }
    var d = new Date(menuData.last_updated);
    if (isNaN(d.getTime())) { span.textContent = ""; return; }
    var opts = { weekday: "short", month: "short", day: "numeric",
                 hour: "numeric", minute: "2-digit" };
    span.textContent = "🕐 Menu updated " + d.toLocaleString(undefined, opts);
  }

  function init() {
    today = midnight(new Date());
    prefersReducedMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var requested = dateFromQuery();
    selected = requested ? midnight(requested) : midnight(new Date());

    document.getElementById("prevBtn").addEventListener("click", function () { step(-1); });
    document.getElementById("nextBtn").addEventListener("click", function () { step(1); });
    document.getElementById("todayBtn").addEventListener("click", goToday);
    document.getElementById("tomorrowBtn").addEventListener("click", goTomorrow);
    setupThemes();
    setupInteractions();
    setTimeout(spawnShootingStar, 1200);   // start the space-theme shooting stars
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });

    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        menuData = data;
        if (data.school) {
          document.getElementById("school").textContent = data.school;
        }
        computeBounds();
        renderUpdated();
        render();
      })
      .catch(function (err) {
        var menu = document.getElementById("menu");
        menu.innerHTML = "";
        menu.appendChild(errorCard(
          "We couldn't reach the menu file. Please try again in a bit. (" + err.message + ")"));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

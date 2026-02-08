(function () {
  "use strict";

  const API_BASE = "https://www.loc.gov/pictures/search/";
  const ITEMS_PER_PAGE = 5;
  const MAX_RETRIES = 5;

  // Broad search terms to sample different parts of the catalog.
  // Each entry has a query and the approximate number of result pages (at 5 per page).
  const SEARCH_POOLS = [
    { q: "photograph", pages: 80000 },
    { q: "portrait", pages: 30000 },
    { q: "building", pages: 20000 },
    { q: "war", pages: 15000 },
    { q: "city", pages: 12000 },
    { q: "poster", pages: 25000 },
    { q: "drawing", pages: 15000 },
    { q: "map", pages: 8000 },
    { q: "landscape", pages: 10000 },
    { q: "woman", pages: 8000 },
    { q: "children", pages: 5000 },
    { q: "house", pages: 8000 },
    { q: "farm", pages: 5000 },
    { q: "ship", pages: 4000 },
    { q: "bridge", pages: 3000 },
    { q: "baseball", pages: 3000 },
    { q: "aviation", pages: 2000 },
    { q: "music", pages: 3000 },
  ];

  const btn = document.getElementById("fetch-btn");
  const loading = document.getElementById("loading");
  const error = document.getElementById("error");
  const errorMsg = document.getElementById("error-msg");
  const result = document.getElementById("result");
  const imgEl = document.getElementById("image");
  const titleEl = document.getElementById("title");
  const creatorEl = document.getElementById("creator");
  const dateEl = document.getElementById("date");
  const mediumEl = document.getElementById("medium");
  const subjectsEl = document.getElementById("subjects");
  const locLink = document.getElementById("loc-link");

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function randomInt(max) {
    return Math.floor(Math.random() * max) + 1;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Derive a larger image URL from the API-provided URL.
   * The "full" field often returns a 150px thumbnail; replacing the
   * suffix with "r.jpg" yields a larger version on tile.loc.gov.
   */
  function getLargeImageUrl(item) {
    const full = item.image && item.image.full;
    if (!full) return null;

    // Skip placeholder / group-record images
    if (full.includes("grouprecord") || full.includes("static/images")) {
      return null;
    }

    return full.replace(/_150px\.jpg$/, "r.jpg");
  }

  async function fetchRandomItem() {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const pool = pickRandom(SEARCH_POOLS);
      const page = randomInt(pool.pages);
      const url = `${API_BASE}?q=${encodeURIComponent(pool.q)}&fo=json&sp=${page}&c=${ITEMS_PER_PAGE}`;

      let resp;
      try {
        resp = await fetch(url);
      } catch {
        continue;
      }
      if (!resp.ok) continue;

      let data;
      try {
        data = await resp.json();
      } catch {
        continue;
      }

      const results = data.results;
      if (!results || results.length === 0) continue;

      // Shuffle and pick first result with a usable image
      const shuffled = results.sort(() => Math.random() - 0.5);
      for (const item of shuffled) {
        const imageUrl = getLargeImageUrl(item);
        if (imageUrl) return { item, imageUrl };
      }
    }

    throw new Error("Could not find an image after several attempts. Please try again.");
  }

  async function handleClick() {
    btn.disabled = true;
    hide(result);
    hide(error);
    show(loading);

    try {
      const { item, imageUrl } = await fetchRandomItem();

      imgEl.src = imageUrl;
      imgEl.alt = item.title || "Library of Congress image";
      titleEl.textContent = item.title || "Untitled";
      creatorEl.textContent = item.creator || "Unknown";
      dateEl.textContent = item.created_published_date || "Unknown";
      mediumEl.textContent = item.medium_brief || item.medium || "N/A";
      subjectsEl.textContent =
        (item.subjects && item.subjects.length > 0)
          ? item.subjects.join(", ")
          : "N/A";

      if (item.links && item.links.item) {
        locLink.href = item.links.item;
        locLink.style.display = "";
      } else {
        locLink.style.display = "none";
      }

      hide(loading);
      show(result);
    } catch (err) {
      hide(loading);
      errorMsg.textContent = err.message;
      show(error);
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", handleClick);
})();

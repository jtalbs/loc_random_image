(function () {
  "use strict";

  // The /photos/ endpoint is the modern loc.gov API with CORS support.
  // It indexes ~1.2 million items from Prints & Photographs.
  const API_BASE = "https://www.loc.gov/photos/";
  const ITEMS_PER_PAGE = 5;
  const MAX_PAGE = 200000; // ~1.2M items / 5 per page, conservative cap
  const MAX_RETRIES = 6;

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

  /**
   * Pick the best image URL from the image_url array.
   * The array typically contains:
   *   [0] = 150px thumbnail
   *   [1] = medium "r.jpg" or "t.gif"
   *   [2] = larger version or verso
   * We prefer the first URL ending in "r.jpg" (recto/medium),
   * falling back to the thumbnail.
   */
  function getBestImageUrl(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return null;

    // Prefer the medium-res recto image
    const recto = imageUrls.find(function (u) { return /r\.(jpg|jpeg|png|gif)$/i.test(u); });
    if (recto) return recto;

    // Fall back to thumbnail if it's on tile.loc.gov (real image, not placeholder)
    const thumb = imageUrls[0];
    if (thumb && thumb.includes("tile.loc.gov")) return thumb;

    return null;
  }

  async function fetchRandomItem() {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const page = randomInt(MAX_PAGE);
      const url = API_BASE + "?fo=json&c=" + ITEMS_PER_PAGE + "&sp=" + page;

      var resp;
      try {
        resp = await fetch(url);
      } catch (e) {
        continue;
      }
      if (!resp.ok) continue;

      var data;
      try {
        data = await resp.json();
      } catch (e) {
        continue;
      }

      var results = data.results;
      if (!results || results.length === 0) continue;

      // Shuffle and pick first result with a usable image
      var shuffled = results.slice().sort(function () { return Math.random() - 0.5; });
      for (var i = 0; i < shuffled.length; i++) {
        var item = shuffled[i];
        var imageUrl = getBestImageUrl(item.image_url);
        if (imageUrl) return { item: item, imageUrl: imageUrl };
      }
    }

    throw new Error("Could not find an image after several attempts. Please try again.");
  }

  function formatContributors(contributors) {
    if (!contributors || contributors.length === 0) return "Unknown";
    return contributors.join(", ");
  }

  function formatSubjects(item) {
    var subs = item.subject || item.subjects || [];
    if (subs.length === 0) return "N/A";
    return subs.join(", ");
  }

  async function handleClick() {
    btn.disabled = true;
    hide(result);
    hide(error);
    show(loading);

    try {
      var ref = await fetchRandomItem();
      var item = ref.item;
      var imageUrl = ref.imageUrl;

      imgEl.src = imageUrl;
      imgEl.alt = item.title || "Library of Congress image";
      titleEl.textContent = item.title || "Untitled";
      creatorEl.textContent = formatContributors(item.contributors);
      dateEl.textContent = item.date || "Unknown";
      mediumEl.textContent = item.medium ? item.medium.join(", ") : (item.description || "N/A");
      subjectsEl.textContent = formatSubjects(item);

      if (item.url) {
        locLink.href = item.url;
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

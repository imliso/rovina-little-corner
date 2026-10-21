import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";
import { ROVINA_PROFILE } from "./rovina-profile.js?v=7";

const BUCKET = "friend-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SOCIAL_LABELS = {
  instagram: "Instagram",
  tiktok: "TikTok",
  spotify: "Spotify",
  youtube: "YouTube",
  website: "Website"
};

const dom = {
  portrait: document.querySelector("#portrait"),
  portraitPlaceholder: document.querySelector("#portrait-placeholder"),
  socialLinks: document.querySelector("#social-links"),
  socialNote: document.querySelector("#social-note"),
  hobbies: document.querySelector("#hobbies-list"),
  music: document.querySelector("#music-list"),
  playlistLink: document.querySelector("#playlist-link"),
  spotifyEmbed: document.querySelector("#spotify-embed"),
  spotifyPlayer: document.querySelector("#spotify-player"),
  birthdayCount: document.querySelector("#birthday-count"),
  birthplace: document.querySelector("#birthplace"),
  dailyFact: document.querySelector("#daily-fact-text"),
  feed: document.querySelector("#feed-list"),
  emptyFeed: document.querySelector("#empty-feed"),
  feedCount: document.querySelector("#feed-count"),
  form: document.querySelector("#post-form"),
  photoInput: document.querySelector("#post-photo"),
  uploadPreview: document.querySelector("#upload-preview"),
  previewImage: document.querySelector("#upload-preview-image"),
  postButton: document.querySelector("#post-button"),
  toast: document.querySelector("#toast")
};

let supabase = null;
let selectedPhoto = null;
let previewUrl = null;
let toastTimer;
let factIndex = 0;

const fallbackFacts = [
  "From Lalisa's POV: Rovina is one of the kindest people I know.",
  "She's sweet to everyone—and she makes it feel effortless.",
  "She's seriously smart, but never makes anyone feel small."
];

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 3500);
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function appendItems(container, items, className, renderItem) {
  container.replaceChildren();
  for (const item of items || []) {
    const element = document.createElement("li");
    element.className = className;
    renderItem(element, item);
    container.append(element);
  }
}

function renderProfile() {
  document.title = `${ROVINA_PROFILE.name}'s Little Corner`;
  setText("#rovina-name-text", ROVINA_PROFILE.name);
  setText("#tagline", ROVINA_PROFILE.tagline);
  setText("#about", ROVINA_PROFILE.about);
  dom.birthplace.textContent = ROVINA_PROFILE.birthplace ? `Born in ${ROVINA_PROFILE.birthplace}` : "";
  dom.birthplace.hidden = !ROVINA_PROFILE.birthplace;

  if (ROVINA_PROFILE.portraitUrl) {
    dom.portrait.src = ROVINA_PROFILE.portraitUrl;
    dom.portrait.hidden = false;
    dom.portraitPlaceholder.hidden = true;
  }

  const socialCount = Object.values(ROVINA_PROFILE.socials).filter(Boolean).length;
  dom.socialLinks.replaceChildren();
  for (const [key, value] of Object.entries(ROVINA_PROFILE.socials)) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!new Set(["https:", "http:"]).has(url.protocol)) continue;
      const link = document.createElement("a");
      link.className = "social-link";
      link.href = url.toString();
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${SOCIAL_LABELS[key] || key} ↗`;
      dom.socialLinks.append(link);
    } catch {
      continue;
    }
  }
  dom.socialNote.hidden = socialCount > 0;

  appendItems(dom.hobbies, ROVINA_PROFILE.hobbies, "hobby-tag", (element, hobby) => {
    element.textContent = hobby;
  });
  appendItems(dom.music, ROVINA_PROFILE.music, "music-item", (element, song) => {
    const title = document.createElement("button");
    title.className = "music-play-button";
    title.type = "button";
    title.textContent = song.title;
    title.dataset.spotifyUrl = song.spotifyUrl || "";
    title.setAttribute("aria-label", song.spotifyUrl ? `Open ${song.title} in the Spotify player` : song.title);
    title.setAttribute("aria-pressed", "false");
    const artist = document.createElement("span");
    artist.textContent = song.artist;
    element.append(title, artist);
  });

  if (ROVINA_PROFILE.playlistUrl) {
    try {
      const playlistUrl = new URL(ROVINA_PROFILE.playlistUrl);
      if (playlistUrl.protocol === "https:" && playlistUrl.hostname === "open.spotify.com") {
        dom.playlistLink.href = playlistUrl.toString();
        dom.playlistLink.hidden = false;
        dom.spotifyPlayer.src = `https://open.spotify.com/embed${playlistUrl.pathname}`;
        dom.spotifyEmbed.hidden = false;
      }
    } catch {
      dom.playlistLink.hidden = true;
    }
  }

  if (ROVINA_PROFILE.birthday) {
    const match = ROVINA_PROFILE.birthday.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
    if (match) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let nextBirthday = new Date(now.getFullYear(), Number(match[1]) - 1, Number(match[2]));
      if (nextBirthday < today) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      const days = Math.round((nextBirthday - today) / 86400000);
      dom.birthdayCount.textContent = days === 0 ? "It's Rovina day! Go celebrate her ✨" : `${days} days until Rovina day!`;
    } else {
      dom.birthdayCount.textContent = "Add birthday as MM-DD in rovina-profile.js";
    }
  }

  const facts = ROVINA_PROFILE.facts?.filter(Boolean) || [];
  const todaysFact = facts.length ? facts[Math.floor(Date.now() / 86400000) % facts.length] : fallbackFacts[0];
  dom.dailyFact.textContent = todaysFact;
  factIndex = facts.length ? facts.indexOf(todaysFact) : 0;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function makePostCard(post) {
  const card = document.createElement("article");
  card.className = "feed-card";
  const header = document.createElement("div");
  header.className = "post-meta";
  const author = document.createElement("strong");
  author.textContent = post.display_name || "A friend";
  const date = document.createElement("time");
  date.dateTime = post.created_at;
  date.textContent = formatDate(post.created_at);
  header.append(author, date);
  card.append(header);

  if (post.message) {
    const message = document.createElement("p");
    message.className = "post-message";
    message.textContent = post.message;
    card.append(message);
  }
  if (post.image_url) {
    const image = document.createElement("img");
    image.className = "post-image";
    image.src = post.image_url;
    image.alt = post.image_alt || `A moment with Rovina, shared by ${post.display_name || "a friend"}`;
    image.loading = "lazy";
    card.append(image);
  }
  const footer = document.createElement("div");
  footer.className = "post-footer";
  const note = document.createElement("span");
  note.textContent = "A little moment for Rovina ✳";
  const reaction = document.createElement("button");
  reaction.className = "reaction-button";
  reaction.type = "button";
  reaction.dataset.postId = post.id;
  reaction.dataset.count = String(post.reaction_count || 0);
  reaction.setAttribute("aria-pressed", String(Boolean(post.reacted_by_me)));
  if (post.reacted_by_me) reaction.classList.add("reacted");
  reaction.innerHTML = `<span aria-hidden="true">♥</span> <span>${reaction.dataset.count}</span>`;
  reaction.setAttribute("aria-label", `${reaction.dataset.count} hearts for this post`);
  const controls = document.createElement("div");
  controls.className = "post-controls";
  controls.append(reaction);
  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-post-button";
  deleteButton.type = "button";
  deleteButton.dataset.postId = post.id;
  deleteButton.dataset.imagePath = post.image_path || "";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete post by ${post.display_name || "a friend"}`);
  controls.append(deleteButton);
  footer.append(note, controls);
  card.append(footer);
  return card;
}

function renderPosts(posts) {
  dom.feed.querySelectorAll(".feed-card").forEach((card) => card.remove());
  dom.emptyFeed.hidden = posts.length > 0;
  dom.feedCount.textContent = `${posts.length} ${posts.length === 1 ? "MOMENT" : "MOMENTS"}`;
  for (const post of posts) dom.feed.insertBefore(makePostCard(post), dom.emptyFeed);

  const featuredPhoto = ROVINA_PROFILE.portraitUrl || posts.find((post) => post.image_url)?.image_url;
  if (featuredPhoto) {
    dom.portrait.src = featuredPhoto;
    dom.portrait.hidden = false;
    dom.portraitPlaceholder.hidden = true;
  }
}

async function loadPosts() {
  const visitorId = getVisitorId();
  const { data, error } = await supabase.from("friend_feed_posts")
    .select("id, display_name, message, image_url, image_path, image_alt, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Could not load Rovina's feed:", error.message);
    showToast("The feed needs its Supabase setup. Check the README for the one-time migration.");
    return;
  }

  const [{ data: counts, error: countsError }, { data: reactions, error: reactionsError }] = await Promise.all([
    supabase.from("friend_feed_posts").select("id, friend_feed_reactions(count)")
      .order("created_at", { ascending: false }).limit(30),
    supabase.from("friend_feed_reactions").select("post_id").eq("visitor_id", visitorId)
  ]);
  const countById = new Map((counts || []).map((post) => [post.id, post.friend_feed_reactions?.[0]?.count || 0]));
  const reactedIds = new Set((reactions || []).map((reaction) => reaction.post_id));
  if (countsError || reactionsError) {
    console.info("Run the updated public feed migration to enable heart reactions.");
  }
  renderPosts((data || []).map((post) => ({
    ...post,
    reaction_count: countById.get(post.id) || 0,
    reacted_by_me: reactedIds.has(post.id)
  })));
}

function getVisitorId() {
  const storageKey = "rovina-feed-visitor-id";
  try {
    let visitorId = localStorage.getItem(storageKey);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(storageKey, visitorId);
    }
    return visitorId;
  } catch {
    return crypto.randomUUID();
  }
}

function clearSelectedPhoto() {
  selectedPhoto = null;
  dom.photoInput.value = "";
  dom.uploadPreview.hidden = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  dom.previewImage.removeAttribute("src");
}

async function addPost(event) {
  event.preventDefault();
  if (!supabase) {
    showToast("The feed is not connected yet. Check the Supabase setup.");
    return;
  }

  const formData = new FormData(dom.form);
  const displayName = String(formData.get("display_name") || "").trim().slice(0, 40) || "A friend";
  const message = String(formData.get("message") || "").trim();
  if (!message && !selectedPhoto) {
    showToast("Add a caption, a photo, or both before posting.");
    return;
  }

  dom.postButton.disabled = true;
  dom.postButton.textContent = "Posting...";
  let uploadedPath = null;

  try {
    let imageUrl = null;
    if (selectedPhoto) {
      const extension = selectedPhoto.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
      uploadedPath = `feed/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(uploadedPath, selectedPhoto, {
        cacheControl: "3600", contentType: selectedPhoto.type, upsert: false
      });
      if (uploadError) throw uploadError;
      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    }

    const { error } = await supabase.from("friend_feed_posts").insert({
      display_name: displayName,
      message,
      image_url: imageUrl,
      image_path: uploadedPath
    });
    if (error) throw error;

    dom.form.reset();
    clearSelectedPhoto();
    await loadPosts();
    showToast("Posted! Rovina's feed just got a little more legendary.");
  } catch (error) {
    console.error("Could not add a feed post:", error);
    showToast(error.message || "Could not post right now. Please try again.");
  } finally {
    dom.postButton.disabled = false;
    dom.postButton.innerHTML = `Post to Rovina's feed <span aria-hidden="true">↗</span>`;
  }
}

dom.photoInput.addEventListener("change", () => {
  const file = dom.photoInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    clearSelectedPhoto();
    showToast("Choose an image file for the post.");
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    clearSelectedPhoto();
    showToast("That photo is over 5 MB. Choose a smaller one.");
    return;
  }
  selectedPhoto = file;
  previewUrl = URL.createObjectURL(file);
  dom.previewImage.src = previewUrl;
  dom.uploadPreview.hidden = false;
});

document.querySelector("#remove-preview").addEventListener("click", clearSelectedPhoto);
dom.music.addEventListener("click", (event) => {
  const button = event.target.closest(".music-play-button");
  if (!button?.dataset.spotifyUrl) return;

  try {
    const trackUrl = new URL(button.dataset.spotifyUrl);
    const trackId = trackUrl.pathname.match(/^\/track\/([A-Za-z0-9]+)\/?$/)?.[1];
    if (trackUrl.hostname !== "open.spotify.com" || !trackId) return;

    dom.spotifyPlayer.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
    dom.spotifyPlayer.title = `Spotify player for ${button.textContent}`;
    dom.spotifyEmbed.hidden = false;
    dom.playlistLink.href = trackUrl.toString();
    dom.playlistLink.textContent = "Open this track in Spotify ↗";
    dom.playlistLink.hidden = false;
    dom.music.querySelectorAll(".music-play-button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  } catch {
    showToast("Could not open this Spotify track.");
  }
});

document.querySelector("#fact-button").addEventListener("click", () => {
  const facts = ROVINA_PROFILE.facts?.filter(Boolean) || [];
  const options = facts.length ? facts : fallbackFacts;
  factIndex = (factIndex + 1) % options.length;
  dom.dailyFact.textContent = options[factIndex];
});

document.querySelector("#easter-egg").addEventListener("click", () => {
  const surprises = [
    "Secret unlocked: Rovina has an official fan page. The fan is you.",
    "Achievement earned: excellent taste in friends.",
    "Breaking news: this sticker has been waiting all day for your attention."
  ];
  showToast(surprises[Math.floor(Math.random() * surprises.length)]);
});

dom.feed.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest(".delete-post-button");
  if (deleteButton) {
    if (!window.confirm("Delete this post and its photo? Anyone with this link can delete any post.")) return;

    deleteButton.disabled = true;
    const { data, error } = await supabase.from("friend_feed_posts")
      .delete()
      .eq("id", deleteButton.dataset.postId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Could not delete the post:", error?.message);
      showToast(error?.message || "Post was not deleted. Run the latest Supabase migration first.");
      deleteButton.disabled = false;
      return;
    }

    let photoCleanupFailed = false;
    if (deleteButton.dataset.imagePath) {
      const { error: photoError } = await supabase.storage.from(BUCKET).remove([deleteButton.dataset.imagePath]);
      photoCleanupFailed = Boolean(photoError);
      if (photoError) console.error("Post deleted but photo cleanup failed:", photoError.message);
    }
    await loadPosts();
    showToast(photoCleanupFailed ? "Post deleted. Its stored photo could not be removed." : "Post and photo deleted.");
    return;
  }

  const button = event.target.closest(".reaction-button");
  if (!button || button.getAttribute("aria-pressed") === "true") return;

  button.disabled = true;
  const { error } = await supabase.from("friend_feed_reactions").insert({
    post_id: button.dataset.postId,
    visitor_id: getVisitorId()
  });
  if (error && error.code !== "23505") {
    showToast("Could not add a heart. Please try again.");
    button.disabled = false;
    return;
  }

  const count = Number(button.dataset.count) + (error ? 0 : 1);
  button.dataset.count = String(count);
  button.setAttribute("aria-pressed", "true");
  button.classList.add("reacted");
  button.innerHTML = `<span aria-hidden="true">♥</span> <span>${count}</span>`;
  button.setAttribute("aria-label", `${count} hearts for this post`);
});

dom.form.addEventListener("submit", addPost);
renderProfile();

if (SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 30) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  loadPosts();
} else {
  showToast("Add the Supabase URL and public key to config.js to enable the feed.");
}
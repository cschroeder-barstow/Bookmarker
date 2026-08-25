const categoryButtons = [...document.querySelectorAll(".category-button")];
const searchInput = document.querySelector("#bookmark-search");
const emptyState = document.querySelector("#empty-state");
const bookmarkGrid = document.querySelector("#bookmark-grid");
const customCategories = document.querySelector("#custom-categories");
const modal = document.querySelector("#bookmark-modal");
const form = document.querySelector("#bookmark-form");
const openModalButton = document.querySelector("#open-modal");
const closeModalButton = document.querySelector("#close-modal");
const cancelModalButton = document.querySelector("#cancel-modal");
const settingsButton = document.querySelector("#settings-button");
const settingsMenu = document.querySelector("#settings-menu");
const exportButton = document.querySelector("#export-bookmarks");
const importButton = document.querySelector("#import-bookmarks");
const importFile = document.querySelector("#import-file");
const deleteModal = document.querySelector("#delete-modal");
const closeDeleteButton = document.querySelector("#close-delete");
const cancelDeleteButton = document.querySelector("#cancel-delete");
const confirmDeleteButton = document.querySelector("#confirm-delete");
const deleteName = document.querySelector("#delete-name");
const sortSelect = document.querySelector("#sort-bookmarks");
const temporaryCheckbox = document.querySelector("#temporary-bookmark");
const expiryField = document.querySelector("#expiry-field");
const tagOptions = document.querySelector("#bookmark-tag-options");
const modalTitle = document.querySelector("#modal-title");

let bookmarks = JSON.parse(localStorage.getItem("gdev-bookmarks") || "[]");
bookmarks = bookmarks.map((bookmark) => {
  const temporary = Boolean(bookmark.temporary && bookmark.expiresAt);
  const tags = bookmark.tags.filter((tag) => tag.toLowerCase() !== "temp");
  if (temporary) tags.unshift("Temp");
  return { ...bookmark, id: bookmark.id || crypto.randomUUID(), createdAt: bookmark.createdAt || Date.now(), temporary, expiresAt: temporary ? bookmark.expiresAt : null, tags: [...new Set(tags)] };
});
let sortMode = "newest";

let selectedCategory = "all";
let editingBookmarkId = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

function safeUrl(value) {
  const trimmed = String(value).trim();
  if (!trimmed || /^(javascript|data|vbscript|file):/i.test(trimmed)) return "";
  return /^[a-z][a-z\d+.-]*:\S+$/i.test(trimmed) ? trimmed : "";
}

function saveBookmarks() {
  localStorage.setItem("gdev-bookmarks", JSON.stringify(bookmarks));
}

function removeExpiredBookmarks() {
  const activeBookmarks = bookmarks.filter((bookmark) => !bookmark.temporary || !bookmark.expiresAt || new Date(bookmark.expiresAt).getTime() > Date.now());
  if (activeBookmarks.length !== bookmarks.length) {
    bookmarks = activeBookmarks;
    saveBookmarks();
    return true;
  }
  return false;
}

function closeSettings() {
  settingsMenu.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}

function renderCategories() {
  const categories = [...new Set(bookmarks.flatMap((bookmark) => bookmark.tags))].sort();
  tagOptions.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  customCategories.innerHTML = categories.map((category) => {
    const count = bookmarks.filter((bookmark) => bookmark.tags.includes(category)).length;
    return `<button class="category-button" type="button" data-category="${escapeHtml(category)}" role="tab" aria-selected="false">${escapeHtml(category)} <span>${count}</span></button>`;
  }).join("");

  document.querySelectorAll(".category-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      document.querySelectorAll(".category-button").forEach((categoryButton) => {
        const isActive = categoryButton === button;
        categoryButton.classList.toggle("active", isActive);
        categoryButton.setAttribute("aria-selected", String(isActive));
      });
      updateBookmarks();
    });
  });
}

function renderBookmarks() {
  bookmarkGrid.querySelectorAll(".bookmark-card").forEach((card) => card.remove());
  const sortedBookmarks = [...bookmarks].sort((first, second) => {
    if (sortMode === "title") return first.title.localeCompare(second.title);
    if (sortMode === "category") return first.tags[0].localeCompare(second.tags[0]) || first.title.localeCompare(second.title);
    return second.createdAt - first.createdAt;
  });
  sortedBookmarks.forEach((bookmark) => {
    const card = document.createElement("article");
    card.className = "bookmark-card";
    card.dataset.id = bookmark.id;
    card.dataset.category = bookmark.tags.join(" ");
    card.dataset.name = bookmark.title;
    card.innerHTML = `<a class="bookmark-icon" href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(bookmark.title)}"><img src="${escapeHtml(bookmark.image || "")}" alt="${escapeHtml(bookmark.title)} icon" width="150" height="150"><span class="open-arrow" aria-hidden="true">↗</span></a><div class="bookmark-info"><h2>${escapeHtml(bookmark.title)}</h2><div class="bookmark-actions"><div class="bookmark-tags">${bookmark.tags.map((tag) => `<span class="category-label">${escapeHtml(tag)}</span>`).join("")}</div><div class="card-buttons"><button class="edit-button" type="button" aria-label="Edit ${escapeHtml(bookmark.title)}" title="Edit bookmark">&#9998;</button><button class="delete-button" type="button" aria-label="Delete ${escapeHtml(bookmark.title)}" title="Delete bookmark">&times;</button></div></div></div>`;
    card.querySelector(".edit-button").addEventListener("click", () => openEditModal(bookmark.id));
    card.querySelector(".delete-button").addEventListener("click", () => openDeleteModal(bookmarks.findIndex((item) => item.id === bookmark.id)));
    bookmarkGrid.insertBefore(card, emptyState);
  });
}

function updateBookmarks() {
  const query = searchInput.value.trim().toLowerCase();
  const cards = [...document.querySelectorAll(".bookmark-card")];
  let visibleCount = 0;

  cards.forEach((card) => {
    const matchesCategory = selectedCategory === "all" || card.dataset.category.split(" ").includes(selectedCategory);
    const matchesSearch = card.dataset.name.toLowerCase().includes(query);
    const isVisible = matchesCategory && matchesSearch;

    card.hidden = !isVisible;
    if (isVisible) {
      visibleCount += 1;
    }
  });

  emptyState.hidden = visibleCount !== 0;
  document.querySelector(".category-button[data-category='all'] span").textContent = bookmarks.length;
}

searchInput.addEventListener("input", updateBookmarks);
sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value;
  renderBookmarks();
  updateBookmarks();
});

temporaryCheckbox.addEventListener("change", () => {
  expiryField.hidden = !temporaryCheckbox.checked;
  form.elements.expiresDate.required = temporaryCheckbox.checked;
  form.elements.expiresTime.required = temporaryCheckbox.checked;
});

function closeModal() {
  modal.hidden = true;
  form.reset();
  expiryField.hidden = true;
  form.elements.expiresDate.required = false;
  form.elements.expiresTime.required = false;
  editingBookmarkId = null;
  modalTitle.textContent = "Add bookmark";
}

let bookmarkToDelete = null;

function openDeleteModal(bookmarkIndex) {
  bookmarkToDelete = bookmarkIndex;
  deleteName.textContent = bookmarks[bookmarkIndex].title;
  deleteModal.hidden = false;
  confirmDeleteButton.focus();
}

function closeDeleteModal() {
  bookmarkToDelete = null;
  deleteModal.hidden = true;
}

openModalButton.addEventListener("click", () => {
  editingBookmarkId = null;
  modalTitle.textContent = "Add bookmark";
  modal.hidden = false;
  form.elements.title.focus();
});

function openEditModal(bookmarkId) {
  const bookmark = bookmarks.find((item) => item.id === bookmarkId);
  if (!bookmark) return;
  editingBookmarkId = bookmarkId;
  modalTitle.textContent = "Edit bookmark";
  form.elements.title.value = bookmark.title;
  form.elements.url.value = bookmark.url;
  form.elements.image.value = bookmark.image || "";
  form.elements.tags.value = bookmark.tags.filter((tag) => tag.toLowerCase() !== "temp").join(", ");
  temporaryCheckbox.checked = Boolean(bookmark.temporary);
  expiryField.hidden = !temporaryCheckbox.checked;
  form.elements.expiresDate.required = temporaryCheckbox.checked;
  form.elements.expiresTime.required = temporaryCheckbox.checked;
  if (bookmark.expiresAt) {
    const [date, time] = bookmark.expiresAt.split("T");
    form.elements.expiresDate.value = date;
    form.elements.expiresTime.value = time;
  }
  modal.hidden = false;
  form.elements.title.focus();
}
settingsButton.addEventListener("click", () => {
  settingsMenu.hidden = !settingsMenu.hidden;
  settingsButton.setAttribute("aria-expanded", String(!settingsMenu.hidden));
});
exportButton.addEventListener("click", () => {
  const file = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" });
  const download = document.createElement("a");
  download.href = URL.createObjectURL(file);
  const date = new Date().toISOString().slice(0, 10);
  download.download = `savedbookmarks(${date}).json`;
  download.click();
  URL.revokeObjectURL(download.href);
  closeSettings();
});
importButton.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => {
  const [file] = importFile.files;
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported) || imported.some((bookmark) => !bookmark.title || !safeUrl(bookmark.url) || !Array.isArray(bookmark.tags))) throw new Error("Invalid save data");
      bookmarks = imported.map((bookmark) => {
        const temporary = Boolean(bookmark.temporary && bookmark.expiresAt);
        const tags = bookmark.tags.map(String).filter((tag) => tag.toLowerCase() !== "temp");
        if (temporary) tags.unshift("Temp");
        return { id: bookmark.id || crypto.randomUUID(), title: String(bookmark.title), url: safeUrl(bookmark.url), image: safeUrl(bookmark.image || ""), tags: [...new Set(tags)], temporary, expiresAt: temporary ? bookmark.expiresAt : null, createdAt: bookmark.createdAt || Date.now() };
      });
      saveBookmarks();
      selectedCategory = "all";
      renderCategories();
      renderBookmarks();
      updateBookmarks();
      closeSettings();
    } catch {
      window.alert("That file is not valid bookmark save data.");
    }
    importFile.value = "";
  });
  reader.readAsText(file);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".settings-wrap")) closeSettings();
});
closeModalButton.addEventListener("click", closeModal);
cancelModalButton.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
closeDeleteButton.addEventListener("click", closeDeleteModal);
cancelDeleteButton.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) closeDeleteModal();
});
confirmDeleteButton.addEventListener("click", () => {
  if (bookmarkToDelete === null) return;
  bookmarks.splice(bookmarkToDelete, 1);
  saveBookmarks();
  selectedCategory = "all";
  renderCategories();
  renderBookmarks();
  document.querySelectorAll(".category-button").forEach((button) => {
    const isAll = button.dataset.category === "all";
    button.classList.toggle("active", isAll);
    button.setAttribute("aria-selected", String(isAll));
  });
  updateBookmarks();
  closeDeleteModal();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const url = safeUrl(data.get("url").trim());
  if (!url) return;
  const expiresAt = temporaryCheckbox.checked ? `${data.get("expiresDate")}T${data.get("expiresTime")}` : null;
  const tags = data.get("tags").split(",").map((tag) => tag.trim()).filter(Boolean);
  if (!tags.length) tags.push("Other");

  const bookmarkData = {
    title: data.get("title").trim(),
    url,
    image: safeUrl(data.get("image").trim()),
    temporary: temporaryCheckbox.checked,
    expiresAt,
    tags: [...new Set(tags.filter((tag) => tag.toLowerCase() !== "temp").map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1)))],
  };
  if (temporaryCheckbox.checked) bookmarkData.tags.unshift("Temp");
  if (editingBookmarkId) {
    const bookmark = bookmarks.find((item) => item.id === editingBookmarkId);
    Object.assign(bookmark, bookmarkData);
  } else {
    bookmarks.push({ id: crypto.randomUUID(), ...bookmarkData, createdAt: Date.now() });
  }
  saveBookmarks();
  selectedCategory = "all";
  renderCategories();
  renderBookmarks();
  document.querySelectorAll(".category-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === "all");
    button.setAttribute("aria-selected", String(button.dataset.category === "all"));
  });
  updateBookmarks();
  closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

removeExpiredBookmarks();
renderCategories();
renderBookmarks();
updateBookmarks();
setInterval(() => {
  if (removeExpiredBookmarks()) {
    renderCategories();
    renderBookmarks();
    updateBookmarks();
  }
}, 30000);

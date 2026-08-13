const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");

function openModal(src) {
  modalImage.src = src;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.getElementById("layoutViewer").addEventListener("click", () => {
  openModal("assets/trust-city-layout.jpg");
});

document.querySelectorAll(".gallery-item").forEach(item => {
  item.addEventListener("click", () => openModal(item.dataset.image));
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

document.getElementById("enquiryForm").addEventListener("submit", e => {
  e.preventDefault();

  const form = e.currentTarget;
  const data = new FormData(form);
  const name = data.get("name");
  const phone = data.get("phone");
  const message = data.get("message") || "I would like Trust City Township project details.";

  const whatsappText =
    `Hello Trust City Township,%0A%0A` +
    `Name: ${encodeURIComponent(name)}%0A` +
    `Mobile: ${encodeURIComponent(phone)}%0A` +
    `Message: ${encodeURIComponent(message)}`;

  // Replace the number below with the project's real WhatsApp number.
  window.open(`https://wa.me/918000000000?text=${whatsappText}`, "_blank");

  document.getElementById("formNote").textContent =
    "Thank you. Your enquiry has been prepared for WhatsApp.";
  form.reset();
});

window.addEventListener("scroll", () => {
  document.getElementById("header").classList.toggle("scrolled", window.scrollY > 10);
});

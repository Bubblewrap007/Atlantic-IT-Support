// script.js

(function () {
  // Set footer year
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // ----- Mailto Support Form -----
  const supportForm = document.getElementById("supportForm");
  if (supportForm) {
    supportForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(supportForm);

      const to = "shawn@atlanticitsupport.com";
      const subject = encodeURIComponent(
        "Support Request - " + (fd.get("service") || "General")
      );

      const body = encodeURIComponent(
        "Full Name: " + (fd.get("name") || "") + "\n" +
        "Contact: " + (fd.get("contact") || "") + "\n" +
        "Service Requested: " + (fd.get("service") || "") + "\n" +
        "Location: " + (fd.get("location") || "") + "\n\n" +
        "Issue Details:\n" + (fd.get("details") || "")
      );

      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  }

  // ----- Mailto Guidance Form (CompTIA page) -----
const guidanceForm = document.getElementById("guidanceForm");
if (guidanceForm) {
  guidanceForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const fd = new FormData(guidanceForm);

    const to = "shawn@atlanticitsupport.com";
    const subject = encodeURIComponent(
      "CompTIA Guidance Request - " + (fd.get("exam") || "")
    );

    const body = encodeURIComponent(
      "Name: " + (fd.get("name") || "") + "\n" +
      "Email: " + (fd.get("contact") || "") + "\n" +
      "Exam: " + (fd.get("exam") || "") + "\n" +
      "Experience: " + (fd.get("experience") || "") + "\n\n" +
      "Details:\n" + (fd.get("details") || "")
    );

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });
}


  // ----- Hamburger Menu -----
  const btn = document.querySelector(".menu-toggle");
  const menu = document.getElementById("mobileMenu");

  function closeMenu() {
    document.body.classList.remove("menu-open");
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Open menu");
    }
  }

  if (btn && menu) {
    btn.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("menu-open");
      btn.setAttribute("aria-expanded", String(isOpen));
      btn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    // Close menu when clicking a link
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeMenu);
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // Close if clicking outside menu/button
    document.addEventListener("click", (e) => {
      const clickedInside = menu.contains(e.target) || btn.contains(e.target);
      if (!clickedInside) closeMenu();
    });
  }
})();

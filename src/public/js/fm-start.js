document.querySelectorAll("li").forEach((karte) => {
  karte.addEventListener("click", () => {
    const link = karte.querySelector("a");
    if (link) {
      window.location = link.href;
    }
  });
});

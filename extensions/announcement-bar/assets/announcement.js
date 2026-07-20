document.addEventListener("DOMContentLoaded", async () => {
  const response = await fetch("/apps/announcement");
  const data = await response.json();

  if (data.enabled) {
    document.getElementById("announcement-bar").textContent = data.title;
  }
});
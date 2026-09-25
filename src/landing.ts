// Desktop landing page: the film plays muted on a loop. "Play with sound" restarts it
// from the beginning with sound, after which the same button mutes and unmutes.
// "Replay" always goes back to the start.
export function setupLanding() {
  document.title = "Qibla Line: find the Qibla from the walls of your room";

  const video = document.getElementById("l-video") as HTMLVideoElement | null;
  const controls = document.getElementById("l-controls");
  const replay = document.getElementById("l-replay") as HTMLButtonElement | null;
  const sound = document.getElementById("l-sound") as HTMLButtonElement | null;
  if (!video || !controls || !replay || !sound) return;

  // src and poster are set here so nothing downloads while the page is showing the app
  video.poster = video.dataset.poster ?? "";
  video.src = video.dataset.src ?? "";
  video.preload = "auto";
  controls.hidden = false;

  // autoplay as well as play(): a tab opened in the background starts once it is shown
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    video.autoplay = true;
    video.play().catch(() => undefined);
  }

  revealSections();

  let heardSound = false;
  const label = sound.querySelector("span")!;
  const showSound = () => {
    sound.dataset.muted = String(video.muted);
    label.textContent = video.muted ? (heardSound ? "Sound on" : "Play with sound") : "Sound off";
  };

  replay.addEventListener("click", () => {
    video.currentTime = 0;
    video.play().catch(() => undefined);
  });

  sound.addEventListener("click", () => {
    if (!heardSound) {
      // First time: from the top, with sound, played once rather than looped
      heardSound = true;
      video.currentTime = 0;
      video.loop = false;
      video.muted = false;
      video.play().catch(() => undefined);
    } else {
      video.muted = !video.muted;
    }
    showSound();
  });
}

// Each section rises into place the first time it scrolls into view
function revealSections() {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" }
  );
  document.documentElement.classList.add("reveal-ready");
  document.querySelectorAll(".l-reveal").forEach((section) => observer.observe(section));
}

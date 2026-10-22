function measureCarouselStep(rail) {
  const width = rail.firstElementChild?.getBoundingClientRect().width || rail.clientWidth;
  return width + (parseFloat(getComputedStyle(rail).columnGap) || 0);
}

function findCarouselPosition(rail, direction) {
  const end = Math.max(0, rail.scrollWidth - rail.clientWidth);
  const current = rail.scrollLeft;
  if (direction > 0 && current >= end - 1) return 0;
  if (direction < 0 && current <= 1) return end;
  return Math.max(0, Math.min(end, current + direction * measureCarouselStep(rail)));
}

function moveCarousel(rail, direction) {
  rail.scrollTo({ left: findCarouselPosition(rail, direction), behavior: 'smooth' });
}

function bindCarouselControls(carousel, rail) {
  carousel.querySelector('[aria-label="Previous"]').addEventListener('click', () => moveCarousel(rail, -1));
  carousel.querySelector('[aria-label="Next"]').addEventListener('click', () => moveCarousel(rail, 1));
}

function startCarouselTimer(carousel, rail) {
  let paused = false;
  carousel.addEventListener('mouseenter', () => { paused = true; });
  carousel.addEventListener('mouseleave', () => { paused = false; });
  setInterval(() => { if (!paused) moveCarousel(rail, 1); }, 5_000);
}

function initializeCarousel() {
  const carousel = document.querySelector('#supporting');
  const rail = carousel?.querySelector('.supporting-grid');
  if (!rail) return;
  bindCarouselControls(carousel, rail);
  startCarouselTimer(carousel, rail);
}

initializeCarousel();

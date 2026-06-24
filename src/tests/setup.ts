import '@testing-library/jest-dom/vitest';

// jsdom no soporta element.animate (Web Animations API)
// necesario para svelte transitions (slide, fade, etc.)
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
	Element.prototype.animate = () => ({
		finished: Promise.resolve(),
		cancel: () => {},
		finish: () => {},
		pause: () => {},
		play: () => {},
		reverse: () => {},
		updatePlaybackRate: () => {}
	}) as unknown as Animation;
}

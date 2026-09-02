/**
 * Progressive-enhancement carousel for the "tfe/carousel" WP block.
 *
 * The block's saved HTML (delivered via content.rendered) is just:
 *   <div class="tfe-carousel">
 *     <figure class="tfe-carousel-slide"><img …><figcaption>…</figcaption></figure>
 *     ...
 *   </div>
 *
 * This script finds every ".tfe-carousel" inside a rendered article, wraps
 * its slides in a sliding track, and adds prev/next arrows, dot indicators
 * and touch-swipe navigation — the same interaction set as the reference
 * (Bootstrap carousel + jQuery TouchSwipe), reproduced without any
 * Bootstrap/jQuery dependency.
 *
 * Usage — call once after the article HTML is in the DOM, right next to
 * wherever ArticleContent.tsx wires up the PhotoSwipe lightbox:
 *
 *   import { initCarousels } from "@/scripts/tfeCarousel";
 *   ...
 *   initCarousels(containerRef.current);
 */

const SWIPE_THRESHOLD_PX = 40;
const TRANSITION_MS = 500;

export function initCarousels(root: HTMLElement | null): void {
	if ( ! root ) return;

	const carousels = root.querySelectorAll<HTMLElement>( '.tfe-carousel' );

	carousels.forEach( setupCarousel );
}

function setupCarousel( carousel: HTMLElement ): void {
	// Avoid double-init if initCarousels() runs again on the same DOM
	// (e.g. re-render, or PhotoSwipe wrapping running after this).
	if ( carousel.dataset.tfeCarouselInit === 'true' ) return;

	const slides = Array.from( carousel.children ) as HTMLElement[];
	if ( slides.length === 0 ) return;

	carousel.dataset.tfeCarouselInit = 'true';
	carousel.classList.add( 'tfe-carousel--enhanced' );

	// Nothing to navigate with a single image — leave it as a plain image.
	if ( slides.length === 1 ) return;

	// --- build the sliding track around the existing slides ---
	const track = document.createElement( 'div' );
	track.className = 'tfe-carousel-track';
	track.style.transitionDuration = TRANSITION_MS + 'ms';
	slides.forEach( ( slide ) => {
		slide.classList.add( 'tfe-carousel-slide' );
		track.appendChild( slide );
	} );
	carousel.appendChild( track );

	let index = 0;
	let dots: HTMLButtonElement[] = [];

	function goTo( next: number ): void {
		index = ( next + slides.length ) % slides.length;
		track.style.transform = `translateX(-${ index * 100 }%)`;
		dots.forEach( ( dot, i ) =>
			dot.classList.toggle( 'is-active', i === index )
		);
	}

	// --- prev / next arrows ---
	const prevBtn = document.createElement( 'button' );
	prevBtn.type = 'button';
	prevBtn.className = 'tfe-carousel-arrow tfe-carousel-arrow--prev';
	prevBtn.setAttribute( 'aria-label', 'Previous slide' );
	prevBtn.innerHTML = '&#10094;';
	prevBtn.addEventListener( 'click', () => goTo( index - 1 ) );

	const nextBtn = document.createElement( 'button' );
	nextBtn.type = 'button';
	nextBtn.className = 'tfe-carousel-arrow tfe-carousel-arrow--next';
	nextBtn.setAttribute( 'aria-label', 'Next slide' );
	nextBtn.innerHTML = '&#10095;';
	nextBtn.addEventListener( 'click', () => goTo( index + 1 ) );

	carousel.appendChild( prevBtn );
	carousel.appendChild( nextBtn );

	// --- dot indicators ---
	const dotsWrap = document.createElement( 'div' );
	dotsWrap.className = 'tfe-carousel-dots';
	dots = slides.map( ( _slide, i ) => {
		const dot = document.createElement( 'button' );
		dot.type = 'button';
		dot.className = 'tfe-carousel-dot' + ( i === 0 ? ' is-active' : '' );
		dot.setAttribute( 'aria-label', `Go to slide ${ i + 1 }` );
		dot.addEventListener( 'click', () => goTo( i ) );
		dotsWrap.appendChild( dot );
		return dot;
	} );
	carousel.appendChild( dotsWrap );

	// --- touch swipe, same left/right logic as the reference demo ---
	let startX = 0;
	let deltaX = 0;

	carousel.addEventListener(
		'touchstart',
		( e: TouchEvent ) => {
			startX = e.touches[ 0 ].clientX;
			deltaX = 0;
		},
		{ passive: true }
	);

	carousel.addEventListener(
		'touchmove',
		( e: TouchEvent ) => {
			deltaX = e.touches[ 0 ].clientX - startX;
		},
		{ passive: true }
	);

	carousel.addEventListener( 'touchend', () => {
		if ( deltaX < -SWIPE_THRESHOLD_PX ) goTo( index + 1 ); // swiped left → next
		else if ( deltaX > SWIPE_THRESHOLD_PX ) goTo( index - 1 ); // swiped right → prev
	} );

	// --- keyboard support when the carousel has focus ---
	carousel.tabIndex = 0;
	carousel.addEventListener( 'keydown', ( e: KeyboardEvent ) => {
		if ( e.key === 'ArrowLeft' ) goTo( index - 1 );
		if ( e.key === 'ArrowRight' ) goTo( index + 1 );
	} );

	goTo( 0 );
}

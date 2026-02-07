
/* -----------------MAIN PAGES SETUP ---------------- */
function setupInteractive() {  
	setupPageBubbles(); 
    setupCarousel();
    
	/* ───────────────────── Bubbles ───────────────────── */ 
	function setupPageBubbles() {		
		document.querySelectorAll('.js-mainpage-parent').forEach(parent => {   
			
			/* expands bubble when clicking on it */
			const bubbles = parent.querySelectorAll('.js-bubble');
			bubbles.forEach(bubble => {
				bubble.addEventListener('click', () => {
                    handleBubbleActivity(bubble); 
				});
			});

			/* closes bubble when clicking x */
			const closeButtons = parent.querySelectorAll('.jscs-bubble-closebtn');
			closeButtons.forEach(btn => {
				btn.addEventListener('click', e => {
					e.stopPropagation();
                    handleBubbleActivity(); 
				});
			});
			

			/* closes bubble when clicking outside */
			document.body.addEventListener('click', (e) => {
				if (!e.target.closest('.js-bubble.jscs-bubble-expanded') && !e.target.classList.contains('jscs-bubble-closebtn')) {
                    handleBubbleActivity(); 
				}
			}); 
            
            
            /* helper function */
            function handleBubbleActivity(bubble){	
                // closes all bubbles
                bubbles.forEach(b => b.classList.remove('jscs-bubble-expanded'));    
                
                // if a bubble was passed -> opens it 
                // (and deactivates scrolling outside of bubble)
                if (bubble) {
                    bubble.classList.add('jscs-bubble-expanded');           
                    document.body.style.overflow = 'hidden';                 
                } else {
                    // otherwise reactivates the scrolling outside bubble
                    document.body.style.overflow = '';
                } 
                
            }

		});

	} 
    
    
    
    
	/* ───────────────────── Carousel ───────────────────── */     
    function setupCarousel(){
        
        // iterates over each carousel 
		document.querySelectorAll('.js-comment-carousel').forEach(root => {  
            
            // Extracts html elements inside this carousel
            const viewport = root.querySelector('.js-comment-carousel-viewport');
            const track = root.querySelector('.js-comment-carousel-track');
            const btnPrev = root.querySelector('[data-action="prev"]');
            const btnNext = root.querySelector('[data-action="next"]');

            // Array of carousel items (children of the track)	
            const items = Array.from(track.children);
            
            // "index" will store the index of the first visible carousel item
            // (ie each time we move right, index=index+1)
            let index = 0;
            
            // Autoplay state & attributes 
            let autoplay = true; //true until the user interacts
		    let timer = null;
		    let started = false; // prevents double-starting 
            const autoplayMsAttr = root.getAttribute('data-autoplay-ms');
            const autoplayMs = Number(autoplayMsAttr) > 0 ? Number(autoplayMsAttr) : 4500; // ms every which auto-scrolls 
            // starts autoplay at the correct time
            setupVisibilityAutoplay(root, {
                onStart: () => startAutoplay(true),
                onResume: () => startAutoplay(false),
                onPause: () => pauseAutoplay(),
                threshold: 0.1
            });


            
            
            
            /* --------------------------------- */ 
            /* -------- Helper Functions ------- */  
            /* --------------------------------- */   
            
            /* -------- Handle Prev/Next ------- */     
            // Clamp index to a legal range so we don't scroll past the last fully-visible set 
            function moveNElements(N) { 
                const count = track.children.length;  
                
                // Normalize N so we never move more than we have
                const k = Math.min(Math.abs(N), count);
                
                // 1) Freeze current visual position (read current translateX)
                //    If transform is "none", treat it as 0.
                const curTransform = window.getComputedStyle(track).transform;
                let curX = 0;
                if (curTransform && curTransform !== 'none') {
                    // matrix(a,b,c,d,tx,ty) or matrix3d(...)
                    const parts = curTransform.startsWith('matrix3d')
                        ? curTransform.match(/matrix3d\((.+)\)/)[1].split(',').map(s => parseFloat(s))
                        : curTransform.match(/matrix\((.+)\)/)[1].split(',').map(s => parseFloat(s));
                    curX = curTransform.startsWith('matrix3d') ? parts[12] : parts[4];
                }

                // 2) Temporarily disable transition so the DOM reorder doesn't animate
                const prevTransition = track.style.transition;
                track.style.transition = 'none';

                // 3) Reorder DOM children
                
                if (N > 0) {
                    // Move last k to front
                    for (let i = 0; i < k; i++) {
                        const last = track.lastElementChild;
                        if (!last) break;
                        track.prepend(last);
                    }

                    // 4) Adjust index to keep the SAME content in view
                    // Prepending items means everything shifts right by k positions, so index increases by k.
                    index += k;
                } else {
                    // Move first k to end
                    for (let i = 0; i < k; i++) {
                        const first = track.firstElementChild;
                        if (!first) break;
                        track.append(first);
                    }

                    // Appending items means everything shifts left by k positions, so index decreases by k.
                    index -= k;
                }

                // 5) Re-apply transform so the viewport doesn't move visually
                //    We force transform based on updated index.
                //    This yields the same visible items as before the DOM move.
                const x = index * stepSizePx();
                track.style.transform = `translateX(${-x}px)`;

                // Force reflow so the browser commits the snapped position
                track.getBoundingClientRect();

                // 6) Restore transition
                track.style.transition = prevTransition || '';
            }

            function checkIndex(i){ 
                
                /*
                const maxIndex = Math.max(0, items.length - visibleCount());
                return Math.min(Math.max(0, i), maxIndex);*/
                if (i<=0){
                    moveNElements(5);
                 }
                if (i>=(items.length - visibleCount())){
                    moveNElements(-5);
                 }
              
            }

            // How many items should be visible at once based on viewport width
		    // (must match CSS breakpoints)
            function visibleCount() {
                // Matches CSS breakpoints: 3 / 2 / 1
                const w = window.innerWidth;
                if (w <= 620) return 1;
                if (w <= 980) return 2;
                return 3;
            }

           // Compute the horizontal distance to move per index "step":
		   // item width + CSS gap between items.
		   // This is used to translate the track so items align neatly.
            function stepSizePx() {
                // distance between item starts = item width + gap
                const first = items[0];
                if (!first) return 0;

                const itemRect = first.getBoundingClientRect();
                
                // Read the gap from computed styles.  		
                const trackStyles = window.getComputedStyle(track);
                const gap = parseFloat(trackStyles.columnGap || trackStyles.gap || '0') || 0;

                return itemRect.width + gap;
            }

            // Move the carousel to index i.
		    // animate=false temporarily disables transitions (useful on resize / initial setup).
            function goTo(i, { animate = true } = {}) {
                // Handle Overscrolling by calling handler function 
               // index = checkIndex(i);
	           
                index=i;
                // Disable animation if requested (so it "snaps" instead of sliding)		
                if (!animate) {
                    track.style.transition = 'none';
                } else {
                    track.style.transition = '';
                }
 
                
                // Translate track left by index steps			
                const x = index * stepSizePx();
                track.style.transform = `translateX(${-x}px)`;

                // If we snapped with no transition, force a reflow so the browser applies it,
			    // then restore transition so future moves animate normally.
                if (!animate) {
                    // force reflow then restore transition so future moves animate
                    track.getBoundingClientRect();
                    track.style.transition = '';
                }
                 
                
            }

            // Button click callers of goTo
            function next() {
                console.log('next');
                moveNElements(-1);
                goTo(index + 1);
            //    moveNElements(-1);
            }

            function prev() {
                moveNElements(1);
                goTo(index - 1);
         //       moveNElements(1);
            }

            
            

            /* -------- Handle Specific Types of User Interaction ------- */    
            // Button clicks: stop autoplay and move one step	
            btnNext?.addEventListener('click', () => { 
                stopAutoplay(); 
                next(); 
            });
            btnPrev?.addEventListener('click', () => { 
                stopAutoplay(); 
                prev(); 
            });

            // Keyboard support (when focused - ArrowLeft/ArrowRight)
            viewport.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight') { stopAutoplay(); next(); }
                if (e.key === 'ArrowLeft') { stopAutoplay(); prev(); }
            });

            // Touch / pointer drag (simple swipe)
            let startX = null;
            let isDown = false;
            viewport.addEventListener('pointerdown', (e) => {
                isDown = true;
                startX = e.clientX;
                viewport.setPointerCapture(e.pointerId);// Ensures we still receive pointer events even if the pointer leaves the element
			
            });
            viewport.addEventListener('pointerup', (e) => {
                if (!isDown) return;
                isDown = false;

                const dx = e.clientX - startX;	// Horizontal drag distance (positive = dragged right, negative = dragged left)
		
                startX = null;

                // Only treat as swipe if meaningful
                if (Math.abs(dx) < 40) return; // Ignore tiny drags (avoid accidental slide changes)

                // Drag left -> show next; drag right -> show previous
                stopAutoplay();
                if (dx < 0) next();
                else prev();
            });
            viewport.addEventListener('pointercancel', () => {
            // If pointer capture is cancelled (OS gesture, etc.), reset state
                isDown = false;
                startX = null;
            });

            // Any wheel/trackpad interaction stops autoplay (even though viewport is hidden overflow)
            viewport.addEventListener('wheel', () => stopAutoplay(), { passive: true });
        
            /* -------- END OF: Specific Types of User Interaction ------- */
        

        
        
            /* -------- Handle Autoplay ------- */  
            // Permanently stop autoplay 
            // (called once the user interacts - typical UX pattern) 
            function stopAutoplay() {
                if (!autoplay) return;
                autoplay = false;
                // timer is declared later but is in scope due to closures
                if (timer) clearInterval(timer);
                timer = null;
            }
            function pauseAutoplay() {
                // used when element leaves viewport (can resume later)
                if (timer) clearInterval(timer);
                timer = null;
            }
            // Starts autoplay 
            // (called when opening the tab)
            function  startAutoplay(firstTime){  
                if (firstTime){
                    // guard against double-starting
                    if (started) return;
                    started = true;       

                    // Initial start (no animation)
                    goTo(0, { animate: false });

                    // Keep the track aligned after window resize (because visibleCount and stepSize change)		
                    window.addEventListener('resize', () => {
                        goTo(index, { animate: false });
                    });             
                   /* moveNElements(1); */
                    
                }
                
                // Autoplay timer: advances every autoplayMs milliseconds.	    
                timer = setInterval(() => {
                    if (!autoplay) return;
                    next();
                }, autoplayMs);  
            }
        
        
            function setupVisibilityAutoplay(root, {
                    onStart,
                    onResume,
                    onPause,
                    threshold = 0.15
                } = {}) {

                let hasStartedOnce = false;
                let isRunning = false;

                const io = new IntersectionObserver((entries) => {
                    const entry = entries[0];

                    if (entry.isIntersecting) { 
                        // First time visible: start
                        if (!hasStartedOnce) {  
                            hasStartedOnce = true;
                            onStart?.();
                            isRunning = true;
                            return;
                        }

                        // Visible again: resume
                        if (!isRunning) {  
                            onResume?.();
                            isRunning = true; 
                            return;
                        }
                    } else {
                        // Not visible: pause/stop
                        if (isRunning) {
                            onPause?.();
                            isRunning = false;
                        }
                    }
                }, { threshold });

                io.observe(root);

                //  return a cleanup function
                return () => io.disconnect();
            }


        
        
        });

    }
    
}
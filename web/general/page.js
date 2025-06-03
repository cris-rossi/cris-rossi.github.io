 /* ----------------- CONFIG  ---------------- */
// Definition for the popup window 
function defPagePopupWindow(url = ''){  
	const pagePopupWindowConfig = {
		width: 0.9,
		height: 0.7,
		sizeUnits: '%',
		left: 0,
		top: 0,
		positionUnits:'+%',
		htmlFile: url
	};     
	return pagePopupWindowConfig;
} 


/* -----------------MAIN PAGES SETUP ---------------- */
async function setupPage() {  
	await setupDataContent();
	setupOnThisPageBox(); 
    setupDataLinks(); 
	setupImageCarousel(); 
	
	setupSearch();
	 


	
	
	/* ----------------- HELPER FUNCTIONS ---------------- */	
	/*  ─────────── Loads HTML content from [data-content] ───────── */	
	 async function setupDataContent(root = document, count=0) {
		 // (count < maxNestedCalls) is a fallback against infinite loop
		 // Self-calls occur for nested data contents (loaded content 1 loads has data-content itself to be setup)
		 maxNestedCalls = 10; // max hierarchy layers (content inside content inside content...)
		 count++; 
		 if (count<maxNestedCalls){ 
			const divs = root.querySelectorAll('[data-content]'); 

			for (const div of divs) {
				
				console.log(div.getAttribute('data-content'));
				
				
				// Find the closest parent container with data-path
				const tabParent = div.closest('.mainWindow-tabContentContainer[data-path]');

				// path <- data-path attribute of mainWindow-tabContentContainer parent
				// or no base path (path='') if this does not exist
				const path = tabParent ? tabParent.getAttribute('data-path') : '';  
				
				// extracts name of file and data-source selection  
				const targetFilename = `${path}${div.getAttribute('data-content')}.html`; 
				const targetSelection = div.getAttribute('data-content-sel') || '';  				
				
				await loadHTML(targetFilename, div, true, targetSelection); // loads content from file to container 
				
				await setupDataContent(div, count); // recursive: sets up data content within new content
				
			} 
		 }
	} 
	
	 
	
	/* ───────────────────── Links ───────────────────── */ 
	async function setupDataLinks(){
		// Links to Popups (<a> with  data-popupref attribute)
		const popupLinks = document.querySelectorAll('a[data-popupref]');
		console.log(popupLinks);
		popupLinks.forEach(link => {
			link.addEventListener('click', async event => {
				event.preventDefault(); // prevent href="" from navigating

				// Find and opens frame
				const url = link.getAttribute('data-popupref'); 


				//  Create New Window 
			   const targetWindow = await createWindow(defPagePopupWindow(url)); 


				//  Load JSON content
				// // Includes Files (html content, styles, scripts) from Json definitions
				const jsonFiles = [ 
					{ jsonPath: 'web/general/general.json', selection: "main"}
				];	 
				await includeFilesFromJson(jsonFiles, targetWindow); 

			});
		});
		
		
		// Links to Buttons (<a> with  data-buttonref attribute)
		const buttonLinks = document.querySelectorAll('a[data-buttonref]');
		console.log(document);
		console.log(buttonLinks);
		buttonLinks.forEach(link => {
			link.addEventListener('click', async event => { 
				event.preventDefault(); // prevent href="" from navigating

				// Find & Click button
				const buttonID = link.getAttribute('data-buttonref'); 
				const button = document.getElementById(buttonID);
				 
				button.click();  

			});
		});
	}
	
	
	
	/* ───────────────────── Image Carousel ───────────────────── */ 
	function setupImageCarousel(){   
		document.querySelectorAll('.carousel-container').forEach(container => {

			console.log(container);
			const slides = Array.from(container.querySelectorAll('.carousel-slide-img')).map(img => ({
				image: img.src,
				caption: img.dataset.caption || ''
			}));

			const displayImg = container.querySelector('.carousel-display');
			const captionEl = container.querySelector('.carousel-header');
			let currentSlide = 0;

			const updateSlide = () => {
				displayImg.src = slides[currentSlide].image;
				captionEl.textContent = slides[currentSlide].caption;
			};

			container.querySelector('.prev-btn').addEventListener('click', () => {
				currentSlide = (currentSlide - 1 + slides.length) % slides.length;
				updateSlide();
			});

			container.querySelector('.next-btn').addEventListener('click', () => {
				currentSlide = (currentSlide + 1) % slides.length;
				updateSlide();
			});

			updateSlide();
		});

	}

 
	/* ───────────────── "On This Page" table of content ────────────────── */ 
	function setupOnThisPageBox() {
		const contentParent = document.querySelectorAll('.mainpage-parent');

		contentParent.forEach(parent => {
			const nav = parent.querySelector('nav.on-this-page');
			if (!nav) return;

			const tocRoot = nav.querySelector('ul');
			if (!tocRoot) return;
			tocRoot.innerHTML = '';

			const includeSummarys = nav.classList.contains('levels-three');
			const includePanels   = includeSummarys || nav.classList.contains('levels-two');	 

			// helper to slug-ify header text and ensure unique IDs
			const ensureId = (el, fallback) => {
				if (el.id) return el.id;
				const base = (el.textContent || fallback || '')
					.trim().toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '');
				let unique = base || `section-${Date.now()}`;
				for (let n = 1; document.getElementById(unique); n++)
					unique = `${base}-${n}`;
				el.id = unique;
				return unique;
			};

			parent.querySelectorAll('.section-header:not(.temp-hidden)').forEach((header, idx) => {
				const sectionId = ensureId(header, `section-${idx + 1}`);

				/* ---------- level-1 list item ---------- */
				const li = document.createElement('li');
				const a  = document.createElement('a');
				a.href = `#${sectionId}`;
				a.textContent = header.textContent.trim();
				li.appendChild(a);

				/* ---------- optional level-2 items ---------- */
				if (includePanels) {
					let subHeaders = [];

					// preferred: panel headers inside the very next .section-content wrapper
					let contentWrapper = header.nextElementSibling;
					if (contentWrapper && contentWrapper.classList.contains('section-content')) {
						subHeaders = Array.from(
							contentWrapper.querySelectorAll('.section-panel-header:not(.temp-hidden)')
						);
					}

					// fallback: sibling scan until the next .section-header
					if (subHeaders.length === 0) {
						let sib = header.nextElementSibling;
						while (sib && !sib.classList.contains('section-header')) {
							if (sib.classList && sib.classList.contains('section-panel-header') &&
								!sib.classList.contains('temp-hidden')) {
								subHeaders.push(sib);
							}
							sib = sib.nextElementSibling;
						}
					}

					/* ---------- build nested level-2 list ---------- */
					if (subHeaders.length) {
						const subUl = document.createElement('ul');

						subHeaders.forEach((pHead, pIdx) => {
							const pId = ensureId(pHead, `panel-${idx + 1}-${pIdx + 1}`);
							const subLi = document.createElement('li');
							const subA  = document.createElement('a');
							subA.href = `#${pId}`;
							subA.textContent = pHead.textContent.trim();
							subLi.appendChild(subA);

							/* ---------- optional level-3 from <summary> ---------- */
							if (includeSummarys) {
								const summaries = [];

								// scan siblings until next panel or section header
								let sib2 = pHead.nextElementSibling;
								while (sib2 && !sib2.classList.contains('section-panel-header') &&
									!sib2.classList.contains('section-header')) {

									// collect <summary> in direct <details> siblings
									if (sib2.tagName === 'DETAILS') {
										const s = sib2.querySelector('summary');
										if (s && !s.classList.contains('temp-hidden')) summaries.push(s);
									} else {
										// collect any nested <summary> elements
										sib2.querySelectorAll('details > summary').forEach(s => {
											if (!s.classList.contains('temp-hidden')) summaries.push(s);
										});
									}

									sib2 = sib2.nextElementSibling;
								}

								if (summaries.length) {
									const subSubUl = document.createElement('ul');
									summaries.forEach((sumEl, sIdx) => {
										const sId = ensureId(sumEl, `sum-${idx + 1}-${pIdx + 1}-${sIdx + 1}`);
										const subSubLi = document.createElement('li');
										const subSubA  = document.createElement('a');
										subSubA.href = `#${sId}`;
										subSubA.textContent = sumEl.textContent.trim();
										subSubLi.appendChild(subSubA);
										subSubUl.appendChild(subSubLi);
									});
									subLi.appendChild(subSubUl);
								}
							}

							subUl.appendChild(subLi);
						});

						li.appendChild(subUl);
					}
				}

				tocRoot.appendChild(li);
			});
	
			/* expand On Scroll */
			if (nav.classList.contains('expandOnScroll')) {
				initOnThisPageScrollSpy(nav);  				
			}
		
		});
		
		
	
	 

	} 
	
	
		
		// // // --------- helper ------- // // //
		/* highlights + auto-expand current section */
		function initOnThisPageScrollSpy(nav) {
			/* 1 – collect links & targets */
			const links   = Array.from(nav.querySelectorAll('a[href^="#"]'));
			const targets = links
				.map(a => document.querySelector(a.hash))
				.filter(Boolean);

			/* 2 – central routine that marks the TOC */
			const setActive = id => {
				if (!id) return;
				nav.querySelectorAll('li.active').forEach(li => li.classList.remove('active'));

				const link = nav.querySelector(`a[href="#${id}"]`);
				if (!link) return;

				let li = link.parentElement;
				li.classList.add('active');               // current item
				while ((li = li.parentElement.closest('li'))) {
					li.classList.add('active');           // all ancestors (auto-expand)
				}
				
				/* ──  keep the active item visible ─────────────────────────── */
				const scroller = nav.querySelector(':scope > ul');   // ← the element that now scrolls
				if (scroller && scroller.scrollHeight > scroller.clientHeight) {
					link.scrollIntoView({
						block: 'nearest',
						inline: 'nearest',
						behavior: 'smooth'   // remove if you prefer an instant jump
					});
				} 
				
			};

			/* 3 – scroll-based spy   */
			const observer = new IntersectionObserver(
				entries => {
					for (const entry of entries) {
						if (entry.isIntersecting) setActive(entry.target.id);
					}
				},
				
				
				// rootMargin: '(FROM TOP) 0px (FROM BOTTM) 0px' 
				// considers an element active when it is in the range between (FROM TOP) - (FROM BOTTOM)
				// i.e., when the element (likely the header) is in the range defined by:
				// // y position = between [-(FROM TOP)]% and [100+(FROM BOTTOM)]% from the top of the viewport
				//{ rootMargin: '-40% 0px -55% 0px' } // means active when 40% to (100-55)% = 40% to 45% from top
				{ rootMargin: '20% 0px -55% 0px' } // tune as needed
			);
			targets.forEach(t => observer.observe(t));

			/* 4 – hash-based spy (click or programmatic jump) */
			// a) page loads with a hash
			if (location.hash) setActive(location.hash.slice(1));

			// b) user clicks a TOC link
			links.forEach(a => {
				a.addEventListener('click', () => {
					/* Wait one frame so the browser finishes the jump scroll */
					requestAnimationFrame(() => setActive(a.hash.slice(1)));
				});
			});

			// c) hash changes by any other means (keyboard shortcuts, JS, etc.)
			window.addEventListener('hashchange', () =>
				setActive(location.hash.slice(1))
			);
		}

		
		
		
	



	/* ---------- SEACRH ------ */

	function setupSearchModalLike(){
		
		const contentContainerID = 'mainhelppage-content';
		const expandableSelector = 'details';

		const contentContainer = document.getElementById(contentContainerID);	
		const expandableElements = document.querySelectorAll(expandableSelector);

		const originalContent = contentContainer.innerHTML;

		
		document.getElementById('help-search').addEventListener('input', function() {
			console.log('aaa');
			searchInPage(this.value, originalContent, contentContainerID, expandableSelector);
		});

		
	}
	
	
	
	
	/* ---------- SEARCH ---------- */
function setupSearch () {

	/* config */
	const contentContainerID  = 'mainhelppage-content';
	const expandableSelector  = 'details';        // sections that may be collapsed

	/* elements & state */
	const contentContainer = document.getElementById(contentContainerID);
	const originalContent  = contentContainer.innerHTML;      // pristine markup

	const searchInput = document.getElementById('help-search');
	const prevBtn     = document.getElementById('search-prev');
	const nextBtn     = document.getElementById('search-next');

	let highlights    = [];   // NodeList → Array of <span class="highlight">
	let currIndex     = -1;   // index of the “current” hit

	/* ---------- listeners ---------- */
	searchInput.addEventListener('input', () => runSearch(searchInput.value.trim()));
	prevBtn    .addEventListener('click', () => jump(-1));
	nextBtn    .addEventListener('click', () => jump(+1));

	/* ---------- core ---------- */
	function runSearch (query) {
		
		const nav = document.querySelector('.mainpage-parent.help-page').querySelector('nav.on-this-page');
		
		/* 1 – reset if empty / invalid */
		if (!query || query.includes('<') || query.includes('>')) {
			resetContent();
			 
			initOnThisPageScrollSpy(nav);
			return;
		}

		/* 2 – rebuild innerHTML with highlights */
		const temp  = document.createElement('div');
		temp.innerHTML = originalContent;

		const walk  = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT);
		const regex = new RegExp(`(${query})`, 'gi');
		let   node;

		while (node = walk.nextNode()) {
			node.nodeValue = node.nodeValue.replace(regex, '[[[HIGHLIGHT]]]$1[[[/HIGHLIGHT]]]');
		}

		contentContainer.innerHTML =
			temp.innerHTML
				.replaceAll('[[[HIGHLIGHT]]]',  '<span class="highlight">')
				.replaceAll('[[[/HIGHLIGHT]]]', '</span>');
 
		initOnThisPageScrollSpy(nav);
		
		/* 3 – unhide collapsed sections that contain hits */ 		
		document.querySelectorAll(expandableSelector).forEach(section => { 
			if (section.querySelector('.highlight')) { 
				section.style.display = 'block';
				section.open = true; 
			}
		  });
		 

		/* 4 – collect hits & jump to the first one */
		highlights = Array.from(contentContainer.querySelectorAll('.highlight'));  
		currIndex  = highlights.length ? 0 : -1; 
		updateButtons();
		 
		 
		if (currIndex !== -1) { 
			scrollToCurrent();
		}
		 
	}

	function jump (direction) {
		if (!highlights.length) return;
		currIndex = (currIndex + direction + highlights.length) % highlights.length;
		scrollToCurrent();
	}

	function scrollToCurrent () {
		highlights.forEach(h => h.classList.remove('current'));
		const el = highlights[currIndex];

		/* make sure its parent section is visible */
		const section = el.closest(expandableSelector);
		if (section){
				section.style.display = 'block';
				section.open = true; 
			
		}   
		el.classList.add('current');
		
		// must wait till next frame after opening details to find it 
		setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);

	}

	function resetContent () {
		contentContainer.innerHTML = originalContent;
		document.querySelectorAll(expandableSelector).forEach(sec => sec.style.display = 'none');
		highlights = [];
		currIndex  = -1;
		updateButtons();
	}

	function updateButtons () {
		const disabled = !highlights.length;
		prevBtn.disabled = disabled;
		nextBtn.disabled = disabled;
	}
}




	
	
	// // end of function block // //
	
} 



function searchInPage(query, originalContentArg, contentContainerID, expandableSelector){
		//	CALL: 
		//	document.getElementById('search-box').addEventListener('input', function() {
		//		searchInPage(this.value, originalContent, contentContainerID, //expandableSelector);
		//	});*/

			  query = query.trim();
			  if (!query || query.includes('<') || query.includes('>')){
				  document.getElementById(contentContainerID).innerHTML = originalContentArg;
				  document.querySelectorAll(expandableSelector).forEach(sec => sec.style.display = 'none');
				  return;
			  } 

			  const temp = document.createElement('div');
			  temp.innerHTML = originalContentArg;
			  const walk = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null, false);
			  let node;
			  const regex = new RegExp(`(${query})`, 'gi');
			  while (node = walk.nextNode()) {
				node.nodeValue = node.nodeValue.replace(regex, '[[[HIGHLIGHT]]]$1[[[/HIGHLIGHT]]]');
			  }
 
			 document.getElementById(contentContainerID).innerHTML = temp.innerHTML.replace(/\[\[\[HIGHLIGHT\]\]\]/g, '<span class="highlight">').replace(/\[\[\[\/HIGHLIGHT\]\]\]/g, '</span>'); 
			  document.querySelectorAll(expandableSelector).forEach(section => { 
				if (section.querySelector('.highlight')) {
					section.style.display = 'block';
					section.open = true; 
				}
			  });
		}



 






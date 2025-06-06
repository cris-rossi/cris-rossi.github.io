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
    setupDataLinks(); 
	setupDoiLinks();
	setupImageCarousel(); 
	setupPageTabs();
	setupPageBubbles(); 
	
	
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
				
				// dataContent = name of file, with or without path   
				const dataContent = div.getAttribute('data-content');
				
				// extracts / prepares name of file with path  
				let targetFilename = dataContent.endsWith('.html') ? dataContent : `${dataContent}.html`;
				if (!dataContent.startsWith('/web')) { 
					targetFilename = `${path}${targetFilename}`;  // sets path to closest data-ath if path not explicitly defined
				}
				
				// extracts data-source selection  
				const targetSelection = div.getAttribute('data-content-sel') || '';  				
				
				await loadHTML(targetFilename, div, true, targetSelection); // loads content from file to container 
				
				await setupDataContent(div, count); // recursive: sets up data content within new content
				
			} 
		 }
	} 
	
	 
	
	/* ───────────────────── Links ───────────────────── */ 
	function setupDoiLinks() {
		const doiLinks = document.querySelectorAll('a.paperdoi');
		doiLinks.forEach(link => {
			const text = link.textContent.trim();
			const match = text.match(/^doi:\s*(10\.\S+)/i);
			if (match) {
				const doi = match[1];
				link.href = `https://doi.org/${doi}`;
			}
		});
	}

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

	/* ───────────────────── Within-page Tabs ───────────────────── */ 
	function setupPageTabs() {		
		document.querySelectorAll('.mainpage-parent').forEach(parent => { 

			/* opens tab when clicking on the tab button */
			const tabs = parent.querySelectorAll('.tab-button');
			const contents = parent.querySelectorAll('.tab-content');
			tabs.forEach((tab, index) => {
				tab.addEventListener('click', () => {
					tabs.forEach(t => t.classList.remove('active'));
					contents.forEach(c => c.classList.remove('active'));
					tab.classList.add('active');
					contents[index].classList.add('active');
				});
			}); 

			/* resets tabs when changing page */ 
			document.querySelectorAll('.toprow-tabbutton').forEach(pagebtn => { 
				pagebtn.addEventListener('click', () => {
					tabs.forEach(t => t.classList.remove('active'));
					contents.forEach(c => c.classList.remove('active'));
					tabs[0].classList.add('active');  // reset = open first tab
					contents[0].classList.add('active');
				});
				
			});
		});
		 
	}

	/* ───────────────────── Bubbles ───────────────────── */ 
	function setupPageBubbles() {		
		document.querySelectorAll('.mainpage-parent').forEach(parent => {   
			
			/* expands bubble when clicking on it */
			const bubbles = parent.querySelectorAll('.bubble');
			bubbles.forEach(bubble => {
				bubble.addEventListener('click', () => {
					bubbles.forEach(b => b.classList.remove('expanded'));
					bubble.classList.add('expanded');
					document.body.style.overflow = 'hidden';
				});
			});

			/* closes bubble when clicking x */
			const closeButtons = parent.querySelectorAll('.close-btn');
			closeButtons.forEach(btn => {
				btn.addEventListener('click', e => {
					e.stopPropagation();
					bubbles.forEach(b => b.classList.remove('expanded'));
					document.body.style.overflow = '';
				});
			});
			

			/* closes bubble when clicking outside */
			document.body.addEventListener('click', (e) => {
				if (!e.target.closest('.bubble.expanded') && !e.target.classList.contains('close-btn')) {
					bubbles.forEach(b => b.classList.remove('expanded'));
					document.body.style.overflow = '';
				}
			}); 

		});

	}
		


    
	
	// // end of function block // //
	
} 
 

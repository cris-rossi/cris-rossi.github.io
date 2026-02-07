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
	setupPageTabs();
    setupInteractive();
	
	
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
				const tabParent = div.closest('.js-mainWindow-pageContent[data-path]');

				// path <- data-path attribute of js-mainWindow-pageContent parent
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
		const doiLinks = document.querySelectorAll('a.js-paperdoi');
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
		buttonLinks.forEach(link => {
			link.addEventListener('click', async event => { 
				event.preventDefault(); // prevent href="" from navigating

				// Find & Click button
				const buttonID = link.getAttribute('data-buttonref'); 
				const button = document.getElementById(buttonID);				 
				button.click();  
			});
		}); 
		
		
		// Multiple-steps Links (<a> with  data-multilinkref attribute)
		const multiLinks = document.querySelectorAll('a[data-multilinkref]'); 
		multiLinks.forEach(link => {
			link.addEventListener('click', async event => { 
				event.preventDefault(); // prevent href="" from navigating

				// Extracts Refs
				const linkRefsString = link.getAttribute('data-multilinkref'); 
                const linkRefs = linkRefsString.split(" "); // refs are separated by space
                
                linkRefs.forEach(linkref => {
                    
                    // Checks linkref type --> performs appropriate action:
                    //  - If starts with # --> navigate to that location in space
                    //  - Otherwise --> click button
                	if (linkref.startsWith("#")) {
                        const elID = linkref.slice(1); // removes starting #
		                const el = document.getElementById(elID); // gets element
                        
                        // Scrolls to elements
                        // (requestAnimationFrame waits for layout update,
                        //  ensuring any prior relevant linkref has been completed)
                        requestAnimationFrame(() => {
                            el.scrollIntoView();
                        });
                    } else {                         
                        const button = document.getElementById(linkref);
                        button.click();  // clicks button with ID = linkref
                    }
                 
                });

			});
		});
	}
	
	
	 /* ───────────────────── Within-page Tabs ───────────────────── */ 
	function setupPageTabs() {		
		document.querySelectorAll('.js-mainpage-parent').forEach(parent => { 

            /* tab buttons & content containers */
			const tabs = parent.querySelectorAll('.js-tab-button');
			const contents = parent.querySelectorAll('.js-tab-content');
            
			/* opens tab when clicking on the tab button */
			tabs.forEach((tab, index) => {
				tab.addEventListener('click', () => { 
                    handleTabSelection(index);                     
				});
			}); 

			/* resets tabs when changing page */ 
			document.querySelectorAll('.js-mainWindow-pageHeader').forEach(pagebtn => { 
				pagebtn.addEventListener('click', () => { 
                    handleTabSelection(0);                     
				});				
			});
            
            /* helper function to change tab */ 
            function handleTabSelection(index) { 
                
                // if there are tabs in "parent" page 
                if (tabs.length != 0) { 
                    
                    // close all tabs 
                    tabs.forEach(t => t.classList.remove('jscs-tab-active'));
                    contents.forEach(c => c.classList.remove('jscs-tab-active')); 

                    // open only index tab
                    tabs[index].classList.add('jscs-tab-active');  
                    contents[index].classList.add('jscs-tab-active'); 
                }
            }
            
		}); 
        
	}

	
	// // end of function block // //
	
} 
 

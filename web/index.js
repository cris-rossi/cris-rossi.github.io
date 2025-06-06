

// MAIN JS FILE THAT IS CALLED UPON WEBSITE LOADING 
// Creates the main window top row tabs and tabs contents,
//   and handles everything else through other scripts 

const mainWindowTabDefinition = [
    { buttonText: 'HOME', htmlFileName: 'home', tooltip: '' }, 
    { buttonText: 'ABOUT ME', htmlFileName: 'about', tooltip: '' }, 
    { buttonText: 'RESEARCH', htmlFileName: 'research', tooltip: '' }, 
    { buttonText: 'TOOLS', htmlFileName: 'tools', tooltip: '' }, 
    { buttonText: 'TEACHING', htmlFileName: 'teaching', tooltip: '' }, 
    { buttonText: 'CV', htmlFileName: 'cv', tooltip: '' }, 
];
  
 /*   { buttonText: 'LEARN', htmlFileName: 'help', tooltip: 'Instructions and Guides'  }*/

// MAIN WINDOW - INITIAL CALL
// Prepare main window overall structure (top row, and container for page content),
// then loads home page
document.addEventListener("DOMContentLoaded", async () => {  
	
  	const [firstPageDef, ...otherPagesDef] = mainWindowTabDefinition;
	 
	// Step 1: Initialize first page and get its jsonFiles
	const firstJsonFiles = await firstPageInitialization();
	  
	// Step 2: Initialize other pages and get json
	const otherJsonFiles = await createTabs(otherPagesDef);
	
	// post-json-loading setup 
	setupPage(); 
	
	// includes "modals" that were left behind (slow: 2-3 sec loading)
	// does not "await" so they can load in the background without slowing things
	const jsonFiles = [...firstJsonFiles, ...otherJsonFiles];
	includeFilesFromJson(jsonFiles, undefined, ["modals"], []); 
	 
	
	
	// ----------------- HELPER FUNCTIONS ----------------- //
	
	// FUNCTION to create & initialize content seen on Home Page (priority) 
	async function firstPageInitialization(){ 
		
		// - - - 1) Header - - - //
		createHeader(); 	
		
		// - - - 2) Main Page Tab - - - //
		const jsonFiles = [
			{ jsonPath: 'web/general/general.json', selection: 'main', htmlContainer: document.body }
		]; 
		
		//  PAGES Tab links -> creates content for  pages + gets JSON references 
		// (jsonFiles array will store json files for these pages)
		await createTabs([firstPageDef], jsonFiles); 
		
		// Clicks to open home page  
		document.getElementById('home_Button').click();
		
		return jsonFiles; // return to parent
	
	}
	
	
	// FUNCTION to create HEADER with LOGO & TAB BUTTONS    
	function createHeader(){
		 // OVERALL TOP NAVIGATION MENU 
		// Container 
		const mainWindowTopRowContainer = document.createElement('div');
		mainWindowTopRowContainer.className = 'mainWindow-topRowContainer';
		document.body.appendChild(mainWindowTopRowContainer);

		// Logo image 
		const logoImg = document.createElement('img');
		logoImg.src = '/web/img/headshot.jpg'; 
		mainWindowTopRowContainer.appendChild(logoImg); 
		
		// Name and pronouns
		const personalInfoElement = document.createElement('div'); 
		personalInfoElement.className = 'header-namepronouns'; 
		mainWindowTopRowContainer.appendChild(personalInfoElement); 
		const nameElement = document.createElement('div');
		nameElement.innerHTML = 'Cris Rossi, Ph.D.'; 
		nameElement.className = 'header-name'; 
		personalInfoElement.appendChild(nameElement); 
		const pronounsElement = document.createElement('div');
		//pronounsElement.innerHTML = 'they/them';/*⁄／⧸/∕*/   
		pronounsElement.className = 'header-pronouns'; 		
		const slash = document.createElement("span");
		slash.className = "short-slash";
		slash.textContent = "/";
		pronounsElement.textContent = "they";
		pronounsElement.appendChild(slash);
		pronounsElement.append("them");
		personalInfoElement.appendChild(pronounsElement);  
		personalInfoElement.addEventListener('click', () => {
			mainWindowClickTab("home");
		});  

		// Tab links -> creates content for each page + gets JSON references + links buttons
		mainWindowTabDefinition.forEach(({ buttonText, htmlFileName, tooltip }) => {
			const button = document.createElement('button');
			button.id = htmlFileName + '_Button'; 
			button.className = 'toprow-tabbutton'; 
			button.title = tooltip; 
			button.textContent = buttonText;
			button.addEventListener('click', () => {
				mainWindowClickTab(htmlFileName);
			});  
			mainWindowTopRowContainer.appendChild(button);  
		}); 
		
		
		// // HELPER FUNCTION // // 
		// open tab content when clicking tab button
		// (load the content of a main window tab, change tab link style)    
		function mainWindowClickTab(clickedTab) {
			const clickedTabID = clickedTab + '_Container';
			const allTabContentContainers = document.querySelectorAll('.mainWindow-tabContentContainer');

			// Smoothes change of tabs
			// this goes with css at index.css:
			// // .mainWindow-tabContentContainer {  transition: opacity 0.2s ease; }
			allTabContentContainers.forEach(tabContent => {
				if (tabContent.id === clickedTabID) {
					tabContent.classList.add('show');
					setTimeout(() => {
						tabContent.style.opacity = '1';
					}, 10); // Let class apply before transitioning
				} else {
					tabContent.style.opacity = '0';
					setTimeout(() => {
						tabContent.classList.remove('show');
					}, 100); // Match CSS transition duration
				}
			});

			// Resets Page 
			history.replaceState(null, null, 'index.html'); // Removes any "#" indicating what we clicked on in previous tab
			location.hash = '#' + clickedTab;  // current tab
			// Scroll up on tab switch (immediately - not smoothing)			
			const html = document.documentElement;  // Temporarily disable smooth scroll
			const prevScrollBehavior = html.style.scrollBehavior;
			html.style.scrollBehavior = 'auto'; 
			window.scrollTo({ top: 0 }); // Actual Scroll
			setTimeout(() => {
				html.style.scrollBehavior = prevScrollBehavior || '';// Restore smooth scroll
			}, 0); // restore on next tick
			 

			// Update button styles
			const clickedButtonID = clickedTab + '_Button';
			const allTabButtons = document.querySelectorAll('.mainWindow-topRowContainer button');
			allTabButtons.forEach(button => {
				button.classList.toggle('active', button.id === clickedButtonID);
			});
		} 
	}
	
	
	// FUNCTION to create the MAIN TABS with CONTENT    
	async function createTabs(pagesDef, jsonFiles = []){   
		//  PAGES Tab links -> creates content for  pages + gets JSON references 
		// (jsonFiles array will store json files for these pages)
		pagesDef.forEach(({ htmlFileName }) => { 
			mainWindowInitializeTabContent(htmlFileName,jsonFiles);
		});   
 
		// includes scripts and styles as defined by the .json files 
		// including all types except "modals" (these take a long time to load - we will do it sync) 
		await includeFilesFromJson(jsonFiles, undefined, ["all"], ["modals"]); 
		
		return jsonFiles;
		
		
		
		// // HELPER FUNCTION // // 
		// initializes tab contents (container, html content, script/style files)     
		function mainWindowInitializeTabContent(htmlFileName,jsonFiles){   
			// creates tab content container   
			const tabContentContainer = document.createElement('div');
			tabContentContainer.className = 'mainWindow-tabContentContainer';
			tabContentContainer.id = htmlFileName+'_Container';
			document.body.appendChild(tabContentContainer);

			// Stores tab-specific .json file and parameters to array,
			// used to include tab-specific scripts, styles, and HTML content, as defined by the .json files   
			const folderName='web/'+htmlFileName;    
			const jsonPath=folderName+'/'+htmlFileName+'.json';   // tab-specific json   
			jsonFiles.push({ jsonPath, selection: "main", htmlContainer: tabContentContainer }); 

		} 
	}
	 


});
 





                  
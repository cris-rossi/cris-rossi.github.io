
// // // FUNCTIONS TO ATTACH SCRIPTS AND STYLES TO WINDOWS // // // 
// Function to attach JS, CSS, HTML files from JSON to a target window
async function includeFilesFromJson(argsArray,targetWindow = window, groupTypeInclude, groupTypeExclude) {
	// Note: groupTypeInclude, groupTypeExclude overridden by individual 
	// args.typeInclude, args.typeExclude if these are present
	
	//console.log('jsonWrapper In');
	//console.log(argsArray); 
	
	pendingEntryScripts=[];
	// loads everything except the entry scripts 
	for (const args of argsArray) {   
		 
		const {jsonPath, selection, htmlContainer,
			   typeInclude = groupTypeInclude, typeExclude = groupTypeExclude} = args; 
		
		// Await the full processing of each JSON file.   
		await includeFromJson(jsonPath, targetWindow, selection,
							  htmlContainer,pendingEntryScripts,typeInclude,typeExclude);  
	}
 
	// Once all calls are complete, load all collected entry scripts.
	for (const { url, targetWindow } of pendingEntryScripts) {
		await includeScript(url, targetWindow);
	}
	
	//console.log('jsonWrapper Out'); 
	
 
	async function includeFromJson(jsonPath, targetWindow = window, selection = "", 
										 htmlContainer = targetWindow.document.body,
										 pendingEntryScripts,
								   		 typeInclude = ["all"], typeExclude = []) { 
 
		const response = await fetch(jsonPath);  // extract data from json file
		const data = await response.json();
		const filePath = data.path; // Containing folder
		 
        
		// stores path reference to container
		htmlContainer.setAttribute('data-path', filePath);
        
		
		// Lookup Table: "type string" -> script to run 
		const loaders = {
			html:            file => loadHTML(filePath + file, htmlContainer, true),
			scopedScripts:   file => includeScript(filePath + file, targetWindow),
			externalScripts: file => includeScript(file,                targetWindow),
			css:             file => includeStyle(filePath + file, targetWindow),
			externalCss:     file => includeStyle(file,            targetWindow),
			modals: async fileObj => {   // iFrame modals  
				const iframe = await loadHTMLFrame(filePath + fileObj.file, fileObj.id, targetWindow);
				if (fileObj.selection) {
					await includeFromJson(jsonPath, iframe.contentWindow,fileObj.selection);
				}
			}
		};
		
		// Loads all file types 
		await loadCategory('html',            selection);
		await loadCategory('scopedScripts',   selection);
		await loadCategory('externalScripts', selection);
		await loadCategory('css',             selection);
		await loadCategory('externalCss',     selection);
		await loadCategory('modals',          selection); 
		await loadCategoryScript(); 
 
		
		
		
		//////////////////// HELPER FUNCTIONS ////////////////////		
		// Generic Wrapper for Loading everything but "scripts" //
		async function loadCategory(key, selection) {			
			if ( typeInclude.includes(key) || 
				(typeInclude.includes("all") && !typeExclude.includes(key)) ){				
				const files = collectSelectedFiles(data[key], [selection, 'global']);
				for (const f of files) await loaders[key](f);
			}
		}
		
		// // // Wrapper for loading "scripts" (JS files) // // //
		// - Loads all scripts for "main" and not others
		// - Leaves "entry" scripts for last 
		async function loadCategoryScript(){
			if ( typeInclude.includes('scripts') || 
				(typeInclude.includes("all") && !typeExclude.includes('scripts')) ){	
				// Loads scripts only for "main" call (primary call in main window) // // //
				// (Handles scripting centrally, not directly in popups + Avoids reloading for secondary calls)
				if (selection == "main") {  
					// gets array of entry scripts, or set variable to [] if there is no such definition in json 
					const entryScripts = collectSelectedFiles(data.scripts,['entry']);
					// Load scripts except the entry scripts
					for (const [category, files] of Object.entries(data.scripts)) { 
						for (const file of files) {					
							if (!entryScripts.includes(file)) { // Check if file is NOT in entryScripts array 
								// console.log('Loading Script '+ file);
								await includeScript(filePath + file, targetWindow); 
							} 
						} 
					}
					// Store all entry scripts to load last  
					for (const entry of entryScripts) {  
						pendingEntryScripts.push({ url: filePath + entry, targetWindow });
					} 
				} 
			}
		}
		
		
  
		// Helper Function to Return List of Files included in selection + global + $include references //
		function collectSelectedFiles(data,selections,result = []){  
            if(data){ 
                // Iterate through selection + global
                selections.forEach(sel => {   
                    // Iterate through all items (listed css/html/js files or $include objects)
                    data[sel]?.forEach(item => { 
                       
                        if (item && item.$include && data[item.$include]) {  
                            // $include object -> recursively adds files to array
                            collectSelectedFiles(data,[item.$include],result);  
                        } else {
                            // css/html/js file  -> add to array
                            result.push(item); 
                        }  
                    }); 
                });                
            }
			return result; 
		} 

		// Function includes css style from file fileSource 
		// to the doc (if only first argument passsed) or a window (second argument)
		function includeStyle(fileSource, targetWindow) {	
			// Target document <- targetWindow.document if targetWindow exists, document otherwise
			const targetDoc = targetWindow ? targetWindow.document : document;

			// Creates and initializes script elemement
			const cssLink = targetDoc.createElement('link'); // creates link element = reference to external source
			cssLink.rel = 'stylesheet'; // specifies "relationship" = source is a stylesheet for doc/window
			cssLink.type = 'text/css'; // specifies file type = source is a css file
			cssLink.href = fileSource; // file path
			targetDoc.head.appendChild(cssLink);
		}
                                   
                                   
                                   
        
        // function to load an entire HTML file as a iframe (for modals)
        function loadHTMLFrame(fileSource, frameID, targetWindow) {   
            return new Promise((resolve, reject) => {
                const iframeElement = targetWindow.document.createElement('iframe'); 
                iframeElement.src = fileSource; //'error-popup.html'; 
                iframeElement.className="general-iframe"; 	
                iframeElement.id =  frameID;// sets the id = filename 
                iframeElement.style.display="none"; 				 
                targetWindow.document.body.appendChild(iframeElement);  
                
                // Resolve the Promise when the iframe has loaded
                iframeElement.onload = () => {
                    resolve(iframeElement);
                }; 
            });
        } 
	}
							   
	// Function includes js script from file fileSource 
	// to the doc (if only first argument passed) or a window (second argument)
	// Uses Promise to allow to fully load a script before starting to load the next one 
	//   I.e., using await in the calling function: await includeScript(fileSource);
	function includeScript(fileSource, targetWindow) {	 
		return new Promise((resolve) => {

			// Target document <- targetWindow.document if targetWindow exists, document otherwise
			const targetDoc = targetWindow ? targetWindow.document : document;

			// Creates and initializes script elemement
			const scriptElement = targetDoc.createElement('script'); 
			scriptElement.src = fileSource;  

			// Sets up listener to track when script has loaded
			scriptElement.onload = () => {  
				resolve(scriptElement); // Resolve with the script element once it's loaded
			};

			// adds script to document and returns it
			targetDoc.body.appendChild(scriptElement);   

		});
	}
}


// // // FUNCTION TO POPULATE CONTAINERS WITH HTML CONTENT FROM FILES // // // 
// loads html body content from file and loads it onto container 
// How to pass a function to loadHTML:
//		loadHTML(...).then(()=>{});  
//      or, if the caller function is async: await loadHTML(...)
// Input parameters: 
//		fileSource = path of the file to load (folderName + htmlFileName), 
//		targetContainer = container in the new page where you want to load the html content,
//		addFlag = true if you want to add content to container, false if you wanna replace content,
//		dataSourceValue = if you only want to load specific content from the file - that contained in a container with attribute data-source="${dataSourceValue}"	
function loadHTML(fileSource, targetContainer = window.document.body, addFlag = false, dataSourceValue = '') {  
	
	return new Promise((resolve) => { // 'return' occurs on 'resolve' below (after loading completed) 
		// Load + parse HTML file -> add HTML content to container
		loadFile(fileSource).then(html => {
			const parser = new DOMParser();
			const parsedHtml = parser.parseFromString(html, 'text/html'); 			
			
			// Parses either entire file, or that in container specified by dataSourceValue
			let parsedHtmlContent;
			if (dataSourceValue) {
				const subsection = parsedHtml.querySelector(`[data-source="${dataSourceValue}"]`);
				parsedHtmlContent = subsection ? subsection.innerHTML : ''; 
			} else {
				parsedHtmlContent = parsedHtml.body.innerHTML;
			} 
			
			// Adds or replaces HTML content in new file
			if (addFlag) { // adds to current body HTML
				targetContainer.insertAdjacentHTML('beforeend', parsedHtmlContent); 
			} else { // replaces innerHTML
				targetContainer.innerHTML = parsedHtmlContent;
			}
			
			resolve(); // Waits for HTML to continue
			
		}); 
	});
} 




// // // FUNCTIONS TO LOAD FILES (INTERNAL AND EXTERNAL) // // //
// source: URL string (internal) or File object (external) 
async function loadFile(source) { 
    if (typeof source === 'string') {	  // INTERNAL FILE //
        // Load internal file using fetch (source = file path)
        const response = await fetch(source); 
        return await response.text();    
    } else if ((source instanceof File) || (Object.prototype.toString.call(source)=== '[object File]')) { 	  // EXTERNAL FILE //
        // Load external file using FileReader (source = file, from input type=file)    
        return await readFileAsText(source);
    }   

    //helper function: reads a File object as text using FileReader
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = event => 
            reject(new Error("File could not be read: " + event.target.error));
            reader.readAsText(file);
        });
    }
}

 

// // // FUNCTIONS TO CREATE AND INITIALIZE NEW POPUP WINDOWS // // // 

// Function creates a new window, using specified size and position
// Size: width, height, sizeUnits = "%" or "px"
// 			 // sizeUnits = "px" -> absolute size in pixel
// 			 // sizeUnits = "%" -> size as % of screen size
// Position: left = 0, top = 0, positionUnits = "%", "px", "+%", or "+px"
// 			 // positionUnits = "%", "px" -> position from top-left corner of screen
// 			 // positionUnits = "+%", "+px" -> position from center of screen
function createWindow({width, height, sizeUnits = "%",
                      left = 0, top = 0, positionUnits = "%", htmlFile = ''}) {  

    // Reference dimensions: get the dimensions of the screen
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height; 

    // New window size 
    const windowWidth = getMeasure(width, sizeUnits, screenWidth, 0);
    const windowHeight = getMeasure(height, sizeUnits, screenHeight, 0);

    // New window position, if centered
    const windowLeftCentered = (screenWidth - windowWidth) / 2;
    const windowTopCentered = (screenHeight - windowHeight) / 2; 
	 
    // New window position
    const windowLeft = getMeasure(left, positionUnits, screenWidth, windowLeftCentered);
    const windowTop = getMeasure(top, positionUnits, screenHeight, windowTopCentered);

    // Open the window with the calculated size and position	 
	const newWindow = window.open(htmlFile, '_blank', `
		width=${windowWidth},height=${windowHeight},
		left=${windowLeft},top=${windowTop}
	`);   
	return new Promise((resolve, reject) => {
        robustOnLoad(newWindow, () => {
			// console.log('createWindow OUT');
            resolve(newWindow); // Resolve the promise once the window is fully loaded
        });
    });
	
	 
	
    // Support function to calculate measures that are a percentage of screen size
    function calculatePercentage(value, refSize){
        return Math.round(refSize * (Math.abs(value) > 1 ? value / 100 : value));
    };
    // Support function to calculate size or offset (for both width, height, left, and top)
    function getMeasure(value, units, refSize, centerOffset){
		// size or position relative to top-left screen corner:
        if (units === "px") return value; // measure in pixel
        if (units === "%") return calculatePercentage(value, refSize); // measure in % of screen size
		// position relative to screen center:
        if (units === "+px") return centerOffset + value; // pixel
        if (units === "+%") return centerOffset + calculatePercentage(value, refSize);  // % of screen size 
    };
	
	
	// Support function to return promise once window has loaded
	// (Can be standalone if needed -> move out of this function)
		// Function ensures that a function is run upon loading of a new popup window
		// loadingElement: a new popup window
		// targetFunction: function to be executed upon loading completion
		// How to pass a function to robustOnLoad:
		//		robustOnLoad(myWindow, myFunction.bind(null, 
		//				myFunctionParam1, myFunctionParam2, myFunctionParam3,...));  
	function robustOnLoad(loadingElement,targetFunction){ 
		// Check if the new window is already loaded
		if (loadingElement.document.readyState === 'complete') { 
			// If already loaded, execute modifications immediately
			targetFunction(); 
		} else { 
			// If not loaded, attach a load event listener
			loadingElement.addEventListener('load', targetFunction); 
		}
		// setTimeout(targetFunction,2000);
	} 
	
}
	 

// // // INTERFACE GET FUNCTIONS // // // 
// Function gets the value of a css property as originally defined in the css file
// (original value even if later overridden in js)
function getOriginalStyle(selector, property) {
	// example use:
	// const originalDisplay = getOriginalStyle('.myClass', 'display');
	// console.log(originalDisplay); // Will output the display style like "flex"
	// To check actual current style, use:	console.log(window.getComputedStyle(myElement).display);
    for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules || sheet.rules) {
            if (rule.selectorText === selector) {
                return rule.style[property] || null;
            }
        }
    }
    return null;
}

 

///// DEBUGGING FUNCTIONS ////
	
function simulateDelayWindow(ms, targetWindow){
	simulateDelay(ms,()=>{
		targetWindow.document.readyState='loading';
	});
}
function simulateDelay0(ms,loopFun= () => {}){
	let start = new Date().getTime();
	let end = start;
	while (end < start + ms) {
	  	end = new Date().getTime();
		loopFun();
	} 
}
		
/*Sample use
console.log('modals in');
await simulateDelay(5000);		
console.log('modals  del');*/
async function simulateDelay(ms) {
	console.log('Before wait');
	await sleep(ms); // Wait 
	console.log('After wait');
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

		
		
		

		
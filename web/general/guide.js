
function guideSetup(){
	
	const contentContainerID = 'helpGuide-content';
	const expandableSelector = '.section-content';
	 	
	const contentContainer = document.getElementById(contentContainerID);	
	const expandableElements = document.querySelectorAll(expandableSelector);

	const originalContent = contentContainer.innerHTML;

	document.querySelector('.x-close').onclick = () => {
		closeHelpWindow();
	};
	document.querySelector('.closeButton').onclick = () => {
		closeHelpWindow();
	};


	window.onclick = (event) => {
	  if (event.target == document.getElementById('helpGuide-modal'))
		document.querySelector('.x-close').onclick();
	};



	document.getElementById('search-box').addEventListener('input', function() {
		searchInPage(this.value, originalContent, contentContainerID, expandableSelector);
	});
	
	

	 
	document.querySelectorAll('a.help-modal-link[data-modalref^="#"]').forEach(link => {
		link.addEventListener('click', event => {
			event.preventDefault(); // prevent href="" from navigating

			// Find and opens frame
			const targetID = link.getAttribute('data-modalref').replace(/^#/, ''); 
			const guidePopupFrame = parent.document.getElementById(targetID);  
			guidePopupFrame.contentWindow.openModal?.();

			// Sets a higher z-index than self
			const currentFrameZ = parseInt(parent.getComputedStyle(window.frameElement).zIndex);
			guidePopupFrame.style.zIndex = (currentFrameZ + 1).toString(); 
		});
	});



	
	function closeHelpWindow(){
		document.getElementById('helpGuide-modal').style.display 	= 'none';
		document.getElementById('search-box').value = '';
		resetContent(originalContent, contentContainerID, expandableSelector);


		//	window.frameElement.style.display = "none";

		const frameEl = window.frameElement;
		if (frameEl){ // html was opened as a frame -> hide the frame
			window.frameElement.style.display = "none";
		} else { // html was opened as a window -> close the window
			window.close();		
		}  
	}
	

	function resetContent(originalContentArg, contentContainerID, expandableSelector) {
	  contentContainer.innerHTML = originalContentArg;
	  expandableElements.forEach(sec => sec.style.display = 'none');
	}  

	
}



 


function openModal(){
			 
	guideSetup();
	
	// Opens Window
	window.frameElement.style.display = "block";
	window.frameElement.classList.add("help-iframe"); 
	document.getElementById('helpGuide-modal').style.display = 'block'; 
}	

function toggleStickyHeader(clickedHeader){
  const nextDiv = clickedHeader.nextElementSibling;
  nextDiv.style.display = (nextDiv.style.display === 'block') ? 'none' : 'block';
}

	
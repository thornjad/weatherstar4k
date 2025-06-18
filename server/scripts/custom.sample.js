// this file is loaded by the main html page (when renamed to custom.js)
// it is intended to allow for customizations that do not get published back to the git repo
// for example, changing the logo

const customTask = () => {
	// get all of the logo images
	const logos = document.querySelectorAll('.logo img');
	// loop through each logo
	logos.forEach((elem) => {
		// change the source
		elem.src = 'my-custom-logo.gif';
	});
};

// start running after all content is loaded, or immediately if page content is already loaded
if (document.readyState === 'loading') {
	// Loading hasn't finished yet
	document.addEventListener('DOMContentLoaded', customTask);
} else {
	// `DOMContentLoaded` has already fired
	customTask();
}
document.addEventListener('DOMContentLoaded', () => {

});

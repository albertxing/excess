var loc = window.location;
var head = document.getElementsByTagName('head')[0];
chrome.storage.local.get('files', function (result) {
	var files = result.files;
	for (var f in files) {
		var file = files[f];
		var reg = new RegExp(file.properties.filter(function (prop) {
			return prop.key == 'match'
		})[0].value);

		if (reg.test(loc)) {
			console.log(file);
			var css = file.raw;
			var style = document.createElement('style');
			style.classList.add('excess');
			style.innerHTML = css;
			head.appendChild(style);
		}
	}
});
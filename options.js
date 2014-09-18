var folder;
chrome.storage.local.get('folder', function (data) {
	folder = data.folder;
});

var editor = ace.edit('editor');
editor.getSession().setMode("ace/mode/css");
editor.setShowPrintMargin(false);

var state = null;

var newl = document.querySelector('.new');
var styles = document.querySelector('.styles ul');
var main = document.querySelector('.main');
var title = document.querySelector('.options .title');
var rules = document.querySelector('.rules pre')
var save = document.querySelector('.options .save');
var remove = document.querySelector('.options .remove');

newl.onclick = function () {
	title.innerHTML = 'New Style';
	title.classList.add('dirty');
	main.style.display = 'initial';

	state = null;
}

save.onclick = function () {
	if (!state) {
		var li = document.createElement('li');
		li.classList.add('link');
		li.innerHTML = title.innerHTML;
		styles.appendChild(li);

		chrome.identity.getAuthToken({interactive: true}, function (token) {
			var css = editor.getValue();
			var metadata = {
				title: title.textContent.toLowerCase() + '.css',
				mimeType: 'text/css',
				parents: [folder],
				properties: [{
					key: 'match',
					value: rules.textContent,
					visibility: 'PRIVATE'
				}]
			};
			var metastring = JSON.stringify(metadata);

			// var formreq = '--excess\nContent-Type: application/x-www-form-urlencoded\n\nuploadType=multipart';
			var metareq = '--excess\nContent-Type: application/json\n\n' + metastring;
			var cssreq = '\n\n--excess\nContent-Type: text/css\n\n' + css;
			var end = '\n\n--excess--';

			var req = metareq + cssreq + end;
			var size = req.length;

			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart');
			xhr.setRequestHeader('Authorization', 'Bearer ' + token);
			xhr.setRequestHeader('Content-Type', 'multipart/related; boundary="excess"');
			xhr.setRequestHeader('Content-Size', size);

			xhr.onload = function () {
				console.log(xhr.responseText);
			};

			xhr.send(req);
		});
	}

	title.classList.remove('dirty');
}
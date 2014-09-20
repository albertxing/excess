var port = chrome.runtime.connect();
port.onMessage.addListener(function (msg) {
	update(msg);
});

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

function update (local) {
	var files = local;
	if (!files) {
		chrome.storage.local.get('files', function (data) {
			files = data.files;
			list(files);
		});
	}
	list(files);
}

function list (files) {
	styles.innerHTML = '';

	for (var id in files) {
		var li = document.createElement('li');
		var file = files[id];
		li.classList.add('link');
		li.innerHTML = file.description;
		li.file = file;
		li.onclick = function () {
			load(this.file);
		};
		styles.appendChild(li);
	}
}

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
		li.innerHTML = title.textContent;
		styles.appendChild(li);

		chrome.identity.getAuthToken({interactive: true}, function (token) {
			var css = editor.getValue();
			var metadata = {
				title: title.textContent.toLowerCase().replace(/\s/, '_') + '.css',
				mimeType: 'text/css',
				parents: [folder],
				description: title.textContent,
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
				var file = JSON.parse(xhr.responseText);
				file.raw = css;
				chrome.runtime.sendMessage('update');
			};

			xhr.send(req);
		});
	} else {
		chrome.identity.getAuthToken({interactive: true}, function (token) {
			var css = editor.getValue().trim();
			var metadata = {
				title: title.textContent.toLowerCase().replace(/\s/, '_') + '.css',
				description: title.textContent,
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
			xhr.open('PUT', 'https://www.googleapis.com/upload/drive/v2/files/' + state.id + '?uploadType=multipart');
			xhr.setRequestHeader('Authorization', 'Bearer ' + token);
			xhr.setRequestHeader('Content-Type', 'multipart/related; boundary="excess"');
			xhr.setRequestHeader('Content-Size', size);

			xhr.onload = function () {
				var file = JSON.parse(xhr.responseText);
				file.raw = css;
				port.postMessage('update');

				state = file;
			};

			xhr.send(req);
		});
	}

	title.classList.remove('dirty');
}

function load (file) {
	title.innerHTML = file.description;
	rules.innerHTML = file.properties.filter(function (p) {
		return p.key == 'match';
	})[0].value;
	main.style.display = 'initial';
	editor.setValue(file.raw.trim());
	state = file;
}

update();
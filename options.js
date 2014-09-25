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
editor.setFadeFoldWidgets(true);
editor.session.setOption("useWorker", false);

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
		li.classList.add(file.description.replace(/\s/, '_'));
		li.onclick = function () {
			load(this.file);
		};
		styles.appendChild(li);
	}
}

function load (file) {
	title.innerHTML = file.description;
	rules.innerHTML = file.properties.filter(function (p) {
		return p.key == 'match';
	})[0].value;
	main.style.display = 'initial';
	editor.setValue(file.raw.trim(), -1);
	editor.blur();
	state = file;
}

newl.onclick = function () {
	title.innerHTML = 'New Style';
	rules.innerHTML = '.*';
	title.classList.add('dirty');
	main.style.display = 'initial';
	editor.setValue('');

	state = null;
}

save.onclick = function () {
	if (!state) {
		var li = document.createElement('li');
		li.classList.add('link');
		li.innerHTML = title.textContent;
		styles.appendChild(li);

		save.setAttribute('disabled', true);

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
				state = file;
				chrome.runtime.sendMessage('update');
				save.setAttribute('disabled', false);
			};

			xhr.send(req);
		});
	} else {
		var li = document.querySelector('.' + state.description.replace(/\s/, '_'));
		li.textContent = title.textContent;
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

remove.onclick = function () {
	main.style.display = 'none';

	if (!state) return;

	document.querySelector('.' + state.description.replace(/\s/, '_')).remove();

	chrome.storage.local.get('files', function (data) {
		delete data.files[state.id];
		chrome.storage.local.set({files: data.files});
	});

	chrome.identity.getAuthToken({interactive: true}, function (token) {
		var xhr = new XMLHttpRequest();
		xhr.open('PUT', 'https://www.googleapis.com/drive/v2/files/' + state.id);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.setRequestHeader('Content-Type', 'application/json');

		xhr.onload = function () {
			port.postMessage('update');
		}

		xhr.send(JSON.stringify({labels: {trashed: true}}));
	});
}

window.onunload = function () {
	port.disconnect();
}

update();
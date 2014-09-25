chrome.runtime.onStartup.addListener(update);
chrome.runtime.onInstalled.addListener(installed);

var apiUrl = 'https://www.googleapis.com/drive/v2/';

function installed (details) {
	if (details.reason == 'install') {
		chrome.storage.local.set({
			'files': {}
		});
	}

	update();
}

function update (callback) {
	chrome.identity.getAuthToken({interactive: true}, function (token) {
		var xhr = new XMLHttpRequest();
		var query = 'title = "Excess" and mimeType = "application/vnd.google-apps.folder"';
		xhr.open('GET', apiUrl + 'files?q=' + query);
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.onload = function () {
			var data = JSON.parse(xhr.responseText);
			var folder = data.items[0];

			if (!folder) {
				var fxhr = new XMLHttpRequest();
				fxhr.open('POST', apiUrl + 'files');
				fxhr.setRequestHeader('Authorization', 'Bearer ' + token);
				fxhr.setRequestHeader('Content-Type', 'application/json');
				fxhr.onload = function () {
					folder = JSON.parse(fxhr.responseText).items.filter(function (i) {
						return (i.mimeType == 'application/vnd.google-apps.folder'
							&& i.title == 'Excess');
					});
				}

				var folderData = {
					'title': 'Excess',
					'mimeType': 'application/vnd.google-apps.folder'
				}

				fxhr.send(JSON.stringify(folderData));
			}

			chrome.storage.local.set({'folder': folder});

			var query = '"' + folder.id + '" in parents and trashed = false';
			var cxhr = new XMLHttpRequest();
			cxhr.open('GET', apiUrl + 'files?q=' + query);
			cxhr.setRequestHeader('Authorization', 'Bearer ' + token);
			cxhr.onload = function () {
				var files = JSON.parse(cxhr.responseText);
				var local;
				chrome.storage.local.get('files', function (result) {
					var local = result.files;

					Object.keys(local).filter(function (id) {
						return files.items.filter(function (f) {
							return f.id == id;
						}).length == 0;
					}).forEach(function (id) {
						delete local[id];
					});

					var incoming = 0;
					files.items.forEach(function (item) {
						if (!local[item.id] || local[item.id].version != item.version) {
							incoming++;

							dxhr = new XMLHttpRequest();
							dxhr.open('GET', item.downloadUrl);
							dxhr.setRequestHeader('Authorization', 'Bearer ' + token);
							dxhr.onload = function () {
								var raw = dxhr.responseText;
								item.raw = raw.trim();

								incoming--;
								if (incoming == 0) {
									chrome.storage.local.set({files: local});

									if (callback) callback(local);
								}
							}

							dxhr.send();
							local[item.id] = item;
						}
					});

					if (incoming == 0) {
						chrome.storage.local.set({files: local});
						if (callback) callback(local);
					}
				});
			}

			cxhr.send();
		}

		xhr.send();
	});
}

chrome.runtime.onConnect.addListener(function (port) {
	port.onMessage.addListener(function (msg) {
		if (msg == 'update')
			update(function (files) {port.postMessage(files)});
	});
});
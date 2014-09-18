chrome.runtime.onStartup.addListener(update);
chrome.runtime.onInstalled.addListener(installed);

var apiUrl = 'https://www.googleapis.com/drive/v2/';

function installed (details) {
	if (details.reason == 'install') {
		console.log('install');
		chrome.storage.local.set({
			'files': {}
		});
	}

	update();
}

function update () {
	chrome.identity.getAuthToken({interactive: true}, function (token) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', apiUrl + 'files');
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
		xhr.onload = function () {
			var data = JSON.parse(xhr.responseText);
			var ta = data.items.filter(function (i) {
				return (i.mimeType == 'application/vnd.google-apps.folder'
					&& i.title == 'Excess');
			});

			if (!ta.length) {
				var fxhr = new XMLHttpRequest();
				fxhr.open('POST', apiUrl + 'files');
				fxhr.setRequestHeader('Authorization', 'Bearer ' + token);
				fxhr.setRequestHeader('Content-Type', 'application/json');
				fxhr.onload = function () {
					ta = JSON.parse(fxhr.responseText).items.filter(function (i) {
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

			var folder = ta[0];
			chrome.storage.local.set({'folder': folder});

			var query = '\'' + folder.id + '\' in parents';
			var cxhr = new XMLHttpRequest();
			cxhr.open('GET', apiUrl + 'files?q=' + query);
			cxhr.setRequestHeader('Authorization', 'Bearer ' + token);
			cxhr.onload = function () {
				var files = JSON.parse(cxhr.responseText);
				var local;
				chrome.storage.local.get('files', function (local) {
					console.log(files);
					console.log(local);

					files.items.forEach(function (item) {
						if (!local[item.id] || local[item.id].version != item.version) {
							dxhr = new XMLHttpRequest();
							dxhr.open('GET', item.downloadUrl);
							dxhr.setRequestHeader('Authorization', 'Bearer ' + token);
							dxhr.onload = function () {
								var raw = dxhr.responseText;
								item.raw = raw;
							}

							dxhr.send();
							local[item.id] = item;
						}
					});
				});
			}

			cxhr.send();
		}

		xhr.send();
	});
}
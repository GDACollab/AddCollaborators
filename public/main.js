const ID = "95d76b7c8a73286e6107";

const socket = io();

function onLogin() {
	let state = (new Date().getTime() + 15138 + Math.random());
	localStorage.setItem("state", state);
	location.assign(`https://github.com/login/oauth/authorize?client_id=${ID}&redirect_uri=http://localhost:8080/&state=${state}&allow_signup=false&scope=admin:org`);
}

window.onload = function() {
	document.getElementById("login-button").addEventListener("click", onLogin);

	let params = new URLSearchParams(location.search);
	if (params.has("state")) {
		if (localStorage.getItem("state") !== params.get("state")) {
			window.alert("State did not verify correctly.");
			return;
		}

		if (!(params.has("code"))) {
			window.alert("Could not get login token.");
			return;
		}

		socket.emit('login', params.get("code"), params.get("state"));

		document.getElementById("login").hidden = true;
		document.getElementById("upload-csv").hidden = false;

		document.getElementById("csv-form").addEventListener("submit", (e) => {
			e.preventDefault();
			onSubmit();
		});
	}
}

socket.on("addErr", (err) => {
	if (err.status === 400) {
		alert("Please log in again.");
		document.getElementById("login").hidden = false;
		document.getElementById("upload-csv").hidden = true;
	} else {
		console.warn(err);
	}
});

function getUsers(file) {
	return new Promise(function (resolve, reject) {
		let reader = new FileReader();
		reader.onloadend = function() {
			let rowStrings = reader.result.split("\n");
			let rows = rowStrings.map((string) => string.split(","));
			
			let header = rows[0];

			let email = header.findIndex((col) => col.includes("Email"));

			if (email === -1) {
				reject(new Error(`Could not find "Email" header for user email in CSV.`));
			}

			let github = header.findIndex((col) => col.includes("GitHub"));

			if (github === -1) {
				reject(new Error(`Could not find "GitHub" header for github username in CSV.`));
			}

			// Double check we have a ucsc.edu email, as well as a valid entry.
			let validEmails = rows.filter((col, i) => i > 0 && col.length === header.length && col[email].endsWith("@ucsc.edu"));

			
			resolve(validEmails.map((col) => [col[email], col[github]]));
		}
		reader.readAsText(file);
	});
}

async function onSubmit() {

	let csvForm = document.getElementById("csv");
	if (csvForm.files === null) {
		return;
	}

	let csv = csvForm.files[0];
	let users = await getUsers(csv);
	if (users instanceof Error) {
		alert(users);
		return;
	}

	socket.emit('addUsers', users);
}
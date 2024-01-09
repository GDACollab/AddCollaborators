import { Octokit, App } from "https://esm.sh/octokit";
import { createOAuthUserAuth } from "https://esm.sh/@octokit/auth-oauth-user";

const ID = "Iv1.612aedd76cd97601";

function onLogin() {
	let state = (new Date().getTime() + 15138 + Math.random());
	localStorage.setItem("state", state);
	location.assign(`https://github.com/login/oauth/authorize?client_id=${ID}&redirect_uri=https://gdacollab.github.io/AddCollaborators/&state=${state}&allow_signup=false`);
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

		document.getElementById("login").hidden = true;
		document.getElementById("upload-csv").hidden = false;

		const octokit = new Octokit({
			authStrategy: createOAuthUserAuth,
			auth: {
				clientId: "Iv1.612aedd76cd97601",
				// Not really secret anymore! But who cares, really. Requires a login in conjunction with the secret.
				clientSecret: "ac07bfadcc98bd5f00e553dd44a000c407882503",
				code: params.get("code"),
				state: localStorage.getItem("state"),
			}
		});

		document.getElementById("csv-form").addEventListener("submit", onSubmit.bind(octokit));
	}
}

function getUsers(file) {
	return new Promise(function (resolve, reject) {

		let reader = new FileReader();
		reader.onloadend = function() {
			let rowStrings = reader.result.split("\n");
			let rows = rowStrings.map((string) => string.split(","));
			
			let header = rows[0];

			let email = header.findIndex((col) => { col.contains("Email") });

			let github = header.findIndex((col) => { col.contains("GitHub") });

			// Double check we have a ucsc.edu email.
			let validEmails = rows.filter((col) => col[email].endsWith("@ucsc.edu"));

			
			resolve(validEmails.map((col) => [col[email], col[github]]));
		}
		reader.readAsText(csv);
	});
}

async function onSubmit(octokit, e) {
	e.preventDefault();
	// Octokit.js
	// https://github.com/octokit/core.js#readme
	// const auth = createOAuthUserAuth({
	// });

	let csvForm = document.getElementById("csv-form");
	if (csvForm.files === null) {
		return;
	}

	let csv = csv.files[0];
	let users = await getUsers(csv);

	users.forEach(async (user) => {
		let [email, github] = user;

		octokit.request('PUT /orgs/{org}/memberships/{username}', {
			org: 'GDACollab',
			username: github,
			role: 'member',
			headers: {
				'X-Github-Api-Version': '2022-11-28'
			}
		}).catch((err) => {

			console.warn(`Could not add user ${github}: ${error.status} ${error.response}`);
		});
	});
}
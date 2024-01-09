const { Octokit, App } = require("octokit");
const {createOAuthUserAuth} = require("@octokit/auth-oauth-user");
const express = require("express");
const http = require("http");
const fs = require("fs").promises;
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/', function(req, res) {
	fs.readFile(__dirname + "/index.html").then(contents => {
		res.setHeader("Content-Head", "text/html");
		res.writeHead(200);
		res.end(contents);
	})
	.catch((err) => {
		res.writeHead(500);
		res.end(err);
		return;
	});
});

io.on('connection', (socket) => {
	console.log("Connected.");
	let octokit;
	socket.on('login', (code, state) => {
		console.log("Login detected.");
		octokit = new Octokit({
			authStrategy: createOAuthUserAuth,
			auth: {
				clientId: "95d76b7c8a73286e6107",
				// Not really secret anymore! But who cares, really. Requires a login in conjunction with the secret.
				clientSecret: "d4490387db734668ab5716ccf4e728a5b1cc05ac",
				code: code,
				state: state,
			}
		});
	});

	socket.on('addUsers', (users) => {
		users.forEach(async (user) => {
			var [email, github] = user;
	
			// Quickly check for other github possibilities:
			// github = github.replace("github.com/", "");
			// github = github.replace("https://", "");
			// github = github.replace("www.", "");
			// github = github.replace("/", "");
			// github = github.replace(".", "");
	
			octokit.request('POST /orgs/{org}/invitations', {
				org: 'GDACollab',
				email: email,
				role: 'direct_member',
				headers: {
					'X-Github-Api-Version': '2022-11-28'
				}
			}).catch((err) => {
				socket.emit("addErr", err);
				console.warn(`Could not add user ${github}: ${err.status} ${err.response.data.message}`);
			});
		});
	});
	
});
	
function startServer(server, port, host) {
	function error(e) {
		server.removeListener('error', error);
		server.removeListener('listening', success);
		if (e.code === 'EADDRINUSE') {
			startServer(server, port++, host);
		}
	}

	function success() {
		console.log(`Listening at https://${host}:${port}`)
	}
	server.listen(port, host)
	.on('error', error)
	.on('listening', success)
}

startServer(server, 8080, "localhost");
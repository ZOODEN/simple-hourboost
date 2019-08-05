const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const fs = require('fs');

var accounts = [];
var delay = 30*60;

fs.readFile('accounts.txt', 'utf-8', (err, data) => {
	if (err) 
		throw err;
	
    accounts = [];
	
	process.setMaxListeners(50);
	
    data.trim().split("\n").forEach(function(line) {
        account = line.trim().split(":");
	
		if (accounts.includes(account) === false)
		{
			accounts.push(account);
		}
	
	})
	
	var clients = [];
	var games = new Array();
	
	console.log("Found "+accounts.length+" Accounts.");
	
	var playing = false;

	accounts.forEach(function(account, i) {
		games[i] = new Array();
		clients[i] = new SteamUser();
			
		games[i] = account[2].split(",").map(function(game) {
			return parseInt(game, 10);
		});
		games[i].push(account[3]);
		games[i].reverse();

		function login2FA()
		{
			clients[i].logOn({
				accountName: account[0],
				password: account[1],
				twoFactorCode: SteamTotp.generateAuthCode(account[4])
			});
		}
		
		function login()
		{
			clients[i].logOn({
				accountName: account[0],
				password: account[1]
			});
		}
		
		function checkForPlaying() {
			clients[i].on('playingState', function(blocked, playingApp) {
				if (blocked == true) {
					setTimeout(checkForPlaying, 5000);
				} else if (blocked == false) {
					clients[i].setPersona(SteamUser.EPersonaState.Online);
					clients[i].gamesPlayed(games[i]);
				}
			});
		}
				
		if(account[4] != null)
		{			
			setTimeout(function() {		
			
				console.log(account[0] + " - Logging in with 2FA.");	
				
				login2FA();

				clients[i].on('loggedOn', function() {
					console.log(account[0] + " - Logged In.");

					clients[i].setPersona(SteamUser.EPersonaState.Online);
					clients[i].gamesPlayed(games[i]);
					
					setTimeout(checkForPlaying, 1500*60);
				});
				
				clients[i].on('error', function(err) {
					if (err.eresult == '6') {
						console.log(account[0] + " - Logged out. Retrying in 5 minutes..");
						setTimeout(login2FA, 5000*60);
					}
				});
				
			}, delay * i);
		}
		else
		{
			setTimeout(function() {		
			
				console.log(account[0] + " - Logging in.");	
				
				login();

				clients[i].on('loggedOn', function() {
					console.log(account[0] + " - Logged In.");

					clients[i].setPersona(SteamUser.EPersonaState.Online);
					clients[i].gamesPlayed(games[i]);
					
					setTimeout(checkForPlaying, 1500*60);
				});
				
				clients[i].on('error', function(err) {
					if (err.eresult == '6') {
						console.log(account[0] + " - Logged out. Retrying in 5 minutes..");
						setTimeout(login, 5000*60);
					}
				});
				
			}, delay * i);
		}

	})
})


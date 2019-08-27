const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamID = require('steamid');
const fs = require('fs');

var accounts = [];
var delay = 120*60;
var clients = [];
var games = [];
var code = [];
var games_count = [];
var playing = [];


fs.readFile('accounts.txt', 'utf-8', (err, data) => {
	if (err) 
		throw err;
	
	accounts = [];

	data.trim().split("\n").forEach(function(line) {
        account = line.trim().split(":");
	
		if (accounts.includes(account) === false)
		{
			accounts.push(account);
		}
	
	})

	console.log("Found "+accounts.length+" accounts.");
	
	accounts.forEach(function(account, i) {
		
		games[i] = new Array();
		clients[i] = new SteamUser({ promptSteamGuardCode: false });
		
		games[i] = account[2].split(",").map(function(game) {
			return parseInt(game, 10);
		});
		
		games[i].push(account[3]);
		games[i].reverse();
		games_count[i] = parseInt(games[i].length) - parseInt(1);
		
		function checkForPlaying() {
			clients[i].on('playingState', function(blocked, playingApp) {
				if (blocked == true) {
					setTimeout(checkForPlaying, 5000);
				} else if (blocked == false) {
					console.log(account[0] + " - Stopped playing but waiting 3 minutes before starting hourboost.");
					setTimeout(function() {
						clients[i].setPersona(SteamUser.EPersonaState.Online);
						clients[i].gamesPlayed(games[i]);
					}, 180000);
				}
			});
		}
		
		function login()
		{
			if(account[4] > 5)
			{
				console.log(account[0] + " - Logging in with 2FA..");	
				clients[i].logOn({
					accountName: account[0],
					password: account[1],
					twoFactorCode: SteamTotp.generateAuthCode(account[4])
				});
			}
			else
			{
				console.log(account[0] + " - Logging in..");	
				clients[i].logOn({
					accountName: account[0],
					password: account[1]
				});
			}
		}
				
		setTimeout(function() {
			
			login();

			clients[i].on('loggedOn', function() {
				
				clients[i].setPersona(SteamUser.EPersonaState.Online);
				
				setTimeout(function() {
					
					clients[i].getPersonas([clients[i].steamID], function (personas) {
						if(personas[clients[i].steamID].gameid == 0)
						{
							if(games_count[i] > 1)
							{
								console.log(account[0] + " - Logged In. | Boosting "+games_count[i]+" games.");
							}
							else
							{
								console.log(account[0] + " - Logged In. | Boosting "+games_count[i]+" game.");
							}
							
							clients[i].setPersona(SteamUser.EPersonaState.Online);
							clients[i].gamesPlayed(games[i]);
						}
						else
						{
							console.log(account[0] + " - Logged In. | Waiting for user to stop playing..");
							checkForPlaying();
							
							clients[i].setPersona(SteamUser.EPersonaState.Offline);
						}
					});
						
				}, 50*60);
				
			});
			
			clients[i].on('steamGuard', function (domain, callback) {
				console.log(account[0] + " - Steam Guard code is needed.");
				
				if(account[4] != null)
				{
					console.log(account[0] + " - Steam Guard code not found.");
				}
				else
				{
					callback(account[4]);
				}
			});	
							
			clients[i].on('error', function(err) {
				
				clients[i].logOff();
				console.log(account[0] + " - Logged out.");
				
				if (err.eresult == '6') {		
					setTimeout(login, 5000*60);
				}
			});
			
		}, delay * i);

	})
})


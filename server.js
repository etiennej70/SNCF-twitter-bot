/*
 * This file is part of the What's up station package.
 *
 * (c) Etienne JACQUOT <http://etiennejacquot.com/>
 *	@author Etienne JACQUOT <contact@etiennejacquot.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
process.env.TZ = 'Europe/Paris';
var config = require('./config.json');
var request = require('request');
var Twit = require('twit');
var T = new Twit({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token: config.twitter.access_token,
  access_token_secret: config.twitter.access_token_secret,
  timeout_ms: 60*1000,  // optional HTTP request timeout to apply to all requests. 
})

var SNCFAPItoken = config.SNCFAPItoken;

String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

/**
 * Get the next train on departure or arrival in the station targeted by its id
 *
 * @param string $event Can be "departures" or "arrivals"
 * @param string $SNCFAPItoken The SNCF API SNCFAPItoken for HTTP basic authentification
 * @param string $idStation The stop_area id of the station get from the SNCF API before call the function
 * @param function $callback the function called after retrieving all the informations needed
 *
 * @return callback function or error
 */
function getNextTrain(event, SNCFAPItoken, idStation, callback) {
	var date = new Date();
	date.setHours(date.getHours() + 2);
	date = date.toISOString().replace(/\..+/, '');
	//On lance la requête
	request.get('https://api.sncf.com/v1/coverage/sncf/stop_areas/'+idStation+'/'+event+'?from_datetime='+date, function (error, response, body) {
		
		if(!error) {
			//Si pas d'erreur, on parse la réponse pour obtenir les informations dont on a besoin
			var nextDeparture = JSON.parse(body)[event][0];
			var infos = [];
			infos['direction'] = nextDeparture['display_informations']['direction'];
			infos['numero'] = nextDeparture['display_informations']['headsign'];
			infos['type'] = nextDeparture['display_informations']['commercial_mode'];
			infos['trajet'] = nextDeparture['route']['name'];
			if(event == 'arrivals') {
				var departReel = nextDeparture['stop_date_time']['arrival_date_time'];
			}
			else {
				var departReel = nextDeparture['stop_date_time']['departure_date_time'];
			}
			departReel = departReel.insert(13, ':');
			departReel = departReel.insert(11, ':');
			departReel = departReel.insert(6, '-');
			departReel = departReel.insert(4, '-');
			infos['departReel'] = departReel;
			if(event == 'arrivals') {
				var departTheorique = nextDeparture['stop_date_time']['base_arrival_date_time'];
			}
			else {
				var departTheorique = nextDeparture['stop_date_time']['base_departure_date_time'];
			}
			departTheorique = departTheorique.insert(13, ':');
			departTheorique = departTheorique.insert(11, ':');
			departTheorique = departTheorique.insert(6, '-');
			departTheorique = departTheorique.insert(4, '-');
			infos['departTheorique'] = departTheorique;

			return callback(infos)
		}
		else {
			return error;
		}


	}).auth(SNCFAPItoken, '', false);
	
}

/**
 * Get the station requested by the user in his tweet.
 *
 * @param string $string The tweet of the user
 *
 * @return string $gare The station name requested
 */
function getRequestFromText(string) {
	if(string.match(new RegExp("what's up(.*)station")) != null || string.match(new RegExp("gare de (.*) \?")) != null) {
	    var gare = /what's up (.*) station/.exec(string);
	    if(gare == null) {
	    	var gare = /gare de (.*) \?/.exec(string);
	    }
	    gare['type'] = 'general';
	}
	else if(string.match(new RegExp("next departure from (.*) station")) != null || string.match(new RegExp("prochain départ de (.*) \?")) != null) {
	    var gare = /next departure from (.*) station/.exec(string);
	    if(gare == null) {
	    	var gare = /prochain départ de (.*) \?/.exec(string);
	    }
	    gare['type'] = 'departure';
	}
	else if(string.match(new RegExp("next arrival to (.*) station")) != null || string.match(new RegExp("prochaine arrivée à (.*) \?")) != null) {
	    var gare = /next arrival to (.*) station/.exec(string);
	    if(gare == null) {
	    	var gare = /prochaine arrivée à (.*) \?/.exec(string);
	    }
	    gare['type'] = 'arrival';
	}
	else {
	    var gare = '';
	}
	return gare;
}

/**
 * Get the id of the station in the SNCF API and order to tweet the answer
 *
 * @param string $ville The city of the station requested
 * @param string $type The type of request : requested for arrivals, departures or both
 * @param string $idTweet The id of the tweet sent by the user
 * @param string username The username of the user who requested for infos
 */
function tweetForRequest(ville, type, idTweet, username) {
	request.get('https://api.sncf.com/v1/coverage/sncf/places?q='+ville, function (error, response, body) {

		//On récupère les infos de la gare en fonction de la ville donnée
		var json = JSON.parse(body);
		var idStation = undefined;
		var nomGare = undefined;
		//On itère sur les éléments d'indication géographique (région, arrondissements, etc)
		for (var i = JSON.parse(body)['places'].length - 1; i >= 0; i--) {
			//Si on trouve un type "stop_area", ie; une gare, on stock les infos
			if(json['places'][i]['embedded_type'] == 'stop_area') {
				idStation = json['places'][i]['stop_area']['id'];
				nomGare = json['places'][i]['stop_area']['name'];
			}
		}

		if(idStation == undefined) {
			return 'error';
		}
		else {
			switch(type) {
				case 'general':
					var tweet = tweetForGeneral(idStation, nomGare, idTweet, username);
					break;
				case 'departure':
					var tweet = tweetForDeparture(idStation, nomGare, idTweet, username);
					break;
				case 'arrival':
					var tweet = tweetForArrival(idStation, nomGare, idTweet, username);
					break;
			}
		}

	}).auth(SNCFAPItoken, '', false);
}

/**
 * Send the tweet to answer to the user in case of "general" request, ie for both arrivals and departures
 *
 * @param string $idStation The id of the station requested
 * @param string $nomGare The name of the station for the city requested
 * @param string $idTweet The id of the tweet sent by the user
 * @param string username The username of the user who requested for infos
 */
function tweetForGeneral(idStation, nomGare, idTweet, username) {
	tweetForDeparture(idStation, nomGare, idTweet, username);
	tweetForArrival(idStation, nomGare, idTweet, username);
}

/**
 * Send the tweet to answer to the user in case of "departure" request
 * 
 * @param string $idStation The id of the station requested
 * @param string $nomGare The name of the station for the city requested
 * @param string $idTweet The id of the tweet sent by the user
 * @param string username The username of the user who requested for infos
 */
function tweetForDeparture(idStation, nomGare, idTweet, username) {
	getNextTrain('departures', SNCFAPItoken, idStation, function(infos) {
		var dateDepartReel = new Date(infos["departReel"]);
		dateDepartReel.setHours(dateDepartReel.getHours() - 2);
		var dateDepartTheorique = new Date(infos["departTheorique"]);
		dateDepartTheorique.setHours(dateDepartTheorique.getHours() - 2);
    	T.post('statuses/update', { in_reply_to_status_id: idTweet, status: '@'+username+' Prochaine arrivée en gare de '+nomGare+' : '+infos["type"]+' '+infos["numero"]+' de '+infos["trajet"]+'. Arrivée à '+dateDepartReel.getHours()+':'+dateDepartReel.getMinutes()+' (théorique : '+dateDepartTheorique.getHours()+':'+dateDepartTheorique.getMinutes()+')'}, function(err, data, response) {
    			console.log(err);
        })
        console.log("Reponse à un tweet pour les arrivées en gare de "+nomGare);
    });
}

/**
 * Send the tweet to answer to the user in case of "arrival" request
 * 
 * @param string $idStation The id of the station requested
 * @param string $nomGare The name of the station for the city requested
 * @param string $idTweet The id of the tweet sent by the user
 * @param string username The username of the user who requested for infos
 */
function tweetForArrival(idStation, nomGare, idTweet, username) {
	getNextTrain('arrivals', SNCFAPItoken, idStation, function(infos) {
		var dateDepartReel = new Date(infos["departReel"]);
		dateDepartReel.setHours(dateDepartReel.getHours() - 2);
		var dateDepartTheorique = new Date(infos["departTheorique"]);
		dateDepartTheorique.setHours(dateDepartTheorique.getHours() - 2);
    	T.post('statuses/update', { in_reply_to_status_id: idTweet, status: '@'+username+' Prochain départ en gare de '+nomGare+' : '+infos["type"]+' '+infos["numero"]+' de '+infos["trajet"]+'. Depart à '+dateDepartReel.getHours()+':'+dateDepartReel.getMinutes()+' (théorique : '+dateDepartTheorique.getHours()+':'+dateDepartTheorique.getMinutes()+')'}, function(err, data, response) {
    		console.log(err);
        })
        console.log("Reponse à un tweet pour les arrivées en gare de "+nomGare);
    });
}

//To store the previous tweet answered
var statusAnswered = [];


//Main script
setInterval(function() {
  T.get('statuses/mentions_timeline', function(err, data, response) {
      for(var i = 0; i<data.length; i++) {
      	if(statusAnswered.indexOf(data[i].id) === -1 ) {
      		var userRequest = getRequestFromText(data[i]["text"]);
      		if(userRequest[1] != undefined) {
      			tweetForRequest(userRequest[1], userRequest['type'], data[i].id, data[i].user.screen_name);
	        }
	        else {
	        	console.log("Tweet incompris.")
	        	T.post('statuses/update', { in_reply_to_status_id: data[i].id, status: '@'+data[i].user.screen_name+' Je n\'ai pas compris de quelle gare il s\'agit'}, function(err, data, response) {
        		})
	        }
	      	statusAnswered.push(data[i].id);
      	}
      }
  })
}, 1000*60, null);
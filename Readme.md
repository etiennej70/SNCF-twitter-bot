What's up station! server
===================
Ceci est un bot twitter permettant d'obtenir rapidement les infos du prochain départ ou prochaine arrivée d'un train dans la gare de son souhait, par un simple tweet à @Etienne_L10.
**Le service est actuellement disponible et testable**

Syntax des tweets
-------------
A l'heure actuelle, les messages acceptés par le bot son du type :
* "What'up [gare] station ?
* ... gare de [gare] ?
* ... next departure from [gare] station ?
* ... prochain départ de [gare] ?
* ... next arrival to [gare] station ?
* ... prochaine arrivée à [gare] ?
Où [gare] est à remplacer par le nom de la ville ou de la gare, et où "..." représente n'importe quel texte.

Exemple de tweet :
@Etienne_L10 Quel est le prochain départ de Troyes ?

> /!\ Vous devez suivre @Etienne_L10 pour recevoir la réponse

Installation et lancement
-------------
* Télécharger le serveur
* Dans le répertoire, exécuter la commande :
```bash
npm install
```
* Ajouter un fichier config.json à la racine du projet avec les données suivantes :
```json
{
    "SNCFAPItoken" : "key",
    "twitter" : {
    	"consumer_key":         "key",
  		"consumer_secret":      "key",
  		"access_token":         "key",
  		"access_token_secret":  "key"
    }
}
```
* Pour lancer le serveur, dans le répertoire, exécuter la commande :
```bash
node server.js
```

Infos sur l'API SNCF
-------------
L'ensemble de la documentation est accessible sur [data.sncf.com](https://data.sncf.com/api/fr/documentation).

###Retrouver l'ID de la gare (ou la gare de la ville)
Pour retrouver l'ID de la gare sur laquelle on souhaite avoir des informations sur les arrivées et départ, il faut effectuer une requête sur (ici par exemple sur la ville de Troyes) :
```
https://api.sncf.com/v1/coverage/sncf/places?q=Troyes
```
Une fois le JSON parsé, on retrouve l'ID de la gare dans l'objet STOP_AREA

###Pour avoir les infos trafic sur la gare
Une fois l'ID de la gare obtenu, on peut obtenir les informations des prochaines arrivées et départ sur un autre point d'entrée de l'API. Il faut envoyer une requête sur (toujours pour la ville de Troyes ici) :
https://api.sncf.com/v1/coverage/sncf/stop_areas/stop_area:OCE:SA:87118000/departures?from_datetime=2016-06-19T18:35:58

On retrouve alors l'ensemble des données des trains liés à la gare. Il suffit de prendre le premier train à disposition et d'y prendre les éléments qui nous intéressent.


Bugs et améliorations
-------------
* Il serait souhaitable d'améliorer l'analyse syntaxique des tweets afin d'être plus flexible (obtenir des infos à une heure ultérieure, sur un train en particulier, le prochain train pour un trajet, ...)
* Il serait souhaitable de renvoyer la réponse dans la langue du tweet d'origine.
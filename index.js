const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);
const https = require('https');
const pbkdf2 = require('pbkdf2');
const fs = require('fs');
const port = 8446;
const userModel = require('./models/user');

const salt = "QBpJ6JPPljGg70DQfoaD8eDK42CeazZR0Ix2zYEOsM5vwqnRTh0mWgvOlV1g4HhYXpFuH6RzrOfLtsA0w9lUVpVInLXC0WaCshhu";


mongoose.connect('mongodb://localhost/test-database', {
	useMongoClient: true
});
mongoose.Promise = global.Promise;
const db = mongoose.connection

var siteKey = "mysite.com";
var key = fs.readFileSync(`/etc/letsencrypt/live/${siteKey}/privkey.pem`);
var cert = fs.readFileSync(`/etc/letsencrypt/live/${siteKey}/cert.pem`);
var options = {
	key: key,
	cert: cert
};

const router = express.Router();
const app = express();


app.use(session({
	secret: "evkG5+>F@$hLewjH0,oP^9d$^l?Wy",
	resave: false,
	saveUninitialised: true,
	store: new MongoStore({ mongooseConnection: db })
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


router.get('/', (req, res) => {
	res.send('main site');
});

router.post('/login', (req, res) => {
	if((req.body.user === undefined) || (req.body.pass === undefined)) {
		res.status(400).send("missing user / pass");
	}
	else {
		userModel.findOne({user: req.body.user}, function(err, result) {
			if(result !== null) {
				var saltedHash = pbkdf2.pbkdf2Sync(req.body.pass, salt, 1, 32, 'sha512')
				var buff = new Buffer(saltedHash);
				var saltedHash64 = buff.toString('base64');
				if(saltedHash64 === result.pass) {
					req.session.user = result.user;
					res.status(200).send("OK");
					return;
				}
			}
			res.status(400).send("invalid credentials");
		});
	}
});

router.get('/logout', (req, res) => {
	req.session.destroy((err) => {
		res.status(200).send("logged out");
	});
});

router.post('/register', (req, res) => {
	if((req.body.user === undefined) || (req.body.pass === undefined)) {
		res.status(400).send("missing user / pass");
	}
	else {
		var user = req.body.user;
		userModel.findOne({user: user}, function(err, result) {
			if(result === null) {
				var saltedHash = pbkdf2.pbkdf2Sync(req.body.pass, salt, 1, 32, 'sha512')
				var buff = new Buffer(saltedHash);
				var saltedHash64 = buff.toString('base64');
				userModel.create({user: user, pass: saltedHash64});
				res.status(200).send("OK");
			}
			else {
				res.status(400).send("error creating account");
			}
		});
	}
});

router.get("/protected", (req, res) => {
	if(req.session.user) {
		res.status(200).send("Ez bruh");
	} else {
		res.status(403).send("nah m8 get logged in 1st");
	}
});

var server = https.createServer(options, app);

app.use('/', router);
server.listen(port, () => {
	console.log("server starting on port : " + port)
});

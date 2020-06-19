const mongoose = require('mongoose');

var schema = new mongoose.Schema({ 
	user: 'string', 
	pass: 'string'
});

module.exports = mongoose.model('user', schema);

var crypto = require('crypto')
  , Backbone = require('backbone')
  , _ = require('underscore');

function md5(string) {
  return crypto
    .createHash('md5')
    .update(string)
    .digest('hex');
}

function randomEmail() {
  return ('guest+' + Math.floor(Math.random() * 1000)) + '@airhockey.jit.su';
}

var PlayerModel = Backbone.Model.extend({
  toJSON: function() {
    var json = {};

    json.name = this.get('name');
    json.uuid = this.get('uuid');
    json.gravatar = this.get('gravatar') || md5(this.get('email') || randomEmail()) ;

    if (this.get('score')) {
      json.score = this.get('score');
    }

    return json;
  }
});

module.exports = PlayerModel;

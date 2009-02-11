/*
Script: JsonP.js
	Defines JsonP, a class for cross domain javascript via script injection.

License:
	http://www.clientcide.com/wiki/cnet-libraries#license
*/
var JsonP = new Class({
	Implements: [Options, Events],
	options: {
//	onComplete: $empty,
//	globalFunction: '',
//	abortAfter: 0,
		callBackKey: "callback",
		queryString: "",
		data: {},
		timeout: 5000,
		retries: 0
	},
	initialize: function(url, options){
		this.setOptions(options);
		this.url = this.makeUrl(url).url;
		this.fired = false;
		this.scripts = [];
		this.requests = 0;
		this.triesRemaining = [];
	},
	request: function(url, requestIndex){
		var u = this.makeUrl(url);
		if(!$chk(requestIndex)) {
			requestIndex = this.requests;
			this.requests++;
		}
		if(!$chk(this.triesRemaining[requestIndex])) this.triesRemaining[requestIndex] = this.options.retries;
		var remaining = this.triesRemaining[requestIndex]; //saving bytes
//		h2.log('retrieving by json script method: %s', u.url);
		var dl = (Browser.Engine.trident)?50:0; //for some reason, IE needs a moment here...
		(function(){
			var script = new Element('script', {
				src: u.url, 
				type: 'text/javascript',
				id: 'jsonp_'+u.index+'_'+requestIndex
			});
			this.fired = true;
			this.addEvent('onComplete', function(){
				try {script.dispose();}catch(e){}
			}.bind(this));
			script.inject(document.head);
			
			if ($chk(this.options.abortAfter) && ! remaining) script.dispose.delay(this.options.abortAfter, script);

			if(remaining) {
				(function(){
					this.triesRemaining[requestIndex] = remaining - 1;
					if(script.getParent() && remaining) {
//						h2.log('removing script (%o) and retrying: try: %s, remaining: %s', requestIndex, remaining);
						script.dispose();
						this.request(url, requestIndex);
					}
				}).delay(this.options.timeout, this);
			}
		}.bind(this)).delay(dl);
		return this;
	},
	makeUrl: function(url){
		var index;
		if (JsonP.requestors.contains(this)) {
			index = JsonP.requestors.indexOf(this);
		} else {
			index = JsonP.requestors.push(this) - 1;
			JsonP.requestors['request_'+index] = this;
		}
		if(url) {
			var separator = (url.test('\\?'))?'&':'?';
			var jurl = url + separator + this.options.callBackKey + "=JsonP.requestors.request_" +
				index+".handleResults";
			if(this.options.queryString) jurl += "&"+this.options.queryString;
			jurl += "&"+Hash.toQueryString(this.options.data);
		} else {
			var jurl = this.url;
		}
		if ($chk(this.options.globalFunction)) {
			window[this.options.globalFunction] = function(r){
				JsonP.requestors[index].handleResults(r)
			};
		}
		return {url: jurl, index: index};
	},
	handleResults: function(data){
//		h2.log('jsonp received: ', data);
		this.fireEvent('onComplete', [data, this]);
	}
});
JsonP.requestors = [];


var util = require('util');
var async = require('async');

(function () {

	/**
	 * Returns a string[] with trimmed strings from a delimited string as input
	 * @param input 
	 * @param delimiter default is ','
	 * @returns
	 */
    var getArrayFromString = function(input, delimiter) {
    	var arr = input.split((delimiter ? delimiter : ','));
    	for (v in arr) {
    		arr[v] = arr[v].trim();
    	}
    	return arr;
    }

    /**
     * Converts the object's delimited string values trimmed string arrays.
     * This function is useful for reading properties files with keys like: key1 = foo1, foo2, foo17
     * @param settings
     * @returns
     */
    var convertObjectValuesToArray = function(settings) {
    	var obj = {};
    	for (var key in settings) {
    		obj[key] = getArrayFromString(settings[key]);
    	}
    	return obj;
    }
    
    module.exports = {
        'getArrayFromString': getArrayFromString,
        'convertObjectValuesToArray': convertObjectValuesToArray
    };

}());

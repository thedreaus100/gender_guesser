var _ = require("underscore");


module.exports = new stats();

function stats() {

    this.mean = mean;
    this.inRange = inRange;
    this.variance = variance;
    this.sdeviation = sdeviation;
    this.probability = probability;

    function mean(range) {

        return _.reduce(range, function(prev, value) {
            return prev + Number(value);
        }, 0) / range.length;
    }

    //assumes its sorted
    function inRange(test, range) {

        return (test >= range[0] && test <= range[range.length - 1]);
    }

    function variance(mean, range) {

        return _.reduce(range, function(prev, value) {
            return prev + Math.pow(value - mean, 2);
        }, 0) / range.length;
    }

    function sdeviation(variance) {
        return Math.sqrt(variance);
    }

    /*
		s: standard deviation
		d: deviation
   	*/
    function probability(d, s) {

        console.log("deviation: ", d, "standard deviation: ",s);
        return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.pow(Math.E, -1 * (Math.pow(d, 2) / (2 * Math.pow(s, 2))));
    }
}

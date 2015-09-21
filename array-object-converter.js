module.exports = {

    toObject: function(array) {

        return toObject(array);

        function toObject(array) {

            var obj = {};
            for (var i = 0; i < array.length; i += 2) {
                obj[array[i]] = array[i + 1];
            }
            return obj;
        }
    }
}

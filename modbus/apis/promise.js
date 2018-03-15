"use strict";

var _convert = function(f) {
    var converted = function(address, arg, next) {
        var client = this;
        var id = this._unitID;

        /* the function check for a callback
         * if we have a callback, use it
         * o/w build a promise.
         */
        if (next) {
            // if we have a callback, use the callback
            f.bind(client)(id, address, arg, next);
        } else {
            // o/w use  a promise
            var promise = new Promise(function(resolve, reject) {
                function cb(err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                }

                f.bind(client)(id, address, arg, cb);
            });

            return promise;
        }
    };

    return converted;
};

module.exports = function(Modbus) {

    var cl = Modbus.prototype;

    // set/get unitID
    cl.setID = function(id) {this._unitID = id;};
    cl.getID = function() {return this._unitID;};

    // set/get timeout
    cl.setTimeout = function(timeout) {this._timeout = timeout;};
    cl.getTimeout = function() {return this._timeout;};

    cl.readHoldingRegisters = _convert(cl.send);
}

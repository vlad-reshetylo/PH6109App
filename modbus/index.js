"use strict";

require("./utils/buffer_bit")();

const crc16 = require("./utils/crc16");
const modbusSerialDebug = require("debug")("modbus-serial");

const PORT_NOT_OPEN_MESSAGE = "Port Not Open";
const PORT_NOT_OPEN_ERRNO   = "ECONNREFUSED";
const BAD_ADDRESS_MESSAGE   = "Bad Client Address";
const BAD_ADDRESS_ERRNO     = "ECONNREFUSED";

const PortNotOpenError = function() {
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.message = PORT_NOT_OPEN_MESSAGE;
    this.errno = PORT_NOT_OPEN_ERRNO;
};

const BadAddressError = function() {
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.message = BAD_ADDRESS_MESSAGE;
    this.errno = BAD_ADDRESS_ERRNO;
};

/**
 * Wrapper method for writing to a port with timeout. <code><b>[this]</b></code> has the context of ModbusRTU
 * @param {Buffer} buffer The data to send
 * @private
 */
function _writeBufferToPort(buffer, transactionId) {
    var transaction = this._transactions[transactionId];

    this._port.write(buffer);
    if (transaction) {
        transaction._timeoutFired = false;
        transaction._timeoutHandle = _startTimeout(this._timeout, transaction);
    }
}

/**
 * Starts the timeout timer with the given duration.
 * If the timeout ends before it was cancelled, it will call the callback with an error.
 * @param {number} duration the timeout duration in milliseconds.
 * @param {Function} next the function to call next.
 * @return {number} The handle of the timeout
 * @private
 */
function _startTimeout(duration, transaction) {
    if (!duration) {
        return undefined;
    }
    return setTimeout(function() {
        transaction._timeoutFired = true;
        if (transaction.next) {
            transaction.next(new Error("Timed out"));
        }
    }, duration);
}

/**
 * Cancel the given timeout.
 *
 * @param {number} timeoutHandle The handle of the timeout
 * @private
 */
function _cancelTimeout(timeoutHandle) {
    clearTimeout(timeoutHandle);
}

/**
 * Class making ModbusRTU calls fun and easy.
 *
 * @param {SerialPort} port the serial port to use.
 */
var ModbusRTU = function(port) {
    // the serial port to use
    this._port = port;

    // state variables
    this._transactions = {};
    this._timeout = null; // timeout in msec before unanswered request throws timeout error
    this._unitID = 1;
};

/**
 * Open the serial port and register Modbus parsers
 *
 * @param {Function} callback the function to call next on open success
 *      of failure.
 */
ModbusRTU.prototype.open = function(callback) {
    var modbus = this;

    // open the serial port
    modbus._port.open(function(error) {
        if (error) {
            modbusSerialDebug({ action: "port open error", error: error });

            if (callback){
                callback(error);
            }
        } else {
            /* init ports transaction id and counter */
            modbus._port._transactionIdRead = 1;
            modbus._port._transactionIdWrite = 1;

            let buffer = null;

            modbus._port.on("data", function(data) {
                // set locale helpers variables
                var transaction = modbus._transactions[modbus._port._transactionIdRead];

                // the _transactionIdRead can be missing, ignore wrong transaction it's
                if (!transaction) {
                    return;
                }

                if(data.length < 16){
                    if(buffer == null){
                        buffer = data;

                        console.log(`Got buffer: ${buffer.length} symbols. Not enough.`);

                        return;
                    }else{
                        console.log(`Got buffer: ${data.length} symbols. Will be concated.`);

                        data = Buffer.from(buffer.toJSON().data.concat(data.toJSON().data));

                        buffer = null;
                    }
                }

                /* cancel the timeout */
                _cancelTimeout(transaction._timeoutHandle);
                transaction._timeoutHandle = undefined;

                /* check if the timeout fired */
                if (transaction._timeoutFired === true) {
                    // we have already called back with an error, so don't generate a new callback
                    return;
                }

                transaction.next(null, {
                    "data": data.toJSON().data.slice(3, 12), 
                    "buffer": data
                });
            });

            /* On serial port open OK call next function with no error */
            if (callback){
                callback(error);
            }
        }
    });
};

Object.defineProperty(ModbusRTU.prototype, "isOpen", {
    enumerable: true,
    get: function() {
        if (this._port) {
            return this._port.isOpen;
        }

        return false;
    }
});

ModbusRTU.prototype.close = function(callback) {
    // close the serial port if exist
    if (this._port) {
        this._port.removeAllListeners("data");
        this._port.close(callback);
    }
};

ModbusRTU.prototype.send = function(address, dataAddress, length, next) {
    // check port is actually open before attempting write
    if (this.isOpen !== true) {
        if (next) next(new PortNotOpenError());
        return;
    }

    // sanity check
    if (typeof address === "undefined" || typeof dataAddress === "undefined") {
        if (next) next(new BadAddressError());
        return;
    }

    const code = 3;

    // set state variables
    this._transactions[this._port._transactionIdWrite] = {
        nextAddress: address,
        nextCode: code,
        nextLength: 2 + 2 * length + 2,
        next: next
    };

    var codeLength = 6;
    var buf = new Buffer(codeLength + 2); // add 2 crc bytes

    buf.writeUInt8(address, 0);
    buf.writeUInt8(code, 1);
    buf.writeUInt16BE(dataAddress, 2);
    buf.writeUInt16BE(length, 4);

    // add crc bytes to buffer
    buf.writeUInt16LE(crc16(buf.slice(0, -2)), codeLength);

    // write buffer to serial port
    _writeBufferToPort.call(this, buf, this._port._transactionIdWrite);
};

// add the connection shorthand API
require("./apis/connection")(ModbusRTU);

// add the promise API
require("./apis/promise")(ModbusRTU);

// exports
module.exports = ModbusRTU;
module.exports.initModbus = (ModbusClient, port, callback) => {
    this.client = new ModbusClient();

    this.client.connectRTU(port, {baudRate: 9600}, () => {
        callback((id, resultCallback, errorCallback) => {
            this.client.setID(id);

            this.client.readHoldingRegisters(0, 6)
                        .then(resultCallback)
                        .catch(errorCallback);
        });
    });
};
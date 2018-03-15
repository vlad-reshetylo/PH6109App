const ModbusClient = require("./modbus/index.js")
const Vue          = require('vue/dist/vue.min.js')
const path         = require('path')
const fs           = require('fs')
const os           = require('os')

const logFile      = path.join(os.homedir(), 'db.json')
const Reader       = {read : null}

const onError = error => error && console.log(`${error.errno}: ${error.message}`)
const log     = data => fs.appendFile(logFile, JSON.stringify(data) + os.EOL, onError)

const app = new Vue({
    el : "#app",

    data : {
        isReady : false,
        device : "COM1",
        address : 1,
        result : "",
        logPath : logFile
    },

    methods : {
        connect : function () {
            this.isReady = true

            ModbusClient.initModbus(ModbusClient, this.device, read => {
                Reader.read = read
            })            
        },

        send : function () {
            if (Reader.read === null) {
                alert("Reader is not ready!")

                return
            }

            this.result = ""

            const address = parseInt(this.address)
            const time    = new Date().getTime()

            const onResponse = data => {
                alert('got response!');

                this.result = data.data.map(symbol => String.fromCharCode(symbol)).join('')

                const responseTime = new Date().getTime() - time

                console.log(data)

                log({
                    address : address,
                    string : this.result,
                    responseData : data.data,
                    responseBuffer : data.buffer,
                    time : `${responseTime}ms`
                })
            }

            Reader.read(address, onResponse, onError)
        }
    }
})
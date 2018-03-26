const ModbusClient = require("./modbus/index.js")
const Vue          = require('vue/dist/vue.min.js')
const path         = require('path')
const fs           = require('fs')
const os           = require('os')
const s           = require('serialport')

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
        logPath : logFile,
        activePage : "settings",
        phFault : 0,
        orpFault : 0,
        tempFault : 0,
        sidebarDisabled: false,
        ph : {
            intervalId : false,
            active : false,
            frequency : 5,
            mode : "once",
            currentValue : 0,
            lastValue : 0,
            currentTemp : 0,
            lastTemp : 0,
        }
    },

    methods : {
        connect : function () {
            console.log('reconnected')

            this.isReady = true

            ModbusClient.initModbus(ModbusClient, this.device, read => {
                Reader.read = read
            })            
        },

        openPage : function (page) {
            if(this.sidebarDisabled){
                return
            }

            if(!this.isReady){
                this.connect()
            }

            this.activePage = page
        },

        phRunFrequency : function () {
            this.ph.active = this.sidebarDisabled = true;

            this.ph.intervalId = setInterval(() => {
                this.send();
            }, 1000 * parseInt(this.ph.frequency));
        },

        phStopFrequency : function () {
            this.ph.active = this.sidebarDisabled = false;

            clearInterval(this.ph.intervalId);

            this.ph.intervalId = false;
        },

        send : function () {
            if (Reader.read === null) {
                alert("Reader is not ready!")

                return
            }

            const address = 1
            const time    = new Date().getTime()

            const onResponse = data => {
                const info = data.data.map(symbol => String.fromCharCode(symbol)).join('')

                this.ph.lastValue = this.ph.currentValue
                this.ph.currentValue = parseFloat(info.substr(0, 5)) + parseFloat(this.phFault)

                this.ph.lastTemp = this.ph.currentTemp
                this.ph.currentTemp = parseFloat(info.substr(5)) + parseFloat(this.tempFault)

                // this.result = data.data.map(symbol => String.fromCharCode(symbol)).join('')

                // const responseTime = new Date().getTime() - time

                // console.log(data)

                // log({
                //     address : address,
                //     string : this.result,
                //     responseData : data.data,
                //     responseBuffer : data.buffer,
                //     time : `${responseTime}ms`
                // })
            }

            Reader.read(address, onResponse, onError)
        }
    }
})
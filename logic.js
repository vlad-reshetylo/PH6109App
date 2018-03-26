const ModbusClient = require("./modbus/index.js")
const Vue          = require('vue/dist/vue.min.js')
const path         = require('path')
const fs           = require('fs')
const os           = require('os')
const swal         = require('sweetalert')
const Config       = require('electron-config');

const logFile      = path.join(os.homedir(), 'db.json')
const Reader       = {read : null}
const config       = new Config();

const onError = error => error && console.log(`${error.errno}: ${error.message}`)
const log     = data => fs.appendFile(logFile, JSON.stringify(data) + os.EOL, onError)

let modbusConnection = null

const app = new Vue({
    el : "#app",

    data : {
        isReady : false,
        device : "COM1",
        address : 1,
        logPath : logFile,
        activePage : "settings",
        sidebarDisabled: false,
        address : 1,
        intervalId : false,
        active : false,
        ph : {
            fault : 0,
            frequency : 5,
            interval : 60,
            mode : "once",
            currentValue : 0,
            lastValue : 0
        },
        temp : {
            fault : 0,
            currentValue : 0,
            lastValue : 0,
        },
        orp : {
            fault: 0,
            frequency : 5,
            interval : 60,
            mode : "once",
            currentValue : 0,
            lastValue : 0
        }
    },

    created: function () {
        this.device     = config.get('device')    || this.device
        this.ph.fault   = config.get('phFault')   || this.ph.fault
        this.temp.fault = config.get('tempFault') || this.temp.fault
        this.orp.fault  = config.get('orpFault')  || this.orp.fault
    },

    methods : {
        connect : function () {
            console.log('reconnected')

            this.isReady = true

            modbusConnection = ModbusClient.initModbus(ModbusClient, this.device, read => {
                Reader.read = read
            })

            modbusConnection.setLengthErrorHandler(() => {
                this.stopFrequency()
                swal('Ошибка!', 'Вероятнее всего, датчик находится в неправильном режиме', 'error')
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

        runFrequency : function () {
            if (this.orp.frequency < 1) {
                swal('Ошибка!', 'Период должен быть целым числом.', 'error')
                return
            }

            this.active = this.sidebarDisabled = true

            this.intervalId = setInterval(() => {
                this.send()
            }, 1000 * parseInt(this[this.activePage].frequency) * parseInt(this[this.activePage].interval))
        },

        stopFrequency : function () {
            this.active = this.sidebarDisabled = false

            clearInterval(this.intervalId)

            this.intervalId = false
        },

        send : function () {
            const onResponse = data => {
                const info = data.data.map(symbol => String.fromCharCode(symbol)).join('')

                if (this.activePage == 'ph') {
                    this.ph.lastValue = this.ph.currentValue
                    this.ph.currentValue = parseFloat(info.substr(0, 5)) + parseFloat(this.ph.fault)

                    this.temp.lastValue = this.temp.currentValue
                    this.temp.currentValue = parseFloat(info.substr(5)) + parseFloat(this.temp.fault)
                }

                if (this.activePage == 'orp') {
                    this.orp.lastValue = this.orp.currentValue
                    this.orp.currentValue = parseFloat(info.substr(0, 3) + '.' + info.substr(3, 1)) + parseFloat(this.orp.fault)
                }
            }

            if (this.activePage == 'ph') {
                modbusConnection.setDataLength(16)
            }

            if (this.activePage == 'orp') {
                modbusConnection.setDataLength(12)
            }

            Reader.read(this.address, onResponse, onError)
        },

        saveConfig : function () {
            config.set('device', this.device)
            config.set('phFault', this.ph.fault)
            config.set('tempFault', this.temp.fault)
            config.set('orpFault', this.orp.fault)
        }
    }
})
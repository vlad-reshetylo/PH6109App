const ModbusClient = require("modbus-serial")
const InitModbus   = require('./modbus/COMReader.js')
const Vue          = require('vue/dist/vue.min.js')

const Reader = {
    read : null
}

const app = new Vue({
    el : "#app",

    data : {
        isReady : false,
        device : "COM1",
        address : 1,
        result : ""
    },

    methods : {
        connect : function () {
            this.isReady = true

            InitModbus(ModbusClient, this.device, read => {
                Reader.read = read
            })            
        },

        send : function () {
            if (Reader.read === null) {
                return
            }

            Reader.read(this.address, 
                        data => {
                            this.result = data.data.map(symbol => String.fromCharCode(symbol)).join('')
                        }, 
                        error => {
                            alert(error)
                        })
        }
    }
})
const ModbusClient = require("modbus-serial")
const InitModbus   = require('./modbus/COMReader.js')

const Reader = {
    read : null
}

const initbox   = document.getElementById('initbox')
const initedbox = document.getElementById('initedbox')
const initbtn   = document.getElementById('initbtn')
const device    = document.getElementById('device')
const button    = document.getElementById('send')
const input     = document.getElementById('id')
const result    = document.getElementById('result')

initbtn.onclick = function () {
    initbox.style.display = "none";
    initedbox.style.display = "";

    InitModbus(ModbusClient, device.value, read => {
        initbtn.style.display = "none";

        Reader.read = read
    })
}

button.onclick = function () {
    if (Reader.read !== null) {
        Reader.read(1, callback = data => {
            result.innerHTML = data.data.map(dec => String.fromCharCode(dec)).join('')
        })
    }
}
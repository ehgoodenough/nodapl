var Keyb = require("keyb")
var Pixi = require("pixi.js")
var Afloop = require("afloop")
var Statgrab = require("statgrab/do")
var Firebase = require("firebase")
var ShortID = require("shortid")

var WIDTH = 1200
var HEIGHT = 900
var PIXEL = Pixi.Texture.fromImage(require("images/pixel.png"))

///////////
// Pixi //
/////////

Pixi.renderer = Pixi.autoDetectRenderer(WIDTH, HEIGHT)
Pixi.renderer.backgroundColor = 0x444444
Pixi.render = function(scene) {this.renderer.render(scene)}
document.body.appendChild(Pixi.renderer.view)

var scene = new Pixi.Container()
scene.persons = new Object()
scene._addChild = scene.addChild
scene.addChild = function(child) {
    this._addChild(child)
    
    if(child.isPerson) {
        this.persons[child.id] = child
    }
}

///////////////
// Firebase //
/////////////

Firebase.initializeApp({
    apiKey: "AIzaSyDa3aTe8g7c-sWlagpaUADePbeSS2RPS2A",
    authDomain: "sjgj-6a344.firebaseapp.com",
    databaseURL: "https://sjgj-6a344.firebaseio.com",
    storageBucket: "sjgj-6a344.appspot.com",
    messagingSenderId: "681965971322"
})

///////////
// Me!! //
/////////

var makePerson = function(data) {
    data = data || {}
    
    var person = new Pixi.Sprite(PIXEL)
    person.isPerson = true
    person.id = data.id || ShortID.generate()
    person.position.x = !!data.position ? data.position.x : WIDTH / 2
    person.position.y = !!data.position ? data.position.y : HEIGHT / 2
    person.anchor.x = 0.5
    person.anchor.y = 0.5
    person.scale.x = 32
    person.scale.y = 64
    person.speed = 0.5
    
    return person
}

var me = makePerson()
me.toData = function() {
    return {
        "id": me.id,
        "position": {
            "x": this.position.x,
            "y": this.position.y,
        },
    }
}
me.sync = function() {
    Firebase.database().ref("/users/" + me.id).set(me.toData())
}

Firebase.database().ref("/users/" + me.id).onDisconnect().remove()

scene.addChild(me)
me.sync()

///////////
// Loop //
/////////

var loop = new Afloop(function(delta) {
    
    if(Keyb.isDown("W") || Keyb.isDown("<up>")) {
        me.position.y -= me.speed * delta
        me.sync()
    }
    if(Keyb.isDown("S") || Keyb.isDown("<down>")) {
        me.position.y += me.speed * delta
        me.sync()
    }
    if(Keyb.isDown("A") || Keyb.isDown("<left>")) {
        me.position.x -= me.speed * delta
        me.sync()
    }
    if(Keyb.isDown("D") || Keyb.isDown("<right>")) {
        me.position.x += me.speed * delta
        me.sync()
    }
    
    Pixi.render(scene)
})

///////////
// Sync //
/////////

Firebase.database().ref("/users").on("child_added", function(data) {
    data = data.val()
    
    var person = makePerson(data)
    if(person.id != me.id) {
        scene.addChild(person)
    }
})

Firebase.database().ref("/users").on("child_changed", function(data) {
    data = data.val()
    
    var person = makePerson(data)
    if(person.id != me.id) {
        if(scene.persons[person.id]) {
            scene.persons[person.id].position.x = data.position.x
            scene.persons[person.id].position.y = data.position.y
        }
    }
})

Firebase.database().ref("/users").on("child_removed", function(data) {
    data = data.val()
    
    var person = makePerson(data)
    
    if(scene.persons[person.id]) {
        scene.removeChild(scene.persons[person.id])
        delete scene.persons[person.id]
    }
})

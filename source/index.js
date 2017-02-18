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
Pixi.render = function(container) {this.renderer.render(container)}
document.body.appendChild(Pixi.renderer.view)

class Game extends Pixi.Container {
    constructor() {
        super()
        
        this.persons = new Object()
    }
    addChild(child) {
        super.addChild(child)
        // if(child instanceof Person) {
        if(child.isPerson) {
            this.persons[child.id] = child
        }
    }
    removeChild(child) {
        super.removeChild(child)
        if(child instanceof Person) {
            delete this.persons[child.id]
        }
    }
}

var game = new Game()

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

class Person extends Pixi.Sprite {
    constructor(person = new Object()) {
        super(PIXEL)
        this.scale.x = 32
        this.scale.y = 64
        
        this.isPerson = true
        
        this.id = person.id || ShortID.generate()
        this.position.x = !!person.position ? person.position.x : WIDTH / 2
        this.position.y = !!person.position ? person.position.y : WIDTH / 2
        
        this.anchor.x = 0.5
        this.anchor.y = 0.5
        
        this.speed = 0.5
    }
    toData() {
        return {
            "id": this.id,
            "position": {
                "x": this.position.x,
                "y": this.position.y,
            }
        }
    }
    sync() {
        Firebase.database().ref("/users/" + this.id).set(this.toData())
    }
    syncOnDisconnect() {
        Firebase.database().ref("/users/" + this.id).onDisconnect().remove()
    }
}

var me = new Person()

game.addChild(me)
me.syncOnDisconnect()
me.sync()

///////////
// Loop //
/////////

var loop = new Afloop(function(delta) {
    
    if(Keyb.isDown("W") || Keyb.isDown("<up>")) {
        me.position.y -= me.speed * delta
        if(me.position.y < HEIGHT / 2) {
            me.position.y = HEIGHT / 2
        }
        me.sync()
    }
    if(Keyb.isDown("S") || Keyb.isDown("<down>")) {
        me.position.y += me.speed * delta
        if(me.position.y > HEIGHT) {
            me.position.y = HEIGHT
        }
        me.sync()
    }
    if(Keyb.isDown("A") || Keyb.isDown("<left>")) {
        me.position.x -= me.speed * delta
        if(me.position.x < 0) {
            me.position.x = 0
        }
        me.sync()
    }
    if(Keyb.isDown("D") || Keyb.isDown("<right>")) {
        me.position.x += me.speed * delta
        if(me.position.x > WIDTH) {
            me.position.x = WIDTH
        }
        me.sync()
    }
    
    Pixi.render(game)
})

///////////
// Sync //
/////////

Firebase.database().ref("/users").on("child_added", function(data) {
    data = data.val()
    
    if(data.id != me.id) {
        game.addChild(new Person(data))
    }
})

Firebase.database().ref("/users").on("child_changed", function(data) {
    data = data.val()
    
    if(data.id != me.id) {
        if(game.persons[data.id]) {
            game.persons[data.id].position.x = data.position.x
            game.persons[data.id].position.y = data.position.y
        }
    }
})

Firebase.database().ref("/users").on("child_removed", function(data) {
    data = data.val()
    
    if(data.id != me.id) {
        if(game.persons[data.id]) {
            game.removeChild(game.persons[data.id])
        }
    }
})

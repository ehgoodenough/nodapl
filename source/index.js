var Keyb = require("keyb")
var Pixi = require("pixi.js")
var Afloop = require("afloop")
var Statgrab = require("statgrab/do")
var Firebase = require("firebase")
var ShortID = require("shortid")

var WIDTH = 1600
var HEIGHT = 900

var PIXEL = Pixi.Texture.fromImage(require("images/pixel.png"))
var TRUCK = Pixi.Texture.fromImage(require("images/truck.png"))

var PERSON = {
    WALK: [
        Pixi.Texture.fromImage(require("images/walk1.png")),
        Pixi.Texture.fromImage(require("images/walk2.png")),
        Pixi.Texture.fromImage(require("images/walk3.png")),
        Pixi.Texture.fromImage(require("images/walk4.png")),
    ],
    PUSH: [
        Pixi.Texture.fromImage(require("images/push1.png")),
        Pixi.Texture.fromImage(require("images/push2.png")),
        Pixi.Texture.fromImage(require("images/push3.png")),
        Pixi.Texture.fromImage(require("images/push4.png")),
    ],
}

///////////
// Pixi //
/////////

Pixi.renderer = Pixi.autoDetectRenderer(WIDTH, HEIGHT)
Pixi.renderer.backgroundColor = 0x458B00
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

//////////
// Sky //
////////

var sky = new Pixi.Sprite(PIXEL)
sky.scale.x = WIDTH
sky.scale.y = HEIGHT / 2
sky.tint = 0x87CEEB
game.addChild(sky)

////////////
// Truck //
//////////

class Truck extends Pixi.Sprite {
    constructor() {
        super(TRUCK)
        
        this.scale.x = 3
        this.scale.y = 3
        
        this.anchor.x = 0
        this.anchor.y = 1
        
        this.position.x = WIDTH / 8 
        this.position.y = HEIGHT - 10
    }
}

var truck = new Truck()
game.addChild(truck)

//////////////
// Persons //
////////////

class Person extends Pixi.extras.AnimatedSprite {
    constructor(data = new Object()) {
        // super(PIXEL)
        // this.scale.x = 32
        // this.scale.y = 64
        super(PERSON.WALK)
        
        this.isPerson = true
        
        this.id = data.id || ShortID.generate()
        this.position.x = !!data.position ? data.position.x : WIDTH / 8
        this.position.y = !!data.position ? data.position.y : HEIGHT * 0.75
        
        this.anchor.x = 0.5
        this.anchor.y = 0.5
        
        this.speed = data.speed || 0.5
        this.direction = data.direction || +1
    }
    toData() {
        return {
            "id": this.id,
            "direction": this.direction,
            "position": {
                "x": this.position.x,
                "y": this.position.y,
            },
        }
    }
    sync() {
        Firebase.database().ref("/users/" + this.id).set(this.toData())
    }
    syncOnDisconnect() {
        Firebase.database().ref("/users/" + this.id).onDisconnect().remove()
    }
    update() {
        this.scale.x = this.direction
        
        if(this.position.x < WIDTH / 2) {
            this.textures = PERSON.WALK
            super.update(0.2)
        } else {
            this.textures = PERSON.PUSH
            super.update(0.15)
        }
    }
}

var me = new Person()
window.me = me

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
        me.direction = -1
        if(me.position.x < 0) {
            me.position.x = 0
        }
        me.sync()
    }
    if(Keyb.isDown("D") || Keyb.isDown("<right>")) {
        me.position.x += me.speed * delta
        me.direction = +1
        if(me.position.x > WIDTH) {
            me.position.x = WIDTH
        }
        me.sync()
    }
    
    game.children.forEach((child) => {
        if(child.update instanceof Function) {
            child.update(0.2)
        }
    })
    
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
            game.persons[data.id].direction = data.direction
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

window.kick = function() {
    Firebase.database().ref("/users").remove()
}

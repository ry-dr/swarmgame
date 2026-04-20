

// Screen Size References
let screenSize = {x: 0, y: 0};

// Physics References
let freq = 60; // Hz
let dt = 1/freq; // Time between frames
let t = 0;  // Total time elapsed from last frame

// GameObject References
let activeAsteroids = [];
let activeProjectiles = [];
let activeEnemies = [];


// Global Asteroid Parameters
let asteroidMaxSize = 100;

// Gameplay References
let gameState = 'play';

let wave = 1;
let waveStarted = true;
let enemySeed;

let gameOverFrameBuffer = 100;
let gameOverFrameCount = 0;

let dispersionVector = {x: 0, y: 0};


// VFX References
let explosionFrameBuffer = 60;
let explosionColor;
let activeExplosions = [];

let warpFrameBuffer = 30;
let warpColor;
let activeWarps = [];
let waveFrameCount = 0;

let playerProjPriColor;
let playerProjSecColor;
let enemyProjPriColor;
let enemyProjSecColor;



function setup() {

    explosionColor = color(255, 113, 25);
    warpColor = color(71, 255, 240);

    enemyProjPriColor = color(255, 102, 97);
    enemyProjSecColor = color(255, 74, 74);
    playerProjPriColor = color(255, 255, 255);
    playerProjSecColor = color(255, 255, 255);
    

    screenSize.x = windowWidth;
    screenSize.y = windowHeight;
    createCanvas(screenSize.x, screenSize.y);
    background(12, 12, 12);

    player = new Player();

    // enemy = new Enemy('ranger');

    // spawnWave(wave);



}



function draw() {

    // print(gameState);

    // Frame Gating
    if (t < dt) { 
        t += dt; 
        return; 
    };
    
    t = 0;

    // Reset Screen
    background(12, 12, 12);

    switch(gameState) {

        case 'play':
            
            if (player.isDestroyed == false) {

                // Player Input/Controls
                if (keyIsDown(87)) { player.input.w = 1 } else { player.input.w = 0 };
                if (keyIsDown(65)) { player.input.a = 1 } else { player.input.a = 0 };
                if (keyIsDown(83)) { player.input.s = 1 } else { player.input.s = 0 };
                if (keyIsDown(68)) { player.input.d = 1 } else { player.input.d = 0 };
                if (keyIsDown(32)) { fireProjectile(player) };
                if (keyIsDown(16)) {
                    player.thrustForce = 1400;
                    player.thrusterSize = 20;
                } else {
                    player.thrustForce = 850;
                    player.thrusterSize = 10;
                };

                // Apply Drag When Player Stops Controlling
                if (player.inputValue == 0) {
                    player.transform.velocity.x *= player.dragFactor;
                    player.transform.velocity.y *= player.dragFactor;
                };

                // Update Velocities
                player.playerInputAction();

                // Update Position/Render
                if (player.foldOverBounds() != true) {
                    player.updateTransform();  // Update player ship world position
                    player.render();  // Render player ship
                }

            } else {  // runs if player is destroyed

                if (player.hasExploded == false) { 
                    activeExplosions.push({x: player.transform.position.x, y: player.transform.position.y, frameCount: 0}); 
                    player.hasExploded = true;
                }

            }

            // Render/Update Projectiles
            if (activeProjectiles.length != 0) {
                for (let i = 0; i < activeProjectiles.length; i++) {

                    // Universal Projectiles
                    activeProjectiles[i].render();
            
                    // Enemy Projectiles
                    if (activeProjectiles[i].parent != player) {
                        if (player.isDestroyed == false) {
                            if (activeProjectiles[i].distanceFromPlayer() <= player.transform.size) { 
                                player.destroy();  // Destroy player
                                activeProjectiles.splice(i, 1);  // Destroy projectile
                            };
                        }


                    // Player Projectiles
                    } else {

                        for (let j = 0; j < activeEnemies.length; j++) {

                            if (activeProjectiles[i].distanceFromEnemy(activeEnemies[j]) <= activeEnemies[j].transform.size) {
                                activeProjectiles.splice(i, 1);
                                activeExplosions.push({x: activeEnemies[j].transform.position.x, y: activeEnemies[j].transform.position.y, frameCount: 0});
                                activeEnemies.splice(j, 1);
                                break;
                            }
                        }
                    }
                }
            }
    

            // Render/Update Enemies
            if (waveStarted == true) {
                if (activeEnemies.length != 0) {
                    for (let i = 0; i < activeEnemies.length; i++) {
            
                        // If player is alive
                        if (player.isDestroyed == false) {

                            activeEnemies[i].disperse(i);

                            // Ranger Specific Actions
                            if (activeEnemies[i].type == 'ranger') {
                                activeEnemies[i].followPlayerAction();
                                if (millis() - activeEnemies[i].spawnTime >= 1000 / activeEnemies[i].fireRate) { fireProjectile(activeEnemies[i]) };
                            }

                            // Bomber Specific Actions
                            if (activeEnemies[i].type == 'bomber') {
                                activeEnemies[i].suicideFollow();
                            }

                        // If player is dead
                        } else {
                            if (activeEnemies[i].isStopped == false) {
                                activeEnemies[i].stop();
                            }
                        }
                    
            
                        // Universal Actions
                        activeEnemies[i].updateTransform();
                        activeEnemies[i].render();

            
                        if (activeEnemies[i].distanceToPlayer <= player.transform.size) {
                            player.destroy();
                            activeEnemies.splice(i, 1);
                        }

                    };

                // If all enemies are killed
                } else {
                    spawnWave(wave);
                    wave += 1;
                    waveStarted = false;
                }

            // Wave hasn't started yet (handles spawn animations before starting the wave)
            } else {

                // Warp Animations
                if (activeWarps.length != 0) {
                    for (let i = 0; i < activeWarps.length; i++) {
                        warp(i);
                    }
                
                // Runs once all warps have completed
                } else {
                    waveStarted = true;
                }


            }
            

            // Explosion Animations
            if (activeExplosions.length != 0) {
                for (let i = 0; i < activeExplosions.length; i++) {
                    explosion(i);
                }
            }



            break;




    }
    

}


class Asteroid {

    constructor() {
        
        // Initialize asteroid transform
        this.transform = {
            position: {x: 0.5 * screenSize.x, y: 0.5 * screenSize.y},  // of asteroid center 
            velocity: {x: random(100, 500), y: random(100, 500)},
            size: random(25, 60)
        };  

        // Initialize asteroid template
        this.model = this.randomModel();

        // Update this to true when asteroid enters screen
        this.hasEnteredScreen = false;

        // Select from spawn nodes at random, then reconfigure asteroid position to spawn node
        this.randomizeSpawn();

        // Add asteroid to active asteroid cache
        activeAsteroids.push(this);

    }

    randomizeSpawn() {

        /*  Spawn Node Layout Map

          1 |       2        |  3
        --------------------------
          4 |     canvas     |  5
        --------------------------
          6 |       7        |  8

        */

        // Select Random Spawn Node
        switch(int(random(1, 9))) {

            case 1:
                this.transform.position = {x: -asteroidMaxSize, y: -asteroidMaxSize};
                break;

            case 2:
                this.transform.position = {x: 0.5 * screenSize.x, y: -asteroidMaxSize};
                this.transform.velocity.x *= randomSign();
                break;

            case 3:
                this.transform.position = {x: screenSize.x + asteroidMaxSize, y: -asteroidMaxSize};
                this.transform.velocity.x *= -1;
                break;

            case 4:
                this.transform.position = {x: -asteroidMaxSize, y: 0.5 * screenSize.y};
                this.transform.velocity.y *= randomSign();
                break;

            case 5:
                this.transform.position = {x: screenSize.x + asteroidMaxSize, y: 0.5 * screenSize.y};
                this.transform.velocity.x *= -1;
                this.transform.velocity.y *= randomSign();
                break;

            case 6:
                this.transform.position = {x: -asteroidMaxSize, y: screenSize.y + asteroidMaxSize};
                this.transform.velocity.y *= -1;
                break;

            case 7:
                this.transform.position = {x: 0.5 * screenSize.x, y: screenSize.y + asteroidMaxSize};
                this.transform.velocity.x *= randomSign();
                this.transform.velocity.y *= -1;
                break;

            case 8:
                this.transform.position = {x: screenSize.x + asteroidMaxSize, y: screenSize.y + asteroidMaxSize};
                this.transform.velocity.x *= -1;
                this.transform.velocity.y *= -1;
                break;

        }
    }

    randomModel() {

        // switch(int(random(1, 1))) {

        // }

        // add more models later but make game work first
        

        return [
            1 * this.transform.size, 
            0.8 * this.transform.size,
            0.9 * this.transform.size,
            1 * this.transform.size,
            1 * this.transform.size,
            0.7 * this.transform.size,
            0.6 * this.transform.size,
            0.8 * this.transform.size,
            1 * this.transform.size,
            0.9 * this.transform.size,
            1 * this.transform.size,
            1 * this.transform.size,
            1 * this.transform.size,
            0.85 * this.transform.size,
            0.75 * this.transform.size,
            0.9 * this.transform.size,
        ];


    }



    updateTransform() {

        // Update position from velocity
        this.transform.position.x += this.transform.velocity.x * dt;
        this.transform.position.y += this.transform.velocity.y * dt;

    }

    foldOverBounds() {  

        // Once asteroid enters screen, update variable to reflect that
        if (this.hasEnteredScreen == false) {
            if (this.transform.position.x < (screenSize.x + asteroidMaxSize) && this.transform.position.x > -asteroidMaxSize &&
                this.transform.position.y < (screenSize.y + asteroidMaxSize) && this.transform.position.y > -asteroidMaxSize) {
                    this.hasEnteredScreen = true;
            }    
        }
        
        // If asteroid hasn't entered screen yet, code stops here
        if (this.hasEnteredScreen == false) { return false };

        // do a switch case here with the transform.position, and for corners just do && for x and y

        // If hits left screen bound, move to right screen bound, reset hasEnteredScreen
        if (this.transform.position.x <= -asteroidMaxSize) { 
            this.transform.position.x = screenSize.x + asteroidMaxSize;
            this.hasEnteredScreen = false;
            return true;
        };

        // If hits right screen bound, move to left screen bound, reset hasEnteredScreen
        if (this.transform.position.x >= (screenSize.x + asteroidMaxSize)) {
            this.transform.position.x = -asteroidMaxSize;
            this.hasEnteredScreen = false;
            return true;
        };  

        // If hits top screen bound, move to bottom screen bound, reset hasEnteredScreen
        if (this.transform.position.y <= -asteroidMaxSize) { 
            this.transform.position.y = screenSize.y + asteroidMaxSize;
            this.hasEnteredScreen = false;
            return true;
        };

        // If hits bottom screen bound, move to top screen bound, reset hasEnteredScreen
        if (this.transform.position.y >= (screenSize.y + asteroidMaxSize)) {
            this.transform.position.y = -asteroidMaxSize;
            this.hasEnteredScreen = false;
            return true;
        };

        return false;

    }

    distanceFromPlayer() {
        return sqrt(sq(player.transform.position.x - this.transform.position.x) + sq(player.transform.position.y - this.transform.position.y));
    }





    render() {
        this.polyWheel(this.model);
    }

    polyWheel(radii) {  // models are arrays of radii of length 16

        stroke(120, 120, 120);
        // noFill();
        fill(120, 120, 120);

        beginShape();
        vertex(this.transform.position.x + radii[0], this.transform.position.y);  // 0 degrees
        vertex(this.transform.position.x + 0.866 * radii[1], this.transform.position.y - 0.5 * radii[1]);  // 30 degrees
        vertex(this.transform.position.x + 0.707 * radii[2], this.transform.position.y - 0.707 * radii[2]);  // 45 degrees
        vertex(this.transform.position.x + 0.5 * radii[3], this.transform.position.y - 0.866 * radii[3]);  // 60 degrees
        vertex(this.transform.position.x, this.transform.position.y - radii[4]);  // 90 degrees
        vertex(this.transform.position.x - 0.5 * radii[5], this.transform.position.y - 0.866 * radii[5]);  // 120 degrees
        vertex(this.transform.position.x - 0.707 * radii[6], this.transform.position.y - 0.707 * radii[6]);  // 135 degrees
        vertex(this.transform.position.x - 0.866 * radii[7], this.transform.position.y - 0.5 * radii[7]);  // 150 degrees
        vertex(this.transform.position.x - radii[8], this.transform.position.y);  // 180 degrees
        vertex(this.transform.position.x - 0.866 * radii[9], this.transform.position.y + 0.5 * radii[9]);  // 210 degrees
        vertex(this.transform.position.x - 0.707 * radii[10], this.transform.position.y + 0.707 * radii[10]);  // 225 degrees
        vertex(this.transform.position.x - 0.5 * radii[11], this.transform.position.y + 0.866 * radii[11]);  // 240 degrees
        vertex(this.transform.position.x, this.transform.position.y + radii[12]);  // 270 degrees
        vertex(this.transform.position.x + 0.5 * radii[13], this.transform.position.y + 0.866 * radii[13]);  // 300 degrees
        vertex(this.transform.position.x + 0.707 * radii[14], this.transform.position.y + 0.707 * radii[14]);  // 315 degrees
        vertex(this.transform.position.x + 0.866 * radii[15], this.transform.position.y + 0.5 * radii[15]);  // 330 degrees
        vertex(this.transform.position.x + radii[0], this.transform.position.y);  // 360 degrees
        endShape();

    }




}


function randomSign() {
                        
        switch(int(random(0, 1))) {
        
        case 0:
            return -1;

        case 1:
            return 1;

        };

    }


class Player {

    constructor() {

        // Initialize player ship transform
        this.transform = {
            position: {x: 0.5 * screenSize.x, y: 0.5 * screenSize.y},  // of ship center 
            direction: {x: 0, y: 1},  // direction vector of ship front, relative to +y world axis
            velocity: {x: 0, y: 0},
            rotation: 0,  // in radians, cw from world pos y axis
            size: 25
        };

        this.model = [];

        this.input = {w: 0, a: 0, s: 0, d: 0};
        this.inputValue = this.input.w + this.input.a + this.input.d + this.input.s;
        this.fireRate = 2;  // projectiles per second
        this.timeLastFired = 0;

        this.thrustForce = 850; // px / s^2
        this.angularVelocity = 8;  // in radians
        this.dragFactor = 0.98;  // percentage of velocity maintained every frame when keys not pressed

        this.hasEnteredScreen = true;
        this.isDestroyed = false;
        this.hasExploded = false;

        this.thrusterSize = 10;

    }

    updateTransform() {

        this.transform.position.x += this.transform.velocity.x * dt;
        this.transform.position.y += this.transform.velocity.y * dt;
    
    }

    playerInputAction() {

        // Thrust Movements
        if (this.input.w == 1) { 
            this.transform.velocity.x += this.transform.direction.x * this.thrustForce * dt;
            this.transform.velocity.y += this.transform.direction.y * this.thrustForce * dt;    
        };

        if (this.input.s == 1) { // need to stop from being able to go backwards here
            this.transform.velocity.x -= this.transform.direction.x * this.thrustForce * dt;
            this.transform.velocity.y -= this.transform.direction.y * this.thrustForce * dt;    
        };

        // Rotational Movements
        if (this.input.a == 1) { this.transform.rotation -= this.angularVelocity * dt };
        if (this.input.d == 1) { this.transform.rotation += this.angularVelocity * dt };

        // Update Direction Vector
        this.transform.direction.x = -sin(this.transform.rotation);
        this.transform.direction.y = cos(this.transform.rotation);

        // Update Input Value
        this.inputValue = this.input.w + this.input.a + this.input.d + this.input.s;

    }

    render() {
        push();  // Initialize alternate coordinates
        translate(player.transform.position.x, player.transform.position.y);  // Move origin to player ship
        rotate(player.transform.rotation); // Rotate coordinates about player ship center
        
        stroke(180, 180, 180);
        fill(180, 180, 180);
        triangle(  // hull
            0, this.transform.size,  // nose vertex
            -cos(0.785) * this.transform.size, -sin(0.785) * this.transform.size,  // right thruster vertex 
            cos(0.785) * this.transform.size, -sin(0.785) * this.transform.size  // left thruster vertex
        );
        stroke(0, 0, 0);
        fill(0, 0, 0);
        triangle(
            0, -0.2 * this.transform.size,
            0.98 * -cos(0.785) * this.transform.size, -sin(0.785) * this.transform.size,
            0.98 * cos(0.785) * this.transform.size, -sin(0.785) * this.transform.size
        );
        if (this.inputValue != 0) {
            stroke(0, 217, 255);
            fill(0, 217, 255);
            circle(0, -this.transform.size, this.thrusterSize);
        }


        pop();  // Destroy alternate coordinates
    }

    foldOverBounds() {  

        // Once player enters screen, update variable to reflect that
        if (this.hasEnteredScreen == false) {
            if (this.transform.position.x < screenSize.x && this.transform.position.x > 0 &&
                this.transform.position.y < screenSize.y && this.transform.position.y > 0) {
                    this.hasEnteredScreen = true;
            }    
        }
        
        // If player hasn't entered screen yet, code stops here
        if (this.hasEnteredScreen == false) { return false };

        // If hits left screen bound, move to right screen bound, reset hasEnteredScreen
        if (this.transform.position.x <= 0) { 
            this.transform.position.x = screenSize.x;
            this.hasEnteredScreen = false;
            return true;
        };

        // If hits right screen bound, move to left screen bound, reset hasEnteredScreen
        if (this.transform.position.x >= screenSize.x) {
            this.transform.position.x = 0;
            this.hasEnteredScreen = false;
            return true;
        };  

        // If hits top screen bound, move to bottom screen bound, reset hasEnteredScreen
        if (this.transform.position.y <= 0) { 
            this.transform.position.y = screenSize.y;
            this.hasEnteredScreen = false;
            return true;
        };

        // If hits bottom screen bound, move to top screen bound, reset hasEnteredScreen
        if (this.transform.position.y >= screenSize.y) {
            this.transform.position.y = 0;
            this.hasEnteredScreen = false;
            return true;
        };

        return false;

    }

    destroy() {

        this.isDestroyed = true;

    }

    
    
}


class Projectile {

    constructor(parent) {

        this.parent = parent;  // either player or enemy instance

        if (this.parent != player) {
            this.speed = 1200;
            this.priColor = enemyProjPriColor;
            this.secColor = enemyProjSecColor;
            this.secColor.setAlpha(128);
        } else {
            this.speed = 2500;
            this.priColor = playerProjPriColor;
            this.secColor = playerProjSecColor;
            // this.secColor.setAlpha(128);
        }
        

        this.transform = {
            position: {x: this.parent.transform.position.x + this.parent.transform.direction.x * this.parent.transform.size, y: this.parent.transform.position.y + this.parent.transform.direction.y * this.parent.transform.size},
            velocity: {x: this.parent.transform.direction.x * this.speed, y: this.parent.transform.direction.y * this.speed},
            size: 8
        }

    }

    render() {

        // Update Transform 
        this.transform.position.x += this.transform.velocity.x * dt;
        this.transform.position.y += this.transform.velocity.y * dt;

        stroke(this.secColor);
        fill(this.priColor);
        circle(this.transform.position.x, this.transform.position.y, this.transform.size);

    }

    distanceFromPlayer() {
        return sqrt(sq(player.transform.position.x - this.transform.position.x) + sq(player.transform.position.y - this.transform.position.y));
    }

    distanceFromEnemy(enemy) {
        return sqrt(sq(enemy.transform.position.x - this.transform.position.x) + sq(enemy.transform.position.y - this.transform.position.y));
    }


}


class Enemy {
    // Types: 'ranger', 'bomber', 'mine'

    constructor(type) {

        this.type = type;

        this.transform = {
            position: {x: 0, y: 0},
            velocity: {x: 0, y: 0},
            direction: {x: 0, y: 0},
            size: 35
        }

        this.randomizeSpawn();

        this.speed = random(300, 400);
        this.bomberMaxSpeed = 500;
        this.velocity = this.speed;

        this.distanceToPlayer = 0;
        this.directionToPlayer();

        this.fireRate = random(0.3, 0.6);
        this.timeLastFired = 0;
        this.ambushRadius = random(365, 445);

        activeEnemies.push(this);

        this.spawnTime = millis();

        activeWarps.push({x: this.transform.position.x, y: this.transform.position.y, frameCount: 0});

        this.isStopped = false;

        this.model = this.getModel();

        this.movementVector = {x: 0, y: 0};
        this.directionVector = {x: 0, y: 0};
        this.distanceToEnemy = 1000;
        this.moveMag = sqrt(sq(this.directionVector.x) + sq(this.directionVector.y));

        this.dispersionRadius = 200;

    }

    render() {

        push();  // Initialize alternate coordinates
        translate(this.transform.position.x, this.transform.position.y);  // Move origin to player ship
        

        switch(this.type) {

            case 'ranger':
                
                // Coordinate rotation
                if (this.transform.direction.y >= 0) { rotate(acos(this.transform.direction.x) - PI/2) };
                if (this.transform.direction.y <= 0) { rotate(-acos(this.transform.direction.x) + (3/2) * PI) };

                stroke(255, 102, 97);
                fill(255, 102, 97);
                polyWheel(0, 0, this.model);

                if (this.transform.velocity.x != 0 || this.transform.velocity.y != 0) {
                    stroke(255, 113, 25);
                    fill(255, 113, 25);
                    circle(-11, -0.65 * this.transform.size, 0.02 * sqrt(sq(this.transform.velocity.x) + sq(this.transform.velocity.y)));
                    circle(11, -0.65 * this.transform.size, 0.02 * sqrt(sq(this.transform.velocity.x) + sq(this.transform.velocity.y)));
                }
                break;

            case 'bomber':

                // Coordinate rotation
                if (this.transform.direction.y >= 0) { rotate(acos(this.transform.direction.x) - PI/2) };
                if (this.transform.direction.y <= 0) { rotate(-acos(this.transform.direction.x) + (3/2) * PI) };
                
                stroke(255, 102, 97);
                fill(255, 102, 97);
                polyWheel(0, 0, this.model);

                if (this.transform.velocity.x != 0 || this.transform.velocity.y != 0) {
                    stroke(255, 113, 25);
                    fill(255, 113, 25);
                    circle(0, -this.transform.size, 0.02 * sqrt(sq(this.transform.velocity.x) + sq(this.transform.velocity.y)));
                }
    



                break;

        }




        pop();  // Destroy alternate coordinates
        


    }

    updateTransform() {

        this.transform.velocity.x = this.velocity * this.movementVector.x / this.moveMag;
        this.transform.velocity.y = this.velocity * this.movementVector.y / this.moveMag;

        this.transform.position.x += this.transform.velocity.x * dt;
        this.transform.position.y += this.transform.velocity.y * dt;

        this.movementVector = {x: 0, y: 0};

    }

    randomizeSpawn() {

        if (player.transform.position.x <= 0.5 * screenSize.x) { this.transform.position.x = random(0.5 * screenSize.x, screenSize.x) };
        if (player.transform.position.x > 0.5 * screenSize.x) { this.transform.position.x = random(0, 0.5 * screenSize.x) };
        if (player.transform.position.y <= 0.5 * screenSize.x) { this.transform.position.y = random(0.5 * screenSize.y, screenSize.y) };
        if (player.transform.position.y > 0.5 * screenSize.x) { this.transform.position.y = random(0, 0.5 * screenSize.y) };

    }

    directionToPlayer() {

        // Get unit direction vector
        this.transform.direction.x = player.transform.position.x - this.transform.position.x;
        this.transform.direction.y = player.transform.position.y - this.transform.position.y;
        this.distanceToPlayer = sqrt(sq(this.transform.direction.x) + sq(this.transform.direction.y))
        this.transform.direction.x = this.transform.direction.x / this.distanceToPlayer;
        this.transform.direction.y = this.transform.direction.y / this.distanceToPlayer;


    }

    directionToEnemy(j) {
        // Get unit direction vector
        this.directionVector.x = activeEnemies[j].transform.position.x - this.transform.position.x;
        this.directionVector.y = activeEnemies[j].transform.position.y - this.transform.position.y;
        this.distanceToEnemy = sqrt(sq(this.directionVector.x) + sq(this.directionVector.y))
        this.directionVector.x = this.directionVector.x / this.distanceToPlayer;
        this.directionVector.y = this.directionVector.y / this.distanceToPlayer;
    }

    followPlayerAction() {

        this.directionToPlayer();

        if (this.distanceToPlayer >= this.ambushRadius + 25) {
            this.movementVector.x += this.transform.direction.x;
            this.movementVector.y += this.transform.direction.y;
            // this.transform.velocity.x = this.transform.direction.x * this.speed;
            // this.transform.velocity.y = this.transform.direction.y * this.speed;
        } else if (this.distanceToPlayer >= this.ambushRadius - 25 && this.distanceToPlayer < this.ambushRadius + 25) {
            // this.transform.velocity.x = 0;
            // this.transform.velocity.y = 0;
        } else if (this.distanceToPlayer < this.ambushRadius - 25) {
            // this.transform.velocity.x = -this.transform.direction.x * this.speed;
            // this.transform.velocity.y = -this.transform.direction.y * this.speed;
            this.movementVector.x -= this.transform.direction.x;
            this.movementVector.y -= this.transform.direction.y;
        }


    }

    suicideFollow() {

        this.directionToPlayer();
        
        if (this.distanceToPlayer >= this.bomberMaxSpeed) { 
            this.velocity = this.speed / (this.distanceToPlayer / 800);
        } else {
            this.velocity = this.speed / (this.bomberMaxSpeed / 800);
        }

    }

    stop() {
        this.transform.velocity.x *= 0.1;
        this.transform.velocity.y *= 0.1;
        this.isStopped = true;
    }

    getModel() {

        switch(this.type) {

            case 'ranger':
                return [
                    1 * this.transform.size, 
                    0.52 * this.transform.size,
                    0.6 * this.transform.size,
                    0.3 * this.transform.size,
                    1 * this.transform.size,
                    0.3 * this.transform.size,
                    0.6 * this.transform.size,
                    0.52 * this.transform.size,
                    1 * this.transform.size,
                    0.4 * this.transform.size,
                    0.4 * this.transform.size,
                    0.45 * this.transform.size,
                    0.75 * this.transform.size,
                    0.45 * this.transform.size,
                    0.4 * this.transform.size,
                    0.4 * this.transform.size,
                ];

            case 'bomber':
                return [
                    0.5 * this.transform.size, 
                    0.5 * this.transform.size,
                    0.5 * this.transform.size,
                    0.7 * this.transform.size,
                    0.5 * this.transform.size,
                    0.7 * this.transform.size,
                    0.5 * this.transform.size,
                    0.5 * this.transform.size,
                    0.5 * this.transform.size,
                    0.4 * this.transform.size,
                    0.9 * this.transform.size,
                    0.35 * this.transform.size,
                    0.6 * this.transform.size,
                    0.35 * this.transform.size,
                    0.9 * this.transform.size,
                    0.4 * this.transform.size,
                ];
            




        }

    }

    disperse(i) {
    
        // Iterate through all active enemies
        for (let j = 0; j < activeEnemies.length; j++) {

            // If iteration enemy is not enemy i...
            if (j != i) {
                this.directionToEnemy(j);
                if (this.distanceToEnemy <= this.dispersionRadius) {
                    this.movementVector.x -= this.directionVector.x;
                    this.movementVector.y -= this.directionVector.y;
                }
            
            
            
            }
        
        
        
        
        }
    
    
    }


}

function explosion(i) {
    if (activeExplosions[i].frameCount <= explosionFrameBuffer) {
        explosionColor.setAlpha(255 - (255 * activeExplosions[i].frameCount / explosionFrameBuffer));
        stroke(explosionColor);
        fill(explosionColor);
        circle(activeExplosions[i].x, activeExplosions[i].y, 25 * (1 + 2 * activeExplosions[i].frameCount/explosionFrameBuffer));
        activeExplosions[i].frameCount += 1;
    } else {
        activeExplosions.splice(i, 1);
    }
}

function warp(i) {
    if (activeWarps[i].frameCount <= warpFrameBuffer) {
        warpColor.setAlpha(255 - (170 * activeWarps[i].frameCount / warpFrameBuffer));
        stroke(warpColor);
        fill(warpColor);
        circle(activeWarps[i].x, activeWarps[i].y, 15 * (warpFrameBuffer/(activeWarps[i].frameCount + 3)));
        activeWarps[i].frameCount += 1;
    } else {
        activeWarps.splice(i, 1);
    }
}

function fireProjectile(parent) {
    if (millis() - parent.timeLastFired >= 1000 / parent.fireRate) {
        parent.timeLastFired = millis();
        activeProjectiles.push(new Projectile(parent));
    };
}


function spawnWave(wave) {
    
    // put outer for loop for 3 iterations, 1 for each enemy type
    for (let j = 0; j < random(wave, 2 * wave); j++) {
        
        enemySeed = int(random(1, 3));
        print(enemySeed);
        
        switch(enemySeed) {

            case 1:
                new Enemy('ranger');
                break;

            case 2:
                new Enemy('bomber');
                break;


        }
        
        
    }


}

function polyWheel(x, y, radii) {  // models are arrays of radii of length 16

        beginShape();
        vertex(x + radii[0], y);  // 0 degrees
        vertex(x + 0.866 * radii[1], y - 0.5 * radii[1]);  // 30 degrees
        vertex(x + 0.707 * radii[2], y - 0.707 * radii[2]);  // 45 degrees
        vertex(x + 0.5 * radii[3], y - 0.866 * radii[3]);  // 60 degrees
        vertex(x, y - radii[4]);  // 90 degrees
        vertex(x - 0.5 * radii[5], y - 0.866 * radii[5]);  // 120 degrees
        vertex(x - 0.707 * radii[6], y - 0.707 * radii[6]);  // 135 degrees
        vertex(x - 0.866 * radii[7], y - 0.5 * radii[7]);  // 150 degrees
        vertex(x - radii[8], y);  // 180 degrees
        vertex(x - 0.866 * radii[9], y + 0.5 * radii[9]);  // 210 degrees
        vertex(x - 0.707 * radii[10], y + 0.707 * radii[10]);  // 225 degrees
        vertex(x - 0.5 * radii[11], y + 0.866 * radii[11]);  // 240 degrees
        vertex(x, y + radii[12]);  // 270 degrees
        vertex(x + 0.5 * radii[13], y + 0.866 * radii[13]);  // 300 degrees
        vertex(x + 0.707 * radii[14], y + 0.707 * radii[14]);  // 315 degrees
        vertex(x + 0.866 * radii[15], y + 0.5 * radii[15]);  // 330 degrees
        vertex(x + radii[0], y);  // 360 degrees
        endShape();

    }



/* TO-DO

new name S.W.A.R.M.
space war armament research mission

1. set up wave start timers / just make the label actually work
2. prevent duplicate spawn locations bc the enemies have the same behavior and overlap
2.5. or add some randomness to enemy behaviors
3. keep randomized number of enemies, but make for each spawn iteration randomize the enemy type
3.. should probably add the other enemy types first lol
4. maybe add a boost feature idk yet

for waves, create a wave start frame buffer
so when wave starts, the frame buffer basically changes the "draw" function for that number of frames
should put logic in there for gamestates so the code runs different for different stages
gamestates (active, waveStart, gameEnd, menu)
for frame buffer:
each frame increase a number
next frame check if that number is less than the frame buffer
if it is, keep running that code
if it is not, switch the gamestate to active



*/
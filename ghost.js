var Ghost = function(game, key, name, startPos, startDir) {
    this.game = game;
    this.key  = key;
    this.name = name;
    
    this.gridsize = this.game.gridsize;
    this.safetiles = this.game.safetile;
    this.startDir = startDir;
    this.startPos = startPos;
    this.threshold = 6;
    
    this.turnTimer = 0;
    this.TURNING_COOLDOWN = 150;
    this.RETURNING_COOLDOWN = 100;
    this.RANDOM     = "random";
    this.SCATTER    = "scatter";
    this.CHASE      = "chase";
    this.STOP       = "stop";
    this.AT_HOME    = "at_home";
    this.EXIT_HOME  = "leaving_home";
    this.RETURNING_HOME = "returning_home";
    this.lastDirection = null;
    
    this.mode = this.AT_HOME;
    this.ghostDestination = new Phaser.Point();
    this.scatterDestination = new Phaser.Point(18 * this.gridsize, 20 * this.gridsize);
    this.returnDestination = new Phaser.Point(9 * this.gridsize, 10 * this.gridsize);
    
    this.ghostSpeed = 150;
    this.ghostScatterSpeed = 130;
    this.ghostFrightenedSpeed = 75;
    this.cruiseElroySpeed = 170;
    this.directions = [ null, null, null, null, null ];
    // Phaser.none/left/right/up/down = 0/1/2/3/4
    this.opposites = [ Phaser.NONE, Phaser.RIGHT, Phaser.LEFT, Phaser.DOWN, Phaser.UP ];
    this.currentDir = startDir;
    
    this.turnPoint = new Phaser.Point();
    
    var offsetGhost = 0;
    switch (this.name) {
        case "clyde":
            //offsetGhost = 4;
            this.scatterDestination = new Phaser.Point(0, 20 * this.gridsize);
            break;
        case "pinky":
            //offsetGhost = 8;
            this.scatterDestination = new Phaser.Point(0, 0);
            break;
        case "blinky":
            //offsetGhost = 12;
            this.scatterDestination = new Phaser.Point(18 * this.gridsize, 0);
            this.mode = this.SCATTER;
            break;
            
        default:
            break;
    }
    
    this.ghost = this.game.add.sprite((startPos.x * this.gridsize) + this.gridsize/2, (startPos.y * this.gridsize) + this.gridsize/2, key, 0);
    this.ghost.name = this.name;
    this.ghost.anchor.set(0.5);
    /*
    this.ghost.animations.add(Phaser.LEFT, [offsetGhost], 0, false);
    this.ghost.animations.add(Phaser.UP, [offsetGhost+1], 0, false);
    this.ghost.animations.add(Phaser.DOWN, [offsetGhost+2], 0, false);
    this.ghost.animations.add(Phaser.RIGHT, [offsetGhost+3], 0, false);
    this.ghost.animations.add("frightened", [16, 17], 10, true);
    this.ghost.animations.add(Phaser.RIGHT+20, [20], 0, false);
    this.ghost.animations.add(Phaser.LEFT+20, [21], 0, false);
    this.ghost.animations.add(Phaser.UP+20, [22], 0, false);
    this.ghost.animations.add(Phaser.DOWN+20, [23], 0, false);
    */
    this.ghost.animations.add("left", [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35], 15, true);
    this.ghost.animations.add("right", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 15, true);
    this.ghost.animations.add("frightened left", [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47], 15, true);
    this.ghost.animations.add("frightened right", [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], 15, true);
    //this.ghost.play(startDir);
    
    this.game.physics.arcade.enable(this.ghost);
    this.ghost.body.setSize(26, 26, 2, 0);
    
    this.move(startDir);
};

Ghost.prototype = {
    update: function() {

        this.game.physics.arcade.collide(this.ghost, this.game.layer);
        
        var x = this.game.math.snapToFloor(Math.floor(this.ghost.x), this.gridsize) / this.gridsize;
        var y = this.game.math.snapToFloor(Math.floor(this.ghost.y), this.gridsize) / this.gridsize;
        this.turnPoint.x = (x * this.gridsize) + (this.gridsize / 2);
        this.turnPoint.y = (y * this.gridsize) + (this.gridsize / 2);

        if (this.ghost.x < 0) {
            this.ghost.x = this.game.map.widthInPixels - 2;
        }
        if (this.ghost.x >= this.game.map.widthInPixels - 1) {
            this.ghost.x = 1;
        }
        
        if (this.game.math.fuzzyEqual((x * this.gridsize) + (this.gridsize /2), this.ghost.x, this.threshold) &&
           this.game.math.fuzzyEqual((y * this.gridsize) + (this.gridsize /2), this.ghost.y, this.threshold)) {
            this.directions[0] = this.game.map.getTile(x, y, this.game.layer);
            this.directions[1] = this.game.map.getTileLeft(this.game.layer.index, x, y) || this.directions[1];
            this.directions[2] = this.game.map.getTileRight(this.game.layer.index, x, y) || this.directions[2];
            this.directions[3] = this.game.map.getTileAbove(this.game.layer.index, x, y) || this.directions[3];
            this.directions[4] = this.game.map.getTileBelow(this.game.layer.index, x, y) || this.directions[4];
            // console.log(this.name + " " + x + " " + this.currentDir);

            var canContinue = this.checkSafetile(this.directions[this.currentDir].index);
            var possibleExits = [];
            for (var q=1; q<this.directions.length; q++) {
                if (this.checkSafetile(this.directions[q].index) && q !== this.opposites[this.currentDir]) {
                    possibleExits.push(q);
                }
            }
            console.log(this.name, possibleExits);
            switch (this.mode) {
                case this.RANDOM:
                    if (this.turnTimer < this.game.time.time && (possibleExits.length > 1 || !canContinue)) {
                        var select = Math.floor(Math.random() * possibleExits.length);
                        var newDirection = possibleExits[select];

                        // snap to grid exact position before turning
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;

                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(newDirection);

                        this.turnTimer = this.game.time.time + this.TURNING_COOLDOWN;
                    }
                    break;
                    
                case this.RETURNING_HOME:
                    this.ghostDestination = this.returnDestination;
                    if (this.turnTimer < this.game.time.time) {
                        var distanceToObj = 999999;
                        var direction, decision, bestDecision;
                        for (q=0; q<possibleExits.length; q++) {
                            direction = possibleExits[q];
                            switch (direction) {
                                case Phaser.LEFT:
                                    decision = new Phaser.Point((x-1)*this.gridsize + (this.gridsize/2),
                                        (y * this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.RIGHT:
                                    decision = new Phaser.Point((x+1)*this.gridsize + (this.gridsize/2),
                                        (y * this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.UP:
                                    decision = new Phaser.Point(x * this.gridsize + (this.gridsize/2),
                                        ((y-1)*this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.DOWN:
                                    decision = new Phaser.Point(x * this.gridsize + (this.gridsize/2),
                                        ((y+1)*this.gridsize) + (this.gridsize / 2));
                                    break;
                                default:
                                    break;
                            }
                            var dist = this.ghostDestination.distance(decision);
                            if (dist < distanceToObj) {
                                bestDecision = direction;
                                distanceToObj = dist;
                            }
                        }

                        /* if (this.game.isSpecialTile({x: x, y: y}) && bestDecision === Phaser.UP) {
                            bestDecision = this.currentDir;
                        } */

                        // snap to grid exact position before turning
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;

                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(bestDecision);

                        this.turnTimer = this.game.time.time + this.TURNING_COOLDOWN;
                    }
                    if (this.hasReachedHome()) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.mode = this.AT_HOME;
                        this.game.gimeMeExitOrder(this);
                    }
                    break;
                    
                case this.CHASE:
                    this.ghostDestination = this.getGhostDestination();
                    if (this.turnTimer < this.game.time.time) {
                        var distanceToObj = 999999;
                        var direction, decision, bestDecision;
                        for (q=0; q<possibleExits.length; q++) {
                            direction = possibleExits[q];
                            switch (direction) {
                                case Phaser.LEFT:
                                    decision = new Phaser.Point((x-1)*this.gridsize + (this.gridsize/2), 
                                                                (y * this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.RIGHT:
                                    decision = new Phaser.Point((x+1)*this.gridsize + (this.gridsize/2), 
                                                                (y * this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.UP:
                                    decision = new Phaser.Point(x * this.gridsize + (this.gridsize/2), 
                                                                ((y-1)*this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.DOWN:
                                    decision = new Phaser.Point(x * this.gridsize + (this.gridsize/2), 
                                                                ((y+1)*this.gridsize) + (this.gridsize / 2));
                                    break;
                                default:
                                    break;
                            }
                            var dist = this.ghostDestination.distance(decision);
                            if (dist < distanceToObj) {
                                bestDecision = direction;
                                distanceToObj = dist;
                            }
                        }
                        
                        /* if (this.game.isSpecialTile({x: x, y: y}) && bestDecision === Phaser.UP) {
                            bestDecision = this.currentDir;
                        } */

                        // snap to grid exact position before turning
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;

                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(bestDecision);

                        this.turnTimer = this.game.time.time + this.TURNING_COOLDOWN;
                    }
                    break;
                    
                case this.AT_HOME:
                    if (x === 8 && this.currentDir !== Phaser.RIGHT) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(Phaser.RIGHT);
                    } else if (x === 10 && this.currentDir !== Phaser.LEFT) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(Phaser.LEFT);
                    } else if (x === 9 && this.currentDir === Phaser.DOWN) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(Phaser.DOWN);
                    } else if (x === 9 && this.currentDir === Phaser.UP) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(Phaser.RIGHT);
                    } else {
                        this.lastDirection = this.currentDir;
                        this.move(this.currentDir);
                    }
                    break;
                    
                case this.EXIT_HOME:
                    if (x === 8 && this.currentDir !== Phaser.LEFT) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(Phaser.LEFT);
                    } else if (x === 10 && this.currentDir !== Phaser.RIGHT) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(Phaser.RIGHT);
                    } else if (x === 9 && this.currentDir !== Phaser.UP) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(Phaser.UP);
                    } else if (x === 6 && y === 10 || x === 12 && y === 10 || x === 9 && y === 8) {
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;
                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.mode = this.game.getCurrentMode();
                        return;
                    } 
                    break;
                    
                case this.SCATTER:
                    this.ghostDestination = this.scatterDestination;
                    if (this.turnTimer < this.game.time.time) {
                        var distanceToObj = 999999;
                        var direction, decision, bestDecision;
                        for (q=0; q<possibleExits.length; q++) {
                            direction = possibleExits[q];
                            switch (direction) {
                                case Phaser.LEFT:
                                    decision = new Phaser.Point((x-1)*this.gridsize + (this.gridsize/2),
                                        (y * this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.RIGHT:
                                    decision = new Phaser.Point((x+1)*this.gridsize + (this.gridsize/2),
                                        (y * this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.UP:
                                    decision = new Phaser.Point(x * this.gridsize + (this.gridsize/2),
                                        ((y-1)*this.gridsize) + (this.gridsize / 2));
                                    break;
                                case Phaser.DOWN:
                                    decision = new Phaser.Point(x * this.gridsize + (this.gridsize/2),
                                        ((y+1)*this.gridsize) + (this.gridsize / 2));
                                    break;
                                default:
                                    break;
                            }
                            var dist = this.ghostDestination.distance(decision);
                            if (dist < distanceToObj) {
                                bestDecision = direction;
                                distanceToObj = dist;
                            }
                        }

                        /* if (this.game.isSpecialTile({x: x, y: y}) && bestDecision === Phaser.UP) {
                            bestDecision = this.currentDir;
                        } */

                        // snap to grid exact position before turning
                        this.ghost.x = this.turnPoint.x;
                        this.ghost.y = this.turnPoint.y;

                        this.ghost.body.reset(this.turnPoint.x, this.turnPoint.y);
                        this.lastDirection = this.currentDir;
                        this.move(bestDecision);

                        this.turnTimer = this.game.time.time + this.TURNING_COOLDOWN;
                    }
                    break;
                    
                case this.STOP:
                    this.lastDirection = this.currentDir;
                    this.move(Phaser.NONE);
                    break;
            }
        }
    },
    
    attack: function() {
        if (!this.game.pacman.isDead && !this.game.gameWin && this.mode !== this.RETURNING_HOME) {
            //this.ghost.animations.play(this.currentDir);
            if (this.mode !== this.AT_HOME && this.mode !== this.EXIT_HOME) {
                this.mode = this.CHASE;
            }
        }
    },
    
    checkSafetile: function(tileIndex) {
        for (var q=0; q<this.safetiles.length; q++) {
            if (this.safetiles[q] === tileIndex) {
                return true;
            }
        }
        return false;
    },
    
    enterFrightenedMode: function() {
        if (this.mode !== this.AT_HOME && this.mode !== this.EXIT_HOME && this.mode !== this.RETURNING_HOME) {
            //this.ghost.play("frightened");
            this.mode = this.RANDOM;
        }
    },
    
    getGhostDestination: function() {
        switch (this.name) {
            case "blinky":
                return this.game.pacman.getPosition();
                
            case "pinky":
                var dest = this.game.pacman.getPosition();
                var dir = this.game.pacman.getCurrentDirection();
                var offsetX = 0, offsetY = 0;
                if (dir === Phaser.LEFT || dir === Phaser.RIGHT) {
                    offsetX = (dir === Phaser.RIGHT) ? -4 : 4;
                }
                if (dir === Phaser.UP || dir === Phaser.DOWN) {
                    offsetY = (dir === Phaser.DOWN) ? -4 : 4;
                }
                offsetX *= this.gridsize;
                offsetY *= this.gridsize;
                dest.x -= offsetX;
                dest.y -= offsetY;
                if (dest.x < this.gridsize/2) dest.x = this.gridsize/2;
                if (dest.x > this.game.map.widthInPixels - this.gridsize/2) dest.x = this.game.map.widthInPixels - this.gridsize/2;
                if (dest.y < this.gridsize/2) dest.y = this.gridsize/2;
                if (dest.y > this.game.map.heightInPixels - this.gridsize/2) dest.y = this.game.map.heightInPixels - this.gridsize/2;
                return dest;
                
            case "inky":
                var pacmanPos = this.game.pacman.getPosition();
                var blinkyPos = this.game.blinky.getPosition();
                var diff = Phaser.Point.subtract(pacmanPos, blinkyPos);
                var dest = Phaser.Point.add(pacmanPos, diff);
                if (dest.x < this.gridsize/2) dest.x = this.gridsize/2;
                if (dest.x > this.game.map.widthInPixels - this.gridsize/2) dest.x = this.game.map.widthInPixels - this.gridsize/2;
                if (dest.y < this.gridsize/2) dest.y = this.gridsize/2;
                if (dest.y > this.game.map.heightInPixels - this.gridsize/2) dest.y = this.game.map.heightInPixels - this.gridsize/2;
                return dest;
                
            case "clyde":
                var pacmanPos = this.game.pacman.getPosition();
                var clydePos = this.getPosition();
                if (clydePos.distance(pacmanPos) > 8 * this.gridsize) {
                    return pacmanPos;
                } else {
                    return new Phaser.Point(this.scatterDestination.x, this.scatterDestination.y);
                }
                
            default:
                return new Phaser.Point(this.scatterDestination.x, this.scatterDestination.y);
        }
    },
    
    getPosition: function() {
        var x = this.game.math.snapToFloor(Math.floor(this.ghost.x), this.gridsize) / this.gridsize;
        var y = this.game.math.snapToFloor(Math.floor(this.ghost.y), this.gridsize) / this.gridsize;
        return new Phaser.Point((x * this.gridsize) + (this.gridsize / 2), (y * this.gridsize) + (this.gridsize / 2));
    },
    
    hasReachedHome: function() {
        if (this.ghost.x < 8*this.gridsize || this.ghost.x > 11*this.gridsize ||
            this.ghost.y < 10*this.gridsize || this.ghost.y > 11*this.gridsize) {
            return false;
        }
        return true;
    },
    
    move: function(dir) {
        this.currentDir = dir;
        
        var speed;
        if (this.mode === this.SCATTER) {
            speed = this.ghostScatterSpeed;
        } else if (this.mode === this.RANDOM) {
            speed = this.ghostFrightenedSpeed;
        } else if (this.mode === this.RETURNING_HOME) {
            speed = this.cruiseElroySpeed;
            // this.ghost.animations.play(dir+20);
        } else {
            speed = this.ghostSpeed;
            // this.ghost.animations.play(dir);
            if (this.name === "blinky" && this.game.numDots < 3) {
                speed = this.cruiseElroySpeed;
                // this.mode = this.CHASE;
            }
        }
        
        if (this.currentDir === Phaser.NONE) {
            this.ghost.body.velocity.x = this.ghost.body.velocity.y = 0;
            return;
        }

        if (dir === Phaser.LEFT || dir === Phaser.UP) speed = -speed;
        if (dir === Phaser.LEFT && !this.game.isPaused) {
            this.ghost.animations.play("left");
        } else if (dir === Phaser.RIGHT && !this.game.isPaused) {
            this.ghost.animations.play("right");
        } else if (dir === Phaser.UP && !this.game.isPaused && this.lastDirection === Phaser.LEFT) {
            this.ghost.animations.play("left");
        } else if (dir === Phaser.UP && !this.game.isPaused && this.lastDirection === Phaser.RIGHT) {
            this.ghost.animations.play("right");
        } else if (dir === Phaser.DOWN && !this.game.isPaused && this.lastDirection === Phaser.LEFT) {
            this.ghost.animations.play("left");
        } else if (dir === Phaser.DOWN && !this.game.isPaused && this.lastDirection === Phaser.RIGHT) {
            this.ghost.animations.play("right");
        } else if (dir === Phaser.LEFT && this.mode === this.RANDOM) {
            this.ghost.animations.play("frightened left");
        } else if (dir === Phaser.RIGHT && this.mode === this.RANDOM) {
            this.ghost.animations.play("frightened right");
        } else if (dir === Phaser.UP && this.mode === this.RANDOM && this.lastDirection === Phaser.LEFT) {
            this.ghost.animations.play("frightened left");
        } else if (dir === Phaser.UP && this.mode === this.RANDOM && this.lastDirection === Phaser.RIGHT) {
            this.ghost.animations.play("frightened right");
        } else if (dir === Phaser.DOWN && this.mode === this.RANDOM && this.lastDirection === Phaser.LEFT) {
            this.ghost.animations.play("frightened left");
        } else if (dir === Phaser.DOWN && this.mode === this.RANDOM && this.lastDirection === Phaser.RIGHT) {
            this.ghost.animations.play("frightened right");
        }
        if (dir === Phaser.LEFT || dir === Phaser.RIGHT) {
            this.ghost.body.velocity.x = speed;
        } else {
            this.ghost.body.velocity.y = speed;
        }
    },
    
    scatter: function() {
        if (!this.game.pacman.isDead && !this.game.gameWin && this.mode !== this.RETURNING_HOME) {
            // this.ghost.animations.play(this.currentDir);
            if (this.mode !== this.AT_HOME && this.mode !== this.EXIT_HOME) {
                this.mode = this.SCATTER;
            }
        }
    },

    respawn: function() {
        this.ghost.x = this.startPos.x * this.gridsize + this.gridsize/2;
        this.ghost.y = this.startPos.y * this.gridsize + this.gridsize/2;
        this.ghost.body.reset(this.startPos.x * this.gridsize + this.gridsize/2, this.startPos.y * this.gridsize + this.gridsize/2);
        this.currentDir = this.startDir;
        if (this.name === "blinky") this.mode = this.SCATTER;
        else {
            this.mode = this.AT_HOME;
            this.game.gimeMeExitOrder(this);
        }
    },

    restart: function() {
        this.ghost.x = this.startPos.x * this.gridsize + this.gridsize/2;
        this.ghost.y = this.startPos.y * this.gridsize + this.gridsize/2;
        this.ghost.body.reset(this.startPos.x * this.gridsize + this.gridsize/2, this.startPos.y * this.gridsize + this.gridsize/2);
        this.currentDir = this.startDir;
        if (this.name === "blinky") this.mode = this.SCATTER;
        else this.mode = this.AT_HOME;
    }
};

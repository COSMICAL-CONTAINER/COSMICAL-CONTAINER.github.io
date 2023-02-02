//// branch
function Branch(startX, startY, angle, length, generation) {
    this.startX = startX;
    this.startY = startY;
    this.angle = angle;
    this.length = length;
    this.generation = generation;
    this.maxX = this.startX + Math.sin(this.angle) * this.length;
    this.maxY = this.startY + -Math.cos(this.angle) * this.length;

    this.width = Math.max(8 - generation * 0.9, 0.5);
    this.color = "black";
    this.waitFrames = 0;

    this.resetGrowthTo(0);

    this.graphics = new createjs.Graphics();
    this.view = new createjs.Shape(this.graphics);
}

Branch.prototype.resetGrowthTo = function(percentage) {
    this.growPercentage = percentage;
    this.growRate = randomRange(0.02, 0.12);
    this.isFullyGrown = false;
    this.hasSpawnedChildren = false;
    this.children = [];
}

Branch.prototype.chopAtPoint = function(x, y) {
    var px = (x - this.startX) / (this.maxX - this.startX);
    var py = (y - this.startY) / (this.maxY - this.startY);

    this.resetGrowthTo(isNaN(px) ? py : px);
    this.waitFrames = 20;
    this.grow();
}

Branch.prototype.update = function() {
    if (this.isFullyGrown === false) {
        if (this.waitFrames > 0) {
            this.waitFrames--;
        } else {
            this.growPercentage += this.growRate;

            if (this.growPercentage >= 1) {
                this.growPercentage = 1;
                this.isFullyGrown = true;
            }

            this.grow();
        }
    }
}

Branch.prototype.grow = function() {
    this.currentLength = this.length * this.growPercentage;
    this.endX = this.startX + Math.sin(this.angle) * this.currentLength;
    this.endY = this.startY + -Math.cos(this.angle) * this.currentLength;

    this.graphics.clear();
    this.graphics.setStrokeStyle(this.width, 1);
    this.graphics.beginStroke(this.color);
    this.graphics.moveTo(this.startX, this.startY);
    this.graphics.lineTo(this.endX, this.endY);
    this.graphics.endStroke();
}

//// chop line
function ChopLine() {
    this.graphics = new createjs.Graphics();
    this.view = new createjs.Shape(this.graphics);

    this.width = 2;
    this.color = "red";
}

ChopLine.prototype.setStartPoint = function(x, y) {
    this.startX = x;
    this.startY = y;
}

ChopLine.prototype.setEndPoint = function(x, y) {
    this.endX = x;
    this.endY = y;
}

ChopLine.prototype.setActive = function(active) {
    this.active = active;
}

ChopLine.prototype.update = function() {
    this.graphics.clear();

    if (this.active === true) {
        this.graphics.setStrokeStyle(this.width);
        this.graphics.beginStroke(this.color);
        this.graphics.moveTo(this.startX, this.startY);
        this.graphics.lineTo(this.endX, this.endY);
        this.graphics.endStroke();
    }
}

//// bird
function Bird(x, y, length, angle, width) {
    this.view = new createjs.Container();
    this.view.x = x;
    this.view.y = y;
    // this.view.rotation = -angle * 180 / Math.PI;

    this.leftWingGraphics = new createjs.Graphics();
    this.leftWingGraphics.setStrokeStyle(width);
    this.leftWingGraphics.beginStroke("black");
    this.leftWingGraphics.moveTo(0, 0);
    this.leftWingGraphics.lineTo(-length * 0.5, 0);
    this.leftWingGraphics.endStroke();
    this.leftWing = new createjs.Shape(this.leftWingGraphics);
    this.view.addChild(this.leftWing);

    this.rightWingGraphics = new createjs.Graphics();
    this.rightWingGraphics.setStrokeStyle(width);
    this.rightWingGraphics.beginStroke("black");
    this.rightWingGraphics.moveTo(0, 0);
    this.rightWingGraphics.lineTo(length * 0.5, 0);
    this.rightWingGraphics.endStroke();
    this.rightWing = new createjs.Shape(this.rightWingGraphics);
    this.view.addChild(this.rightWing);

    this.startFlightAnimation();
}

Bird.prototype.startFlightAnimation = function() {
    var flapDuration = 200;
    var leftWing = this.leftWing;
    var rightWing = this.rightWing;
    var view = this.view;

    leftWing.rotation = -30;
    createjs.Tween.get(leftWing, {
        loop: true
    }).to({
        rotation: 30
    }, flapDuration).to({
        rotation: -30
    }, flapDuration);

    this.rightWing.rotation = 30;
    createjs.Tween.get(rightWing, {
        loop: true
    }).to({
        rotation: -30
    }, flapDuration).to({
        rotation: 30
    }, flapDuration);

    createjs.Tween.get(view).to({
        x: randomRange(0, 800),
        y: -100,
        alpha: 0
    }, randomRange(1000, 3000), createjs.Ease.quadIn).call(tweenComplete);

    function tweenComplete() {
        createjs.Tween.removeTweens(leftWing);
        createjs.Tween.removeTweens(rightWing);

        view.parent.removeChild(view);
    }
}

// main
const FRAME_RATE = 30;
const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 600;
const TREE_START_SIZE = 130;
const MAX_GENERATION = 9;
const DEGENERATION = 0.8;
const H_SPREAD = Math.PI / 2.5;

var _stage = null;

var _tree = [];
var _chopLine = null;

var _mouseDown = false;

function init() {
    createStage();

    //start the tree by creating a branch from the bottom center of the stage (canvas)
    createBranch(STAGE_WIDTH / 2, STAGE_HEIGHT, 0, TREE_START_SIZE, 0)
    createChopLine();

    start();
};

function createStage() {
    _stage = new createjs.Stage(document.getElementById("canvas"));
    createjs.Ticker.setFPS(FRAME_RATE);
};

function createBranch(startX, startY, angle, length, generation) {
    var branch = new Branch(startX, startY, angle, length, generation);

    _stage.addChild(branch.view);
    _tree.push(branch);

    return branch;
};

function createChopLine() {
    _chopLine = new ChopLine();
    _stage.addChild(_chopLine.view);
};

function start() {
    createjs.Ticker.addEventListener("tick", update);

    // does not work?
    // _stage.addEventListener("mousedown", mouseDownHandler);
    // _stage.addEventListener("mousemove", mouseMoveHandler);
    // _stage.addEventListener("mouseup", mouseUpHandler);
    // depricated (0.6.1), removed (0.7.0)
    _stage.onMouseMove = mouseMoveHandler;
    _stage.onMouseDown = mouseDownHandler;
    _stage.onMouseUp = mouseUpHandler;
};

function mouseDownHandler(event) {
    _mouseDown = true;
    console.log(_stage.children.length);

    _chopLine.setStartPoint(event.stageX, event.stageY);
    _stage.setChildIndex(_chopLine.view, _stage.children.length - 1);
};

function mouseMoveHandler(event) {
    if (_mouseDown) {
        _chopLine.setActive(true);
        _chopLine.setEndPoint(event.stageX, event.stageY);
    }
};

function mouseUpHandler(event) {
    _mouseDown = false;

    _chopLine.setEndPoint(event.stageX, event.stageY);
    _chopLine.setActive(false);

    chop();
};

function chop() {
    var branch = null;
    var intersection = null;

    for (var i = 0; i < _tree.length; i++) {
        branch = _tree[i];
        intersection = checkLineIntersection(_chopLine.startX, _chopLine.startY, _chopLine.endX, _chopLine.endY, branch.startX, branch.startY, branch.endX, branch.endY);

        if (intersection.onLine1 && intersection.onLine2) {
            birdifyChildren(branch, 0);

            branch.chopAtPoint(intersection.x, intersection.y);
        }
    }
};

function birdifyChildren(branch, delay) {
    for (var i = 0; i < branch.children.length; i++) {
        var child = branch.children[i];
        var f = birdifyBranch.bind(child);

        setTimeout(f, randomRange(150, 300) * delay);

        removeBranchFromTree(child);
        birdifyChildren(child, delay + 1);
    }
};

function birdifyBranch() {
    var midX = this.startX + (this.endX - this.startX) * 0.5;
    var midY = this.startY + (this.endY - this.startY) * 0.5;
    var bird = new Bird(midX, midY, this.currentLength, this.angle, this.width);

    _stage.addChild(bird.view);
    _stage.removeChild(this.view);
}

function removeBranchFromTree(branch) {
    var index = _tree.indexOf(branch);

    if (index !== -1) {
        _tree.splice(index, 1);
    }
};


function update(event) {
    if (!event.paused) {
        var branch = null;

        for (var i = 0; i < _tree.length; i++) {
            branch = _tree[i];
            branch.update();

            if (branch.isFullyGrown === true && branch.hasSpawnedChildren === false) {
                spawnBranches(branch);
            }
        }

        _chopLine.update();

        _stage.update();
    }
};

function spawnBranches(fromBranch) {
    var generation = fromBranch.generation + 1;

    if (generation < MAX_GENERATION) {
        var length = fromBranch.length * DEGENERATION;
        var startX = fromBranch.endX;
        var startY = fromBranch.endY;
        var leftAngle = randomRange(0.3, H_SPREAD);
        var rightAngle = randomRange(-H_SPREAD, -0.3);

        fromBranch.children.push(createBranch(startX, startY, leftAngle, length, generation));
        fromBranch.children.push(createBranch(startX, startY, rightAngle, length, generation));
    }

    fromBranch.hasSpawnedChildren = true;
};

///////////
// UTILS //
///////////

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
};

//from http://jsfiddle.net/justin_c_rounds/Gd2S2/
function checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
    /*
           // it is worth noting that this should be the same as:
           x = line2StartX + (b * (line2EndX - line2StartX));
           y = line2StartX + (b * (line2EndY - line2StartY));
           */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};

init();
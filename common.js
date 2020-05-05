//=========================================================================
    // minimalist DOM helpers
    //=========================================================================

    var Dom = {

        get:  function(id)                     { return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id); },
        set:  function(id, html)               { Dom.get(id).innerHTML = html;                        },
        on:   function(ele, type, fn, capture) { Dom.get(ele).addEventListener(type, fn, capture);    },
        un:   function(ele, type, fn, capture) { Dom.get(ele).removeEventListener(type, fn, capture); },
        show: function(ele, type)              { Dom.get(ele).style.display = (type || 'block');      },
        blur: function(ev)                     { ev.target.blur();                                    },

        addClassName:    function(ele, name)     { Dom.toggleClassName(ele, name, true);  },
        removeClassName: function(ele, name)     { Dom.toggleClassName(ele, name, false); },
        toggleClassName: function(ele, name, on) {
            ele = Dom.get(ele);
            var classes = ele.className.split(' ');
            var n = classes.indexOf(name);
            on = (typeof on == 'undefined') ? (n < 0) : on;
            if (on && (n < 0))
                classes.push(name);
            else if (!on && (n >= 0))
                classes.splice(n, 1);
            ele.className = classes.join(' ');
        },

        storage: window.localStorage || {}

    };

    //=========================================================================
    // general purpose helpers (mostly math)
    //=========================================================================

    var Util = {

        timestamp:        function()                  { return new Date().getTime();                                    },
        toInt:            function(obj, def)          { if (obj !== null) { var x = parseInt(obj, 10); if (!isNaN(x)) return x; } return Util.toInt(def, 0); },
        toFloat:          function(obj, def)          { if (obj !== null) { var x = parseFloat(obj);   if (!isNaN(x)) return x; } return Util.toFloat(def, 0.0); },
        limit:            function(value, min, max)   { return Math.max(min, Math.min(value, max));                     },
        randomInt:        function(min, max)          { return Math.round(Util.interpolate(min, max, Math.random()));   },
        randomChoice:     function(options)           { return options[Util.randomInt(0, options.length-1)];            },
        percentRemaining: function(n, total)          { return (n%total)/total;                                         },
        accelerate:       function(v, accel, dt)      { return v + (accel * dt);                                        },
        interpolate:      function(a,b,percent)       { return a + (b-a)*percent;                                       },
        easeIn:           function(a,b,percent)       { return a + (b-a)*Math.pow(percent,2);                           },
        easeOut:          function(a,b,percent)       { return a + (b-a)*(1-Math.pow(1-percent,2));                     },
        easeInOut:        function(a,b,percent)       { return a + (b-a)*((-Math.cos(percent*Math.PI)/2) + 0.5);        },
        exponentialFog:   function(distance, density) { return 1 / (Math.pow(Math.E, (distance * distance * density))); },
        lerp:             function (start, end, amt)  { return (1-amt)*start+amt*end;                                   },

        increase:  function(start, increment, max) { // with looping
            var result = start + increment;
            while (result >= max)
                result -= max;
            while (result < 0)
                result += max;
            return result;
        },

        project: function(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
            p.camera.x     = (p.world.x || 0) - cameraX;
            p.camera.y     = (p.world.y || 0) - cameraY;
            p.camera.z     = (p.world.z || 0) - cameraZ;
            p.screen.scale = cameraDepth/p.camera.z;
            p.screen.x     = Math.round((width/2)  + (p.screen.scale * p.camera.x  * width/2));
            p.screen.y     = Math.round((height/2) - (p.screen.scale * p.camera.y  * height/2));
            p.screen.w     = Math.round(             (p.screen.scale * roadWidth   * width/2));
        },

        overlap: function(x1, w1, x2, w2, percent) {
            var half = (percent || 1)/2;
            var min1 = x1 - (w1*half);
            var max1 = x1 + (w1*half);
            var min2 = x2 - (w2*half);
            var max2 = x2 + (w2*half);
            return ! ((max1 < min2) || (min1 > max2));
        }

    };

    //=========================================================================
    // POLYFILL for requestAnimationFrame
    //=========================================================================

    if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
        window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        };
    }

    //=========================================================================
    // GAME LOOP helpers
    //=========================================================================

    var Game = {  // a modified version of the game loop from my previous boulderdash game - see http://codeincomplete.com/posts/2011/10/25/javascript_boulderdash/#gameloop

        run: function(options) {

            Game.loadImages(options.images, function(images) {

                options.ready(images); // tell caller to initialize itself because images are loaded and we're ready to rumble


                var canvas = options.canvas,    // canvas render target is provided by caller
                    update = options.update,    // method to update game logic is provided by caller
                    render = options.render,    // method to render the game is provided by caller
                    step   = options.step,      // fixed frame step (1/fps) is specified by caller
                    now    = null,
                    last   = Util.timestamp(),
                    dt     = 0,
                    gdt    = 0;

                function frame() {
                    now = Util.timestamp();
                    dt  = Math.min(1, (now - last) / 1000); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
                    gdt = gdt + dt;
                    while (gdt > step) {
                        gdt = gdt - step;
                        update(step);
                    }
                    render();
                    last = now;
                    requestAnimationFrame(frame, canvas);
                }
                frame(); // lets get this party started
                Game.playMusic();
            });
        },

        //---------------------------------------------------------------------------

        loadImages: function(names, callback) { // load multiple images and callback when ALL images have loaded
            var result = [];
            var count  = names.length;

            var onload = function() {
                if (--count === 0)
                    callback(result);
            };

            for(var n = 0 ; n < names.length ; n++) {
                var name = names[n];
                result[n] = document.createElement('img');
                Dom.on(result[n], 'load', onload);
                result[n].src = "https://github.com/MiniAlfa/torn-racinvisuals/blob/master/images/" + name + ".png";
            }
        },

        //---------------------------------------------------------------------------


        playMusic: function() {
            var music = Dom.get('music');
            music.loop = true;
            music.volume = 0.05; // shhhh! annoying music!
            music.muted = (Dom.storage.muted === "true");
            music.play();
            Dom.toggleClassName('mute', 'on', music.muted);
            Dom.on('mute', 'click', function() {
                Dom.storage.muted = music.muted = !music.muted;
                Dom.toggleClassName('mute', 'on', music.muted);
            });
        }

    };

    //=========================================================================
    // canvas rendering helpers
    //=========================================================================

    var Render = {

        polygon: function(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();
            ctx.fill();
        },

        //---------------------------------------------------------------------------

        segment: function(ctx, width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {

            var r1 = Render.rumbleWidth(w1, lanes),
                r2 = Render.rumbleWidth(w2, lanes),
                l1 = Render.laneMarkerWidth(w1, lanes),
                l2 = Render.laneMarkerWidth(w2, lanes),
                lanew1, lanew2, lanex1, lanex2, lane;

            ctx.fillStyle = color.grass;
            ctx.fillRect(0, y2, width, y1 - y2);

            Render.polygon(ctx, x1-w1-r1, y1, x1-w1, y1, x2-w2, y2, x2-w2-r2, y2, color.rumble);
            Render.polygon(ctx, x1+w1+r1, y1, x1+w1, y1, x2+w2, y2, x2+w2+r2, y2, color.rumble);
            Render.polygon(ctx, x1-w1,    y1, x1+w1, y1, x2+w2, y2, x2-w2,    y2, color.road);

            if (color.lane) {
                lanew1 = w1*2/lanes;
                lanew2 = w2*2/lanes;
                lanex1 = x1 - w1 + lanew1;
                lanex2 = x2 - w2 + lanew2;
                for(lane = 1 ; lane < lanes ; lanex1 += lanew1, lanex2 += lanew2, lane++)
                    Render.polygon(ctx, lanex1 - l1/2, y1, lanex1 + l1/2, y1, lanex2 + l2/2, y2, lanex2 - l2/2, y2, color.lane);
            }

            Render.fog(ctx, 0, y1, width, y2-y1, fog);
        },

        //---------------------------------------------------------------------------

        background: function(ctx, background, width, height, layer, rotation, offset) {

            rotation = rotation || 0;
            offset   = offset   || 0;

            var imageW = layer.w/2;
            var imageH = layer.h;

            var sourceX = layer.x + Math.floor(layer.w * rotation);
            var sourceY = layer.y;
            var sourceW = Math.min(imageW, layer.x+layer.w-sourceX);
            var sourceH = imageH;

            var destX = 0;
            var destY = offset;
            var destW = Math.floor(width * (sourceW/imageW));
            var destH = height;

            try {ctx.drawImage(background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);}
            catch(e){}
            if (sourceW < imageW) ctx.drawImage(background, layer.x, sourceY, imageW-sourceW, sourceH, destW-1, destY, width-destW, destH);
        },

        //---------------------------------------------------------------------------

        sprite: function(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, offsetX, offsetY, clipY) {

            //  scale for projection AND relative to roadWidth (for tweakUI)
            var destW  = (sprite.w * scale * width/2) * (SPRITES.SCALE * roadWidth);
            var destH  = (sprite.h * scale * width/2) * (SPRITES.SCALE * roadWidth);

            destX = destX + (destW * (offsetX || 0));
            destY = destY + (destH * (offsetY || 0));

            var clipH = clipY ? Math.max(0, destY+destH-clipY) : 0;
            if (clipH < destH)
                ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h*clipH/destH), destX, destY, destW, destH - clipH);

        },

        //---------------------------------------------------------------------------

        player: function(ctx, width, height, resolution, roadWidth, sprites, speedPercent, scale, destX, destY, steer, updown) {

            var bounce = (1.5 * Math.random() * speedPercent * resolution) * Util.randomChoice([-1,1]);
            var sprite;
            if (steer < 0)
                sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_LEFT : SPRITES.PLAYER_LEFT;
            else if (steer > 0)
                sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_RIGHT : SPRITES.PLAYER_RIGHT;
            else
                sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_STRAIGHT : SPRITES.PLAYER_STRAIGHT;

            Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY + bounce, -0.5, -1);
        },

        //---------------------------------------------------------------------------

        fog: function(ctx, x, y, width, height, fog) {
            if (fog < 1) {
                ctx.globalAlpha = (1-fog);
                ctx.fillStyle = COLORS.FOG;
                ctx.fillRect(x, y, width, height);
                ctx.globalAlpha = 1;
            }
        },

        rumbleWidth:     function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(6,  2*lanes); },
        laneMarkerWidth: function(projectedRoadWidth, lanes) { return projectedRoadWidth/Math.max(32, 8*lanes); }

    };

    //=============================================================================
    // RACING GAME CONSTANTS
    //=============================================================================


    var COLORS = {
        SKY:  '#72D7EE',
        TREE: '#005108',
        FOG:  '#a1a1a1',
        LIGHT:  { road: '#636363', grass: '#10AA10', rumble: 'white', lane: '#CCCCCC'  },
        DARK:   { road: '#454545', grass: '#009A00', rumble: 'red'                   },
        START:  { road: 'white',   grass: '#10AA10',   rumble: 'white'                     },
        FINISH: { road: 'white',   grass: '#009A00',   rumble: 'red'                     }
    };

    var BACKGROUND = {
        "HILLS":{"x":0,"y":0,"w":1280,"h":480}
        ,"SKY":{"x":0,"y":480,"w":1280,"h":480}
        ,"TREES":{"x":0,"y":960,"w":1280,"h":480}
    };

    var SPRITES ={
        "BILLBOARD01": {
            "x": 5,
            "y": 5,
            "w": 300,
            "h": 170
        },
        "BILLBOARD02": {
            "x": 315,
            "y": 5,
            "w": 215,
            "h": 220
        },
        "BILLBOARD03": {
            "x": 540,
            "y": 5,
            "w": 230,
            "h": 220
        },
        "BILLBOARD04": {
            "x": 780,
            "y": 5,
            "w": 268,
            "h": 170
        },
        "BILLBOARD05": {
            "x": 1058,
            "y": 5,
            "w": 298,
            "h": 190
        },
        "BILLBOARD06": {
            "x": 5,
            "y": 205,
            "w": 298,
            "h": 190
        },
        "BILLBOARD07": {
            "x": 780,
            "y": 205,
            "w": 298,
            "h": 190
        },
        "BILLBOARD08": {
            "x": 5,
            "y": 405,
            "w": 385,
            "h": 265
        },
        "BILLBOARD09": {
            "x": 400,
            "y": 405,
            "w": 328,
            "h": 282
        },
        "BOULDER1": {
            "x": 1088,
            "y": 205,
            "w": 168,
            "h": 248
        },
        "BOULDER2": {
            "x": 738,
            "y": 405,
            "w": 298,
            "h": 140
        },
        "BOULDER3": {
            "x": 1046,
            "y": 463,
            "w": 320,
            "h": 220
        },
        "BUSH1": {
            "x": 5,
            "y": 693,
            "w": 240,
            "h": 155
        },
        "BUSH2": {
            "x": 738,
            "y": 693,
            "w": 232,
            "h": 152
        },
        "CACTUS": {
            "x": 980,
            "y": 693,
            "w": 235,
            "h": 118
        },
        "CAR01": {
            "x": 1266,
            "y": 205,
            "w": 80,
            "h": 56
        },
        "CAR02": {
            "x": 313,
            "y": 271,
            "w": 80,
            "h": 59
        },
        "CAR03": {
            "x": 403,
            "y": 271,
            "w": 88,
            "h": 55
        },
        "CAR04": {
            "x": 501,
            "y": 271,
            "w": 80,
            "h": 57
        },
        "COLUMN": {
            "x": 255,
            "y": 821,
            "w": 200,
            "h": 315
        },
        "DEAD_TREE1": {
            "x": 1225,
            "y": 693,
            "w": 135,
            "h": 332
        },
        "DEAD_TREE2": {
            "x": 5,
            "y": 1035,
            "w": 150,
            "h": 260
        },
        "DRIFT_SMOKE_LEFT": {
            "x": 591,
            "y": 271,
            "w": 113,
            "h": 69
        },
        "DRIFT_SMOKE_RIGHT": {
            "x": 1266,
            "y": 271,
            "w": 113,
            "h": 69
        },
        "IMAGEEDIT_3_2160032201": {
            "x": 465,
            "y": 855,
            "w": 510,
            "h": 510
        },
        "PALM_TREE": {
            "x": 985,
            "y": 821,
            "w": 215,
            "h": 540
        },
        "PLAYER_LEFT": {
            "x": 1366,
            "y": 5,
            "w": 192,
            "h": 108
        },
        "PLAYER_RIGHT": {
            "x": 1366,
            "y": 123,
            "w": 192,
            "h": 108
        },
        "PLAYER_STRAIGHT": {
            "x": 1389,
            "y": 241,
            "w": 192,
            "h": 108
        },
        "PLAYER_UPHILL_LEFT": {
            "x": 1376,
            "y": 359,
            "w": 192,
            "h": 108
        },
        "PLAYER_UPHILL_RIGHT": {
            "x": 1376,
            "y": 477,
            "w": 192,
            "h": 108
        },
        "PLAYER_UPHILL_STRAIGHT": {
            "x": 1376,
            "y": 595,
            "w": 192,
            "h": 108
        },
        "SEMI": {
            "x": 1370,
            "y": 713,
            "w": 122,
            "h": 144
        },
        "STUMP": {
            "x": 5,
            "y": 867,
            "w": 195,
            "h": 140
        },
        "TREE1": {
            "x": 1210,
            "y": 1035,
            "w": 360,
            "h": 360
        },
        "TREE2": {
            "x": 1591,
            "y": 5,
            "w": 282,
            "h": 295
        },
        "TRUCK": {
            "x": 1591,
            "y": 310,
            "w": 100,
            "h": 78
        }
    };

    SPRITES.SCALE = 0.3 * (1/SPRITES.PLAYER_STRAIGHT.w) ;// the reference sprite width should be 1/3rd the (half-)roadWidth

    SPRITES.BILLBOARDS = [SPRITES.BILLBOARD01, SPRITES.BILLBOARD02, SPRITES.BILLBOARD03, SPRITES.BILLBOARD04, SPRITES.BILLBOARD05, SPRITES.BILLBOARD06, SPRITES.BILLBOARD07, SPRITES.BILLBOARD08, SPRITES.BILLBOARD09];
    SPRITES.PLANTS     = [SPRITES.TREE1, SPRITES.TREE2, SPRITES.DEAD_TREE1, SPRITES.DEAD_TREE2, SPRITES.PALM_TREE, SPRITES.BUSH1, SPRITES.BUSH2, SPRITES.CACTUS, SPRITES.STUMP, SPRITES.BOULDER1, SPRITES.BOULDER2, SPRITES.BOULDER3];
    SPRITES.CARS       = [SPRITES.CAR01, SPRITES.CAR02, SPRITES.CAR03, SPRITES.CAR04, SPRITES.SEMI, SPRITES.TRUCK];

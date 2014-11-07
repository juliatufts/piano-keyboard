;(function(){

	var Game = function(canvasId) {
		var canvas = document.getElementById(canvasId);
		var screen = canvas.getContext('2d');
		var audioCtx = new AudioContext();
		
		this.gameSize = { x : canvas.width, y : canvas.height};
		this.keyboarder = new Keyboarder();
		this.player = new Player(174.614, 20); // F3 (a) to C5 (enter)

		// piano
		var piano = new Image(2880, 2100);
		this.piano = new Sprite({
			width: 960,
			height: 300,
			image: piano,
		});
		piano.src = "Images/KeyboardSpriteSheet.png";

		var self = this;
		var tick = function() {
			self.update(audioCtx);
			self.draw(screen);	
			requestAnimationFrame(tick);
		};
		tick();
	};

	Game.prototype = {
		update : function(audioCtx) {

			// filter keysDown to be only those that map to notes
			this.keyboarder.filter();

			// update piano keyboard sprite
			var frameIndices = this.keyboarder.keysDown.map(function(n) {
				var KEYS = {'65' : 0, // a
					 '87' : 1, // w
					 '83' : 2, // s
					 '69' : 3, // e
					 '68' : 4, // d
					 '82' : 5, // r
					 '70' : 6, // f
					 '71' : 7, // g
					 '89' : 8, // y
					 '72' : 9, // h
					 '85' : 10, // u
					 '74' : 11, // j
					 '75' : 12, // k
					 '79' : 13, // o
					 '76' : 14, // l
					 '80' : 15, // p
					 '186' : 16, // ;
					 '219' : 17, // [
					 '222' : 18, // '
					 '13' : 19  // enter
					  };
				return KEYS[n] + 1;
			});
			this.piano.update(frameIndices);

			// when a key has just been pressed
			if (this.keyboarder.newKeyDown) {
				for (var i = 0; i < this.keyboarder.keysDown.length; i++) {
					var key = this.keyboarder.keysDown[i]
					var index = this.keyboarder.KEYS[key]

					// start the appropriate oscillators, only if they are not already playing
					if (this.player.oscillators[index] == null) {
						this.player.start(audioCtx, index);
					}
				}
			}

			// when a key has just been lifted
			if (this.keyboarder.newKeyUp) {
				var keyDiffs = this.keyboarder.ALLKEYS.diff(this.keyboarder.keysDown);

				// turn off appropriate oscialltors only if they're already playing
				for (var i = 0; i < keyDiffs.length; i++) {
					var index = this.keyboarder.KEYS[keyDiffs[i]];
					if (this.player.oscillators[index] != null) {
						this.player.stop(index);
					}
				}
			}

			// to ensure that newKeyDown is true only once when a new key is pressed
			this.keyboarder.newKeyDown = false;
			this.keyboarder.newKeyUp = false;
		},

		draw : function(screen) {
			this.piano.draw(screen);
		}
	};

	// creates and returns a sprite object
	var Sprite = function(options) {
		this.frames = [0];	// holds the frame indices to draw

		this.width = options.width;
		this.height = options.height;
		this.image = options.image;
		this.frameIndex = 0;
	};

	Sprite.prototype = {
		draw : function(screen) {

			// draw the background keys
			screen.drawImage(
				this.image,
				0,
				0,
				this.width,
				this.height,
				0,
				0,
				this.width,
				this.height);

			// draw the keys currently pressed
			for (var i = 0; i < this.frames.length; i++){
				screen.drawImage(
				this.image,
				this.frames[i] * this.width,
				0,
				this.width,
				this.height,
				0,
				0,
				this.width,
				this.height);
			}
		},

		update : function(frameIndices) {
			this.frames = frameIndices;
		}
	};

	var Keyboarder = function() {
		this.ALLKEYS = [65, 87, 83, 69, 68, 82, 70, 71, 89, 72, 85, 74, 75, 79, 76, 80, 186, 219, 222, 13];
		this.KEYS = {'65' : 0, // a
					 '87' : 1, // w
					 '83' : 2, // s
					 '69' : 3, // e
					 '68' : 4, // d
					 '82' : 5, // r
					 '70' : 6, // f
					 '71' : 7, // g
					 '89' : 8, // y
					 '72' : 9, // h
					 '85' : 10, // u
					 '74' : 11, // j
					 '75' : 12, // k
					 '79' : 13, // o
					 '76' : 14, // l
					 '80' : 15, // p
					 '186' : 16, // ;
					 '219' : 17, // [
					 '222' : 18, // '
					 '13' : 19  // enter
					  };

		// the list of all keys currently being held down
		this.keysDown = [];
		this.newKeyDown = false;
		this.newKeyUp = false;

		// event listeners for keyboard input
		document.addEventListener('keydown', this.keyDown.bind(this));
		document.addEventListener('keyup', this.keyUp.bind(this));
	};

	Keyboarder.prototype = {
		keyDown : function(event) {
			if (this.keysDown.indexOf(event.keyCode) === -1) {
				this.keysDown.push(event.keyCode);
				this.newKeyDown = true;
			}
		},

		keyUp : function(event) {
			var index = this.keysDown.indexOf(event.keyCode);
			if (index > -1) {
				this.keysDown.splice(index, 1);
				this.newKeyUp = true;
			}
		},

		filter : function() {
			var isInArray = function(array) {
				return function(e) {
					return array.indexOf(e) > -1;
				};
			};

			var isInAllKeys = isInArray(this.ALLKEYS);

			this.keysDown = this.keysDown.filter(isInAllKeys);
		}
	};	

	var Player = function(startingPitch, numNotes) {
		this.frequencies = [];
		for (var i = 0; i < numNotes; i++){
			this.frequencies.push(startingPitch * Math.pow(2, i/12));
		}

		this.oscillators = [];
		for (var i = 0; i < this.oscillators.length; i++) {
			this.oscillators.push(null);
		}
	};

	Player.prototype = {
		newOscillator : function(audioCtx, frequency) {
			var oscillator = audioCtx.createOscillator();
			oscillator.frequency.value = frequency;
			oscillator.connect(audioCtx.destination);
			return oscillator;
		},

		start : function(audioCtx, index) {
			this.oscillators[index] = this.newOscillator(audioCtx, this.frequencies[index]);
			this.oscillators[index].start(0);
		},

		stop : function(index) {
			this.oscillators[index].stop();
			this.oscillators[index] = null;
		},
	};

	window.onload = function() {
		// we will use the difference of two arrays
		Array.prototype.diff = function(a) {
    		return this.filter(function(i) {return a.indexOf(i) < 0;});
		};

		new Game("canvas");
	};

})();
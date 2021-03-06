/**
 *  Example: Genetic music
 */

var synth;
var sloop;

var validNotes = [...Array(128).keys()];
var validTokens = validNotes.concat([-1]);
var minValidNote, maxValidNote;
var songLength = 32; // 4 bars * 8th-note resolution

var maxPopulationSize = 70;
var numberOfSurvivors = 20;
var population = [];
var generationCount = 1;

var songIsPlaying = false;
var clickedEarwormIndex;
var notePlaybackIndex;
// Fitness rules
var desiredKeyClasses = [0,2,4,5,7,9,11];
var minGoodPitch = 60;
var maxGoodPitch = 84;

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  colorMode(HSB, 255);
  textAlign(CENTER, CENTER);
  textSize(16);
  frameRate(10);

  sloop = new p5.SoundLoop(soundLoop, 0.3); // Loop plays every 0.3s
  synth = new p5.PolySynth();

  minValidNote = min(validNotes);
  maxValidNote = max(validNotes);
  for (var i=0; i<maxPopulationSize; i++) {
    var song = new Earworm(i);
    song.initialize();
    population.push(song);
  }

  selectionButton = createButton("Select 10 fittest");
  selectionButton.mouseClicked(selectFittest);
  selectionButton.position(10, 10);
  reproductionButton = createButton("Reproduce");
  reproductionButton.mouseClicked(reproducePopulation);
  reproductionButton.position(10, 40);
  fastForwardButton = createButton("Fast-forward 10 generations");
  fastForwardButton.mouseClicked(fastForward);
  fastForwardButton.position(10, 70);
  resetButton = createButton("Reset population");
  resetButton.mouseClicked(resetPopulation);
  resetButton.position(10, 100);
}

function soundLoop(cycleStartTime) {
  var duration = this.interval;
  var velocity = 0.7;
  var midiNote = population[clickedEarwormIndex].notes[notePlaybackIndex];
  var noteFreq = midiToFreq(midiNote);
  synth.play(noteFreq, velocity, cycleStartTime, duration);
  // Move forward the index, and stop if we've reached the end
  notePlaybackIndex++;
  if (notePlaybackIndex >= population[clickedEarwormIndex].notes.length) {
    this.stop(cycleStartTime);
    songIsPlaying = false;
  }
}

function draw() {
  background(30);
  for (var i=0; i<population.length; i++) {
    population[i].display();
  }
  fill(255);
  if (songIsPlaying) {
    text("Song playing... Click to stop.", width/2, height/2);
  } else {
    text("Click on an Earworm to hear it sing!", width/2, height/2);
  }
  text("Generation: " + generationCount, width/2, height/6);
}

function mousePressed() {
  if (songIsPlaying) {
    // Stop a song
    sloop.stop();
    songIsPlaying = false;
  } else {
    // Start a song
    for (var i=0; i<population.length; i++) {
      var clickToEarwormDistance = dist(mouseX, mouseY, population[i].xpos, population[i].ypos);
      if (clickToEarwormDistance < population[i].radius) {
        clickedEarwormIndex = i;
        notePlaybackIndex = 0;
        songIsPlaying = true;
        console.log(population[clickedEarwormIndex].notes);
        sloop.start();
      }
    }  
  }
}

function selectFittest() {
  // Sort in descending order of fitness
  population.sort((a, b) => b.fitnessScore - a.fitnessScore);
  // Keep only the N fittest
  population = subset(population, 0, numberOfSurvivors);
  // Re-assign ID numbers
  for (var i=0; i<population.length; i++) {
    population[i].id = i;
  }
}

function reproducePopulation() {
  var newPopulation = [];
  while (newPopulation.length < maxPopulationSize - numberOfSurvivors) {
    var parentA = random(population);
    var parentB = random(population);
    var child = parentA.reproduceWith(parentB);
    newPopulation.push(child);
  }
  // Add new generation to the survivors
  population = population.concat(newPopulation);
  // Re-assign ID numbers
  for (var i=0; i<population.length; i++) {
    population[i].id = i;
  }
  generationCount++;
}

function fastForward() {
  var fastForwardNum = 10;
  for (var i=0; i<fastForwardNum; i++) {
    selectFittest();
    reproducePopulation();
  }
}

function resetPopulation() {
  generationCount = 1;
  for (var i=0; i<maxPopulationSize; i++) {
    var song = new Earworm(i);
    song.initialize();
    population[i] = song;
  }
}

function Earworm(indexNumber) {
  this.id = indexNumber;
  this.length = songLength;
  this.notes = [];
  this.fitnessScore = 0;
  // Visual properties
  this.xpos = random(width);
  this.ypos = random(height);
  this.radius = (width + height) / 50;
}
Earworm.prototype.initialize = function() {
  this.notes = [];
  for (var i=0; i<this.length; i++) {
    var token = random(validTokens);
    if (random(1) > 0.2) {
      this.notes.push(random(validNotes));
    } else {
      this.notes.push(-1);
    }
  }
  this.calculateFitness();
};
Earworm.prototype.calculateFitness = function() {
  this.fitnessScore = 0;
  // Key
  for (var i=0; i<this.notes.length; i++) {
    var keyClass = this.notes[i] % 12;
    if (desiredKeyClasses.indexOf(keyClass) >= 0) {
      this.fitnessScore = this.fitnessScore + 10;
    }
  }
  // Prefer smaller intervals
  for (var i=0; i<this.notes.length-1; i++) {
    var currentNote = this.notes[i];
    var nextNote = this.notes[i+1];
    var interval = abs(nextNote - currentNote);
    this.fitnessScore = this.fitnessScore - interval;

    // Consonant / dissonant intervals
    // https://www.howmusicreallyworks.com/Pages_Chapter_4/4_2.html#4.2.6
    var consonantIntervals = [3,4,5,7,8,9];
    var dissonantIntervals = [1,2,6,10,11];
    if (consonantIntervals.indexOf(interval)) {
      this.fitnessScore = this.fitnessScore + 10;
    } else if (dissonantIntervals.indexOf(interval)) {
      this.fitnessScore = this.fitnessScore - 10;
    }
  }
  // Pitch range
  for (var i=0; i<this.notes.length; i++) {
    if (this.notes[i] > minGoodPitch) {
      this.fitnessScore = this.fitnessScore + 5;
    }
    if (this.notes[i] < maxGoodPitch) {
      this.fitnessScore = this.fitnessScore + 5;
    }
  }
  // Good ratio of empty and non-empty notes
  var empty = 0;
  var targetEmptyRatio = 0.5;
  for (var i=0; i<this.notes.length; i++) {
    if (this.notes[i] === -1) {
      empty++;
    }
  }
  var emptyRatio = empty / (this.notes.length - empty);
  this.fitnessScore = this.fitnessScore - (targetEmptyRatio - emptyRatio)*100;
};
Earworm.prototype.reproduceWith = function(partner) {
  var partitionIndex = round(random(this.notes.length));
  var partA = subset(this.notes, 0, partitionIndex);
  var partB = subset(partner.notes, partitionIndex, partner.notes.length);
  var child = new Earworm(0);
  child.notes = partA.concat(partB);
  child.mutate(); // Add some random variation
  child.calculateFitness();
  return child;
};
Earworm.prototype.mutate = function() {
  for (var i=0; i<this.notes.length; i++) {
    if (random(100) > 80) {
      // this.notes[i] = random(validTokens);
      if (random(1) > 0.2) {
        this.notes[i] = random(validNotes);
      } else {
        this.notes[i] = -1;
      }
    }
  }
};
Earworm.prototype.display = function() {
  this.xpos = constrain(this.xpos + random(-1, 1), 0, width);
  this.ypos = constrain(this.ypos + random(-1, 1), 0, height);

  push();
  strokeWeight(1);
  angleMode(DEGREES); // Change the mode to DEGREES
  var angle = 360 / this.notes.length;
  translate(this.xpos, this.ypos);
  for (var i=0; i<this.notes.length; i++) {
    rotate(angle);
    if (this.notes[i] === -1) {
      continue;
    }
    var pitchClass = this.notes[i] % 12;
    var color = map(pitchClass, 0, 12, 280, 120) % 255;
    var length = map(this.notes[i], minValidNote, maxValidNote, this.radius/2, this.radius);
    strokeWeight(1);
    stroke(color, 180, 250);
    if (songIsPlaying) {
      if (this.id == clickedEarwormIndex) {
        stroke(color, 180, 250);
        if (i == notePlaybackIndex) {
          strokeWeight(2);
          length = this.radius;
        } else {
          strokeWeight(1);
        }
      } else {
        stroke(color, 100, 100);
      }
    }
    line(0, 0, length, 0);
  }
  pop();
};
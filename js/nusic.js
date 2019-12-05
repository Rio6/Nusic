// Load midi
window.onload = () => {
    MIDI.loadPlugin({
        instrument: ['acoustic_grand_piano'],
        soundfontUrl: 'http://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
        onsuccess: () => {
            $('#loading').remove();
        }
    });
}

// scales and chords
var scales = {
    Ionian: [0, 2, 4, 5, 7, 9, 11],
    Dorian: [0, 2, 3, 5, 7, 9, 10],
    Phrygia: [0, 1, 3, 5, 7, 8, 10],
    Lydian: [0, 2, 4, 6, 7, 9, 11],
    Mixolydian: [0, 2, 4, 5, 7, 9, 10],
    Aeolian: [0, 2, 3, 5, 7, 8, 10],
    Locrian: [0, 1, 3, 5, 6, 8, 10],
    Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

var chords = {
    Single: [0],
    Triad: [0, 2, 4],
    Seventh: [0, 2, 4, 6],
};

// Variables
var tracks = [];
var tempo = 60;
var repeat = false;
var playerInterval = 0;

var addTrack = () => {
    let id = tracks.length;
    let trackDiv = $('#tracks').append(`
        <div class='track' id=track-${id}>
            <input type='text' class='notes' placeholder='notes' />
            <select class='scale'>
                ${Object.keys(scales).map(note => '<option>'+note+'</option>').join('')}
            </select>
            <select class='root'>
                ${Object.keys(MIDI.keyToNote).map(note => '<option>'+note+'</option>').join('')}
            </select>
            <select class='chord'>
                ${Object.keys(chords).map(note => '<option>'+note+'</option>').join('')}
            </select>
            Beats <input class='beats' type='number' value=1 min=0 placeholder='beats' />
            Offset <input class='offset' type='number' value=0 min=0 placeholder='offset' />
            Duration <input class='duration' type='number' value=1 min=0 placeholder='duration' />
            Velocity <input class='velocity' type='number' value=80 min=0 max=100 placeholder='velocity' />
            Repeat <input class='repeat' type='checkbox' />
            <button onclick='removeTrack(${id})'>Remove</button>
        </div>
    `);

    trackDiv.on('change', 'select, input', () => updateTrack(id));
    trackDiv.find("option:contains('C4')").prop('selected', true);

    tracks.push({
        id: id,
        notes: [],
        scale: "Ionian",
        root: "C4",
        chord: "Single",
        beats: 1,
        offset: 0,
        duration: 1,
        velocity: 1,
        repeat: false,
    });
};

var removeTrack = (id) => {
    $('#track-'+id).remove();
    tracks[id] = null;
};

var updateTrack = (id, track) => {
    let trackDiv = $(`#track-${id}`);
    let getValue = sel => trackDiv.children(sel).first().val();
    tracks[id] = {
        id: id,
        notes: getValue('.notes'),
        scale: getValue('.scale'),
        root: getValue('.root'),
        chord: getValue('.chord'),
        beats: +getValue('.beats'),
        offset: +getValue('.offset'),
        duration: +getValue('.duration'),
        velocity: +getValue('.velocity'),
        repeat: trackDiv.children('.repeat').first().is(':checked'),
    };
};

var wrapNumber = (num, max) => {
    let rst = num % max;
    if(rst < 0)
        return max + rst;
    return rst;
};

var getNote = (root, scaleName, note) => {
    let rootKey = MIDI.keyToNote[root];
    let scale = scales[scaleName];
    if(rootKey && scale) {
        let shift = Math.floor((note-1) / scale.length);
        return rootKey + scale[wrapNumber(note-1, scale.length)] + shift * 12;
    }
};

var toNumber = char => {
    if(!char)
        return 0;
    if(isNaN(char))
        return char.charCodeAt();
    return +char;
};

var updateOptions = () => {
    tempo = +$('#tempo').val() || 60;
    repeat = $('#repeat').is(':checked');
};

var play = () => {
    stop();
    updateOptions();

    let i = 0;
    let lastTime = 0;

    playerInterval = setInterval(() => {
        if(Date.now() - lastTime > 1000 * 60 / tempo) {
            let playing = tracks
                .filter(t => t && t.notes)
                .some(t => !t.repeat && (i - t.offset) / t.beats < t.notes.length);

            if(playing) {
                for(let track of tracks) {
                    if(!track || !track.notes) continue;
                    let k = (i - track.offset) / track.beats; // The index of note to play
                    if(track.repeat) k %= track.notes.length; // Wrap around if track is repeating
                    if(k < track.notes.length) {
                        if(k >= 0 && (k === 0 || k % 1 === 0)) { // Make sure it's a positive integer
                            for(let chord of chords[track.chord]) {
                                let num = toNumber(track.notes[k]) + chord;
                                let note = getNote(track.root, track.scale, num);
                                MIDI.noteOn(0, note, track.velocity, 0);
                                MIDI.noteOff(0, note, track.duration * 1000 * 60 / tempo);
                            }
                        }
                    }
                }
            } else {
                if(repeat)
                    i = 0;
                else
                    clearInterval(playerInterval);
            }

            lastTime = Date.now();
            i++;
        }
    }, 1);
};

var stop = () => {
    clearInterval(playerInterval);
};

// scales and chords
var scales = {
    Ionian: [0, 2, 4, 5, 7, 9, 11],
    Dorian: [0, 2, 3, 5, 7, 9, 10],
    Phrygian: [0, 1, 3, 5, 7, 8, 10],
    Lydian: [0, 2, 4, 6, 7, 9, 11],
    Mixolydian: [0, 2, 4, 5, 7, 9, 10],
    Aeolian: [0, 2, 3, 5, 7, 8, 10],
    Locrian: [0, 1, 3, 5, 6, 8, 10],
    "Pentatonic": [0, 2, 4, 7, 9],
    "Minor Pentatonic": [0, 3, 5, 7, 10],
    Hexatonic: [0, 3, 5, 6, 7, 10],
    Heptatonic: [0, 2, 3, 5, 6, 9, 10],
    Nonatonic: [0, 2, 3, 4, 5, 7, 9, 10, 11],
    Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

var chords = {
    Single: [0],
    Triad: [0, 2, 4],
    Seventh: [0, 2, 4, 6],
    Second: [0, 1, 4],
    Third: [0, 2, 7],
    Forth: [0, 3, 4],
    Fifth: [0, 4, 7],
    Sixth: [0, 2, 5],
};

// Variables
var tracks = [];
var tempo = 60;
var decimals = 100;
var playerInterval = 0;

window.onload = () => {
    // Load midi
    MIDI.loadPlugin({
        instrument: ['acoustic_grand_piano'],
        soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
        onsuccess: () => {
            $('#loading').remove();
        }
    });

    // Load elements
    let tracks = [];
    try {
        tracks = JSON.parse(localStorage.getItem('tracks')) || [];
    } catch(e) {
        conole.error("Invalid expression");
    }

    for(let track of tracks) {
        addTrack(track);
    }

    tempo = localStorage['tempo'];
    decimals = localStorage['decimals'];

    if(tempo !== null) $('#tempo').val(+tempo);
    if(decimals !== null) $('#decimals').val(+decimals);
}

window.onbeforeunload = () => {
    updateOptions();
    tracks.forEach(t => t.notes = null);
    localStorage['tracks'] = JSON.stringify(tracks.filter(t => t));
    localStorage['tempo'] = tempo;
    localStorage['decimals'] = decimals;
}

var addTrack = (track) => {
    if(!track) {
        track = {
            id: tracks.length,
            notes: null,
            expression: "",
            scale: 'Ionian',
            root: 'C4',
            chord: 'Single',
            beats: '1',
            velocity: 80,
            repeat: false,
        };
    }
    let trackDiv = $(`
        <div class='track' id=track-${track.id}>
            <input type='text' class='expression' placeholder='expression' value='${track.expression}' />
            <select class='scale'>
                ${Object.keys(scales).map(note => `<option>${note}</option>`).join('')}
            </select>
            <select class='root'>
                ${Object.keys(MIDI.keyToNote).map(note => `<option>${note}</option>`).join('')}
            </select>
            <select class='chord'>
                ${Object.keys(chords).map(note => `<option>${note}</option>`).join('')}
            </select>
            Beats <input class='beats' type='number' min=0 placeholder='beats' value='${track.beats}' />
            Velocity <input class='velocity' type='number' min=0 max=100 placeholder='velocity' value='${track.velocity}' />
            Repeat/Digits <input class='repeat' type='checkbox' />
            <button onclick='removeTrack(${track.id})'>Remove</button>
        </div>
    `).appendTo('#tracks');

    trackDiv.on('change', 'select, input', () => updateTrack(track.id));

    // Setup default selections
    trackDiv.find(`.scale option:contains('${track.scale}')`).prop('selected', true);
    trackDiv.find(`.root option:contains('${track.root}')`).prop('selected', true);
    trackDiv.find(`.chord option:contains('${track.chord}')`).prop('selected', true);
    if(track.repeat)
        trackDiv.find('.repeat').prop('checked', true);

    tracks.push(track);
};

var removeTrack = (id) => {
    $('#track-'+id).remove();
    tracks = tracks.filter(({id: tid}) => tid != id);
};

var updateTrack = (id, track) => {
    let trackDiv = $(`#track-${id}`);
    let getValue = sel => trackDiv.children(sel).first().val();
    tracks[id] = {
        id: id,
        notes: null,
        expression: getValue('.expression'),
        scale: getValue('.scale'),
        root: getValue('.root'),
        chord: getValue('.chord'),
        beats: getValue('.beats'),
        velocity: +getValue('.velocity'),
        repeat: trackDiv.children('.repeat').first().is(':checked'),
    };

    updateNotes(id);
}

var updateNotes = (id) => {
    try {
        let notes = null;
        let exp = nerdamer(tracks[id].expression);
        let constant = exp.evaluate();
        if(constant.isNumber()) { // If expression is non changing, evaluate them and turn them into notes
            notes = constant.text('decimals', decimals);
        } else if(tracks[id].repeat) { // Or if the track is repeating, evaluate the first notes
            let variable = exp.evaluate({x: 0});
            if(variable.isNumber()) {
                notes = variable.text('decimals', decimals);
            }
        }
        if(notes)
            tracks[id].notes = notes.replace('.', '').split('');
    } catch(e) {}
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
        return wrapNumber(rootKey + scale[wrapNumber(note-1, scale.length)] + shift * 12, 109);
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
    decimals = +$('#decimals').val() || 100;
    tracks.forEach(({id}) => updateNotes(id));
};

var evaluateNote = (expression, x, round) => {
    let exp = nerdamer(expression, {x: x}).evaluate();
    if(exp.isNumber()) {
        let n = exp.text('decimals', decimals);
        return round ? Math.round(n).toString() : n.replace('.', '');
    }
};

var play = () => {
    stop();
    updateOptions();

    let i = 0;
    let lastTime = 0;

    tracks.forEach((track, id) => {
        updateTrack(id);

        let count = 0;
        let evaCount = 0;

        tracks[id].player = setTimeout(function run() {
            let track = tracks[id]; // Make sure to use the same one as global
            let beat = +track.beats[count % track.beats.length];

            if(beat > 0) {

                let note = track.notes ? track.notes.shift() : evaluateNote(track.expression, i, true);
                if(typeof(note) !== 'undefined') {
                    for(let chord of chords[track.chord]) {

                        let num = toNumber(note) + chord;
                        let play = getNote(track.root, track.scale, num);
                        let duration = beat * 1000 * 60 / tempo;

                        MIDI.noteOn(0, play, track.velocity, 0);
                        MIDI.noteOff(0, duration);

                        track.player = setTimeout(run, duration);
                    }
                }

                if(track.notes && track.notes.length === 0) {
                    // Finished
                    if(track.repeat) {
                        let note = evaluateNote(track.expression, ++evaCount, false);
                        if(typeof(note) !== 'undefined')
                            track.notes.push(...note.split(''));
                    } else {
                        stopTrack(id);
                    }
                }

            } else {
                track.player = setTimeout(run, 1000 * 60 / tempo);
            }

            count++;
        });
    });
};

var stopTrack = id => {
    if(tracks[id].player) {
        clearInterval(tracks[id].player);
        tracks[id].player = null;
    }
}

var stop = () => {
    tracks.forEach(track => stopTrack(track.id));
};

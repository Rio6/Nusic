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
    Blues: [0, 3, 5, 6, 7, 10],
    "Whole Tone": [0, 2, 4, 6, 8, 10],
    Heptatonic: [0, 2, 3, 5, 6, 9, 10],
    Diminished: [0, 2, 3, 5, 6, 8, 9, 11],
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
    let soundfontUrl = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';

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

    // Load midi
    MIDI.loadPlugin({
        instrument: "acoustic_grand_piano",
        soundfontUrl: soundfontUrl,
        onsuccess: () => {
            if(tracks.length > 0) {
                // Load track instrument
                tracks.forEach(({instrument}, id) => loadInstrument(instrument, id));
            } else {
                $('#loading').hide();
            }
        },
        onerror: () => $('#error').show()
    });
}

window.onbeforeunload = () => {
    updateOptions();
    tracks.filter(t=>t).forEach(t => t.notes = null);
    localStorage['tracks'] = JSON.stringify(tracks.filter(t => t));
    localStorage['tempo'] = tempo;
    localStorage['decimals'] = decimals;
}

var loadInstrument = (name, ch) => {
    $('#error').hide(); // Reset error

    let instrument = MIDI.GM.byName[name];

    if(MIDI.Soundfont[instrument.id]) {
        // Already loaded
        MIDI.programChange(ch, instrument.number);
        $('#loading').hide();
    } else {
        $('#loading').show();
        MIDI.loadResource({
            instrument: name,
            onsuccess: () => {
                MIDI.programChange(ch, instrument.number);
                $('#loading').hide();
            },
            onerror: () => $('#error').show()
        });
    }
}

var addTrack = (track) => {
    if(!track) {
        let id = tracks.findIndex(t => !t);
        if(id < 0) id = tracks.length;

        track = {
            id: id,
            notes: null,
            expression: "",
            scale: 'Ionian',
            root: 'C4',
            chord: 'Single',
            beats: '4',
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
                ${Object.keys(chords).map(chord => `<option>${chord}</option>`).join('')}
            </select>
            <select class='instrument'>
                ${Object.keys(MIDI.GM.byName).map(instrument => `<option>${instrument}</option>`).join('')}
            </select>
            Beats <input class='beats' type='text' placeholder='beats' value='${track.beats}' />
            Velocity <input class='velocity' type='number' min=0 max=100 placeholder='velocity' value='${track.velocity}' />
            Repeat <input class='repeat' type='checkbox' />
            <button onclick='removeTrack(${track.id})'>Remove</button>
        </div>
    `).appendTo('#tracks');

    trackDiv.on('change', 'select, input', () => updateTrack(track.id));

    // Setup default selections
    trackDiv.find(`.scale option:contains('${track.scale}')`).prop('selected', true);
    trackDiv.find(`.root option:contains('${track.root}')`).prop('selected', true);
    trackDiv.find(`.chord option:contains('${track.chord}')`).prop('selected', true);
    trackDiv.find(`.instrument option:contains('${track.instrument}')`).prop('selected', true);
    if(track.repeat)
        trackDiv.find('.repeat').prop('checked', true);

    tracks[track.id] = track;
};

var removeTrack = (id) => {
    $('#track-'+id).remove();
    tracks[id] = null;
};

var updateTrack = (id) => {
    let trackDiv = $(`#track-${id}`);
    let getValue = sel => trackDiv.children(sel).first().val();
    tracks[id] = {
        id: id,
        notes: null,
        expression: getValue('.expression'),
        scale: getValue('.scale'),
        root: getValue('.root'),
        chord: getValue('.chord'),
        instrument: getValue('.instrument'),
        beats: getValue('.beats').split(','),
        velocity: +getValue('.velocity'),
        repeat: trackDiv.children('.repeat').first().is(':checked'),
    };

    loadInstrument(tracks[id].instrument, id);
    updateNotes(id);
}

var updateNotes = (id) => {
    let notes = evaluateNote(tracks[id].expression, null, false);
    if(notes) {
        tracks[id].notes = notes.replace('.', '').split('');
    } else if(tracks[id].repeat) {
        notes = evaluateNote(tracks[id].expression, 0, false);
        tracks[id].notes = notes.replace('.', '').split('');
    }
};

var updateOptions = () => {
    tempo = +$('#tempo').val() || 60;
    repeat = $('#repeat').is(':checked');
    decimals = +$('#decimals').val() || 10;
    tracks.filter(t=>t).forEach((_,id) => updateNotes(id));
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

var evaluateNote = (expression, x, round) => {
    if(!isNaN(expression)) { // Is a number already, don't need to calculate
        return round ? Math.round(expression).toString() : expression.replace('.', '');
    } else {
        let exp = nerdamer(expression, {x: x}).evaluate();
        if(exp.isNumber()) {
            let n = exp.text('decimals', decimals);
            return round ? Math.round(n).toString() : n.replace('.', '');
        }
    }
};

var play = () => {
    stop();
    updateOptions();

    let i = 0;
    let lastTime = 0;

    tracks.forEach((track, id) => {
        if(!track) return;

        updateTrack(id);

        let count = 0;
        let evaCount = 0;

        tracks[id].player = setTimeout(function run() {
            let track = tracks[id]; // Make sure to use the same one as global
            let beat = +track.beats[count % track.beats.length];

            if(beat > 0) {

                let note = track.notes ? track.notes.shift() : evaluateNote(track.expression, count, true);
                if(typeof(note) !== 'undefined') {

                    let duration = 1000 * 60 / tempo * 4 / beat;

                    for(let chord of chords[track.chord]) {

                        let num = toNumber(note) + chord;
                        let play = getNote(track.root, track.scale, num);

                        MIDI.noteOn(0, play, track.velocity, 0);
                        MIDI.noteOff(0, duration * .8);
                    }

                    track.player = setTimeout(run, duration);
                }

                if(track.notes && track.notes.length === 0) {
                    // Finished
                    if(track.repeat) {
                        let notes = evaluateNote(track.expression, ++evaCount, false);
                        if(typeof(notes) !== 'undefined')
                            track.notes.push(...notes.split(''));
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
    tracks.filter(t=>t).forEach((_,id) => stopTrack(id));
};

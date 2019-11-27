window.onload = () => {
    MIDI.loadPlugin({
        instrument: ['acoustic_grand_piano'],
        soundfontUrl: 'http://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
        onsuccess: () => console.log('midi loaded')
    });
}

sound = () => {
    let duration = 0.3;
    let keys = [51, 52, 54, 56, 57, 59, 61, 63, 64, 66];
    let notes = document.getElementById('notes-input').value;
    let i = 0;
    let intv = setInterval(() => {
        if(i % 4 == 0) {
            MIDI.chordOn(0, [keys[notes[i]], keys[notes[(i+2)%10]], keys[notes[(i+4)%10]]], 60, 0);
            MIDI.chordOff(0, [keys[notes[i]], keys[notes[(i+2)%10]], keys[notes[(i+4)%10]]], duration * 4);
        } else {
            MIDI.noteOn(0, keys[notes[i]], 100, 0);
            MIDI.noteOff(0, keys[notes[i]], duration);
        }
        i++;
        if(i >= notes.length) clearInterval(intv);
    }, 1000 * duration);
};

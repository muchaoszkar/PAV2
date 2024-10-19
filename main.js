// Konfiguráció és játék inicializálása
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',  // Fehér háttér
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,  // A játék igazodik a képernyő méretéhez
        autoCenter: Phaser.Scale.CENTER_BOTH  // Középre igazítja a játékot vízszintesen és függőlegesen
    }
};

const game = new Phaser.Game(config);


let topCards = [];
let bottomCard;
let score = 0;
let wrongScore = 0;
let keyPresses = 0;
let totalPlayTime = 0;
let keyPressTimestamps = [];
let avgText;  // Átlagos idő szövege
let gamePaused = false;  // Játék szüneteltetése funkció
let resetButton;  // Reset gomb
let matchProbability = 25;  // Alapértelmezett esély 25%, hogy az alsó kártya azonos legyen
let sliderText;  // Csúszka érték kijelző

const topCardNames = ['0129.png', '0130.png', '0131.png', '0132.png']; // Ász, Király, Dáma, Bubi
const allCardNames = []; // 0001.png-től 0132.png-ig

for (let i = 1; i <= 132; i++) {
    allCardNames.push(i.toString().padStart(4, '0') + '.png');
}

let timerText;
let timer;
let timerStarted = false;
let wrongScoreText;  // Hibák száma kijelzés

function preload() {
    console.log("Betöltés elkezdődött...");
    // Felső kártyák betöltése
    topCardNames.forEach(card => {
        this.load.image(card, 'assets/' + card);
        console.log('Felső kártya betöltve: ', card);
    });
    // Alsó kártyák betöltése
    allCardNames.forEach(card => {
        this.load.image(card, 'assets/' + card);
        console.log('Alsó kártya betöltve: ', card);
    });
}

function create() {
    console.log("Jelenet létrehozása elkezdődött...");
    
    // Felső négy kártya megjelenítése
    for (let i = 0; i < topCardNames.length; i++) {
        let card = this.add.image(200 + i * 150, 100, topCardNames[i]).setScale(0.5);  // A kártyák méretének csökkentése
        topCards.push(card);
        console.log('Felső kártya hozzáadva: ', topCardNames[i]);
    }

    // Alsó kártya megjelenítése
    bottomCard = this.add.image(400, 400, randomCard()).setScale(0.5);  // Az alsó kártya méretének csökkentése
    console.log("Alsó kártya hozzáadva: ", bottomCard.texture.key);

    // Billentyűzet figyelése
    this.input.keyboard.on('keydown', handleAnyKey, this);  // Bármelyik billentyűre induljon a visszaszámláló
    this.input.keyboard.on('keydown-L', handleKeyL, this);
    this.input.keyboard.on('keydown-A', handleKeyA, this);
    this.input.keyboard.on('keydown-SPACE', handleSpaceKey, this);  // SPACE-re szünet

    // Visszaszámláló szöveg hozzáadása a bal felső sarokba
    timerText = this.add.text(10, 10, '07:00', { fontSize: '16px', fill: '#000' });
    timer = 7 * 60;  // 7 perc (420 másodperc)

    // Hibaszámláló szöveg hozzáadása a jobb felső sarokba
    wrongScoreText = this.add.text(780, 10, '0', { fontSize: '32px', fill: '#000' });
    wrongScoreText.setOrigin(1, 0);  // A jobb felső sarokhoz igazítva (1 az X origó)

    // Átlagos idő szöveg hozzáadása a képernyő bal oldalán, a visszaszámláló alatt
    avgText = this.add.text(10, 50, 'AVG: 0.00', { fontSize: '16px', fill: '#000' });

    // RESET felirat középen (felére csökkentve)
    resetButton = this.add.text(400, 10, 'RESET', { fontSize: '16px', fill: '#000' });
    resetButton.setOrigin(0.5, 0);  // Középre igazítva
    resetButton.setInteractive();  // Klikkelhetővé tétele
    resetButton.on('pointerdown', resetGame);  // Reset funkció

    // Csúszka (bal alsó sarok) hajszálvékony vonalakkal
    let sliderBar = this.add.graphics();
    sliderBar.lineStyle(1, 0x000000, 1);  // Hajszálvékony fekete vonal
    sliderBar.strokeRect(10, 550, 150, 1);  // Vékony csúszka vonal

    let sliderHandle = this.add.graphics();
    sliderHandle.lineStyle(1, 0xff0000, 1);  // Hajszálvékony piros vonal a fogantyúhoz
    let handlePosition = matchProbability / 100 * 150;  // A fogantyú alapértelmezett pozíciója
    sliderHandle.strokeRect(10 + handlePosition, 540, 2, 20);  // Hajszálvékony piros fogantyú

    sliderText = this.add.text(170, 545, `Esély: ${matchProbability}%`, { fontSize: '16px', fill: '#000' });

    // Egér figyelése a csúszkán
    this.input.on('pointermove', function (pointer) {
        if (pointer.isDown && pointer.x >= 10 && pointer.x <= 160 && pointer.y >= 540 && pointer.y <= 580) {
            let newHandlePos = pointer.x - 10;
            matchProbability = Math.round((newHandlePos / 150) * 100);
            sliderHandle.clear();
            sliderHandle.lineStyle(1, 0xff0000, 1);  // Vékony piros vonal a fogantyúhoz
            sliderHandle.strokeRect(10 + newHandlePos, 540, 2, 20);  // A fogantyú új helyre kerül
            sliderText.setText(`Esély: ${matchProbability}%`);
        }
    });
}

function update() {
    if (!gamePaused && timerStarted) {
        updateTimer();
        totalPlayTime += 1 / 60;  // Játékidő növelése minden frame-ben (60 FPS)
        updateAvgTime();  // Átlagos idő frissítése
    }
}

function handleAnyKey() {
    if (!timerStarted) {
        timerStarted = true;  // A visszaszámlálás elindul
    }
    if (gamePaused) {
        resumeGame();  // Ha a játék szünetelt, folytatódik
    }
}

function handleKeyL() {
    keyPresses++;
    keyPressTimestamps.push(totalPlayTime);  // Menti az időbélyeget
    if (isCardMatching()) {
        score++;
        console.log('Helyes! Pontok: ' + score);
    } else {
        wrongScore++;
        console.log('Hibás! Hibapontok: ' + wrongScore);
        updateWrongScore();  // Frissítjük a hibaszámlálót
    }
    newBottomCard();
}

function handleKeyA() {
    keyPresses++;
    keyPressTimestamps.push(totalPlayTime);  // Menti az időbélyeget
    if (!isCardMatching()) {
        score++;
        console.log('Helyes! Pontok: ' + score);
    } else {
        wrongScore++;
        console.log('Hibás! Hibapontok: ' + wrongScore);
        updateWrongScore();  // Frissítjük a hibaszámlálót
    }
    newBottomCard();
}

function handleSpaceKey() {
    gamePaused = !gamePaused;  // A játék szünetel vagy folytatódik
    console.log(gamePaused ? "Játék szüneteltetve" : "Játék folytatódik");
}

function updateAvgTime() {
    let averageTimeBetweenPresses = 0;
    if (keyPressTimestamps.length > 1) {
        for (let i = 1; i < keyPressTimestamps.length; i++) {
            averageTimeBetweenPresses += keyPressTimestamps[i] - keyPressTimestamps[i - 1];
        }
        averageTimeBetweenPresses /= (keyPressTimestamps.length - 1);  // Átlag kiszámítása
    }
    avgText.setText(`AVG: ${averageTimeBetweenPresses.toFixed(2)}`);  // Átlag megjelenítése
}

function updateTimer() {
    let minutes = Math.floor(timer / 60);
    let seconds = Math.floor(timer % 60);  // Csak perc és másodperc jelenjen meg

    // Formázás: ha a másodperc < 10, tegyünk elé egy nullát
    seconds = seconds < 10 ? '0' + seconds : seconds;

    // Frissítjük a visszaszámláló szöveget
    timerText.setText(`${minutes}:${seconds}`);

       // Minden másodpercben csökkentjük az időt, még akkor is, ha mínuszba megy
    timer -= 1 / 60;  // 60 FPS frissítési ciklus mellett számoljuk a másodperceket

    // Amikor az idő eléri a nullát, mínuszban is folytatódik
    if (timer < 0) {
        timerText.setFill('#ff0000');  // Pirosra vált a szöveg, ha mínuszba megy
    }
}

function resetGame() {
    // Visszaállít minden változót és elemet az eredeti állapotba
    score = 0;
    wrongScore = 0;
    keyPresses = 0;
    totalPlayTime = 0;
    keyPressTimestamps = [];
    timer = 7 * 60;  // Újraindítja a visszaszámlálót
    timerStarted = false;
    gamePaused = false;

    // Szövegek visszaállítása
    timerText.setText('07:00');
    wrongScoreText.setText('0');
    avgText.setText('AVG: 0.00');

    // Alsó kártya újra beállítása
    bottomCard.setTexture(randomCard());
    bottomCard.setVisible(true);

    console.log("A játék újraindult.");
}

function isCardMatching() {
    const bottomCardTexture = bottomCard.texture.key;
    return topCardNames.includes(bottomCardTexture);
}

function newBottomCard() {
    const newCard = randomCard();
    bottomCard.setTexture(newCard);
    bottomCard.setVisible(true);  // Biztosítja, hogy az új kártya látható legyen
    console.log("Új alsó kártya: ", newCard);
}

function randomCard() {
    const randomIndex = Phaser.Math.Between(0, 100);
    if (randomIndex < matchProbability) {
        // Olyan kártya, amelyik egyezik a felső kártyákkal
        const matchIndex = Phaser.Math.Between(0, topCardNames.length - 1);
        return topCardNames[matchIndex];
    } else {
        // Olyan kártya, amelyik nem egyezik
        let card;
        do {
            card = allCardNames[Phaser.Math.Between(0, allCardNames.length - 1)];
        } while (topCardNames.includes(card));  // Addig választunk, amíg nem találunk nem egyezőt
        return card;
    }
}

function updateWrongScore() {
    wrongScoreText.setText(wrongScore);  // Frissíti a hibaszámlálót a jobb felső sarokban
}

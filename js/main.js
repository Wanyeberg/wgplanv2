// js/main.js
import * as state from './state.js';
import * as galaxy from './galaxy.js';
import * as ui from './ui.js';

function setupStarfield() {
    const starfieldCanvas = document.getElementById('starfield-canvas');
    const sfCtx = starfieldCanvas.getContext('2d');
    let stars = [];
    const numStars = 500;

    function resizeStarfield() {
        const dpr = window.devicePixelRatio || 1;
        starfieldCanvas.width = window.innerWidth * dpr;
        starfieldCanvas.height = window.innerHeight * dpr;
        sfCtx.scale(dpr, dpr);
        stars = [];
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.1 + 0.05,
                opacity: Math.random() * 0.5 + 0.3
            });
        }
    }

    function animateStarfield() {
        sfCtx.clearRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);
        stars.forEach(star => {
            star.y += star.speed;
            if (star.y > window.innerHeight) {
                star.y = 0;
                star.x = Math.random() * window.innerWidth;
            }
            sfCtx.beginPath();
            sfCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            sfCtx.fillStyle = `rgba(230, 237, 243, ${star.opacity})`;
            sfCtx.fill();
        });
        requestAnimationFrame(animateStarfield);
    }

    window.addEventListener('resize', resizeStarfield);
    resizeStarfield();
    animateStarfield();
}


function startApp() {
    setupStarfield();
    state.resolveCssVariables(); 

    ui.initUI();
    galaxy.initGalaxy(); // Simulation wird initialisiert, aber noch ohne Daten

    // KORREKTUR: Die Reihenfolge ist jetzt entscheidend.
    // 1. Zuerst auf Kategorien lauschen. Wenn sie da sind, die Simulation füttern.
    state.listenToCategories(() => {
        galaxy.resolveAndRedraw(); 
        ui.updateCategorySuggestions();
        
        // 2. ERST JETZT auf die Sterne lauschen, da sie die Nebel-Positionen brauchen.
        state.listenToNodes(() => {
            galaxy.restartSimulation();
            ui.updateListViews();
        });
    });

    state.listenToArchived(() => {
        ui.updateListViews();
    });
    
    state.seedInitialData();

    console.log("WG-Galaxie mit Firebase Realtime Database verbunden!");
}

startApp();
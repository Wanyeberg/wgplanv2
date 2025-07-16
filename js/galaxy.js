// js/galaxy.js

import * as state from './state.js';
import { showDetailsPanel } from './ui.js';

let simulation;
let transform = d3.zoomIdentity;
let hoveredNode = null;
let comet = null;
let supernovas = [];

let activeCategory = null;
let categoryTitleAlpha = 0;
const NEBULA_ACTIVATION_RADIUS = 250;

let categoryPositions = {};
let positionAngle = -90; 
let positionRadius = 400;

const canvas = document.getElementById('galaxy-canvas');
const ctx = canvas.getContext('2d');

export function initGalaxy() {
    setupCanvas();
    setupSimulation();
    requestAnimationFrame(renderLoop);
}

export function resolveAndRedraw() {
    const rootStyle = getComputedStyle(document.documentElement);
    Object.values(state.categories).forEach(cat => {
        if (cat.colorVar.startsWith('var')) {
            const varName = cat.colorVar.match(/\((.*?)\)/)[1];
            cat.resolvedColor = rootStyle.getPropertyValue(varName).trim();
        } else {
            cat.resolvedColor = cat.colorVar;
        }
    });
}

export function restartSimulation() {
    if (simulation) {
        simulation.nodes(state.nodes).alpha(0.3).restart();
    }
}

export function triggerComet(newNode) {
    const addButton = document.getElementById('add-item-button');
    const btnRect = addButton.getBoundingClientRect();
    const target = getCategoryTarget(newNode.category);
    comet = {
        x: btnRect.left + btnRect.width / 2,
        y: btnRect.top + btnRect.height / 2,
        startX: btnRect.left + btnRect.width / 2,
        startY: btnRect.top + btnRect.height / 2,
        targetX: target.x,
        targetY: target.y,
        node: newNode,
        progress: 0
    };
}

export function triggerSupernova(x, y, categoryName) {
    const categoryData = Object.values(state.categories).find(c => c.name === categoryName);
    const color = categoryData ? categoryData.resolvedColor : 'rgba(255,255,255,0.5)';
    createSupernova(x, y, color);
}

function handleMouseMove(event) {
    const [x, y] = d3.pointer(event);
    const inverted = transform.invert([x, y]);
    
    hoveredNode = findNodeAt(inverted[0], inverted[1]);

    let closestCategory = null;
    let minDistance = NEBULA_ACTIVATION_RADIUS / transform.k;

    Object.keys(state.categories).forEach(catId => {
        const cat = state.categories[catId];
        const pos = getCategoryTarget(cat.name);
        const dist = Math.sqrt((inverted[0] - pos.x)**2 + (inverted[1] - pos.y)**2);
        if (dist < minDistance) {
            minDistance = dist;
            closestCategory = cat.name;
        }
    });
    activeCategory = closestCategory;
}

function handleCanvasClick(event) {
    const [x, y] = d3.pointer(event);
    const inverted = transform.invert([x, y]);
    const node = findNodeAt(inverted[0], inverted[1]);
    showDetailsPanel(node);
}

function handleResize() {
    categoryPositions = {};
    setupCanvas();
    if (simulation) {
        simulation
            .force('x', d3.forceX(d => getCategoryTarget(d.category).x).strength(0.05))
            .force('y', d3.forceY(d => getCategoryTarget(d.category).y).strength(0.05))
            .alpha(0.3).restart();
    }
}

function getCategoryTarget(categoryName) {
    if (!categoryPositions[categoryName]) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const predefinedPositions = {
            'Küche': { x: w * 0.3, y: h * 0.4 },
            'Bad': { x: w * 0.7, y: h * 0.4 },
            'Allgemein': { x: w * 0.5, y: h * 0.75 }
        };

        if (predefinedPositions[categoryName]) {
            categoryPositions[categoryName] = predefinedPositions[categoryName];
        } else {
            const angleRad = positionAngle * (Math.PI / 180);
            categoryPositions[categoryName] = {
                x: w / 2 + positionRadius * Math.cos(angleRad),
                y: h / 2 + positionRadius * Math.sin(angleRad)
            };
            positionAngle += 60;
        }
    }
    return categoryPositions[categoryName];
}

function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    if (simulation) {
        simulation.force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2));
        simulation.alpha(0.3).restart();
    }
}

function setupSimulation() {
    simulation = d3.forceSimulation(state.nodes)
        .force('charge', d3.forceManyBody().strength(-150))
        .force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2))
        .force('collision', d3.forceCollide().radius(d => d.assignedTo ? 35 : 30))
        .force('x', d3.forceX(d => getCategoryTarget(d.category).x).strength(0.05))
        .force('y', d3.forceY(d => getCategoryTarget(d.category).y).strength(0.05));

    const zoom = d3.zoom().scaleExtent([0.2, 5]).on('zoom', (event) => {
        transform = event.transform;
    });

    d3.select(canvas).call(zoom);
    
    // Event listener hier bündeln
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleCanvasClick);
}

function ticked() {
    const shoppingListView = document.getElementById('shopping-list-view');
    const archiveView = document.getElementById('archive-view');
    if (shoppingListView.classList.contains('visible') || archiveView.classList.contains('visible')) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    
    drawNebulas();
    drawConstellationLines();
    drawActiveCategoryTitle();
    state.nodes.forEach(drawNode);
    if (comet) drawComet();
    drawSupernovas();

    ctx.restore();
}

function findNodeAt(x, y) {
    let closest = null;
    let minDist = 50 / transform.k; 
    state.nodes.forEach(node => {
        const dist = Math.sqrt((node.x - x)**2 + (node.y - y)**2);
        if (dist < minDist) {
            minDist = dist;
            closest = node;
        }
    });
    return closest;
}

function drawConstellationLines() {
    if (!activeCategory) return;
    const categoryData = Object.values(state.categories).find(c => c.name === activeCategory);
    if (!categoryData) return;
    
    const center = getCategoryTarget(activeCategory);
    const color = categoryData.resolvedColor.replace('0.8', '0.3');

    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8 / transform.k;
    ctx.setLineDash([4 / transform.k, 8 / transform.k]);
    
    state.nodes.forEach(node => {
        if (node.category === activeCategory) {
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(node.x, node.y);
            ctx.stroke();
        }
    });
    ctx.setLineDash([]);
}

function drawNebulas() {
    Object.values(state.categories).forEach(cat => {
        const pos = getCategoryTarget(cat.name);
        const isActive = (cat.name === activeCategory);
        
        const activePulse = isActive ? Math.sin(Date.now() * 0.0005) * 10 : 0;
        const baseRadius = NEBULA_ACTIVATION_RADIUS + activePulse;

        for (let i = 0; i < 3; i++) {
            const offsetX = (i === 0) ? 0 : (Math.random() - 0.5) * 50;
            const offsetY = (i === 0) ? 0 : (Math.random() - 0.5) * 50;
            const radius = baseRadius * (Math.random() * 0.4 + 0.6);
            
            if (!cat.resolvedColor) return;
            const color = cat.resolvedColor.replace('0.8', isActive ? '0.1' : '0.05'); 
            const centerColor = cat.resolvedColor.replace('0.8', isActive ? '0.2' : '0.1');

            const gradient = ctx.createRadialGradient(pos.x + offsetX, pos.y + offsetY, radius * 0.2, pos.x + offsetX, pos.y + offsetY, radius);
            gradient.addColorStop(0, centerColor);
            gradient.addColorStop(0.7, color);
            gradient.addColorStop(1, 'rgba(13, 17, 23, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x + offsetX, pos.y + offsetY, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

function drawActiveCategoryTitle() {
    if (activeCategory && categoryTitleAlpha < 1) categoryTitleAlpha += 0.05;
    else if (!activeCategory && categoryTitleAlpha > 0) categoryTitleAlpha -= 0.05;
    categoryTitleAlpha = Math.max(0, Math.min(1, categoryTitleAlpha));

    if (categoryTitleAlpha > 0) {
        const categoryToDraw = activeCategory || (categoryTitleAlpha > 0.5 ? activeCategory : null);
        if(!categoryToDraw) return;
        
        const pos = getCategoryTarget(categoryToDraw);
        ctx.save();
        ctx.globalAlpha = categoryTitleAlpha;
        ctx.font = `bold ${36 / transform.k}px Poppins`;
        ctx.fillStyle = 'rgba(230, 237, 243, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 10;
        ctx.fillText(categoryToDraw, pos.x, pos.y);
        ctx.restore();
    }
}

function drawNode(node) {
    const isHovered = hoveredNode && hoveredNode.id === node.id;
    let baseRadius = 10;
    const flicker = Math.random() * 0.3 + 0.7;
    
    switch (node.priority) {
        case 'Urgent':
            baseRadius = 12 + Math.sin(Date.now() * 0.015) * 2;
            break;
        case 'Low':
            baseRadius = 7;
            break;
    }
    
    const radius = isHovered ? baseRadius * 1.5 : baseRadius;
    const categoryData = Object.values(state.categories).find(c => c.name === node.category);
    if (!categoryData || !categoryData.resolvedColor) return;
    const glowColor = categoryData.resolvedColor;
    
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isHovered ? 30 : 15;
    ctx.fillStyle = glowColor;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    ctx.restore();
    
    if (node.assignedTo) {
        ctx.beginPath();
        const ringPulse = node.priority === 'Urgent' ? Math.sin(Date.now() * 0.015) * 2 : 0;
        ctx.arc(node.x, node.y, radius + 8 + ringPulse, 0, 2 * Math.PI);
        ctx.strokeStyle = state.resolvedUserColors[node.assignedTo];
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    if (isHovered) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${14 / transform.k}px Poppins`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        ctx.fillText(node.name, node.x, node.y - radius - (15 / transform.k));
        ctx.shadowBlur = 0;
    }
}

function updateComet() {
    if (!comet) return;
    const easeOutQuad = t => t * (2 - t);
    
    comet.progress += 0.02;
    comet.progress = Math.min(comet.progress, 1);
    const easedProgress = easeOutQuad(comet.progress);
    
    comet.x = comet.startX + (comet.targetX - comet.startX) * easedProgress;
    comet.y = comet.startY + (comet.targetY - comet.startY) * easedProgress;

    if (comet.progress >= 1) { 
        state.addItem(comet.node);
        triggerSupernova(comet.targetX, comet.targetY, comet.node.category);
        comet = null;
    }
}

function drawComet() {
    if (!comet) return;
    const categoryData = Object.values(state.categories).find(c => c.name === comet.node.category);
    if (!categoryData || !categoryData.resolvedColor) return;
    
    const color = categoryData.resolvedColor;
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0;
    
    const angle = Math.atan2(comet.targetY - comet.y, comet.targetX - comet.x);
    const tailLength = 60 * (1 - comet.progress) + 10;
    
    ctx.beginPath();
    ctx.moveTo(comet.x, comet.y);
    ctx.lineTo(comet.x - Math.cos(angle - 0.2) * tailLength, comet.y - Math.sin(angle - 0.2) * tailLength);
    ctx.lineTo(comet.x - Math.cos(angle + 0.2) * tailLength, comet.y - Math.sin(angle + 0.2) * tailLength);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(comet.x, comet.y, comet.x - Math.cos(angle) * tailLength, comet.y - Math.sin(angle) * tailLength);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fill();
}

function createSupernova(x, y, color) {
    const particles = [];
    const colorMatch = color.match(/\d+/g);
    if (!colorMatch) return;
    const [r, g, b] = colorMatch;

    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particles.push({
            x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 1, life: 100, r, g, b
        });
    }
    supernovas.push({ particles, x, y, color, flash: 1 });
}

function drawSupernovas() {
    supernovas.forEach((nova, index) => {
        if (nova.flash > 0) {
            const colorMatch = nova.color.match(/\d+/g);
            if(colorMatch) {
                const [r, g, b] = colorMatch;
                ctx.beginPath();
                const gradient = ctx.createRadialGradient(nova.x, nova.y, 0, nova.x, nova.y, 100 * (1 - nova.flash));
                gradient.addColorStop(0, `rgba(255, 255, 255, ${nova.flash * 0.8})`);
                gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${nova.flash * 0.6})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.arc(nova.x, nova.y, 100, 0, Math.PI * 2);
                ctx.fill();
            }
            nova.flash -= 0.04;
        }

        nova.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.life / 100})`;
                ctx.fill();
            }
        });
        
        if (nova.flash <= 0 && nova.particles.every(p => p.life <= 0)) {
            supernovas.splice(index, 1);
        }
    });
}

function renderLoop() {
    simulation.tick(); // Manually advance the simulation
    ticked(); // And then draw
    requestAnimationFrame(renderLoop);
}
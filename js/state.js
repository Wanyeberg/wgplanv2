// js/state.js

import { db } from './firebase-config.js';
import { ref, onValue, push, set, remove, update } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

export let nodes = [];
export let archivedItems = [];
export let categories = {};

export const userColorVars = {
    'Du': 'var(--user-du)',
    'Alex': 'var(--user-alex)',
    'Mia': 'var(--user-mia)'
};
export let resolvedUserColors = {};

let hueCounter = 270;

export function resolveCssVariables() {
    const rootStyle = getComputedStyle(document.documentElement);
    for (const key in userColorVars) {
        const varName = userColorVars[key].match(/\((.*?)\)/)[1];
        resolvedUserColors[key] = rootStyle.getPropertyValue(varName).trim();
    }
    Object.values(categories).forEach(cat => {
        if (cat.colorVar.startsWith('var')) {
            const varName = cat.colorVar.match(/\((.*?)\)/)[1];
            cat.resolvedColor = rootStyle.getPropertyValue(varName).trim();
        } else {
            cat.resolvedColor = cat.colorVar;
        }
    });
}


export function listenToCategories(callback) {
    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
        categories = snapshot.val() || {};
        callback(); 
    });
}

export function listenToNodes(callback) {
    const nodesRef = ref(db, 'nodes');
    onValue(nodesRef, (snapshot) => {
        const data = snapshot.val();
        nodes = [];
        if (data) {
            for (const key in data) {
                nodes.push({ id: key, ...data[key] });
            }
        }
        callback();
    });
}

export function listenToArchived(callback) {
    const archivedRef = ref(db, 'archived');
    onValue(archivedRef, (snapshot) => {
        const data = snapshot.val();
        archivedItems = [];
        if (data) {
             for (const key in data) {
                archivedItems.push({ id: key, ...data[key] });
            }
        }
        callback();
    });
}

export async function addCategory(name) {
    if (!name || Object.values(categories).some(cat => cat.name === name)) return;
    
    const hueCounter = (Object.keys(categories).length * 50 + 270) % 360;
    const newColor = `hsla(${hueCounter}, 70%, 55%, 0.8)`;
    
    const newCategoryData = {
        name: name,
        colorVar: newColor,
    };
    const newCategoryRef = push(ref(db, 'categories'));
    await set(newCategoryRef, newCategoryData);
}

export async function addItem(item) {
    const newPostRef = push(ref(db, 'nodes'));
    await set(newPostRef, item);
}

export async function deleteItem(itemId) {
    await remove(ref(db, `nodes/${itemId}`));
}

export async function updateItem(itemId, dataToUpdate) {
    const itemRef = ref(db, `nodes/${itemId}`);
    await update(itemRef, dataToUpdate);
}

export async function archiveItem(item) {
    const newArchivedRef = push(ref(db, 'archived'));
    await set(newArchivedRef, {
        name: item.name,
        category: item.category,
        priority: item.priority,
        timestamp: new Date().toISOString()
    });
    await remove(ref(db, `nodes/${item.id}`));
}

export function seedInitialData() {
    const nodesRef = ref(db, 'nodes');
    onValue(nodesRef, (snapshot) => {
        if (!snapshot.exists()) {
            console.log("Datenbank (nodes) ist leer. Füge Start-Artikel hinzu.");
            addItem({ name: "Milch", category: "Küche", assignedTo: null, priority: "Normal" });
            addItem({ name: "Seife", category: "Bad", assignedTo: null, priority: "Urgent" });
        }
    }, { onlyOnce: true });

    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
         if (!snapshot.exists()) {
            console.log("Datenbank (categories) ist leer. Füge Start-Kategorien hinzu.");
            const initialCategories = {};
            
            const kuecheKey = push(categoriesRef).key;
            initialCategories[kuecheKey] = { name: "Küche", colorVar: "var(--cat-kueche)" };

            const badKey = push(categoriesRef).key;
            initialCategories[badKey] = { name: "Bad", colorVar: "var(--cat-bad)" };

            const allgemeinKey = push(categoriesRef).key;
            initialCategories[allgemeinKey] = { name: "Allgemein", colorVar: "var(--cat-allgemein)" };

            set(ref(db, 'categories'), initialCategories);
         }
    }, { onlyOnce: true });
}


export async function deleteCategoryAndItsItems(categoryId, categoryName) {
    const updates = {};
    updates[`/categories/${categoryId}`] = null;

    const itemsToDelete = nodes.filter(node => node.category === categoryName);
    itemsToDelete.forEach(item => {
        updates[`/nodes/${item.id}`] = null;
    });

    await update(ref(db), updates);
}
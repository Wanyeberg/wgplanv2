// js/ui.js
import * as state from './state.js';
import * as galaxy from './galaxy.js';

let selectedNode = null;
let selectedCategoryForAdd = null; 

function playSound(soundFile, volume = 0.5) {
    try {
        const audio = new Audio(`./sounds/${soundFile}`);
        audio.volume = volume;
        audio.play().catch(e => console.error("Sound konnte nicht abgespielt werden:", e));
    } catch (e) {
        console.error("Fehler beim Laden der Sound-Datei:", e);
    }
}

const elements = {
    addOverlay: document.getElementById('add-item-overlay'),
    addForm: document.getElementById('add-item-form'),
    cancelAddItem: document.getElementById('cancel-add-item'),
    
    categorySelectOverlay: document.getElementById('category-select-overlay'),
    categoryListContainer: document.getElementById('category-list-container'),
    showAddCategoryButton: document.getElementById('show-add-category-button'),
    addNewCategoryForm: document.getElementById('add-new-category-form'),
    newCategoryNameInput: document.getElementById('new-category-name'),
    addNewCategoryButton: document.getElementById('add-new-category-button'),
    cancelCategorySelect: document.getElementById('cancel-category-select'),
    
    addItemModalTitle: document.getElementById('add-item-modal-title'),
    
    detailSidebar: document.getElementById('detail-sidebar'),
    deleteItemButton: document.getElementById('delete-item-button'),
    
    shoppingListView: document.getElementById('shopping-list-view'),
    archiveView: document.getElementById('archive-view'),
    canvas: document.getElementById('galaxy-canvas'),
};

export function initUI() {
    document.getElementById('add-item-button').addEventListener('click', handleOpenCategorySelect);
    
    elements.categoryListContainer.addEventListener('click', handleCategoryAction);
    elements.deleteItemButton.addEventListener('click', handleDeleteItem);
    
    elements.showAddCategoryButton.addEventListener('click', () => {
        playSound('click.mp3', 0.3);
        elements.addNewCategoryForm.classList.remove('hidden');
        elements.showAddCategoryButton.classList.add('hidden');
    });
    elements.addNewCategoryButton.addEventListener('click', handleCreateNewCategory);
    elements.cancelCategorySelect.addEventListener('click', closeAllModals);

    elements.addForm.addEventListener('submit', handleAddItemSubmit);
    elements.cancelAddItem.addEventListener('click', closeAllModals);

    document.getElementById('assign-users').addEventListener('click', handleAssignUser);
    document.getElementById('shopping-mode-toggle').addEventListener('click', (e) => {
        playSound('click.mp3', 0.5);
        toggleListView(elements.shoppingListView, e.currentTarget);
    });
    document.getElementById('archive-toggle').addEventListener('click', (e) => {
        playSound('click.mp3', 0.5);
        toggleListView(elements.archiveView, e.currentTarget);
    });
    document.getElementById('shopping-list-items').addEventListener('change', handleCheckboxChange);
}

function closeAllModals() {
    elements.addOverlay.classList.remove('visible');
    elements.categorySelectOverlay.classList.remove('visible');
    elements.addNewCategoryForm.classList.add('hidden');
    elements.showAddCategoryButton.classList.remove('hidden');
}

// GEÄNDERT: Komplett überarbeitet für das neue Design.
function populateCategorySelector() {
    elements.categoryListContainer.innerHTML = '';
    const coreCategories = [];

    Object.entries(state.categories).forEach(([id, cat]) => {
        const button = document.createElement('button');
        button.className = 'category-select-button';
        button.dataset.categoryName = cat.name;

        // Span für den Namen
        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-name-span';
        nameSpan.textContent = cat.name;
        button.appendChild(nameSpan);

        // Span für das Lösch-Icon (nur für nicht-Kern-Kategorien)
        if (!coreCategories.includes(cat.name)) {
            const deleteIcon = document.createElement('span');
            deleteIcon.className = 'category-delete-icon';
            deleteIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            deleteIcon.dataset.categoryId = id;
            deleteIcon.dataset.categoryName = cat.name;
            deleteIcon.title = `Kategorie "${cat.name}" und alle zugehörigen Artikel löschen`;
            button.appendChild(deleteIcon);
        }
        
        elements.categoryListContainer.appendChild(button);
    });
}

// GEÄNDERT: Angepasst an die neue Button-Struktur und Lösch-Logik.
async function handleCategoryAction(e) {
    const deleteIcon = e.target.closest('.category-delete-icon');

    if (deleteIcon) {
        e.stopPropagation(); // Verhindert, dass der Klick den Button selbst auslöst
        const categoryId = deleteIcon.dataset.categoryId;
        const categoryName = deleteIcon.dataset.categoryName;
        
        // NEUE Warnung, die klarstellt, dass auch Artikel gelöscht werden.
        if (confirm(`Achtung!\nSoll die Kategorie "${categoryName}" wirklich gelöscht werden?\n\nAlle darin enthaltenen Artikel werden ebenfalls unwiderruflich entfernt.`)) {
            playSound('explosion.mp3', 0.4);
            // Ruft die neue State-Funktion auf
            await state.deleteCategoryAndItsItems(categoryId, categoryName);
        }
    } else {
        const categoryButton = e.target.closest('.category-select-button');
        if (categoryButton) {
            playSound('click.mp3');
            selectedCategoryForAdd = categoryButton.dataset.categoryName;
            transitionToAddItemModal();
        }
    }
}

async function handleDeleteItem() {
    if (!selectedNode) return;

    if (confirm(`Soll der Artikel "${selectedNode.name}" wirklich endgültig gelöscht werden?`)) {
        playSound('explosion.mp3', 0.4);
        const idToDelete = selectedNode.id;
        showDetailsPanel(null);
        await state.deleteItem(idToDelete);
    }
}

function handleOpenCategorySelect() {
    playSound('open.mp3', 0.4);
    populateCategorySelector();
    elements.categorySelectOverlay.classList.add('visible');
}

async function handleCreateNewCategory() {
    const newName = elements.newCategoryNameInput.value.trim();
    if (newName) {
        playSound('whoosh.mp3', 0.2);
        await state.addCategory(newName);
        selectedCategoryForAdd = newName;
        transitionToAddItemModal();
    }
}

function transitionToAddItemModal() {
    elements.categorySelectOverlay.classList.remove('visible');
    elements.addItemModalTitle.textContent = `Neuer Stern in "${selectedCategoryForAdd}"`;
    elements.addOverlay.classList.add('visible');
    document.getElementById('item-name').focus();
    
    elements.addForm.reset();
    document.querySelector('input[name="priority"][value="Normal"]').checked = true;
    elements.newCategoryNameInput.value = '';
    elements.addNewCategoryForm.classList.add('hidden');
    elements.showAddCategoryButton.classList.remove('hidden');
}

async function handleAddItemSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('item-name').value;
    const priority = document.querySelector('input[name="priority"]:checked').value;

    if (!name || !selectedCategoryForAdd) return;

    const newItem = { name, category: selectedCategoryForAdd, priority, assignedTo: null };
    
    galaxy.triggerComet(newItem);
    playSound('whoosh.mp3', 0.3);
    
    closeAllModals();
}

export function showDetailsPanel(node) {
    selectedNode = node;
    const detailPriorityWrapper = document.getElementById('detail-priority-wrapper');

    if (node) {
        document.getElementById('detail-name').textContent = node.name;
        const categoryBadge = document.getElementById('detail-category');
        categoryBadge.textContent = node.category;
        
        const categoryData = Object.values(state.categories).find(c => c.name === node.category);
        if (categoryData) {
            categoryBadge.style.backgroundColor = categoryData.colorVar;
        }
        
        const prioritySpan = document.getElementById('detail-priority');
        prioritySpan.textContent = node.priority;
        prioritySpan.className = `priority-indicator priority-${node.priority.toLowerCase()}`;
        detailPriorityWrapper.style.display = 'block';
        
        const userAvatars = document.getElementById('assign-users');
        userAvatars.querySelectorAll('.user-avatar').forEach(avatar => {
            avatar.classList.remove('selected');
            if (avatar.dataset.user === node.assignedTo) {
                avatar.classList.add('selected');
            }
        });
        
        elements.deleteItemButton.style.display = 'flex';
        elements.detailSidebar.classList.add('visible');
    } else {
        elements.deleteItemButton.style.display = 'none';
        elements.detailSidebar.classList.remove('visible');
        if (detailPriorityWrapper) detailPriorityWrapper.style.display = 'none';
    }
}

export function updateCategorySuggestions() {
    populateCategorySelector();
}

async function handleAssignUser(e) {
    if (e.target.classList.contains('user-avatar') && selectedNode) {
        playSound('click.mp3', 0.6);
        const user = e.target.dataset.user;
        const newAssignment = (selectedNode.assignedTo === user) ? null : user;
        await state.updateItem(selectedNode.id, { assignedTo: newAssignment });
    }
}

async function handleCheckboxChange(e) {
    if (e.target.type !== 'checkbox') return;
    
    playSound('explosion.mp3', 0.6);
    const id = e.target.dataset.id;
    e.target.closest('.list-item').classList.add('completed');
    
    setTimeout(async () => {
        const node = state.nodes.find(n => n.id === id);
        if (node) {
            galaxy.triggerSupernova(node.x, node.y, node.category);
            await state.archiveItem(node);
        }
    }, 300);
}

function toggleListView(view, button) {
    const shoppingModeToggle = document.getElementById('shopping-mode-toggle');
    const archiveToggle = document.getElementById('archive-toggle');
    const isActive = view.classList.toggle('visible');
    button.classList.toggle('active', isActive);
    elements.canvas.classList.toggle('hidden', isActive);
    
    if (isActive) {
        [elements.shoppingListView, elements.archiveView].forEach(v => {
            if (v !== view) v.classList.remove('visible');
        });
        [shoppingModeToggle, archiveToggle].forEach(b => {
            if (b !== button) b.classList.remove('active');
        });
        updateListViews();
    }
}

export function updateListViews() {
    const myItems = state.nodes.filter(n => n.assignedTo === 'Du');
    const shoppingListContainer = document.getElementById('shopping-list-items');
    shoppingListContainer.innerHTML = '';
    document.getElementById('empty-shopping-list').style.display = myItems.length === 0 ? 'block' : 'none';

    myItems.sort((a,b) => {
        const priorities = { "Urgent": 0, "Normal": 1, "Low": 2 };
        return priorities[a.priority] - priorities[b.priority];
    });

    myItems.forEach(item => {
        const div = document.createElement('div');
        const categoryData = Object.values(state.categories).find(c => c.name === item.category);
        const categoryColor = categoryData ? categoryData.colorVar : '#888';

        div.className = 'list-item';
        div.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" data-id="${item.id}">
                <span class="checkmark"></span>
            </label>
            <span class="priority-indicator priority-${item.priority.toLowerCase()}" title="Priorität: ${item.priority}">${item.priority.charAt(0)}</span>
            <span class="item-name">${item.name}</span>
            <span class="item-category" style="background-color: ${categoryColor}">${item.category}</span>
        `;
        shoppingListContainer.appendChild(div);
    });

    const archiveListContainer = document.getElementById('archive-list-items');
    archiveListContainer.innerHTML = '';
    document.getElementById('empty-archive-list').style.display = state.archivedItems.length === 0 ? 'block' : 'none';
    [...state.archivedItems].reverse().forEach(item => {
        const div = document.createElement('div');
        const categoryData = Object.values(state.categories).find(c => c.name === item.category);
        const categoryColor = categoryData ? categoryData.colorVar : '#888';
        div.className = 'list-item completed';
        div.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-category" style="background-color: ${categoryColor}">${item.category}</span>
        `;
        archiveListContainer.appendChild(div);
    });
}
import amberCSS   from '../styles/themes/amber.css';
import ayuCSS     from '../styles/themes/ayu.css';
import noctisCSS  from '../styles/themes/noctis.css';

const LS_KEY = 'firelin_theme';

const THEMES = new Map([
    ['phosphor', { name: 'Phosphor', description: 'Classic green phosphor CRT',  css: null }],
    ['amber',    { name: 'Amber',    description: 'Warm amber phosphor CRT',      css: amberCSS }],
    ['ayu',      { name: 'Ayu Dark', description: 'Modern dark with warm accent', css: ayuCSS }],
    ['noctis',   { name: 'Noctis',   description: 'Cool teal dark theme',         css: noctisCSS }],
]);

function saveTheme(id) {
    try { localStorage.setItem(LS_KEY, id); } catch (_) {}
}

function loadTheme() {
    try { return localStorage.getItem(LS_KEY) || 'phosphor'; } catch (_) { return 'phosphor'; }
}

export { THEMES, saveTheme, loadTheme };

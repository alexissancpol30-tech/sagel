// functions/api/actores.js
import { makeCRUD } from './_crud.js';
const { onRequestGet, onRequestPost, onRequestPut, onRequestDelete } = makeCRUD('actores');
export { onRequestGet, onRequestPost, onRequestPut, onRequestDelete };

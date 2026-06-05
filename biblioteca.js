// functions/api/biblioteca.js
import { makeCRUD } from './_crud.js';
const { onRequestGet, onRequestPost, onRequestPut, onRequestDelete } = makeCRUD('biblioteca');
export { onRequestGet, onRequestPost, onRequestPut, onRequestDelete };

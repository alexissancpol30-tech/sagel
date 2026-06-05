// functions/api/sesiones.js
import { makeCRUD } from './_crud.js';
const { onRequestGet, onRequestPost, onRequestPut, onRequestDelete } = makeCRUD('sesiones');
export { onRequestGet, onRequestPost, onRequestPut, onRequestDelete };
